'use client';

import React, { useState } from 'react';
import { AttendanceSubject } from '@/lib/ims/types';
import { calculateSubjectBunks } from '@/lib/ims/calculator';
import {
  ShieldCheck,
  AlertCircle,
  Sliders,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Calculator,
  RotateCcw,
  Minus,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const [showSim, setShowSim] = useState(false);
  // Map subjectCode -> adjustment: number (negative = skip/bunk, positive = attend)
  const [simAdjustments, setSimAdjustments] = useState<Record<string, number>>({});

  const overallBunkData = calculateSubjectBunks(totalAttended, totalHeld, target);
  const isSafe = overallBunkData.status === 'safe';

  // Calculate simulated overall attendance
  let simTotalHeld = totalHeld;
  let simTotalAttended = totalAttended;

  for (const [code, delta] of Object.entries(simAdjustments)) {
    if (delta !== 0) {
      const absDelta = Math.abs(delta);
      simTotalHeld += absDelta;
      if (delta > 0) {
        simTotalAttended += delta;
      }
    }
  }

  const simOverallPct =
    simTotalHeld > 0
      ? Math.round((simTotalAttended / simTotalHeld) * 1000) / 10
      : overallPercentage;
  const pctDiff = Math.round((simOverallPct - overallPercentage) * 10) / 10;
  const simOverallBunkData = calculateSubjectBunks(simTotalAttended, simTotalHeld, target);
  const hasActiveSim = Object.values(simAdjustments).some((v) => v !== 0);

  const handleAdjust = (code: string, delta: number) => {
    setSimAdjustments((prev) => {
      const current = prev[code] || 0;
      const next = current + delta;
      if (next === 0) {
        const copy = { ...prev };
        delete copy[code];
        return copy;
      }
      return { ...prev, [code]: next };
    });
  };

  const handleResetSim = () => {
    setSimAdjustments({});
  };

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

      {/* Grid of Key Metrics (Mobile Responsive 2x2 Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Held */}
        <div className="bg-slate-900/70 p-3 sm:p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Total Held</div>
          <div className="text-lg xs:text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            {hasActiveSim ? `${simTotalHeld}*` : totalHeld}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            {hasActiveSim ? 'Projected classes' : 'Scheduled lectures'}
          </div>
        </div>

        {/* Attended */}
        <div className="bg-slate-900/70 p-3 sm:p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Attended</div>
          <div className="text-lg xs:text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
            {hasActiveSim ? `${simTotalAttended}*` : totalAttended}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">Presents recorded</div>
        </div>

        {/* Overall Percentage */}
        <div className="bg-slate-900/70 p-3 sm:p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Overall Attendance</div>
          <div
            className={clsx(
              'text-lg xs:text-xl sm:text-2xl font-black font-mono tracking-tight flex items-baseline gap-1 privacy-blur',
              (hasActiveSim ? simOverallPct : overallPercentage) >= target
                ? 'text-emerald-400'
                : (hasActiveSim ? simOverallPct : overallPercentage) >= target - 5
                ? 'text-amber-400'
                : 'text-rose-400'
            )}
          >
            <span>{hasActiveSim ? simOverallPct : overallPercentage}%</span>
            {hasActiveSim && pctDiff !== 0 && (
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 font-sans">
                ({pctDiff > 0 ? `+${pctDiff}` : pctDiff}%)
              </span>
            )}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">Target is {target}%</div>
        </div>

        {/* Bunk Cushion / Required */}
        <div className="bg-slate-900/70 p-3 sm:p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
            {(hasActiveSim ? simOverallBunkData.status === 'safe' : isSafe) ? 'Bunk Margin' : 'Required'}
          </div>
          <div
            className={clsx(
              'text-lg xs:text-xl sm:text-2xl font-black font-mono tracking-tight',
              (hasActiveSim ? simOverallBunkData.status === 'safe' : isSafe) ? 'text-teal-300' : 'text-rose-400'
            )}
          >
            {(hasActiveSim ? simOverallBunkData.status === 'safe' : isSafe)
              ? `+${hasActiveSim ? simOverallBunkData.bunkableClasses : overallBunkData.bunkableClasses}`
              : `${hasActiveSim ? simOverallBunkData.requiredClasses : overallBunkData.requiredClasses}`}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            {(hasActiveSim ? simOverallBunkData.status === 'safe' : isSafe) ? 'Can bunk safely' : 'Consecutive classes'}
          </div>
        </div>
      </div>

      {/* Actionable Banner */}
      <div
        className={clsx(
          'p-3.5 sm:p-4 rounded-2xl flex items-start sm:items-center gap-3 border text-xs sm:text-sm',
          (hasActiveSim ? simOverallBunkData.status === 'safe' : isSafe)
            ? 'bg-emerald-950/35 border-emerald-800/40 text-emerald-200'
            : 'bg-rose-950/35 border-rose-800/40 text-rose-200'
        )}
      >
        {(hasActiveSim ? simOverallBunkData.status === 'safe' : isSafe) ? (
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
        ) : (
          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
        )}
        <div className="space-y-0.5">
          <p className="font-semibold text-white">
            {(hasActiveSim ? simOverallBunkData.status === 'safe' : isSafe)
              ? `You are safely above your ${target}% target!`
              : `Attendance is below your ${target}% target!`}
          </p>
          <p className="text-[11px] sm:text-xs opacity-85 leading-relaxed">
            {(hasActiveSim ? simOverallBunkData.status === 'safe' : isSafe)
              ? `You have a cushion of ${hasActiveSim ? simOverallBunkData.bunkableClasses : overallBunkData.bunkableClasses} lecture bunks overall before dropping below ${target}%.`
              : `You must attend the next ${hasActiveSim ? simOverallBunkData.requiredClasses : overallBunkData.requiredClasses} lectures without missing any to restore your aggregate attendance to ${target}%.`}
          </p>
        </div>
      </div>

      {/* Expandable Multi-Course Simulator Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowSim((p) => !p)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-brand-500/40 text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-brand-400" />
            <span>Interactive Multi-Course What-If Simulator</span>
            {hasActiveSim && (
              <span className="px-2 py-0.5 rounded-full bg-brand-500/25 text-brand-300 text-[10px] font-mono border border-brand-500/30">
                Active Simulation ({pctDiff > 0 ? `+${pctDiff}%` : `${pctDiff}%`})
              </span>
            )}
          </div>
          {showSim ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showSim && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Simulate attending or skipping upcoming lectures across all subjects:
              </span>
              {hasActiveSim && (
                <button
                  type="button"
                  onClick={handleResetSim}
                  className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {subjects.map((sub) => {
                const delta = simAdjustments[sub.subjectCode] || 0;
                const subHeld = sub.totalHeld + Math.abs(delta);
                const subAttended = delta > 0 ? sub.attended + delta : sub.attended;
                const subPct =
                  subHeld > 0 ? Math.round((subAttended / subHeld) * 1000) / 10 : sub.percentage;

                return (
                  <div
                    key={sub.subjectCode}
                    className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/70 border border-white/5 text-xs"
                  >
                    <div className="min-w-0 flex-1 mr-0 xs:mr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-brand-300 font-bold px-1.5 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20">
                          {sub.subjectCode}
                        </span>
                        <span className="text-white font-medium truncate">{sub.subjectName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 font-mono">
                        <span>Current: {sub.percentage}%</span>
                        {delta !== 0 && (
                          <span
                            className={clsx(
                              'font-bold',
                              subPct >= target ? 'text-emerald-400' : 'text-rose-400'
                            )}
                          >
                            → Projected: {subPct}% ({delta > 0 ? `+${delta} attended` : `${delta} missed`})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end xs:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAdjust(sub.subjectCode, -1)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 font-bold text-xs border border-white/5 active:scale-90"
                        title="Simulate skipping 1 lecture"
                      >
                        -1 Skip
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjust(sub.subjectCode, 1)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 font-bold text-xs border border-white/5 active:scale-90"
                        title="Simulate attending 1 lecture"
                      >
                        +1 Attend
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
