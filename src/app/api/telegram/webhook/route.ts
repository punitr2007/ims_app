import { NextRequest, NextResponse } from 'next/server';
import { generateWebAppToken, unbindAccount, getBoundRollNumber } from '@/lib/security/auth_guard';
import {
  getLatestNotices,
  findNoticeById,
  getCategorizedNotices,
  searchCategorizedNotices,
  downloadNoticePdf,
  CATEGORIES,
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

async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  replyMarkup?: any
) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error('[Telegram Webhook] Error editing message:', err);
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

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeFilename(title: string): string {
  const clean = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
  return (clean.slice(0, 50) || 'ims_notice') + '.pdf';
}

async function deliverNoticePdf(chatId: number | string, notice: NoticeItem) {
  if (!notice.attachmentUrl) {
    await sendTelegramMessage(
      chatId,
      `ℹ️ <b>${escapeHtml(notice.title)}</b>\n\nThis circular was published as text only without an attached PDF document.`
    );
    return;
  }

  if (notice.isExternalLink && !notice.attachmentUrl.includes('imsnsit.org')) {
    await sendTelegramMessage(
      chatId,
      `🔗 <b>${escapeHtml(notice.title)}</b>\n\n<blockquote expandable>📅 <b>Date:</b> ${escapeHtml(notice.publishedDate)}\n🏢 <b>Dept:</b> ${escapeHtml(notice.department)}\n👤 <b>Publisher:</b> ${escapeHtml(notice.publisher)}</blockquote>\n\n<i>This notice links to an external form/document.</i>`,
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
      `⚠️ <b>Failed to fetch PDF</b>\n\nCould not retrieve PDF for: <i>${escapeHtml(notice.title)}</i>.\nYou can view it on the portal: <a href="${notice.attachmentUrl}">Direct Link</a>`
    );
    return;
  }

  const filename = sanitizeFilename(notice.title);
  const caption =
    `📄 <b>${escapeHtml(notice.title)}</b>\n\n` +
    `<blockquote expandable>` +
    `📅 <b>Date:</b> <code>${escapeHtml(notice.publishedDate)}</code>\n` +
    `🏢 <b>Department:</b> ${escapeHtml(notice.department)}\n` +
    `👤 <b>Publisher:</b> ${escapeHtml(notice.publisher)}` +
    `</blockquote>\n\n` +
    `🌐 <a href="${BASE_URL}">IMS NSUT Portal</a>`;

  await sendTelegramDocument(chatId, downloaded.buffer, filename, caption);
}

