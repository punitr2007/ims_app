import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { AttendanceSubject, StudentProfile, AttendanceResponse } from './types';
import { calculateSubjectBunks, computeOverallAttendance } from './calculator';

const BASE_URL = 'https://www.imsnsit.org/imsnsit/';
const LOGIN_URL = `${BASE_URL}student_login.php`;
const LOGIN_INIT_URL = `${BASE_URL}student_login110.php`;

export function getFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed

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
  public profileUrl: string = '';
  public myActivitiesUrl: string = '';
  public allUrls: Record<string, string> = {};
  public semester: string = '';

  constructor(existingJar?: CookieJar) {
    this.jar = existingJar || new CookieJar();
    this.client = wrapper(
      axios.create({
        jar: this.jar,
        withCredentials: true,
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
        },
      })
    );
  }

  /**
   * Initializes session and retrieves CAPTCHA image + HRAND_NUM
   */
  async getCaptchaAndTokens(): Promise<{ captchaBase64: string; captchaBuffer: Buffer; hrandNum: string }> {
    // 1. Visit banner/login110
    await this.client.get(LOGIN_INIT_URL, {
      headers: { Referer: BASE_URL },
    });

    // 2. Visit main login frame
    const loginRes = await this.client.get(LOGIN_URL, {
      headers: { Referer: BASE_URL },
    });

    const $ = cheerio.load(loginRes.data);
    const captchaImgSrc = $('#captchaimg').attr('src');
    const hrand = $('#HRAND_NUM').attr('value') || $('input[name="HRAND_NUM"]').attr('value') || '';

    this.hrandNum = hrand;

    if (!captchaImgSrc) {
      throw new Error('Failed to locate CAPTCHA image element on login page.');
    }

    const captchaFullUrl = new URL(captchaImgSrc, BASE_URL).toString();

    // 3. Download CAPTCHA Image
    const captchaRes = await this.client.get(captchaFullUrl, {
      responseType: 'arraybuffer',
      headers: { Referer: LOGIN_URL },
    });

    const buffer = Buffer.from(captchaRes.data);
    const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;

    return {
      captchaBase64: base64,
      captchaBuffer: buffer,
      hrandNum: hrand,
    };
  }

  /**
   * Authenticates with student credentials
   */
  async authenticate(
    uid: string,
    pwd: string,
    captchaText: string,
    overrideHrand?: string
  ): Promise<{ success: boolean; error?: string; status?: AttendanceResponse['status'] }> {
    const hrand = overrideHrand || this.hrandNum;
    const fy = getFinancialYear();

    const postData = new URLSearchParams({
      f: '',
      uid,
      pwd,
      HRAND_NUM: hrand,
      fy,
      comp: 'NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY',
      cap: captchaText.trim(),
      logintype: 'student',
    });

    const response = await this.client.post(LOGIN_URL, postData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': LOGIN_URL,
        'Origin': 'https://www.imsnsit.org',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Check for login errors
    const errorFont = $('td.plum_field font, font[color="red"]').text();
    if (html.includes('Invalid Security Number') || errorFont.includes('Invalid Security Number')) {
      return { success: false, error: 'Wrong CAPTCHA. Please try again.', status: 'WRONG_CAPTCHA' };
    }
    if (
      html.includes('Invalid password') ||
      html.includes('Your password does not match') ||
      html.includes('Invalid User')
    ) {
      return { success: false, error: 'Invalid Roll Number or Password.', status: 'INVALID_CREDENTIALS' };
    }

    // Extract navigation links
    $('a').each((_, elem) => {
      const text = $(elem).text().trim();
      const href = $(elem).attr('href');
      if (href) {
        if (text === 'My Profile') this.profileUrl = href;
        if (text === 'My Activities') this.myActivitiesUrl = href;
      }
    });

    if (!this.myActivitiesUrl && !this.profileUrl) {
      // If links were not found in body, check frame sources
      return { success: false, error: 'Failed to parse session navigation.', status: 'SERVER_ERROR' };
    }

    // Extract all activity URLs
    await this.extractActivityUrls();

    return { success: true, status: 'AUTHENTICATED' };
  }

  async extractActivityUrls(): Promise<void> {
    if (!this.myActivitiesUrl) return;
    const res = await this.client.get(this.myActivitiesUrl, {
      headers: { Referer: LOGIN_URL },
    });
    const $ = cheerio.load(res.data);

    $('a').each((_, elem) => {
      const text = $(elem).text().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const href = $(elem).attr('href');
      if (href && href !== '#') {
        this.allUrls[text] = href;
      }
    });
  }

  /**
   * Fetches Enrolled Courses map (code -> course details)
   */
  async getEnrolledCourses(): Promise<Record<string, { subjectName: string; credits?: string }>> {
    const coursesUrl = this.allUrls['currentsemcoursesregistered'];
    if (!coursesUrl) return {};

    try {
      const res = await this.client.get(coursesUrl, {
        headers: { Referer: this.myActivitiesUrl },
      });
      const $ = cheerio.load(res.data);

      const divHead = $('div#div2.plum_head').text();
      const semMatch = divHead.match(/Semester\s+(\d+|[A-Za-z]+)/i);
      if (semMatch) {
        this.semester = semMatch[1];
      }

      const coursesMap: Record<string, { subjectName: string; credits?: string }> = {};
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
    } catch {
      return {};
    }
  }

  /**
   * Scrapes student profile information
   */
  async getProfile(): Promise<StudentProfile | undefined> {
    if (!this.profileUrl) return undefined;
    try {
      const res = await this.client.get(this.profileUrl, {
        headers: { Referer: LOGIN_URL },
      });
      const $ = cheerio.load(res.data);

      let name = '';
      let rollNumber = '';
      let program = '';
      let semester = this.semester;

      $('.plum_fieldbig tr').each((_, tr) => {
        const th = $(tr).find('th').text().trim();
        const td = $(tr).find('td').text().trim();

        if (th.includes('Name') || td.includes('Name')) {
          name = td || $(tr).find('td').last().text().trim();
        }
        if (th.includes('Roll') || td.includes('Roll')) {
          rollNumber = td || $(tr).find('td').last().text().trim();
        }
        if (th.includes('Degree') || th.includes('Branch') || th.includes('Program')) {
          program = td;
        }
      });

      return {
        name: name || 'Student',
        rollNumber: rollNumber || '',
        program: program || 'B.Tech',
        semester: semester || 'Current',
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Scrapes student attendance table
   */
  async scrapeAttendance(uid: string): Promise<AttendanceResponse> {
    const attendanceUrl = this.allUrls['myattendance'];
    if (!attendanceUrl) {
      return { success: false, error: 'Attendance module URL not available.' };
    }

    const initRes = await this.client.get(attendanceUrl, {
      headers: { Referer: this.myActivitiesUrl },
    });

    const $init = cheerio.load(initRes.data);
    const encYear = $init('#enc_year').attr('value') || '';
    const encSem = $init('#enc_sem').attr('value') || '';
    const recentitycode = $init('[name=recentitycode]').attr('value') || uid;
    const dept = $init('[name=dept]').attr('value') || '';
    const degree = $init('[name=degree]').attr('value') || '';

    const coursesMap = await this.getEnrolledCourses();

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

    const attRes = await this.client.post(attendanceUrl, postData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': attendanceUrl,
      },
    });

    const $ = cheerio.load(attRes.data);

    // Subject codes from table header
    const subjectHeaders = $('div#myreport table.plum_fieldbig tr.plum_head');
    const subjectsList: string[] = [];

    if (subjectHeaders.length >= 3) {
      $(subjectHeaders[2])
        .find('td')
        .slice(1)
        .each((_, td) => {
          const code = $(td).text().trim();
          if (code) subjectsList.push(code);
        });
    }

    // Extract summary rows (Total, Present, Percentage)
    const summaryRows = subjectHeaders.slice(-4);
    const stats: Record<string, Record<string, string>> = {};
    for (const code of subjectsList) {
      stats[code] = {};
    }

    summaryRows.each((_, tr) => {
      const cells = $(tr).find('td, th');
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim().toLowerCase();
        cells.slice(1).each((idx, cell) => {
          const code = subjectsList[idx];
          if (code && stats[code]) {
            stats[code][label] = $(cell).text().trim();
          }
        });
      }
    });

    const subjects: AttendanceSubject[] = [];
    for (const code of subjectsList) {
      const course = coursesMap[code];
      const data = stats[code] || {};

      // Match keys like "total class held", "classes attended", etc.
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
