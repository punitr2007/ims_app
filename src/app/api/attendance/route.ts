import { NextRequest, NextResponse } from 'next/server';
import { ImsClient } from '@/lib/ims/client';
import { decodeSessionToken, encodeSessionToken } from '@/lib/ims/session';
import { checkRateLimits, recordAuthFailure, recordAuthSuccess, GENERIC_AUTH_ERROR } from '@/lib/security/auth_guard';
import { CookieJar, Cookie } from 'tough-cookie';

export const maxDuration = 30; // Max execution timeout for serverless

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rollNumber, password, captchaText, sessionToken, userId } = body;

    if (!rollNumber || !password) {
      return NextResponse.json(
        { success: false, error: 'Roll Number and Password are required.' },
        { status: 400 }
      );
    }

    const clientUserId = userId || req.headers.get('x-forwarded-for') || 'anonymous_user';

    // 1. Check Rate Limits
    const rateCheck = checkRateLimits(clientUserId, rollNumber);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many unsuccessful attempts. For security, please wait ${rateCheck.remainingWaitSeconds || 900} seconds before trying again.`,
          status: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    // 2. Case: User has submitted a manual CAPTCHA + session token
    if (captchaText && sessionToken) {
      const decoded = decodeSessionToken(sessionToken);
      if (!decoded) {
        return NextResponse.json(
          { success: false, error: 'Session expired. Please reload the CAPTCHA image.', status: 'NEED_MANUAL_CAPTCHA' },
          { status: 400 }
        );
      }

      const jar = new CookieJar();
      for (const cStr of decoded.cookies) {
        const cookie = Cookie.parse(cStr);
        if (cookie) {
          await jar.setCookie(cookie, 'https://www.imsnsit.org');
        }
      }

      const client = new ImsClient(jar);
      client.hrandNum = decoded.hrandNum;
      client.encFy = decoded.encFy || '';
      client.comp = decoded.comp || 'NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY';
      client.fy = decoded.fy || '';
      client.t = decoded.t || 'swx';

      const authRes = await client.authenticate(rollNumber, password, captchaText, {
        hrandNum: decoded.hrandNum,
        encFy: decoded.encFy,
        comp: decoded.comp,
        fy: decoded.fy,
        t: decoded.t,
      });

      if (!authRes.success) {
        // Record failure against rate limit budget
        recordAuthFailure(clientUserId, rollNumber);

        // Fetch a fresh CAPTCHA for retry
        try {
          const freshClient = new ImsClient();
          const fresh = await freshClient.getCaptchaAndTokens();
          const cookies = await freshClient.jar.getCookies('https://www.imsnsit.org');
          const newSessionToken = encodeSessionToken({
            cookies: cookies.map((c) => c.toString()),
            hrandNum: fresh.hrandNum,
            encFy: fresh.encFy,
            comp: fresh.comp,
            fy: fresh.fy,
            t: fresh.t,
            createdAt: Date.now(),
          });

          const errorMsg =
            authRes.status === 'WRONG_CAPTCHA'
              ? 'Wrong CAPTCHA code. Please try again with the new image below.'
              : GENERIC_AUTH_ERROR;

          return NextResponse.json({
            success: false,
            error: errorMsg,
            status: 'NEED_MANUAL_CAPTCHA',
            captchaBase64: fresh.captchaBase64,
            sessionToken: newSessionToken,
          });
        } catch {
          return NextResponse.json({
            success: false,
            error: GENERIC_AUTH_ERROR,
            status: 'NEED_MANUAL_CAPTCHA',
          });
        }
      }

      // Auth succeeded
      recordAuthSuccess(clientUserId, rollNumber);
      const attendanceData = await client.scrapeAttendance(rollNumber);
      return NextResponse.json(attendanceData);
    }

    // 3. First visit (no session token) OR after prior failures:
    //    Always serve a fresh CAPTCHA image to the user. 
    //    This removes Tesseract OCR from the critical path entirely,
    //    eliminating cold-start timeouts on Vercel.
    const client = new ImsClient();
    let fresh;

    try {
      fresh = await client.getCaptchaAndTokens();
    } catch (err: any) {
      console.error('[API /api/attendance] Failed to fetch CAPTCHA from IMS portal:', err?.message);
      return NextResponse.json({
        success: false,
        error: 'Could not connect to IMS portal. The portal may be temporarily down. Please try again in a few minutes.',
        status: 'SERVER_ERROR',
      });
    }

    const cookies = await client.jar.getCookies('https://www.imsnsit.org');
    const newSessionToken = encodeSessionToken({
      cookies: cookies.map((c) => c.toString()),
      hrandNum: fresh.hrandNum,
      encFy: fresh.encFy,
      comp: fresh.comp,
      fy: fresh.fy,
      t: fresh.t,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: false,
      error: 'Please enter the security code shown in the image below.',
      status: 'NEED_MANUAL_CAPTCHA',
      captchaBase64: fresh.captchaBase64,
      sessionToken: newSessionToken,
    });

  } catch (err: any) {
    console.error('[API /api/attendance Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
