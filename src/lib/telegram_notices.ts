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

export const CATEGORIES = [
  { id: 'all', label: 'All Notices', emoji: '📌' },
  { id: 'exam', label: 'Exams & Datesheets', emoji: '📝' },
  { id: 'hostel', label: 'Hostels', emoji: '🏠' },
  { id: 'academic', label: 'Academics', emoji: '🎓' },
  { id: 'placement', label: 'Placements', emoji: '💼' },
  { id: 'sports', label: 'Sports & NSS', emoji: '🏆' },
];

export function filterNoticesByCategory(
  notices: NoticeItem[],
  category: string,
  onlyAttachments = false
): NoticeItem[] {
  let result = notices;
  if (onlyAttachments) {
    result = result.filter((n) => !!n.attachmentUrl);
  }

  if (category === 'all') return result;

  return result.filter((n) => {
    const titleLower = n.title.toLowerCase();
    const deptLower = n.department.toLowerCase();
    const pubLower = n.publisher.toLowerCase();

    if (category === 'hostel') {
      return (
        titleLower.includes('hostel') ||
        deptLower.includes('hostel') ||
        pubLower.includes('hostel') ||
        titleLower.includes('ramanujan') ||
        titleLower.includes('aryabhatta') ||
        titleLower.includes('mess')
      );
    }
    if (category === 'exam') {
      return (
        titleLower.includes('exam') ||
        titleLower.includes('date sheet') ||
        titleLower.includes('datesheet') ||
        titleLower.includes('mid sem') ||
        titleLower.includes('end sem') ||
        titleLower.includes('seating plan') ||
        titleLower.includes('seat plan') ||
        titleLower.includes('reappear') ||
        titleLower.includes('result') ||
        deptLower.includes('exam')
      );
    }
    if (category === 'academic') {
      return (
        titleLower.includes('academic') ||
        titleLower.includes('syllabus') ||
        titleLower.includes('course') ||
        titleLower.includes('registration') ||
        titleLower.includes('mentor') ||
        titleLower.includes('attendance') ||
        titleLower.includes('scholarship') ||
        titleLower.includes('fee') ||
        deptLower.includes('academic')
      );
    }
    if (category === 'placement') {
      return (
        titleLower.includes('placement') ||
        titleLower.includes('internship') ||
        titleLower.includes('recruitment') ||
        titleLower.includes('training') ||
        titleLower.includes('drive') ||
        deptLower.includes('training') ||
        deptLower.includes('placement')
      );
    }
    if (category === 'sports') {
      return (
        titleLower.includes('sports') ||
        titleLower.includes('nss') ||
        titleLower.includes('gymkhana') ||
        titleLower.includes('cultural') ||
        titleLower.includes('tournament') ||
        deptLower.includes('sports')
      );
    }
    return true;
  });
}

export function getCategorizedNotices(
  category = 'all',
  page = 1,
  pageSize = 5,
  onlyAttachments = false
): { items: NoticeItem[]; total: number; totalPages: number; page: number } {
  const all = loadNotices();
  const filtered = filterNoticesByCategory(all, category, onlyAttachments);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, totalPages, page: currentPage };
}

export function searchCategorizedNotices(
  query: string,
  category = 'all',
  page = 1,
  pageSize = 5,
  onlyAttachments = false
): { items: NoticeItem[]; total: number; totalPages: number; page: number } {
  const all = loadNotices();
  const q = query.toLowerCase().trim();
  let matched = all;
  if (q) {
    matched = all.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.department.toLowerCase().includes(q) ||
        n.publisher.toLowerCase().includes(q)
    );
  }

  const filtered = filterNoticesByCategory(matched, category, onlyAttachments);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, totalPages, page: currentPage };
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
