import { NextRequest, NextResponse } from 'next/server';
import {
  sendWhatsAppText,
  sendWhatsAppDocument,
  sendWhatsAppCategoryMenu,
  sendWhatsAppNoticeList,
} from '@/lib/whatsapp_service';
import { findNoticeById, getLatestNotices } from '@/lib/telegram_notices';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'ims_nsut_whatsapp_verify_token';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ims-app-pearl.vercel.app';

/**
 * 1. Webhook Verification Handshake (GET)
 * Meta calls this when you configure the Webhook URL in Meta Dashboard.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook Verified Successfully]');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * 2. Inbound Message Processing (POST)
 * Receives messages, button taps, and interactive list selections.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ ok: true });
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value || !value.messages) continue;

        const messages = value.messages || [];
        for (const msg of messages) {
          const from = msg.from; // User's WhatsApp phone number (e.g. "919876543210")
          const msgType = msg.type;

          // A. Handle Interactive List / Button Selection
          if (msgType === 'interactive') {
            const interactive = msg.interactive;
            const replyId =
              interactive.list_reply?.id || interactive.button_reply?.id || '';

            if (replyId.startsWith('get_pdf_')) {
              const noticeId = replyId.replace('get_pdf_', '');
              const notice = findNoticeById(noticeId);
              if (notice && notice.attachmentUrl) {
                await sendWhatsAppText(from, `⚡ *Fetching PDF for:* _${notice.title}_...`);
                await sendWhatsAppDocument(
                  from,
                  notice.attachmentUrl,
                  notice.title,
                  `📄 *${notice.title}*\n📅 Date: ${notice.publishedDate}\n🏢 Dept: ${notice.department}`
                );
              } else {
                await sendWhatsAppText(from, `⚠️ Could not find PDF for notice ID: ${noticeId}`);
              }
              continue;
            }

            if (replyId === 'quick_latest_pdf') {
              const latest = getLatestNotices(1);
              if (latest.length > 0 && latest[0].attachmentUrl) {
                await sendWhatsAppText(from, `⚡ *Fetching newest circular PDF...*`);
                await sendWhatsAppDocument(
                  from,
                  latest[0].attachmentUrl,
                  latest[0].title,
                  `📄 *${latest[0].title}*\n📅 Date: ${latest[0].publishedDate}\n🏢 Dept: ${latest[0].department}`
                );
              }
              continue;
            }

            if (replyId === 'quick_attendance') {
              await sendWhatsAppText(
                from,
                `📊 *IMS NSUT Attendance Dashboard*\n\nSecurely check your attendance and calculate bunk limits at:\n${BASE_URL}/attendance`
              );
              continue;
            }

            if (replyId.startsWith('cat_')) {
              const cat = replyId.replace('cat_', '');
              await sendWhatsAppNoticeList(from, cat, 1);
              continue;
            }
          }

          // B. Handle Text Messages & Commands
          if (msgType === 'text') {
            const rawText = (msg.text?.body || '').trim();
            const text = rawText.toLowerCase();

            if (text === 'hi' || text === 'hello' || text === 'start' || text === 'menu') {
              await sendWhatsAppCategoryMenu(from);
              continue;
            }

            if (text === 'latest' || text === 'pdf') {
              const latest = getLatestNotices(1);
              if (latest.length > 0 && latest[0].attachmentUrl) {
                await sendWhatsAppText(from, `⚡ *Fetching latest circular PDF...*`);
                await sendWhatsAppDocument(
                  from,
                  latest[0].attachmentUrl,
                  latest[0].title,
                  `📄 *${latest[0].title}*\n📅 Date: ${latest[0].publishedDate}\n🏢 Dept: ${latest[0].department}`
                );
              } else {
                await sendWhatsAppText(from, `ℹ️ No recent PDF notices found.`);
              }
              continue;
            }

            if (text === 'exam' || text === 'exams') {
              await sendWhatsAppNoticeList(from, 'exam', 1);
              continue;
            }

            if (text === 'hostel' || text === 'hostels') {
              await sendWhatsAppNoticeList(from, 'hostel', 1);
              continue;
            }

            if (text === 'academic' || text === 'academics') {
              await sendWhatsAppNoticeList(from, 'academic', 1);
              continue;
            }

            if (text === 'placement' || text === 'placements') {
              await sendWhatsAppNoticeList(from, 'placement', 1);
              continue;
            }

            if (text === 'sports' || text === 'nss') {
              await sendWhatsAppNoticeList(from, 'sports', 1);
              continue;
            }

            if (text.startsWith('search ') || text.startsWith('find ')) {
              const query = rawText.split(/\s+/).slice(1).join(' ').trim();
              await sendWhatsAppNoticeList(from, 'all', 1, query);
              continue;
            }

            if (text === 'attendance' || text === 'bunk') {
              await sendWhatsAppText(
                from,
                `📊 *IMS NSUT Attendance Dashboard*\n\nCheck attendance & calculate safe bunks at:\n${BASE_URL}/attendance`
              );
              continue;
            }

            // Default fallback
            await sendWhatsAppCategoryMenu(from);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[WhatsApp Webhook POST Error]', err);
    return NextResponse.json({ ok: true });
  }
}
