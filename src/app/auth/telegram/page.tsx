'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AttendanceResponse } from '@/lib/ims/types';
import { LoginForm } from '@/components/attendance/LoginForm';
import { AttendanceCard } from '@/components/attendance/AttendanceCard';
import { BunkCalculator } from '@/components/attendance/BunkCalculator';
import { Shield, Sparkles, AlertCircle, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

function TelegramAuthContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    // Notify Telegram WebApp ready if running inside Telegram client
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
    }

    if (!token) {
      setTokenError('Launch token missing. Please open the WebApp directly from the Telegram bot.');
    }
  }, [token]);

  const handleLoginSuccess = (data: AttendanceResponse) => {
    setAttendanceData(data);
  };

  const handleReset = () => {
    setAttendanceData(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col justify-between max-w-lg mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-3 border-b border-white/10 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center shadow-md shadow-brand-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>IMS NSUT</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 font-mono">WebApp</span>
            </h1>
            <p className="text-[10px] text-slate-400">Direct Ephemeral Attendance</p>
          </div>
        </div>

        {attendanceData && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Switch</span>
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center">
        {tokenError ? (
          <div className="glass-panel p-6 rounded-3xl border border-red-500/30 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-base font-bold text-white">Session Link Expired</h2>
            <p className="text-xs text-slate-400">{tokenError}</p>
            <p className="text-[11px] text-slate-500">Return to Telegram and type <code>/attendance</code> to generate a fresh link.</p>
          </div>
        ) : !attendanceData ? (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-sky-950/30 border border-sky-800/30 text-sky-200 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Your credentials are sent directly over TLS 1.3 to the backend in-memory scraper and are never stored.
              </span>
            </div>
            <LoginForm onSuccess={handleLoginSuccess} />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Student Profile Overview */}
            {attendanceData.profile && (
              <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{attendanceData.profile.name}</h3>
                  <p className="text-xs text-slate-400">{attendanceData.profile.rollNumber} • {attendanceData.profile.program}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    Sem {attendanceData.profile.semester || '1'}
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Bunk Summary Card */}
            <BunkCalculator
              subjects={attendanceData.subjects || []}
              overallPercentage={attendanceData.overallPercentage || 0}
              totalHeld={attendanceData.totalHeld || 0}
              totalAttended={attendanceData.totalAttended || 0}
              target={targetPercentage}
              onTargetChange={setTargetPercentage}
            />

            {/* Course-wise Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Course-wise Breakdown</h3>
              <div className="space-y-3">
                {attendanceData.subjects?.map((subject) => (
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
      </main>

      {/* Footer */}
      <footer className="pt-6 pb-2 text-center text-[10px] text-slate-500 border-t border-white/5 mt-6">
        🔒 End-to-End TLS Encrypted • Zero Data Retention
      </footer>
    </div>
  );
}

export default function TelegramAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">Loading Telegram WebApp...</div>}>
      <TelegramAuthContent />
    </Suspense>
  );
}
