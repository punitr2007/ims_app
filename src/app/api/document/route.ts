import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const ALLOWED_HOSTS = ['www.imsnsit.org', 'imsnsit.org'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl, 'https://www.imsnsit.org/imsnsit/');
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
    }

    const response = await axios.get(parsedUrl.toString(), {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.imsnsit.org/imsnsit/notifications.php',
        'Accept': '*/*',
      },
    });

    const contentType = String(response.headers['content-type'] || 'application/pdf');
    const contentDisposition = String(
      response.headers['content-disposition'] || 'inline; filename="document.pdf"'
    );

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', contentDisposition);
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

    return new NextResponse(response.data, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('[Document Proxy Error]', err);
    return NextResponse.json(
      { error: 'Failed to retrieve document from portal.' },
      { status: 502 }
    );
  }
}
