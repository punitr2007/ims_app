'use client';

import React, { useState } from 'react';
import { AttendanceSubject } from '@/lib/ims/types';
import { calculateSubjectBunks } from '@/lib/ims/calculator';
import { AttendanceDetailOverlay } from './AttendanceDetailOverlay';
import {
  CheckCircle,
  AlertTriangle,
  CalendarDays,
  Calculator,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import clsx from 'clsx';

interface AttendanceCardProps {
  subject: AttendanceSubject;
  targetPercentage?: number;
}

/**
 * Normalizes and determines if an attendance entry represents Present or Absent.
 * Supports '1', '0', '1+CR', '0+CR', 'P', 'A', 'Present', 'Absent', 'CR', and numeric values.
 */
function parseAttendanceStatus(val: unknown): { isPresent: boolean; isAbsent: boolean } {
  if (val === null || val === undefined) return { isPresent: false, isAbsent: false };
  const s = String(val).replace(/\u00a0/g, ' ').trim().toUpperCase();
  if (!s) return { isPresent: false, isAbsent: false };

  // Explicit absent signals
  if (
    s === '0' ||
    s === 'A' ||
    s === 'AB' ||
    s.startsWith('ABS') ||
    s === '0+CR' ||
    s === 'NO' ||
    s === 'FALSE' ||
    s === 'A.'
  ) {
    return { isPresent: false, isAbsent: true };
  }

  // Explicit present signals
  if (
    s === '1' ||
    s === 'P' ||
    s === 'PR' ||
    s.startsWith('PRES') ||
    s.startsWith('ATT') ||
    s === '1+CR' ||
    s.includes('1') ||
    s.includes('CR') ||
    s === 'YES' ||
    s === 'TRUE' ||
    s === 'P.'
  ) {
    return { isPresent: true, isAbsent: false };
  }

  if (s.includes('0') && !s.includes('1')) {
    return { isPresent: false, isAbsent: true };
  }

  return { isPresent: false, isAbsent: false };
}

export function AttendanceCard({ subject, targetPercentage = 75 }: AttendanceCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'daily' | 'simulator'>('daily');

  const dailyEntries = Object.entries(subject.dailyAttendance || {});

  // Compute daily present and absent counts
  let parsedPresent = 0;
  let parsedAbsent = 0;
  for (const [, v] of dailyEntries) {
    const { isPresent, isAbsent } = parseAttendanceStatus(v);
    if (isPresent) parsedPresent++;
    else if (isAbsent) parsedAbsent++;
  }

  // Use parsed counts if available; otherwise use verified portal totals
  const presentDays = parsedPresent > 0 || parsedAbsent > 0 ? parsedPresent : subject.attended;
  const absentDays =
    parsedPresent > 0 || parsedAbsent > 0
      ? parsedAbsent
      : Math.max(0, subject.totalHeld - subject.attended);
  const totalClassesCount =
    dailyEntries.length > 0 ? Math.max(dailyEntries.length, subject.totalHeld) : subject.totalHeld;

  // Base bunk calculations
  const { bunkableClasses, requiredClasses, status } = calculateSubjectBunks(
    subject.attended,
    subject.totalHeld,
    targetPercentage
  );

  const isSafe = subject.totalHeld === 0 ? true : status === 'safe';
  const isWarning = subject.totalHeld > 0 && status === 'warning';
  const isDanger = subject.totalHeld > 0 && status === 'danger';
  const isBorderlineRisk = isSafe && subject.totalHeld > 0 && bunkableClasses <= 1;

  const handleOpenDetail = (tab: 'daily' | 'simulator', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDetailTab(tab);
    setIsDetailOpen(true);
  };

  return (
    <>
      <div
        onClick={() => handleOpenDetail('daily')}
        className="glass-panel glass-panel-hover rounded-3xl border border-white/5 hover:border-brand-500/30 transition-all p-4 sm:p-5 flex flex-col justify-between shadow-xl cursor-pointer group relative overflow-hidden h-full min-h-[250px]"
      >
        {/* Subtle top ambient indicator */}
        <div
          className={clsx(
            'absolute top-0 left-0 right-0 h-1 transition-all',
            isSafe && 'bg-gradient-to-r from-emerald-500 to-teal-400 opacity-70 group-hover:opacity-100',
            isWarning && 'bg-gradient-to-r from-amber-500 to-yellow-400 opacity-70 group-hover:opacity-100',
            isDanger && 'bg-gradient-to-r from-rose-600 to-rose-400 opacity-80 group-hover:opacity-100'
          )}
        />

        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="space-y-1 pr-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-300 font-mono text-[11px] sm:text-xs font-bold border border-brand-500/20">
                  {subject.subjectCode}
                </span>
                {subject.credits && (
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    {subject.credits} Credits
                  </span>
                )}
              </div>
              <h4 className="font-bold text-white text-sm sm:text-base leading-snug tracking-tight line-clamp-2 min-h-[2.5rem]">
                {subject.subjectName}
              </h4>
            </div>

            {/* Percentage Badge */}
            <div className="text-right shrink-0">
              <div
                className={clsx(
                  'text-xl sm:text-2xl font-black font-mono tracking-tight privacy-blur',
                  isSafe && 'text-emerald-400',
                  isWarning && 'text-amber-400',
                  isDanger && 'text-rose-400'
                )}
              >
                {subject.percentage}%
              </div>
              <span
                className={clsx(
                  'text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5',
                  isSafe && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                  isWarning && 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                  isDanger && 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                )}
              >
                {isSafe ? 'Safe' : isWarning ? 'Warning' : 'Shortage'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  isSafe && 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/30',
                  isWarning && 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-sm shadow-amber-500/30',
                  isDanger && 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-sm shadow-rose-500/30'
                )}
                style={{ width: `${Math.min(subject.percentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>
                Attended: <strong className="text-slate-200">{subject.attended}</strong> /{' '}
                {subject.totalHeld} classes
              </span>
              <span>Target: {targetPercentage}%</span>
            </div>
          </div>

          {/* High Danger Zone Ribbon (if 1 class away from shortage) */}
          {isBorderlineRisk && (
            <div className="p-2 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] leading-tight truncate">
                <strong>High Danger:</strong> Missing 1 more class drops below {targetPercentage}%.
              </span>
            </div>
          )}

          {/* Bunk / Recovery Insight Ribbon */}
          <div
            className={clsx(
              'p-2.5 rounded-2xl text-[11px] sm:text-xs flex items-center gap-2 font-medium leading-tight',
              isSafe
                ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-800/30'
                : isWarning
                ? 'bg-amber-950/30 text-amber-300 border border-amber-800/30'
                : 'bg-rose-950/30 text-rose-300 border border-rose-800/30'
            )}
          >
            {subject.totalHeld === 0 ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">No classes recorded yet for this course.</span>
              </>
            ) : isSafe ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {bunkableClasses > 0 ? (
                    <>
                      Can safely bunk next{' '}
                      <strong className="underline decoration-emerald-500 font-bold">
                        {bunkableClasses}
                      </strong>{' '}
                      class{bunkableClasses === 1 ? '' : 'es'}.
                    </>
                  ) : (
                    <>Right on {targetPercentage}% limit. Don&apos;t miss!</>
                  )}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">
                  Attend next{' '}
                  <strong className="underline decoration-rose-500 font-bold">
                    {requiredClasses}
                  </strong>{' '}
                  consecutive classes to reach {targetPercentage}%.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Space-Efficient Bottom Action Triggers */}
        <div className="pt-3.5 mt-3 border-t border-white/5 flex items-center gap-2">
          {/* Daily Records Button */}
          <button
            type="button"
            onClick={(e) => handleOpenDetail('daily', e)}
            className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-brand-500/30 active:scale-[0.98] transition-all text-xs text-slate-300 hover:text-white group/btn"
          >
            <div className="flex items-center gap-1.5 truncate">
              <CalendarDays className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="font-semibold truncate">Daily Records</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded-md border border-white/5 shrink-0 ml-1">
              {presentDays}P / {absentDays}A
            </span>
          </button>

          {/* What-If Simulator Trigger */}
          <button
            type="button"
            onClick={(e) => handleOpenDetail('simulator', e)}
            className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-brand-500/30 active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 text-slate-300 hover:text-white shrink-0"
            title="Open What-If Simulator Overlay"
          >
            <Calculator className="w-3.5 h-3.5 text-brand-400" />
            <span className="font-semibold hidden xs:inline">What-If</span>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* Card Style Overlay (Modal Sheet) */}
      <AttendanceDetailOverlay
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        subject={subject}
        targetPercentage={targetPercentage}
        initialTab={detailTab}
      />
    </>
  );
}
