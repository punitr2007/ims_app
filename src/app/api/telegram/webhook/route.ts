import { NextRequest, NextResponse } from 'next/server';
import { generateWebAppToken, unbindAccount, getBoundRollNumber } from '@/lib/security/auth_guard';
import {
  getLatestNotices,
  findNoticeById,
  searchNotices,
  downloadNoticePdf,
  NoticeItem,
} from '@/lib/telegram_notices';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ims-app-pearl.vercel.app';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data?: string;
  };
}

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  if (!BOT_TOKEN) {
    console.warn('[Telegram Webhook] TELEGRAM_BOT_TOKEN not configured.');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error('[Telegram Webhook] Error sending message:', err);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
      }),
    });
  } catch (err) {
    console.error('[Telegram Webhook] Error answering callback:', err);
  }
}

async function sendTelegramDocument(
  chatId: number | string,
  pdfBuffer: Buffer,
  filename: string,
  caption: string,
  replyMarkup?: any
) {
  if (!BOT_TOKEN) return;
  try {
    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
    if (replyMarkup) {
      formData.append('reply_markup', JSON.stringify(replyMarkup));
    }
    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
    formData.append('document', blob, filename);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    console.error('[Telegram Webhook] Error sending document:', err);
  }
}

function sanitizeFilename(title: string): string {
  const clean = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
  return (clean.slice(0, 50) || 'ims_notice') + '.pdf';
}

