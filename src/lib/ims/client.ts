import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { AttendanceSubject, StudentProfile, AttendanceResponse } from './types';
import { calculateSubjectBunks, computeOverallAttendance } from './calculator';

const BASE_URL = 'https://www.imsnsit.org/imsnsit/';
// Step 1: visit student_login110.php (sets session cookies)
const LOGIN_INIT_URL = `${BASE_URL}student_login110.php`;
// Step 2: visit student_login.php (get CAPTCHA + HRAND_NUM)
const LOGIN_PAGE_URL = `${BASE_URL}student_login.php`;

export function getFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month <= 5) {
    const prevYear = year - 1;
    const shortCurrent = String(year % 100).padStart(2, '0');
    return `${prevYear}-${shortCurrent}`;
  }

  const shortNext = String((year + 1) % 100).padStart(2, '0');
  return `${year}-${shortNext}`;
}

export class ImsClient {
  public jar: CookieJar;
  public client: AxiosInstance;
  public hrandNum: string = '';
  public encFy: string = '';
  public comp: string = 'NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY';
  public fy: string = '';
  public t: string = 'swx';
  public profileUrl: string = '';
  public myActivitiesUrl: string = '';
  public logoutUrl: string = '';
  public allUrls: Record<string, string> = {};
  public semester: string = '';

  constructor(existingJar?: CookieJar) {
    this.jar = existingJar || new CookieJar();
    const instance = axios.create({
      timeout: 20000,
      maxRedirects: 10,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.119 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
      },
    });

    // Manual cookie management (Vercel edge doesn't support CookieJar wrapper reliably)
    instance.interceptors.request.use(async (config) => {
      const fullUrl = config.url?.startsWith('http')
        ? config.url
        : new URL(config.url || '', BASE_URL).toString();
      const cookieHeader = await this.jar.getCookieString(fullUrl);
      if (cookieHeader) {
        config.headers.set('Cookie', cookieHeader);
      }
      return config;
    });

