import { NextRequest, NextResponse } from 'next/server';
import { ImsClient } from '@/lib/ims/client';
import { solveCaptchaServer } from '@/lib/captcha/solver';
import { decodeSessionToken, encodeSessionToken } from '@/lib/ims/session';
import { CookieJar, Cookie } from 'tough-cookie';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rollNumber, password, captchaText, sessionToken } = body;

    if (!rollNumber || !password) {
      return NextResponse.json(
        { success: false, error: 'Roll Number and Password are required.' },
        { status: 400 }
      );
    }

    // Case 2: Manual CAPTCHA with existing session token
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

      const authRes = await client.authenticate(rollNumber, password, captchaText, {
        hrandNum: decoded.hrandNum,
        encFy: decoded.encFy,
        comp: decoded.comp,
      });

      if (!authRes.success) {
        // Fetch new CAPTCHA for retry
        try {
          const fresh = await client.getCaptchaAndTokens();
          const cookies = await client.jar.getCookies('https://www.imsnsit.org');
          const newSessionToken = encodeSessionToken({
            cookies: cookies.map((c) => c.toString()),
            hrandNum: fresh.hrandNum,
            encFy: fresh.encFy,
            comp: fresh.comp,
            createdAt: Date.now(),
          });

          return NextResponse.json({
            success: false,
            error: authRes.error,
            status: authRes.status || 'NEED_MANUAL_CAPTCHA',
            captchaBase64: fresh.captchaBase64,
            sessionToken: newSessionToken,
          });
        } catch {
          return NextResponse.json({
            success: false,
            error: authRes.error || 'Verification failed. Please retry.',
            status: 'NEED_MANUAL_CAPTCHA',
          });
        }
      }

      const attendanceData = await client.scrapeAttendance(rollNumber);
      return NextResponse.json(attendanceData);
    }

    // Case 1: One-shot Auto-solve flow (with auto-retry up to 2 attempts)
    for (let attempt = 1; attempt <= 2; attempt++) {
      const client = new ImsClient();
      let captchaData;
      try {
        captchaData = await client.getCaptchaAndTokens();
      } catch (err: any) {
        if (attempt === 2) {
          return NextResponse.json({
            success: false,
            error: 'IMS portal is temporarily busy or unreachable. Please try again.',
            status: 'SERVER_ERROR',
          });
        }
        continue;
      }

      const { captchaBase64, captchaBuffer, hrandNum, encFy, comp } = captchaData;

      let solvedOcr = '';
      try {
        solvedOcr = await solveCaptchaServer(captchaBuffer);
        console.log(`[Auth Attempt ${attempt}] Auto-solved CAPTCHA: "${solvedOcr}"`);
      } catch {
        // OCR fail
      }

      if (solvedOcr.length >= 4) {
        const authResult = await client.authenticate(rollNumber, password, solvedOcr, {
          hrandNum,
          encFy,
          comp,
        });

        if (authResult.success) {
          const attendanceData = await client.scrapeAttendance(rollNumber);
          return NextResponse.json(attendanceData);
        } else if (authResult.status === 'INVALID_CREDENTIALS') {
          return NextResponse.json({
            success: false,
            error: authResult.error,
            status: 'INVALID_CREDENTIALS',
          });
        }
      }

      // If this was attempt 2 or OCR had low confidence, prompt user with the fresh image
      if (attempt === 2) {
        const cookies = await client.jar.getCookies('https://www.imsnsit.org');
        const newSessionToken = encodeSessionToken({
          cookies: cookies.map((c) => c.toString()),
          hrandNum,
          encFy,
          comp,
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
      error: 'Could not connect to portal. Please try again.',
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