async function deliverNoticePdf(chatId: number | string, notice: NoticeItem) {
  if (!notice.attachmentUrl) {
    await sendTelegramMessage(
      chatId,
      `ℹ️ <b>${notice.title}</b>\n\nThis circular was published as text only without an attached PDF document.`
    );
    return;
  }

  if (notice.isExternalLink && !notice.attachmentUrl.includes('imsnsit.org')) {
    await sendTelegramMessage(
      chatId,
      `🔗 <b>${notice.title}</b>\n\n📅 <b>Date:</b> ${notice.publishedDate}\n🏢 <b>Dept:</b> ${notice.department}\n👤 <b>Publisher:</b> ${notice.publisher}\n\n<i>This notice links to an external form/document.</i>`,
      {
        inline_keyboard: [[{ text: '🌐 Open External Link', url: notice.attachmentUrl }]],
      }
    );
    return;
  }

  const downloaded = await downloadNoticePdf(notice.attachmentUrl);
  if (!downloaded || downloaded.buffer.length === 0) {
    await sendTelegramMessage(
      chatId,
      `⚠️ <b>Failed to fetch PDF</b>\n\nCould not retrieve PDF for: <i>${notice.title}</i>.\nYou can view it on the portal: <a href="${notice.attachmentUrl}">Direct Link</a>`
    );
    return;
  }

  const filename = sanitizeFilename(notice.title);
  const caption =
    `📄 <b>${notice.title}</b>\n\n` +
    `📅 <b>Date:</b> <code>${notice.publishedDate}</code>\n` +
    `🏢 <b>Department:</b> ${notice.department}\n` +
    `👤 <b>Publisher:</b> ${notice.publisher}\n\n` +
    `🌐 <a href="${BASE_URL}">IMS NSUT Portal</a>`;

  await sendTelegramDocument(chatId, downloaded.buffer, filename, caption);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Webhook Secret Token
    if (WEBHOOK_SECRET) {
      const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
      if (incomingSecret !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized secret token' }, { status: 401 });
      }
    }

    const update: TelegramUpdate = await req.json();

    // 2. Handle Callback Queries (Inline Button Clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data || '';
      const chatId = cb.message?.chat.id || cb.from.id;

      if (data.startsWith('pdf:')) {
        const noticeId = data.slice(4);
        await answerCallbackQuery(cb.id, '⏳ Fetching notice PDF from IMS...');
        const notice = findNoticeById(noticeId);
        if (notice) {
          await deliverNoticePdf(chatId, notice);
        } else {
          await sendTelegramMessage(chatId, `⚠️ Notice not found for ID: <code>${noticeId}</code>.`);
        }
        return NextResponse.json({ ok: true });
      }

      if (data === 'latest_pdf') {
        await answerCallbackQuery(cb.id, '⏳ Fetching latest circular PDF...');
        const latest = getLatestNotices(1);
        if (latest.length > 0) {
          await deliverNoticePdf(chatId, latest[0]);
        }
        return NextResponse.json({ ok: true });
      }

      await answerCallbackQuery(cb.id);
      return NextResponse.json({ ok: true });
    }

    // 3. Handle Regular Messages
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const userId = message.from?.id || chatId;
    const userFirstName = message.from?.first_name || 'Student';
    const text = message.text.trim();

    // Command: /start
    if (text.startsWith('/start')) {
      const welcomeText =
        `👋 <b>Welcome to IMS NSUT Bot, ${userFirstName}!</b>\n\n` +
        `Direct official circular PDFs, attendance analytics, and real-time student tools.\n\n` +
        `<b>Available Commands:</b>\n` +
        `• 📄 <b>/notices</b> — Browse latest circulars with 1-tap PDF downloads\n` +
        `• ⚡ <b>/latest</b> — Send the newest official circular PDF directly to chat\n` +
        `• 🔍 <b>/search &lt;query&gt;</b> — Search circulars (e.g. <code>/search exam</code>, <code>/search fee</code>)\n` +
        `• 📊 <b>/attendance</b> — Check attendance & bunk limits via secure WebApp\n` +
        `• 🔓 <b>/unbind</b> — Unlink previously stored roll number\n` +
        `• ℹ️ <b>/help</b> — Usage & privacy information\n\n` +
        `🔒 <i>Passwords never touch Telegram chat messages. Logins happen exclusively in the WebApp.</i>`;

      await sendTelegramMessage(chatId, welcomeText);
      return NextResponse.json({ ok: true });
    }

    // Command: /latest or /pdf (Direct PDF delivery)
    if (text === '/latest' || text === '/pdf' || text === '/latest_pdf') {
      const latest = getLatestNotices(1);
      if (latest.length === 0) {
        await sendTelegramMessage(chatId, `ℹ️ No notices found in catalog.`);
        return NextResponse.json({ ok: true });
      }
      await sendTelegramMessage(chatId, `⚡ <i>Fetching latest official circular PDF from IMS NSUT portal...</i>`);
      await deliverNoticePdf(chatId, latest[0]);
      return NextResponse.json({ ok: true });
    }

    // Command: /search <query> or /find <query>
    if (text.startsWith('/search') || text.startsWith('/find')) {
      const parts = text.split(/\s+/);
      const query = parts.slice(1).join(' ').trim();
      if (!query) {
        await sendTelegramMessage(
          chatId,
          `🔍 <b>Search Circulars</b>\n\nPlease provide a search term.\nExample: <code>/search examination</code> or <code>/search hostel fee</code>`
        );
        return NextResponse.json({ ok: true });
      }

      const results = searchNotices(query, 5);
      if (results.length === 0) {
        await sendTelegramMessage(
          chatId,
          `🔍 No circulars matching <i>"${query}"</i> were found in the archive.`
        );
        return NextResponse.json({ ok: true });
      }

      let responseText = `🔍 <b>Search Results for:</b> <i>"${query}"</i>\n\n`;
      const keyboardButtons: any[] = [];

      results.forEach((notice, idx) => {
        responseText += `<b>${idx + 1}. ${notice.title}</b>\n`;
        responseText += `📅 <code>${notice.publishedDate}</code> | 🏢 ${notice.department}\n\n`;
        if (notice.attachmentUrl) {
          keyboardButtons.push([
            {
              text: `📄 Get PDF #${idx + 1}`,
              callback_data: `pdf:${notice.id}`,
            },
          ]);
        }
      });

      keyboardButtons.push([{ text: '🌐 Search on Web Portal', url: `${BASE_URL}?q=${encodeURIComponent(query)}` }]);

      await sendTelegramMessage(chatId, responseText, {
        inline_keyboard: keyboardButtons,
      });
      return NextResponse.json({ ok: true });
    }

    // Command: /notices
    if (text.startsWith('/notices')) {
      const latestNotices = getLatestNotices(5);
      const noticesUrl = BASE_URL;

      let noticesText =
        `📢 <b>Latest IMS NSUT Notices & Circulars</b>\n\n` +
        `<i>Tap any button below to download the official PDF directly in Telegram:</i>\n\n`;

      const keyboardButtons: any[] = [];

      latestNotices.forEach((notice, idx) => {
        const isHigh = notice.department.toUpperCase().includes('EXAM') || notice.title.toUpperCase().includes('EXAM');
        const badge = isHigh ? '🚨' : '📌';
        noticesText += `${badge} <b>${idx + 1}. ${notice.title}</b>\n`;
        noticesText += `📅 <code>${notice.publishedDate}</code> | 🏢 ${notice.department}\n\n`;

        if (notice.attachmentUrl) {
          keyboardButtons.push([
            {
              text: `📄 Get PDF: ${notice.title.slice(0, 32)}...`,
              callback_data: `pdf:${notice.id}`,
            },
          ]);
        }
      });

      keyboardButtons.push([
        { text: '⚡ Send Newest PDF Directly', callback_data: 'latest_pdf' },
        { text: '🌐 Open Web Portal', url: noticesUrl },
      ]);

      await sendTelegramMessage(chatId, noticesText, {
        inline_keyboard: keyboardButtons,
      });
      return NextResponse.json({ ok: true });
    }

    // Command: /attendance
    if (text.startsWith('/attendance')) {
      const token = generateWebAppToken(userId);
      const webAppUrl = `${BASE_URL}/auth/telegram?token=${encodeURIComponent(token)}`;
      const boundRoll = getBoundRollNumber(userId);
      const promptText = boundRoll
        ? `🔐 <b>Student Portal Attendance</b>\n\nBound Account: <code>${boundRoll}</code>\n\nClick below to securely open your attendance dashboard:`
        : `🔐 <b>Student Portal Attendance</b>\n\nClick the button below to launch the secure WebApp login. Your credentials are sent directly over TLS 1.3 to the backend and never touch chat logs.`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '📊 Open Attendance Dashboard',
              web_app: { url: webAppUrl },
            },
          ],
        ],
      };

      await sendTelegramMessage(chatId, promptText, keyboard);
      return NextResponse.json({ ok: true });
    }

    // Command: /unbind
    if (text.startsWith('/unbind')) {
      const success = unbindAccount(userId);
      const response = success
        ? `✅ <b>Account successfully unlinked.</b> You can now log in with a new roll number via /attendance.`
        : `ℹ️ No active roll number was bound to your Telegram ID.`;

      await sendTelegramMessage(chatId, response);
      return NextResponse.json({ ok: true });
    }

    // Command: /help
    if (text.startsWith('/help')) {
      const helpText =
        `ℹ️ <b>IMS NSUT Bot Help & Features</b>\n\n` +
        `• <b>Direct PDF Delivery:</b> Tap any 📄 PDF button or send /latest to get circulars as native PDF document files.\n` +
        `• <b>Search Circulars:</b> Use /search &lt;query&gt; (e.g. <code>/search timetable</code>) to find and download any past notice.\n` +
        `• <b>Attendance & Bunk Limits:</b> Use /attendance to calculate exact required or skippable classes for 75%.\n` +
        `• <b>Zero-Knowledge Security:</b> Passwords are never stored or logged and only exist in-memory during active sessions.\n\n` +
        `Support & Web Portal: <a href="${BASE_URL}">${BASE_URL}</a>`;

      await sendTelegramMessage(chatId, helpText);
      return NextResponse.json({ ok: true });
    }

    // Default fallback
    await sendTelegramMessage(
      chatId,
      `Unrecognized command. Type /notices for circular PDFs or /attendance for attendance dashboard.`
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

