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

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (Math.abs(a.length - b.length) > 2) return 999;

  const bLen = b.length;
  const aLen = a.length;
  const row = new Array(aLen + 1);
  for (let j = 0; j <= aLen; j++) row[j] = j;

  for (let i = 1; i <= bLen; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= aLen; j++) {
      const temp = row[j];
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        row[j] = prev;
      } else {
        row[j] = Math.min(prev + 1, row[j] + 1, row[j - 1] + 1);
      }
      prev = temp;
    }
  }
  return row[aLen];
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export function searchCategorizedNotices(
  query: string,
  category = 'all',
  page = 1,
  pageSize = 5,
  onlyAttachments = false
): { items: NoticeItem[]; total: number; totalPages: number; page: number } {
  const all = loadNotices();
  const qRaw = query.trim().toLowerCase();

  if (!qRaw) {
    return getCategorizedNotices(category, page, pageSize, onlyAttachments);
  }

  const queryTokens = normalizeWords(qRaw);
  if (queryTokens.length === 0) {
    return getCategorizedNotices(category, page, pageSize, onlyAttachments);
  }

  // Pre-filter by category & attachments first if applicable
  const candidatePool = filterNoticesByCategory(all, category, onlyAttachments);

  // Score candidate notices
  const scoredItems: { notice: NoticeItem; score: number; index: number }[] = [];

  for (let i = 0; i < candidatePool.length; i++) {
    const notice = candidatePool[i];
    const titleLower = notice.title.toLowerCase();
    const deptLower = notice.department.toLowerCase();
    const pubLower = notice.publisher.toLowerCase();

    let score = 0;

    // 1. Direct exact phrase match bonuses
    if (titleLower.includes(qRaw)) {
      score += 150;
    } else if (deptLower.includes(qRaw) || pubLower.includes(qRaw)) {
      score += 80;
    }

    const titleWords = normalizeWords(notice.title);
    const deptWords = normalizeWords(notice.department);

    let matchedTokensCount = 0;

    for (const qToken of queryTokens) {
      let tokenMatched = false;

      // Check title words
      for (const tWord of titleWords) {
        if (tWord === qToken) {
          score += 40;
          tokenMatched = true;
          break;
        } else if (tWord.startsWith(qToken) || tWord.includes(qToken)) {
          score += 20;
          tokenMatched = true;
          break;
        } else if (qToken.length >= 4 && tWord.length >= 4) {
          const dist = levenshtein(qToken, tWord);
          const maxDist = qToken.length >= 7 ? 2 : 1;
          if (dist <= maxDist) {
            score += 15;
            tokenMatched = true;
            break;
          }
        }
      }

      // If not matched in title, check department words
      if (!tokenMatched) {
        for (const dWord of deptWords) {
          if (dWord === qToken) {
            score += 25;
            tokenMatched = true;
            break;
          } else if (dWord.startsWith(qToken) || dWord.includes(qToken)) {
            score += 12;
            tokenMatched = true;
            break;
          }
        }
      }

      if (tokenMatched) {
        matchedTokensCount++;
      }
    }

    // Reward notices matching ALL query tokens (even out of order)
    if (matchedTokensCount === queryTokens.length) {
      score += 60;
    } else if (queryTokens.length > 1 && matchedTokensCount > 0) {
      score += matchedTokensCount * 10;
    }

    if (score > 0) {
      scoredItems.push({ notice, score, index: i });
    }
  }

  // Sort by highest score first; tie-breaker: original index (recency)
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.index - b.index;
  });

  const matched = scoredItems.map((s) => s.notice);
  const total = matched.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const items = matched.slice(start, start + pageSize);

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
