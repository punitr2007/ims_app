'use client';

import React from 'react';
import { AttendanceSubject } from '@/lib/ims/types';
import { calculateSubjectBunks } from '@/lib/ims/calculator';
import { ShieldCheck, AlertCircle, TrendingUp, Sparkles, Sliders } from 'lucide-react';
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
    <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">Overall Attendance Summary</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold">
              Live IMS Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Calculated across all registered courses</p>
        </div>

        {/* Target Selector */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 self-start sm:self-auto">
          <span className="text-xs text-slate-400 px-2 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-brand-400" />
            <span>Target:</span>
          </span>
          {[75, 80, 85].map((pct) => (
            <button
              key={pct}
              onClick={() => onTargetChange(pct)}
              className={clsx(
                'px-3 py-1 rounded-xl text-xs font-bold transition-all',
                target === pct
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs text-slate-400">Total Held</span>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono">{totalHeld}</div>
          <span className="text-[11px] text-slate-500">Lectures</span>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs text-slate-400">Attended</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">{totalAttended}</div>
          <span className="text-[11px] text-slate-500">Lectures</span>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs text-slate-400">Overall Attendance</span>
          <div
            className={clsx(
              'text-xl sm:text-2xl font-black font-mono',
              overallPercentage >= 75 ? 'text-emerald-400' : overallPercentage >= 70 ? 'text-amber-400' : 'text-rose-400'
            )}
          >
            {overallPercentage}%
          </div>
          <span className="text-[11px] text-slate-500">Target is {target}%</span>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs text-slate-400">{isSafe ? 'Bunk Margin' : 'Required Classes'}</span>
          <div
            className={clsx(
              'text-xl sm:text-2xl font-black font-mono',
              isSafe ? 'text-teal-300' : 'text-rose-400'
            )}
          >
            {isSafe ? `+${overallBunkData.bunkableClasses}` : `${overallBunkData.requiredClasses}`}
          </div>
          <span className="text-[11px] text-slate-500">{isSafe ? 'Can bunk safely' : 'Consecutive classes'}</span>
        </div>
      </div>

      {/* Actionable Banner */}
      <div
        className={clsx(
          'p-4 rounded-2xl flex items-center gap-3 border text-sm',
          isSafe
            ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
            : 'bg-rose-950/30 border-rose-800/40 text-rose-200'
        )}
      >
        {isSafe ? (
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
        )}
        <div>
          <p className="font-semibold">
            {isSafe
              ? `You are safely above your ${target}% target!`
              : `Attendance is below your ${target}% target!`}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            {isSafe
              ? `You have a cushion of ${overallBunkData.bunkableClasses} lecture bunks overall before dropping below ${target}%.`
              : `You must attend the next ${overallBunkData.requiredClasses} lectures without missing any to restore your aggregate attendance to ${target}%.`}
          </p>
        </div>
      </div>
    </div>
  );
}
