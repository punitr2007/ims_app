'use client';

import React, { useState, useEffect } from 'react';
import { AttendanceResponse, AttendanceSubject } from '@/lib/ims/types';
import { LoginForm } from '@/components/attendance/LoginForm';
import { AttendanceCard } from '@/components/attendance/AttendanceCard';
import { BunkCalculator } from '@/components/attendance/BunkCalculator';
import { RoomFinder } from '@/components/campus/RoomFinder';
import {
  GraduationCap,
  RefreshCw,
  LogOut,
  BookOpen,
  Clock,
  Sparkles,
  Zap,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import clsx from 'clsx';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'room_finder'>('attendance');
  const [lastSyncedDisplay, setLastSyncedDisplay] = useState<string>('');

  // 1. Instant 0-latency load from localStorage on client mount
  useEffect(() => {
    try {
      const cached =
        localStorage.getItem('ims_attendance_data_v2') ||
        sessionStorage.getItem('ims_attendance_data');

      if (cached) {
        const parsed: AttendanceResponse = JSON.parse(cached);
        if (parsed?.success) {
          setAttendance(parsed);
          if (parsed.lastUpdated) {
            setLastSyncedDisplay(formatSyncTime(parsed.lastUpdated));
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function formatSyncTime(isoStr: string): string {
    try {
      const date = new Date(isoStr);
      return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  }

  const handleLoginSuccess = (data: AttendanceResponse) => {
    const enriched = {
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    setAttendance(enriched);
    setLastSyncedDisplay(formatSyncTime(enriched.lastUpdated));
    setIsSyncModalOpen(false);

    try {
      localStorage.setItem('ims_attendance_data_v2', JSON.stringify(enriched));
      sessionStorage.setItem('ims_attendance_data', JSON.stringify(enriched));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    if (confirm('Clear offline attendance cache and log out?')) {
      setAttendance(null);
      try {
        localStorage.removeItem('ims_attendance_data_v2');
        sessionStorage.removeItem('ims_attendance_data');
      } catch {
        // ignore
      }
    }
  };

  // Compute courses in danger zone (< 75%)
  const dangerCoursesCount =
    attendance?.subjects?.filter((s) => s.totalHeld > 0 && s.percentage < targetPercentage).length || 0;
  const borderlineCoursesCount =
    attendance?.subjects?.filter(
      (s) => s.totalHeld > 0 && s.percentage >= targetPercentage && s.percentage < targetPercentage + 3
    ).length || 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-brand-500/15 text-brand-400 border border-brand-500/25">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Attendance &amp; Academic Tools
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            0-latency offline cache, proactive bunk risk analysis, and campus utilities for NSUT.
          </p>
        </div>

        {/* Top Actions when Authenticated (Mobile-Responsive Tap Targets) */}
        {attendance && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync IMS Fresh Data</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-medium transition-all active:scale-95 shrink-0"
              title="Clear cached profile on this device"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>

      {!attendance ? (
        <div className="py-4 sm:py-6">
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Offline Cache Status Bar */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <div className="text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  Instant Offline Cache Active
                </span>
                <span className="text-slate-400 text-[11px] block xs:inline xs:ml-1.5">
                  {lastSyncedDisplay ? `(Last synced: ${lastSyncedDisplay})` : '(Cached on this device)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end xs:self-auto text-xs">
              {dangerCoursesCount > 0 ? (
                <span className="px-2.5 py-1 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-800/40 font-semibold text-[11px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  {dangerCoursesCount} Shortage Warning{dangerCoursesCount > 1 ? 's' : ''}
                </span>
              ) : borderlineCoursesCount > 0 ? (
                <span className="px-2.5 py-1 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/40 font-semibold text-[11px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  {borderlineCoursesCount} Borderline Near {targetPercentage}%
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  All Courses Safe
                </span>
              )}
            </div>
          </div>

          {/* Student Profile Card (Mobile Optimized) */}
          {attendance.profile && (
            <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center font-bold text-base sm:text-lg text-white shadow-lg shadow-brand-500/20 shrink-0">
                  {attendance.profile.name.charAt(0) || 'S'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    {attendance.profile.name}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-mono truncate">
                    {attendance.profile.rollNumber} • {attendance.profile.program} (Sem {attendance.profile.semester})
                  </p>
                </div>
              </div>

              {/* Navigation Pill (Attendance vs Campus Utilities) */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-white/10 self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className={clsx(
                    'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                    activeTab === 'attendance'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Attendance</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('room_finder')}
                  className={clsx(
                    'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                    activeTab === 'room_finder'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Free Rooms</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'attendance' ? (
            <>
              {/* Interactive Bunk Summary Card */}
              <BunkCalculator
                subjects={attendance.subjects || []}
                overallPercentage={attendance.overallPercentage || 0}
                totalHeld={attendance.totalHeld || 0}
                totalAttended={attendance.totalAttended || 0}
                target={targetPercentage}
                onTargetChange={setTargetPercentage}
              />

              {/* Subjects Grid */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-400" />
                    <h3 className="font-bold text-white text-sm sm:text-base">Course-wise Attendance &amp; Danger Alerts</h3>
                  </div>
                  <span className="text-[11px] sm:text-xs font-mono text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-full border border-white/5">
                    {attendance.subjects?.length || 0} Courses
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {attendance.subjects?.map((subject) => (
                    <AttendanceCard
                      key={subject.subjectCode}
                      subject={subject}
                      targetPercentage={targetPercentage}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Campus Utility: Free APJ Rooms Finder */
            <RoomFinder />
          )}
        </div>
      )}

      {/* Sync Fresh Data Modal (Mobile Scroll & Keyboard Resilient) */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md my-auto">
            <LoginForm
              onSuccess={handleLoginSuccess}
              initialRollNumber={attendance?.profile?.rollNumber}
              isModal={true}
              onCancel={() => setIsSyncModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