function buildNoticeCatalogView(
  category = 'all',
  page = 1,
  onlyAttachments = false,
  query = ''
): { text: string; replyMarkup: any } {
  const data = query
    ? searchCategorizedNotices(query, category, page, 5, onlyAttachments)
    : getCategorizedNotices(category, page, 5, onlyAttachments);

  const activeCategoryObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const queryBadge = query ? `\n🔍 Search: <i>"${escapeHtml(query)}"</i>` : '';
  const attachBadge = onlyAttachments ? ' [📎 Attachments Only]' : '';

  let text =
    `📢 <b>IMS NSUT Notices & Circulars</b>\n` +
    `📂 <b>Category:</b> ${activeCategoryObj.emoji} <b>${escapeHtml(activeCategoryObj.label)}</b>${queryBadge}${attachBadge}\n` +
    `📑 <b>Page:</b> ${data.page} of ${data.totalPages} (${data.total} circulars found)\n\n`;

  const keyboard: any[] = [];
  const pdfButtons: any[] = [];

  if (data.items.length === 0) {
    text += `<blockquote expandable><i>No notices match the selected category/filters. Try selecting "All Notices" or turning off the attachment filter.</i></blockquote>\n\n`;
  } else {
    // Wrap entire page's notice list in Telegram's confined expandable blockquote
    text += `<blockquote expandable>`;
    data.items.forEach((notice, idx) => {
      const itemNum = (data.page - 1) * 5 + idx + 1;
      const isExam = notice.department.toUpperCase().includes('EXAM') || notice.title.toUpperCase().includes('EXAM');
      const badge = isExam ? '🚨' : '📌';
      const attachIcon = notice.attachmentUrl ? ' 📎' : '';

      text += `${badge} <b>${itemNum}. ${escapeHtml(notice.title)}</b>${attachIcon}\n`;
      text += `📅 <code>${escapeHtml(notice.publishedDate)}</code> | 🏢 ${escapeHtml(notice.department)}`;
      if (idx < data.items.length - 1) {
        text += `\n\n`;
      }

      if (notice.attachmentUrl) {
        pdfButtons.push({
          text: `📥 PDF #${itemNum}`,
          callback_data: `pdf:${notice.id}`,
        });
      }
    });
    text += `</blockquote>\n\n`;
    text += `<i>Tap any numbered PDF button below to download:</i>`;
  }

  // 1. PDF Download Buttons formatted in clean, non-truncated rows
  if (pdfButtons.length > 0) {
    if (pdfButtons.length <= 3) {
      keyboard.push(pdfButtons);
    } else if (pdfButtons.length === 4) {
      keyboard.push(pdfButtons.slice(0, 2));
      keyboard.push(pdfButtons.slice(2));
    } else {
      // 5 buttons: 3 on row 1, 2 on row 2
      keyboard.push(pdfButtons.slice(0, 3));
      keyboard.push(pdfButtons.slice(3));
    }
  }

  // 2. Pagination Navigation
  const navRow: any[] = [];
  const qParam = query ? `:${encodeURIComponent(query)}` : '';
  const attachFlag = onlyAttachments ? 1 : 0;

  if (data.page > 1) {
    navRow.push({
      text: '◀️ Prev',
      callback_data: `view:${category}:${data.page - 1}:${attachFlag}${qParam}`,
    });
  }
  navRow.push({
    text: `📄 ${data.page}/${data.totalPages}`,
    callback_data: 'noop',
  });
  if (data.page < data.totalPages) {
    navRow.push({
      text: 'Next ▶️',
      callback_data: `view:${category}:${data.page + 1}:${attachFlag}${qParam}`,
    });
  }
  keyboard.push(navRow);

  // 3. Category Filter Tabs (Row 1)
  const catRow1 = [
    {
      text: `${category === 'all' ? '✅ ' : ''}All`,
      callback_data: `view:all:1:${attachFlag}${qParam}`,
    },
    {
      text: `${category === 'exam' ? '✅ ' : ''}📝 Exams`,
      callback_data: `view:exam:1:${attachFlag}${qParam}`,
    },
    {
      text: `${category === 'hostel' ? '✅ ' : ''}🏠 Hostels`,
      callback_data: `view:hostel:1:${attachFlag}${qParam}`,
    },
  ];
  keyboard.push(catRow1);

  // 4. Category Filter Tabs (Row 2)
  const catRow2 = [
    {
      text: `${category === 'academic' ? '✅ ' : ''}🎓 Academics`,
      callback_data: `view:academic:1:${attachFlag}${qParam}`,
    },
    {
      text: `${category === 'placement' ? '✅ ' : ''}💼 Placements`,
      callback_data: `view:placement:1:${attachFlag}${qParam}`,
    },
    {
      text: `${category === 'sports' ? '✅ ' : ''}🏆 Sports`,
      callback_data: `view:sports:1:${attachFlag}${qParam}`,
    },
  ];
  keyboard.push(catRow2);

  // 5. Attachment Filter Toggle & Fuzzy Search Action
  const toggleFlag = onlyAttachments ? 0 : 1;
  const toggleText = onlyAttachments ? '✅ 📎 Attachments Only' : '📎 Show All (Inc. Text)';
  keyboard.push([
    {
      text: toggleText,
      callback_data: `view:${category}:1:${toggleFlag}${qParam}`,
    },
    {
      text: '🔍 Search Notices',
      callback_data: 'search_prompt',
    },
  ]);

  // 6. Web Portal Link
  keyboard.push([
    {
      text: '🌐 Open Modern Web Portal',
      url: BASE_URL,
    },
  ]);

  return {
    text,
    replyMarkup: { inline_keyboard: keyboard },
  };
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

    // 2. Handle Callback Queries (Inline Button Clicks & Filter Tabs)
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data || '';
      const chatId = cb.message?.chat.id || cb.from.id;
      const messageId = cb.message?.message_id;

      if (data === 'noop') {
        await answerCallbackQuery(cb.id);
        return NextResponse.json({ ok: true });
      }

      if (data === 'search_prompt') {
        await answerCallbackQuery(cb.id);
        const searchPromptMsg =
          `🔍 <b>Fuzzy Search Across 10,000+ IMS Circulars</b>\n\n` +
          `Search notices with keywords in any order, partial words, or typos:\n\n` +
          `• Type <code>/search &lt;keywords&gt;</code> (e.g. <code>/search mid sem datesheet</code>)\n` +
          `• Or simply send your keywords directly in this chat!\n\n` +
          `<b>Popular quick searches:</b>\n` +
          `• <code>/search btech 7th sem</code>\n` +
          `• <code>/search hostel fee refund</code>\n` +
          `• <code>/search seating plan exam</code>\n` +
          `• <code>/search result summer 2026</code>`;

        await sendTelegramMessage(chatId, searchPromptMsg, {
          inline_keyboard: [
            [
              { text: '📝 Search Exams', callback_data: 'view:exam:1:0' },
              { text: '🏠 Search Hostels', callback_data: 'view:hostel:1:0' },
            ],
            [
              { text: '🔙 Back to All Notices', callback_data: 'view:all:1:0' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith('pdf:')) {
        const noticeId = data.slice(4);
        await answerCallbackQuery(cb.id, '⏳ Fetching notice PDF from IMS NSIT...');
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

      if (data.startsWith('view:')) {
        // Format: view:<category>:<page>:<onlyAttachments>[:<query>]
        const parts = data.split(':');
        const cat = parts[1] || 'all';
        const pageNum = parseInt(parts[2] || '1', 10);
        const onlyAttach = parts[3] === '1';
        const query = parts[4] ? decodeURIComponent(parts[4]) : '';

        await answerCallbackQuery(cb.id);
        const view = buildNoticeCatalogView(cat, pageNum, onlyAttach, query);

        if (messageId) {
          await editTelegramMessage(chatId, messageId, view.text, view.replyMarkup);
        } else {
          await sendTelegramMessage(chatId, view.text, view.replyMarkup);
        }
        return NextResponse.json({ ok: true });
      }

      await answerCallbackQuery(cb.id);
      return NextResponse.json({ ok: true });
    }

    // 3. Handle Regular Text Messages & Commands
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
        `Direct official circular PDFs, categorized notices, attendance analytics, and real-time student tools.\n\n` +
        `<b>📂 Notice Commands:</b>\n` +
        `• 📄 <b>/notices</b> — Browse circulars with category tabs & 1-tap PDF downloads\n` +
        `• 📝 <b>/exams</b> — View Exams, Datesheets & Seating Plans\n` +
        `• 🏠 <b>/hostels</b> — View Hostel Allotments & Circulars\n` +
        `• 🎓 <b>/academics</b> — View Academic notices & syllabus\n` +
        `• 💼 <b>/placements</b> — View Training, Placement & Internships\n` +
        `• ⚡ <b>/latest</b> — Send newest official circular PDF directly to chat\n` +
        `• 🔍 <b>/search &lt;query&gt;</b> — Search circulars with category filters\n\n` +
        `<b>📊 Attendance Commands:</b>\n` +
        `• 📊 <b>/attendance</b> — Securely check attendance & bunk limits via WebApp\n` +
        `• 🔓 <b>/unbind</b> — Unlink previously stored roll number\n` +
        `• ℹ️ <b>/help</b> — Usage & privacy information\n\n` +
        `🔒 <i>Passwords never touch Telegram chat messages. Logins happen exclusively in the WebApp.</i>`;

      await sendTelegramMessage(chatId, welcomeText);
      return NextResponse.json({ ok: true });
    }

    // Direct Category Commands
    if (text.startsWith('/exam')) {
      const view = buildNoticeCatalogView('exam', 1, false);
      await sendTelegramMessage(chatId, view.text, view.replyMarkup);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/hostel')) {
      const view = buildNoticeCatalogView('hostel', 1, false);
      await sendTelegramMessage(chatId, view.text, view.replyMarkup);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/academic')) {
      const view = buildNoticeCatalogView('academic', 1, false);
      await sendTelegramMessage(chatId, view.text, view.replyMarkup);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/placement')) {
      const view = buildNoticeCatalogView('placement', 1, false);
      await sendTelegramMessage(chatId, view.text, view.replyMarkup);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/sport')) {
      const view = buildNoticeCatalogView('sports', 1, false);
      await sendTelegramMessage(chatId, view.text, view.replyMarkup);
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

      const view = buildNoticeCatalogView('all', 1, false, query);
      await sendTelegramMessage(chatId, view.text, view.replyMarkup);
      return NextResponse.json({ ok: true });
    }

    // Command: /notices
    if (text.startsWith('/notices')) {
      const view = buildNoticeCatalogView('all', 1, false);
      await sendTelegramMessage(chatId, view.text, view.replyMarkup);
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
        `• <b>Category Tabs & Filters:</b> In /notices, tap category chips (Exams, Hostels, Academics, Placements, Sports) to instantly filter notices.\n` +
        `• <b>Attachments Only Toggle:</b> Tap the 📎 button to show only notices with downloadable PDF attachments.\n` +
        `• <b>Direct PDF Delivery:</b> Tap any 📄 PDF button or send /latest to get circulars as native PDF document files.\n` +
        `• <b>Search Circulars:</b> Use /search &lt;query&gt; (e.g. <code>/search timetable</code>) to search across all archived circulars.\n` +
        `• <b>Attendance & Bunk Limits:</b> Use /attendance to calculate exact required or skippable classes for 75%.\n` +
        `• <b>Zero-Knowledge Security:</b> Passwords are never stored or logged and only exist in-memory during active sessions.\n\n` +
        `Support & Web Portal: <a href="${BASE_URL}">${BASE_URL}</a>`;

      await sendTelegramMessage(chatId, helpText);
      return NextResponse.json({ ok: true });
    }

    // Natural search fallback: treat any freeform text as a fuzzy search query across notices!
    if (!text.startsWith('/')) {
      const view = buildNoticeCatalogView('all', 1, false, text);
      await sendTelegramMessage(chatId, view.text, view.replyMarkup);
      return NextResponse.json({ ok: true });
    }

    // Default fallback for unknown slash commands
    await sendTelegramMessage(
      chatId,
      `Unrecognized command. Type /notices for circulars, /search &lt;keywords&gt; for fuzzy search, or /attendance for attendance dashboard.`
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

