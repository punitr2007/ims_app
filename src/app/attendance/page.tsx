'use client';

import React, { useState, useEffect } from 'react';
import { AttendanceResponse, AttendanceSubject } from '@/lib/ims/types';
import { LoginForm } from '@/components/attendance/LoginForm';
import { AttendanceCard } from '@/components/attendance/AttendanceCard';
import { BunkCalculator } from '@/components/attendance/BunkCalculator';
import { GraduationCap, User, RefreshCw, LogOut, CheckCircle2, AlertCircle, BookOpen, Clock } from 'lucide-react';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [refreshing, setRefreshing] = useState(false);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('ims_attendance_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.success) {
          setAttendance(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLoginSuccess = (data: AttendanceResponse) => {
    setAttendance(data);
    try {
      sessionStorage.setItem('ims_attendance_data', JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setAttendance(null);
    try {
      sessionStorage.removeItem('ims_attendance_data');
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Attendance & Bunk Calculator
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Instant attendance analysis, safe bunk limits, and recovery planning for NSUT students.
          </p>
        </div>

        {attendance && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>

      {!attendance ? (
        <div className="py-6">
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Card */}
          {attendance.profile && (
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-brand-500/20">
                  {attendance.profile.name.charAt(0) || 'S'}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {attendance.profile.name}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    {attendance.profile.rollNumber} • {attendance.profile.program} (Sem {attendance.profile.semester})
                  </p>
                </div>
              </div>

              {attendance.lastUpdated && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  <span>Synced {new Date(attendance.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
          )}

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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-400" />
                <h3 className="font-bold text-white text-base">Course-wise Attendance</h3>
              </div>
              <span className="text-xs text-slate-400">
                {attendance.subjects?.length || 0} Courses Enrolled
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attendance.subjects?.map((subject) => (
                <AttendanceCard
                  key={subject.subjectCode}
                  subject={subject}
                  targetPercentage={targetPercentage}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
