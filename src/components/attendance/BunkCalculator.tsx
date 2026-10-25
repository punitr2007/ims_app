'use client';

import React from 'react';
import { AttendanceSubject } from '@/lib/ims/types';
import { calculateSubjectBunks } from '@/lib/ims/calculator';
import { ShieldCheck, AlertCircle, Sliders, CheckCircle2, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface BunkCalculatorProps {
  subjects: AttendanceSubject[];
  overallPercentage: number;
  totalHeld: number;
  totalAttended: number;
  target: number;
  onTargetChange: (t: number) => void;
}

export function BunkCalculator({
  subjects,
  overallPercentage,
  totalHeld,
  totalAttended,
  target,
  onTargetChange,
}: BunkCalculatorProps) {
  const overallBunkData = calculateSubjectBunks(totalAttended, totalHeld, target);
  const isSafe = overallBunkData.status === 'safe';

  return (
    <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 space-y-4 sm:space-y-6 shadow-xl">
      {/* Top Banner & Target Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
              Overall Attendance Summary
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 text-[10px] sm:text-xs font-semibold border border-brand-500/25">
              Live IMS
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Combined aggregate across all enrolled courses
          </p>
        </div>

        {/* Target Selector Segmented Pill */}
        <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-900/90 p-1 rounded-2xl border border-white/10 self-stretch sm:self-auto">
          <span className="text-[11px] sm:text-xs text-slate-400 px-2 flex items-center gap-1 font-medium">
            <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-400" />
            <span>Target:</span>
          </span>
          <div className="flex items-center gap-1 flex-1 sm:flex-none justify-end">
            {[75, 80, 85].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => onTargetChange(pct)}
                className={clsx(
                  'px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all active:scale-95',
                  target === pct
                    ? 'bg-gradient-to-r from-brand-600 to-sky-500 text-white shadow-md shadow-brand-500/30'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Held */}
        <div className="bg-slate-900/70 p-3.5 sm:p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Total Held</div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            {totalHeld}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500">Scheduled lectures</div>
        </div>

        {/* Attended */}
        <div className="bg-slate-900/70 p-3.5 sm:p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Attended</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
            {totalAttended}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500">Presents recorded</div>
        </div>

        {/* Overall Percentage */}
        <div className="bg-slate-900/70 p-3.5 sm:p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Overall Attendance</div>
          <div
            className={clsx(
              'text-xl sm:text-2xl font-black font-mono tracking-tight',
              overallPercentage >= target
                ? 'text-emerald-400'
                : overallPercentage >= target - 5
                ? 'text-amber-400'
                : 'text-rose-400'
            )}
          >
            {overallPercentage}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500">Target is {target}%</div>
        </div>

        {/* Bunk Cushion / Required */}
        <div className="bg-slate-900/70 p-3.5 sm:p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
            {isSafe ? 'Bunk Margin' : 'Required'}
          </div>
          <div
            className={clsx(
              'text-xl sm:text-2xl font-black font-mono tracking-tight',
              isSafe ? 'text-teal-300' : 'text-rose-400'
            )}
          >
            {isSafe ? `+${overallBunkData.bunkableClasses}` : `${overallBunkData.requiredClasses}`}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            {isSafe ? 'Can bunk safely' : 'Consecutive classes'}
          </div>
        </div>
      </div>

      {/* Actionable Banner */}
      <div
        className={clsx(
          'p-3.5 sm:p-4 rounded-2xl flex items-start sm:items-center gap-3 border text-xs sm:text-sm',
          isSafe
            ? 'bg-emerald-950/35 border-emerald-800/40 text-emerald-200'
            : 'bg-rose-950/35 border-rose-800/40 text-rose-200'
        )}
      >
        {isSafe ? (
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
        ) : (
          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
        )}
        <div className="space-y-0.5">
          <p className="font-semibold text-white">
            {isSafe
              ? `You are safely above your ${target}% target!`
              : `Attendance is below your ${target}% target!`}
          </p>
          <p className="text-[11px] sm:text-xs opacity-85 leading-relaxed">
            {isSafe
              ? `You have a cushion of ${overallBunkData.bunkableClasses} lecture bunks overall before dropping below ${target}%.`
              : `You must attend the next ${overallBunkData.requiredClasses} lectures without missing any to restore your aggregate attendance to ${target}%.`}
          </p>
        </div>
      </div>
    </div>
  );
}

