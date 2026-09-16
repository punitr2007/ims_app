#!/usr/bin/env python3
"""
Lightweight, zero-external-dependency IMS NSUT Notices Scraper for background worker devices (Termux/Python 3).
"""

import os
import re
import json
import hashlib
import urllib.request
import time
from datetime import datetime, timezone

NOTIFICATIONS_URL = 'https://www.imsnsit.org/imsnsit/notifications.php'
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(WORKSPACE_DIR, 'data')
PUBLIC_DATA_DIR = os.path.join(WORKSPACE_DIR, 'public', 'data')
NOTICES_FILE = os.path.join(DATA_DIR, 'notices.json')
PUBLIC_NOTICES_FILE = os.path.join(PUBLIC_DATA_DIR, 'notices.json')
RECENT_NOTICES_FILE = os.path.join(PUBLIC_DATA_DIR, 'notices-recent.json')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

def generate_notice_id(title: str, published_date: str, department: str = '') -> str:
    norm_title = re.sub(r'\s+', ' ', (title or '').lower()).strip()
    norm_date = (published_date or '').strip()
    norm_dept = re.sub(r'\s+', ' ', (department or '').lower()).strip()
    payload = f"{norm_date}|{norm_title}|{norm_dept}".encode('utf-8')
    return hashlib.sha256(payload).hexdigest()[:16]

def parse_publisher_info(raw_text: str):
    cleaned = re.sub(r'Published By:\s*', '', raw_text, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r'^,\s*', '', cleaned)
    if not cleaned:
        return 'Administration', 'General'
    
    parts = [p.strip() for p in cleaned.split(',') if p.strip()]
    if len(parts) >= 2:
        department = parts[-1]
        publisher = ', '.join(parts[:-1])
        return publisher or 'Office', department
    elif len(parts) == 1:
        return parts[0], parts[0]
    return cleaned, 'General'

def parse_html_notices(html: str):
    notices = []
    now = datetime.now(timezone.utc).isoformat()
    
    # Extract table rows
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
    
    for row in rows:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
        if len(tds) >= 2:
            date_match = re.search(r'(\d{2}-\d{2}-\d{4})', tds[0])
            if date_match:
                published_date = date_match.group(1)
                is_new = 'newicon' in tds[0] or 'newicon' in row
                
                content_td = tds[1]
                link_match = re.search(r'<a\s+[^>]*href=[\'"]([^\'"]+)[\'"][^>]*>(.*?)</a>', content_td, re.DOTALL | re.IGNORECASE)
                
                title = ''
                attachment_url = None
                is_external_link = False
                
                if link_match:
                    raw_href = link_match.group(1).strip()
                    title_raw = link_match.group(2)
                    title = re.sub(r'<[^>]+>', '', title_raw).strip()
                    
                    if raw_href:
                        attachment_url = urllib.parse.urljoin(NOTIFICATIONS_URL, raw_href)
                        is_external_link = 'imsnsit.org' not in attachment_url
                else:
                    cleaned_content = re.sub(r'<font[^>]*>.*?</font>', '', content_td, flags=re.DOTALL | re.IGNORECASE)
                    title = re.sub(r'<[^>]+>', '', cleaned_content).strip()
                
                title = re.sub(r'\s+', ' ', title).strip()
                
                # Extract publisher info
                font_matches = re.findall(r'<font[^>]*>(.*?)</font>', content_td, re.DOTALL | re.IGNORECASE)
                font_publisher = font_matches[-1] if font_matches else ''
                publisher, department = parse_publisher_info(re.sub(r'<[^>]+>', '', font_publisher))
                
                if len(title) > 2:
                    nid = generate_notice_id(title, published_date, department)
                    notices.append({
                        'id': nid,
                        'title': title,
                        'publishedDate': published_date,
                        'publisher': publisher,
                        'department': department,
                        'attachmentUrl': attachment_url,
                        'isExternalLink': is_external_link,
                        'isNew': is_new,
                        'scrapedAt': now
                    })
                    
def fetch_live_notices():
    req = urllib.request.Request(NOTIFICATIONS_URL, headers=HEADERS)
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
            return parse_html_notices(html)
        except Exception as e:
            if attempt == 3:
                print(f"[Warning] Failed to fetch live notices from portal: {e}")
                return []
            time.sleep(2)
    return []

def main():
    existing_notices = []
    if os.path.exists(NOTICES_FILE):
        try:
            with open(NOTICES_FILE, 'r', encoding='utf-8') as f:
                existing_notices = json.load(f)
        except Exception:
            pass

    notice_map = {}
    for n in existing_notices:
        clean_id = generate_notice_id(n.get('title', ''), n.get('publishedDate', ''), n.get('department', ''))
        n['id'] = clean_id
        notice_map[clean_id] = n
    
    live_notices = fetch_live_notices()
    new_count = 0
    for n in live_notices:
        if n['id'] not in notice_map:
            new_count += 1
        notice_map[n['id']] = n

    def date_key(item):
        try:
            parts = item['publishedDate'].split('-')
            return datetime(int(parts[2]), int(parts[1]), int(parts[0])).timestamp()
        except Exception:
            return 0

    merged = sorted(notice_map.values(), key=date_key, reverse=True)

    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)

    with open(NOTICES_FILE, 'w', encoding='utf-8') as f:
        json.dump(merged, f, separators=(',', ':'))
        
    with open(PUBLIC_NOTICES_FILE, 'w', encoding='utf-8') as f:
        json.dump(merged, f, separators=(',', ':'))

    with open(RECENT_NOTICES_FILE, 'w', encoding='utf-8') as f:
        json.dump(merged[:1500], f, separators=(',', ':'))

    STATUS_FILE = os.path.join(DATA_DIR, 'last_sync_status.json')
    status_data = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'totalCount': len(merged),
        'newCount': new_count,
        'latestNotices': merged[:3] if merged else []
    }
    with open(STATUS_FILE, 'w', encoding='utf-8') as f:
        json.dump(status_data, f, indent=2)

    print(f"[Python Scraper] Cleaned & saved {len(merged)} unique notices ({new_count} new live notices added).")

if __name__ == '__main__':
    main()
