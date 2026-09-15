import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { generateNoticeId, parsePublisherInfo } from './lib/notice_dedupe';
import { Notice } from '../src/lib/ims/types';

const NOTIFICATIONS_URL = 'https://www.imsnsit.org/imsnsit/notifications.php';
const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');
const PUBLIC_NOTICES_FILE = path.join(PUBLIC_DATA_DIR, 'notices.json');
const RECENT_NOTICES_FILE = path.join(PUBLIC_DATA_DIR, 'notices-recent.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
};

function parseNoticesHtml(html: string): Notice[] {
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  const now = new Date().toISOString();

  $('tr').each((_, row) => {
    const tds = $(row).find('td');
    if (tds.length >= 2) {
      const dateText = $(tds[0]).text().trim();
      const dateMatch = dateText.match(/\d{2}-\d{2}-\d{4}/);
      
      if (dateMatch) {
        const publishedDate = dateMatch[0];
        const isNew = $(tds[0]).find('img[src*="newicon"]').length > 0 || $(row).find('img[src*="newicon"]').length > 0;
        
        const contentTd = $(tds[1]);
        const linkElem = contentTd.find('a').first();
        
        let title = '';
        let attachmentUrl: string | null = null;
        let isExternalLink = false;

        if (linkElem.length > 0) {
          title = linkElem.text().trim();
          const rawHref = linkElem.attr('href') || '';
          if (rawHref) {
            try {
              const parsedUrl = new URL(rawHref, 'https://www.imsnsit.org/imsnsit/');
              attachmentUrl = parsedUrl.toString();
              isExternalLink = !attachmentUrl.includes('imsnsit.org');
            } catch {
              attachmentUrl = rawHref;
            }
          }
        } else {
          title = contentTd.clone().children('font').remove().end().text().trim();
        }

        title = title.replace(/\s+/g, ' ').trim();

        const fontPublisher = contentTd.find('font').last().text();
        const { publisher, department } = parsePublisherInfo(fontPublisher);

        if (title.length > 2) {
          const id = generateNoticeId(title, publishedDate, attachmentUrl);
          notices.push({
            id,
            title,
            publishedDate,
            publisher,
            department,
            attachmentUrl,
            isExternalLink,
            isNew,
            scrapedAt: now,
          });
        }
      }
    }
  });

  return notices;
}

async function scrapeLiveNotices(): Promise<Notice[]> {
  console.log(`[Scraper] Fetching live notices from ${NOTIFICATIONS_URL}...`);
  const response = await axios.get(NOTIFICATIONS_URL, {
    headers: HEADERS,
    timeout: 15000,
  });
  const notices = parseNoticesHtml(response.data);
  console.log(`[Scraper] Parsed ${notices.length} live notices.`);
  return notices;
}

async function scrapeArchivedNotices(): Promise<Notice[]> {
  console.log(`[Scraper] Fetching archived notices...`);
  const payload = new URLSearchParams({
    branch: 'All',
    olddata: 'Archive: Click to View Old Notices / Circulars',
  });

  const response = await axios.post(NOTIFICATIONS_URL, payload.toString(), {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': NOTIFICATIONS_URL,
    },
    timeout: 25000,
  });
  const notices = parseNoticesHtml(response.data);
  console.log(`[Scraper] Parsed ${notices.length} archived notices.`);
  return notices;
}

function parseDateKey(d: string): number {
  const parts = d.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day).getTime();
  }
  return 0;
}

async function run() {
  const shouldScrapeArchive = process.argv.includes('--archive') || !fs.existsSync(NOTICES_FILE);

  let existingNotices: Notice[] = [];
  if (fs.existsSync(NOTICES_FILE)) {
    try {
      const raw = fs.readFileSync(NOTICES_FILE, 'utf-8');
      existingNotices = JSON.parse(raw);
      console.log(`[Scraper] Loaded ${existingNotices.length} existing notices from ${NOTICES_FILE}`);
    } catch (err) {
      console.warn('[Scraper] Could not parse existing notices.json, starting fresh.', err);
    }
  }

  const noticeMap = new Map<string, Notice>();
  for (const n of existingNotices) {
    noticeMap.set(n.id, n);
  }

  let newLiveCount = 0;
  try {
    const liveNotices = await scrapeLiveNotices();
    for (const notice of liveNotices) {
      if (!noticeMap.has(notice.id)) {
        newLiveCount++;
      }
      noticeMap.set(notice.id, notice);
    }
  } catch (err: any) {
    console.error(`[Scraper] Failed to fetch live notices: ${err.message}`);
  }

  if (shouldScrapeArchive) {
    try {
      const archiveNotices = await scrapeArchivedNotices();
      let newArchiveCount = 0;
      for (const notice of archiveNotices) {
        if (!noticeMap.has(notice.id)) {
          newArchiveCount++;
        }
        noticeMap.set(notice.id, notice);
      }
      console.log(`[Scraper] Archive sync: ${newArchiveCount} new archived notices merged.`);
    } catch (err: any) {
      console.error(`[Scraper] Failed to fetch archived notices: ${err.message}`);
    }
  }

  const mergedNotices = Array.from(noticeMap.values()).sort((a, b) => {
    const timeA = parseDateKey(a.publishedDate);
    const timeB = parseDateKey(b.publishedDate);
    return timeB - timeA;
  });

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PUBLIC_DATA_DIR)) fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

  // Save compact JSON
  fs.writeFileSync(NOTICES_FILE, JSON.stringify(mergedNotices), 'utf-8');
  fs.writeFileSync(PUBLIC_NOTICES_FILE, JSON.stringify(mergedNotices), 'utf-8');
  
  // Save recent 1500 notices for ultra-fast initial load
  const recentNotices = mergedNotices.slice(0, 1500);
  fs.writeFileSync(RECENT_NOTICES_FILE, JSON.stringify(recentNotices), 'utf-8');

  console.log(`[Scraper] Saved ${mergedNotices.length} total notices to ${NOTICES_FILE}`);
  console.log(`[Scraper] Saved ${recentNotices.length} recent notices to ${RECENT_NOTICES_FILE}`);
}

run().catch((err) => {
  console.error('[Scraper Fatal Error]', err);
  process.exit(1);
});
