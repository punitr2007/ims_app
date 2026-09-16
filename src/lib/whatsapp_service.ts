import axios from 'axios';
import {
  getCategorizedNotices,
  searchCategorizedNotices,
  getLatestNotices,
  findNoticeById,
  NoticeItem,
} from './telegram_notices';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ims-app-pearl.vercel.app';

const GRAPH_API_URL = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

/**
 * Send a simple text message via WhatsApp Cloud API
 */
export async function sendWhatsAppText(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('[WhatsApp] WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured.');
    return;
  }

  try {
    await axios.post(
      GRAPH_API_URL,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text, preview_url: true },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('[WhatsApp Error sending text]', err.response?.data || err.message);
  }
}

/**
 * Send an official notice PDF document directly to WhatsApp
 */
export async function sendWhatsAppDocument(
  to: string,
  pdfUrl: string,
  filename: string,
  caption: string
) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

  // Use proxy URL to ensure Meta servers can fetch it without referer issues
  const proxiedPdfUrl = `${BASE_URL}/api/document?url=${encodeURIComponent(pdfUrl)}`;

  try {
    await axios.post(
      GRAPH_API_URL,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: {
          link: proxiedPdfUrl,
          filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
          caption,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('[WhatsApp Error sending document]', err.response?.data || err.message);
  }
}

/**
 * Send an Interactive List Menu for Category Selection
 */
export async function sendWhatsAppCategoryMenu(to: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: '📢 IMS NSUT Notices & Circulars',
      },
      body: {
        text: 'Select a category below to browse official notices with 1-tap PDF downloads:',
      },
      footer: {
        text: 'IMS NSUT Student Portal',
      },
      action: {
        button: '📂 Browse Categories',
        sections: [
          {
            title: 'Notice Categories',
            rows: [
              {
                id: 'cat_all',
                title: '📌 All Notices',
                description: 'Latest official notices & general circulars',
              },
              {
                id: 'cat_exam',
                title: '📝 Exams & Datesheets',
                description: 'Seating plans, mid/end sem datesheets, results',
              },
              {
                id: 'cat_hostel',
                title: '🏠 Hostels',
                description: 'Room allotments, mess fees, hostel circulars',
              },
              {
                id: 'cat_academic',
                title: '🎓 Academics',
                description: 'Syllabus, registration, fee notices & scholarships',
              },
              {
                id: 'cat_placement',
                title: '💼 Placements & Internships',
                description: 'Recruitment drives, internship offers, training',
              },
              {
                id: 'cat_sports',
                title: '🏆 Sports & NSS',
                description: 'Gymkhana, tournaments, cultural activities',
              },
            ],
          },
          {
            title: 'Quick Tools',
            rows: [
              {
                id: 'quick_latest_pdf',
                title: '⚡ Send Newest PDF',
                description: 'Directly download newest circular document',
              },
              {
                id: 'quick_attendance',
                title: '📊 Check Attendance',
                description: 'Open secure Attendance & Bunk limit portal',
              },
            ],
          },
        ],
      },
    },
  };

  try {
    await axios.post(GRAPH_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    console.error('[WhatsApp Error sending category menu]', err.response?.data || err.message);
  }
}

/**
 * Send Quick Reply Buttons for Notice actions
 */
export async function sendWhatsAppNoticeList(
  to: string,
  category = 'all',
  page = 1,
  query = ''
) {
  const data = query
    ? searchCategorizedNotices(query, category, page, 4, false)
    : getCategorizedNotices(category, page, 4, false);

  if (data.items.length === 0) {
    await sendWhatsAppText(
      to,
      `🔍 No notices found matching "${query || category}". Type *menu* to explore categories.`
    );
    return;
  }

  let body = `📢 *IMS NSUT Notices (${category.toUpperCase()})*\n\n`;
  const rows: any[] = [];

  data.items.forEach((n, idx) => {
    body += `*${idx + 1}. ${n.title}*\n📅 ${n.publishedDate} | 🏢 ${n.department}\n\n`;
    if (n.attachmentUrl) {
      rows.push({
        id: `get_pdf_${n.id}`,
        title: `📄 PDF #${idx + 1}`,
        description: n.title.slice(0, 70),
      });
    }
  });

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: `📑 Notices: ${category.toUpperCase()}`,
      },
      body: {
        text: body.trim(),
      },
      footer: {
        text: 'Tap below to download any PDF document directly',
      },
      action: {
        button: '📄 Download PDF',
        sections: [
          {
            title: 'Available PDF Documents',
            rows: rows.slice(0, 10),
          },
        ],
      },
    },
  };

  try {
    await axios.post(GRAPH_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    console.error('[WhatsApp Error sending notice list]', err.response?.data || err.message);
  }
}
