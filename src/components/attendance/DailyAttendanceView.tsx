'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Filter,
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
  Sparkles,
  CalendarDays,
  Coffee,
  AlertOctagon,
} from 'lucide-react';
import clsx from 'clsx';

export type AttendanceRecordStatus =
  | 'present'
  | 'absent'
  | 'holiday'
  | 'cancelled'
  | 'rescheduled_present'
  | 'rescheduled_absent'
  | 'other';

export interface ParsedDailyRecord {
  id: string;
  rawDate: string;
  cleanDate: string;
  formattedDate: string;
  dayOfWeek: string;
  monthName: string;
  lectureSlot?: string;
  status: AttendanceRecordStatus;
  rawVal: string;
  statusLabel: string;
  dateTimestamp: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTHS: Record<string, string> = {
  jan: 'January', feb: 'February', mar: 'March', apr: 'April',
  may: 'May', jun: 'June', jul: 'July', aug: 'August',
  sep: 'September', oct: 'October', nov: 'November', dec: 'December',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Calculates day of the week using Zeller's Congruence (Modulo-7 arithmetic):
 * h = (q + floor(13*(m+1)/5) + K + floor(K/4) + floor(J/4) - 2*J) mod 7
 * where January and February are treated as months 13 and 14 of the preceding year.
 * Returns: 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
 */
export function getZellerDayOfWeek(day: number, month1Indexed: number, year: number): string {
  let m = month1Indexed;
  let y = year;
  if (m < 3) {
    m += 12;
    y -= 1;
  }
  const q = day;
  const K = y % 100;
  const J = Math.floor(y / 100);
  const rawH = (q + Math.floor((13 * (m + 1)) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) - 2 * J) % 7;
  const h = (rawH + 7) % 7;
  const zellerDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  return zellerDays[h];
}

/**
 * Parses a raw date string from IMS NSUT into structured date components.
 * Supports:
 * - "Jul-28", "Aug-03", "Sep-09" (Month-Day)
 * - "28-Jul", "03-Aug" (Day-Month)
 * - "24-09-2026", "24/09/2026 (L2)" (Day-Month-Year)
 * - "2026-07-28" (ISO)
 */
function parseImsDate(rawDate: string, index: number): {
  cleanDate: string;
  formattedDate: string;
  dayOfWeek: string;
  monthName: string;
  lectureSlot?: string;
  timestamp: number;
} {
  let datePart = rawDate.trim();
  let lectureSlot: string | undefined;

  // Extract lecture slots like (L2), (L1), etc.
  const slotMatch = datePart.match(/\((L\d+)\)/i);
  if (slotMatch) {
    lectureSlot = slotMatch[1].toUpperCase();
    datePart = datePart.replace(/\((L\d+)\)/i, '').trim();
  }

  // Common separators: "-", "/", ".", or spaces
  const parts = datePart.split(/[-/.\s]+/).filter(Boolean);

  let day = 1;
  let month = 7; // default July
  let year = 2026;
  let parsedSuccessfully = false;

  if (parts.length >= 2) {
    const p0 = parts[0].trim().toLowerCase();
    const p1 = parts[1].trim().toLowerCase();
    const p2 = parts[2] ? parts[2].trim() : undefined;

    // Check if parts[0] is month name (e.g., 'Jul-28')
    const m0 = MONTH_MAP[p0.slice(0, 3)] || MONTH_MAP[p0];
    // Check if parts[1] is month name (e.g., '28-Jul')
    const m1 = MONTH_MAP[p1.slice(0, 3)] || MONTH_MAP[p1];

    if (m0 && !isNaN(parseInt(p1, 10))) {
      month = m0;
      day = parseInt(p1, 10);
      if (p2 && !isNaN(parseInt(p2, 10))) {
        const yVal = parseInt(p2, 10);
        year = yVal < 100 ? 2000 + yVal : yVal;
      }
      parsedSuccessfully = true;
    } else if (m1 && !isNaN(parseInt(p0, 10))) {
      day = parseInt(p0, 10);
      month = m1;
      if (p2 && !isNaN(parseInt(p2, 10))) {
        const yVal = parseInt(p2, 10);
        year = yVal < 100 ? 2000 + yVal : yVal;
      }
      parsedSuccessfully = true;
    } else if (!isNaN(parseInt(p0, 10)) && !isNaN(parseInt(p1, 10))) {
      const n0 = parseInt(p0, 10);
      const n1 = parseInt(p1, 10);
      const n2 = p2 ? parseInt(p2, 10) : 2026;

      if (n0 > 1000) {
        // YYYY-MM-DD
        year = n0;
        month = n1;
        day = n2;
      } else if (n0 > 12) {
        // DD-MM-YYYY
        day = n0;
        month = n1;
        year = n2 < 100 ? 2000 + n2 : n2;
      } else if (n1 > 12) {
        // MM-DD-YYYY
        month = n0;
        day = n1;
        year = n2 < 100 ? 2000 + n2 : n2;
      } else {
        // Default DD-MM
        day = n0;
        month = n1;
        year = n2 < 100 ? 2000 + n2 : n2;
      }
      parsedSuccessfully = true;
    }
  }

  if (parsedSuccessfully && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    const dayOfWeek = getZellerDayOfWeek(day, month, year);
    const monthShort = MONTH_NAMES[month - 1];
    const dayPad = day < 10 ? `0${day}` : `${day}`;
    const formattedDate = `${dayPad} ${monthShort} ${year}`;
    const monthName = FULL_MONTHS[monthShort.toLowerCase()] || monthShort;
    const d = new Date(year, month - 1, day);

    return {
      cleanDate: datePart,
      formattedDate,
      dayOfWeek,
      monthName,
      lectureSlot,
      timestamp: d.getTime() + index, // index preserves original order for same-day
    };
  }

  // Fallback for unparseable formats
  return {
    cleanDate: rawDate,
    formattedDate: rawDate,
    dayOfWeek: 'Class Day',
    monthName: 'Semester',
    lectureSlot,
    timestamp: Date.now() - index * 86400000,
  };
}

/**
 * Normalizes attendance status values from IMS NSUT.
 */
function classifyStatus(rawVal: unknown): {
  status: AttendanceRecordStatus;
  statusLabel: string;
} {
  if (rawVal === null || rawVal === undefined) {
    return { status: 'other', statusLabel: 'Not Recorded' };
  }
  const s = String(rawVal).replace(/\u00a0/g, ' ').trim().toUpperCase();
  if (!s) return { status: 'other', statusLabel: 'Not Recorded' };

  // 1. Gazetted / Restricted Holidays
  if (s === 'GH' || s.startsWith('GH') || s.includes('HOLIDAY') || s === 'RH') {
    return { status: 'holiday', statusLabel: 'Holiday (GH)' };
  }

  // 2. Class Suspended / Cancelled
  if (s === 'CS' || s.startsWith('CS') || s.includes('SUSPEND') || s.includes('CANCEL')) {
    return { status: 'cancelled', statusLabel: 'Cancelled (CS)' };
  }

  // 3. Rescheduled Classes with Present / Absent
  if (s.includes('CR') && (s.includes('1') || s.includes('P') || s.startsWith('1'))) {
    return { status: 'rescheduled_present', statusLabel: 'Present (CR)' };
  }
  if (s.includes('CR') && (s.includes('0') || s.includes('A') || s.startsWith('0'))) {
    return { status: 'rescheduled_absent', statusLabel: 'Absent (CR)' };
  }
  if (s === 'CR' || s.startsWith('CR')) {
    return { status: 'cancelled', statusLabel: 'Rescheduled (CR)' };
  }

  // 4. Standard Present
  if (
    s === '1' ||
    s === 'P' ||
    s === 'PR' ||
    s.startsWith('PRES') ||
    s.startsWith('ATT') ||
    s === 'YES' ||
    s === 'TRUE'
  ) {
    return { status: 'present', statusLabel: 'Present' };
  }

  // 5. Standard Absent
  if (
    s === '0' ||
    s === 'A' ||
    s === 'AB' ||
    s.startsWith('ABS') ||
    s === 'NO' ||
    s === 'FALSE'
  ) {
    return { status: 'absent', statusLabel: 'Absent' };
  }

  if (s.includes('1')) {
    return { status: 'present', statusLabel: 'Present' };
  }
  if (s.includes('0')) {
    return { status: 'absent', statusLabel: 'Absent' };
  }

  return { status: 'other', statusLabel: s };
}

interface DailyAttendanceViewProps {
  dailyAttendance: Record<string, string>;
  totalHeld: number;
  attended: number;
}

export function DailyAttendanceView({
  dailyAttendance,
  totalHeld,
  attended,
}: DailyAttendanceViewProps) {
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'other'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'timeline' | 'matrix'>('timeline');

  // Parse and normalize all daily records
  const allRecords: ParsedDailyRecord[] = useMemo(() => {
    const rawEntries = Object.entries(dailyAttendance || {});
    return rawEntries.map(([rawDate, rawVal], idx) => {
      const parsedDate = parseImsDate(rawDate, idx);
      const { status, statusLabel } = classifyStatus(rawVal);

      return {
        id: `${rawDate}-${idx}`,
        rawDate,
        cleanDate: parsedDate.cleanDate,
        formattedDate: parsedDate.formattedDate,
        dayOfWeek: parsedDate.dayOfWeek,
        monthName: parsedDate.monthName,
        lectureSlot: parsedDate.lectureSlot,
        status,
        rawVal,
        statusLabel,
        dateTimestamp: parsedDate.timestamp,
      };
    });
  }, [dailyAttendance]);

  // Aggregate counts
  const counts = useMemo(() => {
    let p = 0;
    let a = 0;
    let o = 0;
    for (const r of allRecords) {
      if (r.status === 'present' || r.status === 'rescheduled_present') p++;
      else if (r.status === 'absent' || r.status === 'rescheduled_absent') a++;
      else o++;
    }
    return { present: p, absent: a, other: o, total: allRecords.length };
  }, [allRecords]);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let res = allRecords.filter((r) => {
      if (filter === 'present') {
        return r.status === 'present' || r.status === 'rescheduled_present';
      }
      if (filter === 'absent') {
        return r.status === 'absent' || r.status === 'rescheduled_absent';
      }
      if (filter === 'other') {
        return r.status === 'holiday' || r.status === 'cancelled' || r.status === 'other';
      }
      return true;
    });

    res = [...res].sort((a, b) => {
      return sortOrder === 'newest'
        ? b.dateTimestamp - a.dateTimestamp
        : a.dateTimestamp - b.dateTimestamp;
    });

    return res;
  }, [allRecords, filter, sortOrder]);

