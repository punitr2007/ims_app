import { NextResponse } from 'next/server';
import { fetchLiveNoticesFromIms } from '@/lib/notices/scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET() {
  try {
    const liveNotices = await fetchLiveNoticesFromIms();

    const headers = new Headers();
    // Cache at edge for 60 seconds with 120s stale-while-revalidate to avoid pounding IMS server
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return NextResponse.json(
      {
        success: true,
        count: liveNotices.length,
        fetchedAt: new Date().toISOString(),
        notices: liveNotices,
      },
      {
        status: 200,
        headers,
      }
    );
  } catch (err: any) {
    console.error('[API /api/notices/live Error]', err?.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve live notices from IMS NSUT. The portal may be temporarily busy.',
        details: err?.message,
      },
      { status: 502 }
    );
  }
}
