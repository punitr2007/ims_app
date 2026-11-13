'use client';

import React, { useState, useEffect } from 'react';
import { AttendanceSubject } from '@/lib/ims/types';
import { calculateSubjectBunks } from '@/lib/ims/calculator';
import { DailyAttendanceView } from './DailyAttendanceView';
import {
  X,
  CalendarDays,
  Calculator,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import clsx from 'clsx';

interface AttendanceDetailOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  subject: AttendanceSubject;
  targetPercentage?: number;
  initialTab?: 'daily' | 'simulator';
}

export function AttendanceDetailOverlay({
  isOpen,
  onClose,
  subject,
  targetPercentage = 75,
  initialTab = 'daily',
}: AttendanceDetailOverlayProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'simulator'>(initialTab);
  const [simMode, setSimMode] = useState<'skip' | 'attend'>('skip');
  const [simDelta, setSimDelta] = useState(0);

  // Sync tab if initialTab changes when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSimDelta(0);
    }
  }, [isOpen, initialTab]);

  // Handle ESC key press and scroll locking
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Base metrics & bunks
  const { bunkableClasses, requiredClasses, status } = calculateSubjectBunks(
    subject.attended,
    subject.totalHeld,
    targetPercentage
  );

  const isSafe = subject.totalHeld === 0 ? true : status === 'safe';
  const isWarning = subject.totalHeld > 0 && status === 'warning';
  const isDanger = subject.totalHeld > 0 && status === 'danger';
  const isBorderlineRisk = isSafe && subject.totalHeld > 0 && bunkableClasses <= 1;

  // Daily entries count
  const dailyEntries = Object.entries(subject.dailyAttendance || {});
  const totalRecordsCount = dailyEntries.length > 0 ? dailyEntries.length : subject.totalHeld;

  // Real-time Simulation
  const simTotalHeld = subject.totalHeld + simDelta;
  const simAttended = simMode === 'skip' ? subject.attended : subject.attended + simDelta;
  const simPercentage =
    simTotalHeld > 0 ? Math.round((simAttended / simTotalHeld) * 1000) / 10 : subject.percentage;

  const simIsSafe = simTotalHeld === 0 ? true : simPercentage >= targetPercentage;
  const simIsWarning =
    simTotalHeld > 0 && simPercentage < targetPercentage && simPercentage >= targetPercentage - 5;
  const simIsDanger = simTotalHeld > 0 && simPercentage < targetPercentage - 5;

  const pctDiff = Math.round((simPercentage - subject.percentage) * 10) / 10;
  const remainingSafeBunks = Math.max(0, bunkableClasses - (simMode === 'skip' ? simDelta : 0));

  const simRequiredClasses =
    simPercentage < targetPercentage
      ? Math.ceil((targetPercentage * simTotalHeld - 100 * simAttended) / (100 - targetPercentage))
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${subject.subjectName} details`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Overlay Card Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl sm:max-w-3xl max-h-[92vh] bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-start justify-between gap-3 bg-slate-950/40">
          <div className="space-y-1 pr-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-brand-500/15 text-brand-300 font-mono text-xs font-bold border border-brand-500/20">
                {subject.subjectCode}
              </span>
              {subject.credits && (
                <span className="text-[11px] text-slate-400 font-medium">
                  {subject.credits} Credits
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
              {subject.subjectName}
            </h3>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Percentage Badge */}
            <div className="text-right">
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
                  'text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block',
                  isSafe && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                  isWarning && 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                  isDanger && 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                )}
              >
                {isSafe ? 'Safe' : isWarning ? 'Warning' : 'Shortage'}
              </span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/10"
              title="Close overlay (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Quick Glance Metrics Bar */}
        <div className="px-4 sm:px-5 py-3 bg-slate-950/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-3 text-slate-300">
            <span>
              Attended: <strong className="text-white font-mono">{subject.attended}</strong> /{' '}
              <span className="text-slate-400">{subject.totalHeld}</span> classes
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Target: <strong className="text-brand-300 font-mono">{targetPercentage}%</strong>
            </span>
          </div>

          {/* Quick status cushion */}
          <div className="flex items-center gap-1.5">
            {subject.totalHeld === 0 ? (
              <span className="text-slate-400 text-[11px]">No classes recorded</span>
            ) : isSafe ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-800/40">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span>{bunkableClasses} safe bunks available</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-300 bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-800/40">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Must attend next {requiredClasses} classes</span>
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 sm:px-5 pt-3 border-b border-white/10 bg-slate-900/60 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={clsx(
              'flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2',
              activeTab === 'daily'
                ? 'border-brand-500 text-brand-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            )}
          >
            <CalendarDays className="w-4 h-4 text-brand-400" />
            <span>Daily Records &amp; Timeline</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
              {totalRecordsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={clsx(
              'flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2',
              activeTab === 'simulator'
                ? 'border-brand-500 text-brand-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            )}
          >
            <Calculator className="w-4 h-4 text-brand-400" />
            <span>What-If Simulator</span>
            {simDelta > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Body (Scrollable, High Space Efficiency) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5.5 space-y-4">
          {/* TAB 1: Daily Records & Timeline */}
          {activeTab === 'daily' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {isBorderlineRisk && (
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs leading-relaxed">
                    <strong>High Danger Zone:</strong> Missing just 1 more class will drop your attendance below {targetPercentage}%.
                  </span>
                </div>
              )}

              <DailyAttendanceView
                dailyAttendance={subject.dailyAttendance || {}}
                totalHeld={subject.totalHeld}
                attended={subject.attended}
              />
            </div>
          )}

          {/* TAB 2: Interactive What-If Simulator */}
          {activeTab === 'simulator' && (
            <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
              {/* Simulator Card Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-brand-400" />
                      <span>Forecast Attendance Scenarios</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Simulate the impact of missing or attending upcoming classes in real time.
                    </p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSimMode('skip');
                        setSimDelta(0);
                      }}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl font-bold transition-all',
                        simMode === 'skip'
                          ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      Skip Classes (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimMode('attend');
                        setSimDelta(0);
                      }}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl font-bold transition-all',
                        simMode === 'attend'
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      Attend Classes (+)
                    </button>
                  </div>
                </div>

                {/* Stepper Controls */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setSimDelta((prev) => Math.max(0, prev - 1))}
                    disabled={simDelta === 0}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-90 disabled:opacity-30 flex items-center justify-center text-slate-200 transition-all border border-white/10 shrink-0"
                    title="Decrease count"
                    aria-label="Decrease"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="flex-1 text-center bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-sm sm:text-base font-mono font-bold text-white shadow-inner">
                    {simDelta === 0 ? (
                      <span className="text-slate-400">0 classes (Current Status)</span>
                    ) : simMode === 'skip' ? (
                      <span className="text-rose-300">
                        Skip {simDelta} class{simDelta > 1 ? 'es' : ''}
                      </span>
                    ) : (
                      <span className="text-emerald-300">
                        Attend next {simDelta} class{simDelta > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSimDelta((prev) => prev + 1)}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-90 flex items-center justify-center text-slate-200 transition-all border border-white/10 shrink-0"
                    title="Increase count"
                    aria-label="Increase"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  {simDelta > 0 && (
                    <button
                      type="button"
                      onClick={() => setSimDelta(0)}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/90 hover:bg-rose-950/60 active:scale-90 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-all border border-white/10 shrink-0"
                      title="Reset simulation to 0"
                      aria-label="Reset"
                    >
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500 font-medium mr-1 text-[11px]">Quick Presets:</span>
                  {[1, 2, 3, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSimDelta(n)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-all border active:scale-95',
                        simDelta === n
                          ? 'bg-brand-500/25 text-brand-300 border-brand-500/50 shadow-sm shadow-brand-500/20'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-white/5'
                      )}
                    >
                      {simMode === 'skip' ? `-${n}` : `+${n}`}
                    </button>
                  ))}

                  {simMode === 'skip' && bunkableClasses > 0 && (
                    <button
                      type="button"
                      onClick={() => setSimDelta(bunkableClasses)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-all border active:scale-95',
                        simDelta === bunkableClasses
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                          : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 border-emerald-800/30'
                      )}
                    >
                      Max Safe ({bunkableClasses})
                    </button>
                  )}

                  {simMode === 'attend' && requiredClasses > 0 && (
                    <button
                      type="button"
                      onClick={() => setSimDelta(requiredClasses)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-all border active:scale-95',
                        simDelta === requiredClasses
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                          : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 border-emerald-800/30'
                      )}
                    >
                      Target Recovery ({requiredClasses})
                    </button>
                  )}
                </div>

                {/* Outcome Projection Banner */}
                {simDelta > 0 ? (
                  <div
                    className={clsx(
                      'p-4 rounded-2xl border text-xs sm:text-sm space-y-2.5 animate-in fade-in duration-150',
                      simIsSafe
                        ? 'bg-emerald-950/35 border-emerald-800/40 text-emerald-200'
                        : simIsWarning
                        ? 'bg-amber-950/35 border-amber-800/40 text-amber-200'
                        : 'bg-rose-950/35 border-rose-800/40 text-rose-200'
                    )}
                  >
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">{subject.percentage}%</span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                        <span
                          className={clsx(
                            'text-lg sm:text-xl font-black',
                            simIsSafe && 'text-emerald-400',
                            simIsWarning && 'text-amber-400',
                            simIsDanger && 'text-rose-400'
                          )}
                        >
                          {simPercentage}%
                        </span>
                        <span className="text-xs text-slate-400 flex items-center">
                          ({pctDiff > 0 ? `+${pctDiff}` : pctDiff}%)
                        </span>
                      </div>

                      <span
                        className={clsx(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                          simIsSafe && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                          simIsWarning && 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                          simIsDanger && 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        )}
                      >
                        {simIsSafe ? 'Safe' : simIsWarning ? 'Margin' : 'Shortage'}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-300',
                          simIsSafe && 'bg-gradient-to-r from-emerald-500 to-teal-400',
                          simIsWarning && 'bg-gradient-to-r from-amber-500 to-yellow-400',
                          simIsDanger && 'bg-gradient-to-r from-rose-600 to-rose-400'
                        )}
                        style={{ width: `${Math.min(simPercentage, 100)}%` }}
                      />
                    </div>

                    <p className="text-xs sm:text-[13px] leading-relaxed opacity-95">
                      {simMode === 'skip' ? (
                        simIsSafe ? (
                          remainingSafeBunks > 0 ? (
                            <>
                              Skipping <strong>{simDelta}</strong> class{simDelta === 1 ? '' : 'es'}{' '}
                              leaves you at <strong>{simPercentage}%</strong>. You can still safely bunk{' '}
                              <strong>{remainingSafeBunks}</strong> more class(es) without falling below{' '}
                              {targetPercentage}%.
                            </>
                          ) : (
                            <>
                              Skipping <strong>{simDelta}</strong> class{simDelta === 1 ? '' : 'es'}{' '}
                              puts you directly on the <strong>{targetPercentage}%</strong> limit. Zero safe bunks left!
                            </>
                          )
                        ) : (
                          <>
                            Skipping <strong>{simDelta}</strong> class{simDelta === 1 ? '' : 'es'} drops
                            your attendance to <strong>{simPercentage}%</strong>. You will need to attend{' '}
                            <strong>{simRequiredClasses}</strong> consecutive classes to recover.
                          </>
                        )
                      ) : (
                        <>
                          Attending the next <strong>{simDelta}</strong> class{simDelta === 1 ? '' : 'es'}{' '}
                          boosts your attendance to <strong>{simPercentage}%</strong> ({pctDiff > 0 ? `+${pctDiff}%` : '0%'} gain).
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400 text-center">
                    Select a preset or tap <strong>+</strong> / <strong>-</strong> to preview your attendance trajectory.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950/60 border-t border-white/10 flex items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono text-slate-300 font-medium truncate">
              {subject.subjectCode} • {subject.attended}/{subject.totalHeld} classes
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-semibold text-xs transition-all border border-white/10 shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
