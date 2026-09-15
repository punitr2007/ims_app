'use client';

import React from 'react';
import { AttendanceSubject } from '@/lib/ims/types';
import { BookOpen, CheckCircle, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface AttendanceCardProps {
  subject: AttendanceSubject;
  targetPercentage?: number;
}

export function AttendanceCard({ subject, targetPercentage = 75 }: AttendanceCardProps) {
  const isSafe = subject.status === 'safe';
  const isWarning = subject.status === 'warning';
  const isDanger = subject.status === 'danger';

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4 border border-white/5 hover:border-white/10 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-300 font-mono text-xs font-semibold">
              {subject.subjectCode}
            </span>
            {subject.credits && (
              <span className="text-[11px] text-slate-400">
                {subject.credits} Credits
              </span>
            )}
          </div>
          <h4 className="font-semibold text-white text-sm sm:text-base leading-snug">
            {subject.subjectName}
          </h4>
        </div>

        {/* Status Badge */}
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
          <span>Attended: <strong className="text-slate-200">{subject.attended}</strong> / {subject.totalHeld} classes</span>
          <span>Target: {targetPercentage}%</span>
        </div>
      </div>

      {/* Bunk / Attendance Insight */}
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
        {isSafe ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {subject.bunkableClasses > 0 ? (
                <>You can safely bunk the next <strong className="underline decoration-emerald-500 font-bold">{subject.bunkableClasses}</strong> classes and stay above {targetPercentage}%.</>
              ) : (
                <>You are right on the {targetPercentage}% margin. Don&apos;t miss the next class!</>
              )}
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Must attend next <strong className="underline decoration-rose-500 font-bold">{subject.requiredClasses}</strong> consecutive classes to reach {targetPercentage}%.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
