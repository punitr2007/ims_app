import { NextRequest, NextResponse } from 'next/server';
import { ImsClient } from '@/lib/ims/client';
import { solveCaptchaServer } from '@/lib/captcha/solver';
import { decodeSessionToken, encodeSessionToken } from '@/lib/ims/session';
import { checkRateLimits, recordAuthFailure, recordAuthSuccess, GENERIC_AUTH_ERROR } from '@/lib/security/auth_guard';
import { CookieJar, Cookie } from 'tough-cookie';

export const maxDuration = 30; // Max execution timeout for serverless scraping

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

    // 1. Check Rate Limits & Friction Guard (Dual-key: per-user + per-roll target)
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

    // 2. Case: Manual CAPTCHA with existing session token
    if (captchaText && sessionToken) {
      const decoded = decodeSessionToken(sessionToken);
      if (!decoded) {
        return NextResponse.json(
          { success: false, error: 'Session expired. Please reload CAPTCHA.', status: 'NEED_MANUAL_CAPTCHA' },
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

        // Fetch new CAPTCHA for retry
        try {
          const fresh = await client.getCaptchaAndTokens();
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
            error: GENERIC_AUTH_ERROR,
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

      // Authentication succeeded: clear failures and bind roll
      recordAuthSuccess(clientUserId, rollNumber);

      const attendanceData = await client.scrapeAttendance(rollNumber);
      return NextResponse.json(attendanceData);
    }

    // 3. Case: Friction Guard Enforcement (If roll has prior failures, force manual CAPTCHA immediately)
    if (rateCheck.requiresManualCaptcha) {
      const client = new ImsClient();
      const fresh = await client.getCaptchaAndTokens();
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
        error: 'Please enter the security verification code shown below to continue.',
        status: 'NEED_MANUAL_CAPTCHA',
        captchaBase64: fresh.captchaBase64,
        sessionToken: newSessionToken,
      });
    }

    // 4. Case: One-shot Auto-solve flow for first clean attempt
    for (let attempt = 1; attempt <= 2; attempt++) {
      const client = new ImsClient();
      let captchaData;
      try {
        captchaData = await client.getCaptchaAndTokens();
      } catch (err: any) {
        if (attempt === 2) {
          return NextResponse.json({
            success: false,
            error: 'IMS portal is temporarily busy or unreachable. Please try again in a few minutes.',
            status: 'SERVER_ERROR',
          });
        }
        continue;
      }

      const { captchaBase64, captchaBuffer, hrandNum, encFy, comp, fy, t } = captchaData;

      let solvedOcr = '';
      try {
        solvedOcr = await solveCaptchaServer(captchaBuffer);
      } catch {
        // OCR fallback
      }

      if (solvedOcr.length >= 4) {
        const authResult = await client.authenticate(rollNumber, password, solvedOcr, {
          hrandNum,
          encFy,
          comp,
          fy,
          t,
        });

        if (authResult.success) {
          // Success: clear rate limits
          recordAuthSuccess(clientUserId, rollNumber);
          const attendanceData = await client.scrapeAttendance(rollNumber);
          return NextResponse.json(attendanceData);
        } else if (authResult.status === 'INVALID_CREDENTIALS') {
          // Record failure & force manual captcha next time
          recordAuthFailure(clientUserId, rollNumber);
          return NextResponse.json({
            success: false,
            error: GENERIC_AUTH_ERROR,
            status: 'INVALID_CREDENTIALS',
          });
        }
      }

      // If attempt 2 reached, prompt user with clean manual CAPTCHA image
      if (attempt === 2) {
        const cookies = await client.jar.getCookies('https://www.imsnsit.org');
        const newSessionToken = encodeSessionToken({
          cookies: cookies.map((c) => c.toString()),
          hrandNum,
          encFy,
          comp,
          fy,
          t,
          createdAt: Date.now(),
        });

        return NextResponse.json({
          success: false,
          error: 'Please enter the security verification code shown below.',
          status: 'NEED_MANUAL_CAPTCHA',
          captchaBase64,
          sessionToken: newSessionToken,
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Could not connect to IMS portal. Please try again.',
      status: 'SERVER_ERROR',
    });
  } catch (err: any) {
    console.error('[API /api/attendance Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
