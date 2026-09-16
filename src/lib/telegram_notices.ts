import fs from 'fs';
import path from 'path';
import axios from 'axios';

export interface NoticeItem {
  id: string;
  title: string;
  publishedDate: string;
  publisher: string;
  department: string;
  attachmentUrl: string | null;
  isExternalLink?: boolean;
  isNew?: boolean;
  scrapedAt?: string;
}

let cachedNotices: NoticeItem[] | null = null;
let lastCacheTime = 0;

export function loadNotices(): NoticeItem[] {
  const now = Date.now();
  if (cachedNotices && now - lastCacheTime < 60000) {
    return cachedNotices;
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'notices.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      cachedNotices = JSON.parse(data);
      lastCacheTime = now;
      return cachedNotices || [];
    }
  } catch (err) {
    console.error('[loadNotices Error]', err);
  }
  return [];
}

export function getLatestNotices(limit = 5): NoticeItem[] {
  try {
    const statusPath = path.join(process.cwd(), 'data', 'last_sync_status.json');
    if (fs.existsSync(statusPath)) {
      const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
      if (statusData.latestNotices && statusData.latestNotices.length > 0) {
        if (statusData.latestNotices.length >= limit) {
          return statusData.latestNotices.slice(0, limit);
        }
      }
    }
  } catch (err) {
    console.error('[getLatestNotices Status Error]', err);
  }

  const all = loadNotices();
  return all.slice(0, limit);
}

export function findNoticeById(id: string): NoticeItem | undefined {
  const latest = getLatestNotices(10);
  const foundInLatest = latest.find((n) => n.id === id);
  if (foundInLatest) return foundInLatest;

  const all = loadNotices();
  return all.find((n) => n.id === id);
}

export function searchNotices(query: string, limit = 5): NoticeItem[] {
  const all = loadNotices();
  const q = query.toLowerCase().trim();
  if (!q) return all.slice(0, limit);

  return all
    .filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.department.toLowerCase().includes(q) ||
        n.publisher.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

export async function downloadNoticePdf(
  attachmentUrl: string
): Promise<{ buffer: Buffer; filename: string; contentType: string } | null> {
  try {
    const response = await axios.get(attachmentUrl, {
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
    let filename = 'notice.pdf';

    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition && typeof contentDisposition === 'string') {
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    return {
      buffer: Buffer.from(response.data),
      filename,
      contentType,
    };
  } catch (err) {
    console.error('[downloadNoticePdf Error]', err);
    return null;
  }
}
