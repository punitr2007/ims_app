import { NextResponse } from 'next/server';
import { ImsClient } from '@/lib/ims/client';
import { encodeSessionToken } from '@/lib/ims/session';

export async function GET() {
  try {
    const ims = new ImsClient();
    const { captchaBase64, hrandNum } = await ims.getCaptchaAndTokens();

    const cookies = await ims.jar.getCookies('https://www.imsnsit.org');
    const cookieStrings = cookies.map((c) => c.toString());

    const sessionToken = encodeSessionToken({
      cookies: cookieStrings,
      hrandNum,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      captchaBase64,
      sessionToken,
    });
  } catch (err: any) {
    console.error('[API /api/captcha Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch CAPTCHA' },
      { status: 500 }
    );
  }
}
