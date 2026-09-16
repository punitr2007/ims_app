import { NextRequest, NextResponse } from 'next/server';
import { generateWebAppToken, unbindAccount, getBoundRollNumber } from '@/lib/security/auth_guard';

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
    const message = update.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const userId = message.from?.id || chatId;
    const userFirstName = message.from?.first_name || 'Student';
    const text = message.text.trim();

    // Command Routing
    if (text.startsWith('/start')) {
      const welcomeText = `👋 <b>Welcome to IMS NSUT Bot, ${userFirstName}!</b>\n\n` +
        `Access college circulars, notices, and direct attendance analytics seamlessly.\n\n` +
        `<b>Available Commands:</b>\n` +
        `• 📊 <b>/attendance</b> — Securely check attendance & bunk limits via WebApp\n` +
        `• 📢 <b>/notices</b> — View latest official notices & circulars\n` +
        `• 🔓 <b>/unbind</b> — Unlink previously stored roll number\n` +
        `• ℹ️ <b>/help</b> — Security & usage instructions\n\n` +
        `🔒 <i>Your credentials never touch Telegram chats. All logins occur via isolated HTTPS WebApp.</i>`;

      await sendTelegramMessage(chatId, welcomeText);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/attendance')) {
      // Generate short-TTL (3 min) single-use launch token bound to Telegram User ID
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

    if (text.startsWith('/unbind')) {
      const success = unbindAccount(userId);
      const response = success
        ? `✅ <b>Account successfully unlinked.</b> You can now log in with a new roll number via /attendance.`
        : `ℹ️ No active roll number was bound to your Telegram ID.`;

      await sendTelegramMessage(chatId, response);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/notices')) {
      const noticesUrl = `${BASE_URL}`;
      const noticesText = `📢 <b>IMS NSUT Notices & Circulars</b>\n\n` +
        `You can browse, filter, and search through 10,000+ archived and live circulars with direct PDF streaming proxy.\n\n` +
        `🔗 <a href="${noticesUrl}">Open Notices Web Portal</a>`;

      await sendTelegramMessage(chatId, noticesText, {
        inline_keyboard: [
          [{ text: '🌐 Browse All Notices', url: noticesUrl }],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/help')) {
      const helpText = `ℹ️ <b>IMS NSUT Bot Help & Privacy</b>\n\n` +
        `• <b>Privacy:</b> We enforce a strict Zero-Knowledge policy. Passwords are used strictly in-memory during scraping and are never stored or logged.\n` +
        `• <b>Security:</b> Login occurs exclusively inside the Telegram WebApp sandbox over HTTPS.\n` +
        `• <b>Bunk Limits:</b> Automatically calculates remaining allowable absences or required classes to maintain 75% attendance.\n\n` +
        `Support: Open an issue on GitHub or use /unbind to reset session bindings.`;

      await sendTelegramMessage(chatId, helpText);
      return NextResponse.json({ ok: true });
    }

    // Default fallback
    await sendTelegramMessage(
      chatId,
      `Unrecognized command. Type /attendance to check attendance or /notices for circulars.`
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
