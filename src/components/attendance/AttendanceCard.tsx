'use client';

import React, { useState } from 'react';
import { AttendanceSubject } from '@/lib/ims/types';
import { calculateSubjectBunks } from '@/lib/ims/calculator';
import {
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Calculator,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
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
  const [showDaily, setShowDaily] = useState(false);
  const [simulatedBunks, setSimulatedBunks] = useState(0);

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

  // --- Real-time "What If I Skip" Simulation ---
  const simTotalHeld = subject.totalHeld + simulatedBunks;
  const simAttended = subject.attended;
  const simPercentage =
    simTotalHeld > 0 ? Math.round((simAttended / simTotalHeld) * 1000) / 10 : subject.percentage;

  const simIsSafe = simTotalHeld === 0 ? true : simPercentage >= targetPercentage;
  const simIsWarning =
    simTotalHeld > 0 && simPercentage < targetPercentage && simPercentage >= targetPercentage - 5;
  const simIsDanger = simTotalHeld > 0 && simPercentage < targetPercentage - 5;

  const pctDiff = Math.round((simPercentage - subject.percentage) * 10) / 10;
  const remainingSafeBunks = Math.max(0, bunkableClasses - simulatedBunks);

  // Recovery classes needed if simulated skips put attendance under target
  const simRequiredClasses =
    simPercentage < targetPercentage
      ? Math.ceil((targetPercentage * simTotalHeld - 100 * simAttended) / (100 - targetPercentage))
      : 0;

  return (
    <div className="glass-panel rounded-2xl border border-white/5 hover:border-white/10 transition-all overflow-hidden flex flex-col justify-between">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-300 font-mono text-xs font-semibold">
                {subject.subjectCode}
              </span>
              {subject.credits && (
                <span className="text-[11px] text-slate-400">{subject.credits} Credits</span>
              )}
            </div>
            <h4 className="font-semibold text-white text-sm sm:text-base leading-snug">
              {subject.subjectName}
            </h4>
          </div>

          {/* Percentage Badge */}
          <div className="text-right shrink-0">
            <div
              className={clsx(
                'text-xl sm:text-2xl font-black font-mono tracking-tight',
                isSafe && 'text-emerald-400',
                isWarning && 'text-amber-400',
                isDanger && 'text-rose-400'
              )}
            >
              {subject.percentage}%
            </div>
            <span
              className={clsx(
                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5',
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
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                isSafe && 'bg-gradient-to-r from-emerald-500 to-teal-400',
                isWarning && 'bg-gradient-to-r from-amber-500 to-yellow-400',
                isDanger && 'bg-gradient-to-r from-rose-600 to-rose-400'
              )}
              style={{ width: `${Math.min(subject.percentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Attended: <strong className="text-slate-200">{subject.attended}</strong> /{' '}
              {subject.totalHeld} classes
            </span>
            <span>Target: {targetPercentage}%</span>
          </div>
        </div>

        {/* Bunk / Recovery Insight (mirrors reference imsnsit app) */}
        <div
          className={clsx(
            'p-3 rounded-xl text-xs flex items-center gap-2.5 font-medium',
            isSafe
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
              : isWarning
              ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
              : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
          )}
        >
          {subject.totalHeld === 0 ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>No classes scheduled or recorded yet for this course.</span>
            </>
          ) : isSafe ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {bunkableClasses > 0 ? (
                  <>
                    You can safely bunk the next{' '}
                    <strong className="underline decoration-emerald-500 font-bold">
                      {bunkableClasses}
                    </strong>{' '}
                    classes and stay above {targetPercentage}%.
                  </>
                ) : (
                  <>You are right on the {targetPercentage}% margin. Don&apos;t miss the next class!</>
                )}
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Must attend next{' '}
                <strong className="underline decoration-rose-500 font-bold">
                  {requiredClasses}
                </strong>{' '}
                consecutive classes to reach {targetPercentage}%.
              </span>
            </>
          )}
        </div>

        {/* Interactive Skip Classes Simulator */}
        {subject.totalHeld > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Calculator className="w-3.5 h-3.5 text-brand-400" />
                <span>Simulate Skipping Classes</span>
              </div>
              {bunkableClasses > 0 ? (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-bold">
                  Max Safe: {bunkableClasses}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full font-bold">
                  0 Safe Skips
                </span>
              )}
            </div>

            {/* Stepper & Dropdown Controls */}
            <div className="flex items-center gap-2">
              {/* Stepper Minus */}
              <button
                type="button"
                onClick={() => setSimulatedBunks((prev) => Math.max(0, prev - 1))}
                disabled={simulatedBunks === 0}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 disabled:hover:bg-slate-800/80 flex items-center justify-center text-slate-200 transition-colors border border-white/5"
                title="Decrease skipped classes"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {/* Number display / select dropdown */}
              <div className="flex-1 relative">
                <select
                  value={simulatedBunks}
                  onChange={(e) => setSimulatedBunks(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-brand-500 appearance-none cursor-pointer"
                >
                  <option value={0}>0 classes (Current)</option>
                  {Array.from({ length: Math.max(10, bunkableClasses + 4) }, (_, i) => i + 1).map(
                    (num) => (
                      <option key={num} value={num}>
                        Skip {num} {num === 1 ? 'class' : 'classes'}
                        {num <= bunkableClasses ? ' (Safe)' : ' (Shortage)'}
                      </option>
                    )
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Stepper Plus */}
              <button
                type="button"
                onClick={() => setSimulatedBunks((prev) => prev + 1)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center text-slate-200 transition-colors border border-white/5"
                title="Increase skipped classes"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Reset Button */}
              {simulatedBunks > 0 && (
                <button
                  type="button"
                  onClick={() => setSimulatedBunks(0)}
                  className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors border border-white/5"
                  title="Reset to 0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick-Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 text-[10px]">Quick:</span>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSimulatedBunks(n)}
                  className={clsx(
                    'px-2 py-0.5 rounded-md font-mono font-medium transition-all border',
                    simulatedBunks === n
                      ? 'bg-brand-500/25 text-brand-300 border-brand-500/50'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-white/5'
                  )}
                >
                  +{n}
                </button>
              ))}
              {bunkableClasses > 0 && (
                <button
                  type="button"
                  onClick={() => setSimulatedBunks(bunkableClasses)}
                  className={clsx(
                    'px-2 py-0.5 rounded-md font-mono font-medium transition-all border',
                    simulatedBunks === bunkableClasses
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                      : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 border-emerald-800/30'
                  )}
                >
                  Max Safe ({bunkableClasses})
                </button>
              )}
            </div>

            {/* Real-Time Projected Outcome Banner */}
            {simulatedBunks > 0 && (
              <div
                className={clsx(
                  'p-2.5 rounded-lg border text-xs space-y-1.5 animate-in fade-in duration-150',
                  simIsSafe
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                    : simIsWarning
                    ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                    : 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                )}
              >
                <div className="flex items-center justify-between font-mono font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">{subject.percentage}%</span>
                    <span className="text-slate-500">→</span>
                    <span
                      className={clsx(
                        'text-sm font-black',
                        simIsSafe && 'text-emerald-400',
                        simIsWarning && 'text-amber-400',
                        simIsDanger && 'text-rose-400'
                      )}
                    >
                      {simPercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({pctDiff > 0 ? `+${pctDiff}` : pctDiff}%)
                    </span>
                  </div>
                  <span
                    className={clsx(
                      'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                      simIsSafe && 'bg-emerald-500/20 text-emerald-300',
                      simIsWarning && 'bg-amber-500/20 text-amber-300',
                      simIsDanger && 'bg-rose-500/20 text-rose-300'
                    )}
                  >
                    {simIsSafe ? 'Safe' : simIsWarning ? 'Margin' : 'Shortage'}
                  </span>
                </div>

                <p className="text-[11px] leading-tight opacity-90">
                  {simIsSafe ? (
                    remainingSafeBunks > 0 ? (
                      <>
                        Skipping {simulatedBunks} {simulatedBunks === 1 ? 'class' : 'classes'} leaves
                        you at <strong>{simPercentage}%</strong>. You can still safely skip{' '}
                        <strong>{remainingSafeBunks}</strong> more class(es).
                      </>
                    ) : (
                      <>
                        Skipping {simulatedBunks} {simulatedBunks === 1 ? 'class' : 'classes'} puts
                        you exactly on the <strong>{targetPercentage}%</strong> limit. Zero safe
                        bunks left!
                      </>
                    )
                  ) : (
                    <>
                      Skipping {simulatedBunks} {simulatedBunks === 1 ? 'class' : 'classes'} drops
                      attendance to <strong>{simPercentage}%</strong> (below {targetPercentage}%).
                      You would need to attend <strong>{simRequiredClasses}</strong> consecutive
                      classes to recover.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Daily Attendance Toggle */}
        <button
          onClick={() => setShowDaily((p) => !p)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all text-xs text-slate-400 hover:text-slate-200"
        >
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-brand-400" />
            <span>
              Daily View — <span className="text-emerald-400 font-semibold">{presentDays}P</span> /{' '}
              <span className="text-rose-400 font-semibold">{absentDays}A</span>{' '}
              <span className="text-slate-500">({totalClassesCount} classes)</span>
            </span>
          </div>
          {showDaily ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Daily Attendance Grid (expandable) */}
      {showDaily && (
        <div className="border-t border-white/5 px-5 pb-4 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {dailyEntries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {dailyEntries.map(([day, val]) => {
                const { isPresent, isAbsent } = parseAttendanceStatus(val);
                const displayVal = isPresent
                  ? val.includes('CR')
                    ? val
                    : 'P'
                  : isAbsent
                  ? val.includes('CR')
                    ? val
                    : 'A'
                  : val;

                return (
                  <div
                    key={day}
                    title={`${day}: ${val}`}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border transition-colors',
                      isPresent && 'bg-emerald-950/60 border-emerald-700/40 text-emerald-300',
                      isAbsent && 'bg-rose-950/60 border-rose-700/40 text-rose-300',
                      !isPresent && !isAbsent && 'bg-slate-900/60 border-white/5 text-slate-400'
                    )}
                  >
                    <span className="text-slate-400">{day.replace(/^0/, '')}:</span>{' '}
                    <span
                      className={clsx(
                        isPresent
                          ? 'text-emerald-300 font-bold'
                          : isAbsent
                          ? 'text-rose-300 font-bold'
                          : 'text-slate-300'
                      )}
                    >
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-1 italic">
              No individual lecture dates recorded yet by the department for this course. Total classes
              held: {subject.totalHeld}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

