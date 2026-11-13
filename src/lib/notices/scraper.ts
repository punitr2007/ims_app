import axios from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { Notice } from '@/lib/ims/types';

const NOTIFICATIONS_URL = 'https://www.imsnsit.org/imsnsit/notifications.php';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Referer': 'https://www.imsnsit.org/imsnsit/',
};

/**
 * Generates a stable synthetic 16-character SHA-256 hash ID for a notice.
 */
export function generateNoticeId(
  title: string,
  publishedDate: string,
  department: string = ''
): string {
  const normTitle = title.toLowerCase().replace(/\s+/g, ' ').trim();
  const normDate = publishedDate.trim();
  const normDept = department.toLowerCase().replace(/\s+/g, ' ').trim();

  const payload = `${normDate}|${normTitle}|${normDept}`;
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/**
 * Cleans and extracts Publisher and Department from raw strings.
 */
export function parsePublisherInfo(rawText: string): { publisher: string; department: string } {
  let cleaned = rawText.replace(/Published By:\s*/i, '').trim();
  cleaned = cleaned.replace(/^,\s*/, '');

  if (!cleaned) {
    return { publisher: 'Administration', department: 'General' };
  }

  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const department = parts[parts.length - 1];
    const publisher = parts.slice(0, parts.length - 1).join(', ');
    return { publisher: publisher || 'Office', department };
  } else if (parts.length === 1) {
    return { publisher: parts[0], department: parts[0] };
  }

  return { publisher: cleaned, department: 'General' };
}

/**
 * Parses raw HTML table from notifications.php into typed Notice objects.
 */
export function parseNoticesHtml(html: string): Notice[] {
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
        const isNew =
          $(tds[0]).find('img[src*="newicon"]').length > 0 ||
          $(row).find('img[src*="newicon"]').length > 0;

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
          const id = generateNoticeId(title, publishedDate, department);
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

/**
 * Scrapes the latest active notices directly from IMS NSUT live endpoint.
 */
export async function fetchLiveNoticesFromIms(): Promise<Notice[]> {
  const response = await axios.get(NOTIFICATIONS_URL, {
    headers: HEADERS,
    timeout: 12000,
  });

  return parseNoticesHtml(response.data || '');
}