    instance.interceptors.response.use(async (response) => {
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        const fullUrl = response.config.url?.startsWith('http')
          ? response.config.url
          : new URL(response.config.url || '', BASE_URL).toString();
        const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
        for (const cStr of cookieArray) {
          try {
            await this.jar.setCookie(cStr, fullUrl);
          } catch {
            // ignore malformed cookies
          }
        }
      }
      return response;
    });

    this.client = instance;
  }

  /**
   * Initializes session and retrieves CAPTCHA image + HRAND_NUM token.
   * Mirrors the reference Flutter app: student_login110.php → student_login.php
   */
  async getCaptchaAndTokens(): Promise<{
    captchaBase64: string;
    captchaBuffer: Buffer;
    hrandNum: string;
    encFy: string;
    comp: string;
    fy: string;
    t: string;
  }> {
    // Step 1: Hit student_login110.php to establish session cookies
    await this.client.get(LOGIN_INIT_URL, {
      headers: {
        Referer: BASE_URL,
        'Sec-Fetch-User': '?1',
      },
    });

    // Step 2: Load student_login.php to get CAPTCHA src and HRAND_NUM
    const loginRes = await this.client.get(LOGIN_PAGE_URL, {
      headers: { Referer: LOGIN_INIT_URL },
    });

    const $ = cheerio.load(loginRes.data || '');

    // Extract HRAND_NUM (critical – must not be empty)
    const hrand =
      $('#HRAND_NUM').attr('value') ||
      $('input[name="HRAND_NUM"]').attr('value') ||
      '';

    // Optional form fields (fallback to safe defaults)
    const encFyVal =
      $('#enc_fy').attr('value') ||
      $('input[name="enc_fy"]').attr('value') ||
      '';
    const compVal =
      $('#comp').attr('value') ||
      $('input[name="comp"]').attr('value') ||
      'NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY';
    const fyVal =
      $('#fy option:selected').attr('value') ||
      $('#fy option').eq(1).attr('value') ||
      getFinancialYear();
    const tVal =
      $('#t').attr('value') ||
      $('input[name="t"]').attr('value') ||
      'swx';

    const captchaImgSrc = $('#captchaimg').attr('src');

    if (!captchaImgSrc) {
      throw new Error('IMS portal login page did not return a CAPTCHA image. The portal may be down or the page structure changed.');
    }

    if (!hrand) {
      console.warn('[IMS] HRAND_NUM not found in login page – portal structure may have changed');
    }

    this.hrandNum = hrand;
    this.encFy = encFyVal;
    this.comp = compVal;
    this.fy = fyVal;
    this.t = tVal;

    const captchaFullUrl = new URL(captchaImgSrc, BASE_URL).toString();

    // Step 3: Download CAPTCHA Image
    const captchaRes = await this.client.get(captchaFullUrl, {
      responseType: 'arraybuffer',
      headers: { Referer: LOGIN_PAGE_URL },
    });

    const buffer = Buffer.from(captchaRes.data);
    const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;

    return {
      captchaBase64: base64,
      captchaBuffer: buffer,
      hrandNum: hrand,
      encFy: encFyVal,
      comp: compVal,
      fy: fyVal,
      t: tVal,
    };
  }

  /**
   * Authenticates with student credentials.
   * Mirrors reference app: POST to student_login.php with logintype=student
   */
  async authenticate(
    uid: string,
    pwd: string,
    captchaText: string,
    overrideTokens?: { hrandNum?: string; encFy?: string; comp?: string; fy?: string; t?: string }
  ): Promise<{ success: boolean; error?: string; status?: AttendanceResponse['status'] }> {
    const hrand = overrideTokens?.hrandNum ?? this.hrandNum;
    const comp = overrideTokens?.comp ?? this.comp;
    const fy = overrideTokens?.fy ?? this.fy ?? getFinancialYear();

    // POST body mirrors exactly what the reference Flutter app sends
    const postData = new URLSearchParams({
      f: '',
      uid,
      pwd,
      HRAND_NUM: hrand,
      fy,
      comp,
      cap: captchaText.trim(),
      logintype: 'student',
    });

    const response = await this.client.post(LOGIN_PAGE_URL, postData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': LOGIN_PAGE_URL,
        'Origin': 'https://www.imsnsit.org',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'frame',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
      },
    });

    const html = response.data || '';
    const $ = cheerio.load(html);

    // --- Error detection (mirrors reference app exactly) ---
    // Reference checks: "html body form table tbody tr td.plum_field font"
    const loginResultEls = $('html body form table tbody tr td.plum_field font');
    if (loginResultEls.length >= 2) {
      const loginResult = loginResultEls.eq(2).text();
      if (loginResult.includes('Invalid Security Number')) {
        return { success: false, error: 'Wrong CAPTCHA. Please try again.', status: 'WRONG_CAPTCHA' };
      }
      if (
        loginResult.includes('Invalid password') ||
        loginResult.includes('Your password does not match') ||
        loginResult.includes('not authorised') ||
        loginResult.includes('not authorized')
      ) {
        return { success: false, error: 'Invalid Roll Number or Password.', status: 'INVALID_CREDENTIALS' };
      }
    }

    // Fallback: scan all red font errors
    const redErrors: string[] = [];
    $('font[color="red"], font[color="RED"], font[color=red]').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && !text.toLowerCase().includes('please do not share your password')) {
        redErrors.push(text);
      }
    });

    const errorText = redErrors.join(' ').trim();
    const errorTextLower = errorText.toLowerCase();

    if (errorTextLower.includes('invalid security number') || errorTextLower.includes('please enter captcha')) {
      return { success: false, error: 'Wrong CAPTCHA. Please try again.', status: 'WRONG_CAPTCHA' };
    }

    if (
      errorTextLower.includes('invalid password') ||
      errorTextLower.includes('not authorised') ||
      errorTextLower.includes('not authorized') ||
      errorTextLower.includes('invalid user') ||
      errorTextLower.includes('please enter userid') ||
      errorTextLower.includes('please enter password')
    ) {
      return { success: false, error: errorText || 'Invalid Roll Number or Password.', status: 'INVALID_CREDENTIALS' };
    }

    if (errorText.length > 0) {
      return { success: false, error: errorText, status: 'INVALID_CREDENTIALS' };
    }

    // Check if we're still on the login form (not authenticated)
    if ($('input[name="uid"]').length > 0 && !html.includes('My Activities') && !html.includes('My Profile')) {
      return { success: false, error: 'Login failed. Check your credentials on the official IMS portal.', status: 'INVALID_CREDENTIALS' };
    }

    // --- Extract navigation URLs (mirrors reference app) ---
    $('a').each((_, elem) => {
      const text = $(elem).text().trim();
      const href = $(elem).attr('href');
      if (href) {
        if (text === 'My Profile') this.profileUrl = href;
        if (text === 'My Activities') this.myActivitiesUrl = href;
        if (text === 'Logout') this.logoutUrl = href;
      }
    });

    // Fallback: openURL() JS calls
    const openUrlMatches = html.match(/openURL\(['"]([^'"]+)['"]/g);
    if (openUrlMatches) {
      for (const m of openUrlMatches) {
        const urlMatch = m.match(/openURL\(['"]([^'"]+)['"]/);
        if (urlMatch?.[1]) {
          const u = urlMatch[1];
          if (u.includes('profile') && !this.profileUrl) this.profileUrl = u;
          if ((u.includes('activities') || u.includes('student')) && !this.myActivitiesUrl) this.myActivitiesUrl = u;
        }
      }
    }

    await this.extractActivityUrls();

    return { success: true, status: 'AUTHENTICATED' };
  }

  /**
   * Fetches all sub-navigation URLs from the My Activities page.
   * Mirrors reference app cleanUrlKey logic.
   */
  async extractActivityUrls(): Promise<void> {
    if (!this.myActivitiesUrl) return;
    try {
      const targetUrl = new URL(this.myActivitiesUrl, BASE_URL).toString();
      const res = await this.client.get(targetUrl, {
        headers: { Referer: LOGIN_PAGE_URL },
      });
      const $ = cheerio.load(res.data || '');

      $('a').each((_, elem) => {
        const rawText = $(elem).text().trim();
        const href = $(elem).attr('href');
        if (href && href !== '#') {
          // mirrors Flutter's cleanUrlKey: lowercase, remove non-alphanumeric
          const key = rawText.toLowerCase().replace(/[^a-z0-9]/g, '');
          this.allUrls[key] = href;
        }
      });
    } catch (err) {
      console.error('[IMS] extractActivityUrls failed:', err);
    }
  }

  /**
   * Fetches enrolled courses and parses semester number.
   */
  async getEnrolledCourses(): Promise<Record<string, { subjectName: string; credits?: string }>> {
    const coursesUrl = this.allUrls['currentsemcoursesregistered'];
    if (!coursesUrl) return {};

    try {
      const targetUrl = new URL(coursesUrl, BASE_URL).toString();
      const res = await this.client.get(targetUrl, {
        headers: { Referer: this.myActivitiesUrl || LOGIN_PAGE_URL },
      });
      const $ = cheerio.load(res.data || '');

      // Parse semester from div2 heading
      const divHead = $('html body div#div2.plum_head').text();
      const semMatch = divHead.match(/Semester\s+(\d+|[A-Za-z]+)/i);
      if (semMatch) {
        this.semester = semMatch[1];
      }

      const coursesMap: Record<string, { subjectName: string; credits?: string }> = {};
      // Reference: rows from index 2 onward, cols: [1]=code, [2]=name, [6]=credits
      $('table tr').each((i, row) => {
        if (i < 2) return;
        const tds = $(row).find('td');
        if (tds.length >= 7) {
          const code = $(tds[1]).text().trim();
          const name = $(tds[2]).text().trim();
          const credits = $(tds[6]).text().trim();
          if (code) {
            coursesMap[code] = { subjectName: name, credits };
          }
        }
      });

      return coursesMap;
    } catch (err) {
      console.error('[IMS] getEnrolledCourses failed:', err);
      return {};
    }
  }

  /**
   * Scrapes student profile information.
   */
  async getProfile(): Promise<StudentProfile | undefined> {
    if (!this.profileUrl) return undefined;
    try {
      const targetUrl = new URL(this.profileUrl, BASE_URL).toString();
      const res = await this.client.get(targetUrl, {
        headers: { Referer: LOGIN_PAGE_URL },
      });
      const $ = cheerio.load(res.data || '');

      let name = '';
      let rollNumber = '';
      let program = '';
      const semester = this.semester;

      // Reference: parseProfileData iterates .plum_fieldbig with th+td pairs
      $('.plum_fieldbig tr').each((_, tr) => {
        const th = $(tr).find('th').text().trim();
        const tds = $(tr).find('td');
        const td = tds.last().text().trim();

        if (th.includes('Name') || th === '') {
          if (tds.length === 2 && !name) name = td;
        }
        if (th.includes('Roll') || th.includes('Enrollment')) {
          rollNumber = td;
        }
        if (th.includes('Degree') || th.includes('Branch') || th.includes('Program') || th.includes('Course')) {
          program = td;
        }
      });

      // Fallback: scan th/td pairs
      if (!name) {
        $('th, td').each((_, el) => {
          const text = $(el).text().trim();
          if (!name && text && text.length > 3 && text.length < 80 && /^[A-Z][a-z]/.test(text)) {
            name = text;
          }
        });
      }

      return {
        name: name || 'Student',
        rollNumber: rollNumber || '',
        program: program || 'B.Tech',
        semester: semester || 'Current',
      };
    } catch (err) {
      console.error('[IMS] getProfile failed:', err);
      return undefined;
    }
  }

  /**
   * Scrapes student attendance table.
   * Mirrors reference app getAttandanceData() exactly.
   */
  async scrapeAttendance(uid: string): Promise<AttendanceResponse> {
    const attendanceUrl = this.allUrls['myattendance'];
    if (!attendanceUrl) {
      // Debug: log all available keys to help diagnose
      console.error('[IMS] Available allUrls keys:', Object.keys(this.allUrls));
      return { success: false, error: 'Attendance module not found. Please ensure your IMS account has access to attendance data.' };
    }

    const targetUrl = new URL(attendanceUrl, BASE_URL).toString();

    // Step 1: GET the attendance page to extract form tokens
    const initRes = await this.client.get(targetUrl, {
      headers: { Referer: this.myActivitiesUrl || LOGIN_PAGE_URL },
    });

    const $init = cheerio.load(initRes.data || '');
    const encYear = $init('#enc_year').attr('value') || '';
    const encSem = $init('#enc_sem').attr('value') || '';
    const recentitycode = $init('[name=recentitycode]').attr('value') || uid;
    const dept = $init('[name=dept]').attr('value') || '';
    const degree = $init('[name=degree]').attr('value') || '';

    // Step 2: Fetch enrolled courses (also sets this.semester)
    const coursesMap = await this.getEnrolledCourses();

    // Step 3: POST attendance form (mirrors reference app exactly)
    const postData = new URLSearchParams({
      year: getFinancialYear(),
      enc_year: encYear,
      sem: this.semester || '1',
      enc_sem: encSem,
      submit: 'Submit',
      recentitycode,
      dept,
      degree,
      ename: '',
      ecode: '',
    });

    const attRes = await this.client.post(targetUrl, postData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': targetUrl,
      },
    });

    const $ = cheerio.load(attRes.data || '');

    // --- Parse attendance table (mirrors parseAttandanceData in reference app) ---
    // Subject codes are in the 3rd .plum_head row (index 2), all tds after the first
    const plumHeadRows = $('html body div#myreport table.plum_fieldbig tbody tr.plum_head');
    const subjectsList: string[] = [];

    if (plumHeadRows.length >= 3) {
      $(plumHeadRows[2])
        .find('td')
        .each((i, td) => {
          if (i === 0) return; // skip label column
          const code = $(td).text().trim();
          if (code) subjectsList.push(code);
        });
    }

    // --- Parse daily attendance data (mirrors parseAbsoluteAttandanceData) ---
    const dailyData: Record<string, Record<string, string>> = {};
    for (const code of subjectsList) {
      dailyData[code] = {};
    }

    const allRows = $('html body div#myreport table.plum_fieldbig tbody tr');
    allRows.each((_, tr) => {
      // Only rows without a class attribute are data rows (daily rows)
      if (!$(tr).attr('class')) {
        const tds = $(tr).find('td');
        if (tds.length > 2) {
          const day = $(tds[0]).text().trim();
          tds.each((i, td) => {
            if (i === 0) return;
            const code = subjectsList[i - 1];
            const val = $(td).text().trim();
            if (code && val) {
              dailyData[code][day] = val;
            }
          });
        }
      }
    });

    // --- Parse summary rows: last 4 .plum_head rows ---
    const summaryRows = plumHeadRows.slice(-4);
    const stats: Record<string, Record<string, string>> = {};
    for (const code of subjectsList) {
      stats[code] = {};
    }

    summaryRows.each((_, tr) => {
      const cells = $(tr).find('td, th');
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim().toLowerCase();
        cells.each((idx, cell) => {
          if (idx === 0) return;
          const code = subjectsList[idx - 1];
          if (code && stats[code]) {
            stats[code][label] = $(cell).text().trim();
          }
        });
      }
    });

    // --- Build subjects array ---
    const subjects: AttendanceSubject[] = [];
    for (const code of subjectsList) {
      const course = coursesMap[code];
      const data = stats[code] || {};
      const daily = dailyData[code] || {};

      let totalHeld = 0;
      let attended = 0;

      for (const [k, v] of Object.entries(data)) {
        const num = parseInt(v, 10);
        if (!isNaN(num)) {
          if (k.includes('held') || k.includes('total')) totalHeld = num;
          if (k.includes('attend') || k.includes('present')) attended = num;
        }
      }

      const { percentage, status, bunkableClasses, requiredClasses } = calculateSubjectBunks(attended, totalHeld);

      subjects.push({
        subjectCode: code,
        subjectName: course?.subjectName || code,
        credits: course?.credits,
        totalHeld,
        attended,
        percentage,
        status,
        bunkableClasses,
        requiredClasses,
        dailyAttendance: daily,
      });
    }

    const overall = computeOverallAttendance(subjects);
    const profile = await this.getProfile();

    return {
      success: true,
      profile,
      subjects,
      overallPercentage: overall.overallPercentage,
      totalHeld: overall.totalHeld,
      totalAttended: overall.totalAttended,
      lastUpdated: new Date().toISOString(),
      status: 'AUTHENTICATED',
    };
  }
}