  if (allRecords.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-center text-xs text-slate-400">
        <CalendarDays className="w-5 h-5 text-slate-500 mx-auto mb-1.5" />
        No individual lecture dates recorded yet by the department for this course. Total classes held: {totalHeld}.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top Controls: Filter Pills & View Mode */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 text-xs">
        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={clsx(
              'px-2.5 py-1 rounded-xl font-medium transition-all shrink-0 active:scale-95 text-[11px]',
              filter === 'all'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25 font-bold'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
            )}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter('present')}
            className={clsx(
              'px-2.5 py-1 rounded-xl font-medium transition-all shrink-0 active:scale-95 text-[11px] flex items-center gap-1',
              filter === 'present'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25 font-bold'
                : 'bg-emerald-950/30 text-emerald-300 hover:text-white border border-emerald-800/30'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Present ({counts.present})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('absent')}
            className={clsx(
              'px-2.5 py-1 rounded-xl font-medium transition-all shrink-0 active:scale-95 text-[11px] flex items-center gap-1',
              filter === 'absent'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/25 font-bold'
                : 'bg-rose-950/30 text-rose-300 hover:text-white border border-rose-800/30'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Absent ({counts.absent})</span>
          </button>
          {counts.other > 0 && (
            <button
              type="button"
              onClick={() => setFilter('other')}
              className={clsx(
                'px-2.5 py-1 rounded-xl font-medium transition-all shrink-0 active:scale-95 text-[11px]',
                filter === 'other'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/25 font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
              )}
            >
              Holidays/Suspended ({counts.other})
            </button>
          )}
        </div>

        {/* Sort & Layout Toggle */}
        <div className="flex items-center gap-1.5 self-end xs:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSortOrder((p) => (p === 'newest' ? 'oldest' : 'newest'))}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white text-[11px] font-medium transition-all active:scale-95"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3 h-3 text-brand-400" />
            <span>{sortOrder === 'newest' ? 'Latest First' : 'Oldest First'}</span>
          </button>

          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={clsx(
                'p-1 rounded-lg transition-all',
                viewMode === 'timeline' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              )}
              title="Timeline List View"
              aria-label="Timeline List View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={clsx(
                'p-1 rounded-lg transition-all',
                viewMode === 'matrix' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              )}
              title="Clean Day Grid View"
              aria-label="Clean Day Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mode A: Clean Timeline List View (Default & Most Readable on Mobile) */}
      {viewMode === 'timeline' && (
        <div className="space-y-1.5 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
          {filteredRecords.map((item) => {
            const isPresent = item.status === 'present' || item.status === 'rescheduled_present';
            const isAbsent = item.status === 'absent' || item.status === 'rescheduled_absent';
            const isHoliday = item.status === 'holiday';
            const isCancelled = item.status === 'cancelled';

            return (
              <div
                key={item.id}
                className={clsx(
                  'flex items-center justify-between p-2.5 rounded-2xl border transition-all text-xs',
                  isPresent && 'bg-emerald-950/20 border-emerald-800/30 hover:border-emerald-700/50',
                  isAbsent && 'bg-rose-950/20 border-rose-800/30 hover:border-rose-700/50',
                  (isHoliday || isCancelled) && 'bg-slate-900/50 border-white/5 hover:border-white/10',
                  item.status === 'other' && 'bg-slate-900/40 border-white/5'
                )}
              >
                {/* Left: Date & Day & Slot */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border font-mono font-bold text-xs',
                      isPresent && 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                      isAbsent && 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                      isHoliday && 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                      isCancelled && 'bg-slate-800 text-slate-400 border-white/10',
                      item.status === 'other' && 'bg-slate-800 text-slate-400 border-white/10'
                    )}
                  >
                    {isPresent ? 'P' : isAbsent ? 'A' : isHoliday ? 'GH' : isCancelled ? 'CS' : '—'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs sm:text-sm tracking-tight">
                        {item.cleanDate}
                      </span>
                      {/* Day of the week alongside the date */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-brand-500/15 text-brand-300 border border-brand-500/25">
                        {item.dayOfWeek}
                      </span>
                      {item.lectureSlot && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-white/10">
                          {item.lectureSlot}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                      {item.formattedDate} • {item.lectureSlot ? `Lecture Slot (${item.lectureSlot})` : 'Scheduled Lecture Session'}
                    </span>
                  </div>
                </div>

                {/* Right: Status Pill */}
                <div className="shrink-0 ml-2">
                  <span
                    className={clsx(
                      'px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 border',
                      isPresent &&
                        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/10',
                      isAbsent &&
                        'bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-500/10',
                      isHoliday && 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      isCancelled && 'bg-slate-800/80 text-slate-300 border-white/10',
                      item.status === 'other' && 'bg-slate-800 text-slate-400 border-white/5'
                    )}
                  >
                    {isPresent && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {isAbsent && <XCircle className="w-3 h-3 text-rose-400" />}
                    {isHoliday && <Coffee className="w-3 h-3 text-amber-400" />}
                    {isCancelled && <AlertOctagon className="w-3 h-3 text-slate-400" />}
                    <span>{item.statusLabel}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mode B: Clean Day Matrix Grid (No Ellipses, Full Legibility) */}
      {viewMode === 'matrix' && (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
          {filteredRecords.map((item) => {
            const isPresent = item.status === 'present' || item.status === 'rescheduled_present';
            const isAbsent = item.status === 'absent' || item.status === 'rescheduled_absent';
            const isHoliday = item.status === 'holiday';
            const isCancelled = item.status === 'cancelled';

            return (
              <div
                key={item.id}
                title={`${item.cleanDate}: ${item.statusLabel}`}
                className={clsx(
                  'p-2.5 rounded-2xl border flex flex-col justify-between transition-all gap-1.5',
                  isPresent &&
                    'bg-emerald-950/25 border-emerald-800/35 text-emerald-200 shadow-sm shadow-emerald-950/40',
                  isAbsent &&
                    'bg-rose-950/25 border-rose-800/35 text-rose-200 shadow-sm shadow-rose-950/40',
                  (isHoliday || isCancelled) && 'bg-slate-900/60 border-white/5 text-slate-300',
                  item.status === 'other' && 'bg-slate-900/40 border-white/5 text-slate-400'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-white tracking-tight truncate">
                    {item.formattedDate.replace(/ \d{4}$/, '')}
                  </span>
                  {item.lectureSlot && (
                    <span className="text-[9px] font-mono font-bold text-brand-300 bg-brand-500/20 px-1 rounded">
                      {item.lectureSlot}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-brand-300 font-semibold truncate">
                    {item.dayOfWeek.slice(0, 3)}
                  </span>
                  <span
                    className={clsx(
                      'text-xs font-black font-mono px-2 py-0.5 rounded-lg border',
                      isPresent && 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                      isAbsent && 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                      isHoliday && 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      isCancelled && 'bg-slate-800 text-slate-400 border-white/10',
                      item.status === 'other' && 'bg-slate-800 text-slate-400 border-white/5'
                    )}
                  >
                    {isPresent ? 'P' : isAbsent ? 'A' : isHoliday ? 'GH' : isCancelled ? 'CS' : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Helpful Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px] text-slate-400 font-medium">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>P: Present</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>A: Absent</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>GH: Holiday</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>CS: Cancelled</span>
          </span>
        </div>
        <span>Total: {allRecords.length} records</span>
      </div>
    </div>
  );
}
