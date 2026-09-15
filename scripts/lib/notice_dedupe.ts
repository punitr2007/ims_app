import { createHash } from 'crypto';

/**
 * Generates a stable synthetic 16-character SHA-256 hash ID for a notice.
 * Prioritizes (publishedDate + normalizedAttachmentUrl + normalizedTitle).
 */
export function generateNoticeId(
  title: string,
  publishedDate: string,
  attachmentUrl: string | null
): string {
  const normTitle = title.toLowerCase().replace(/\s+/g, ' ').trim();
  const normDate = publishedDate.trim();
  const normUrl = (attachmentUrl || '').trim();

  // If there's an attachment URL (which contains specific query strings / Google docs links),
  // it provides the highest deduplication stability.
  const payload = `${normDate}|${normUrl}|${normTitle}`;
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/**
 * Cleans and extracts Publisher and Department from raw strings like:
 * "Published By: Dr. SHASHI PRAKASH, HOSTEL WARDEN, HOSTEL"
 * or "Published By:  , CENTRAL COMPUTER CENTER"
 */
export function parsePublisherInfo(rawText: string): { publisher: string; department: string } {
  let cleaned = rawText.replace(/Published By:\s*/i, '').trim();
  cleaned = cleaned.replace(/^,\s*/, ''); // Remove leading commas if publisher name is empty

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
