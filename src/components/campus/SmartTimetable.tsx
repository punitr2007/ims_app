'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AttendanceSubject } from '@/lib/ims/types';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Coffee,
  Building2,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import { AttendanceDetailOverlay } from '../attendance/AttendanceDetailOverlay';

interface SmartTimetableProps {
  enrolledSubjects?: AttendanceSubject[];
  targetPercentage?: number;
  onNavigateToRooms?: (day: string, slot: string) => void;
}

interface TimetableSlot {
  id: string;
  period: string;
  time: string;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  subjectCode: string;
  subjectName: string;
  room: string;
  instructor?: string;
  isLunch?: boolean;
}

const DAYS_OF_WEEK = [
  { id: 'Mon', name: 'Monday', short: 'Mon' },
  { id: 'Tue', name: 'Tuesday', short: 'Tue' },
  { id: 'Wed', name: 'Wednesday', short: 'Wed' },
  { id: 'Thu', name: 'Thursday', short: 'Thu' },
  { id: 'Fri', name: 'Friday', short: 'Fri' },
];

export function SmartTimetable({
  enrolledSubjects = [],
  targetPercentage = 75,
  onNavigateToRooms,
}: SmartTimetableProps) {
  // Determine today's day (Mon-Fri). If weekend, default to Mon.
  const todayDayId = useMemo(() => {
    const dayNum = new Date().getDay(); // 0 is Sun, 1 is Mon...
    if (dayNum >= 1 && dayNum <= 5) {
      return DAYS_OF_WEEK[dayNum - 1].id;
    }
    return 'Mon';
  }, []);

  const [selectedDay, setSelectedDay] = useState<string>(todayDayId);
  const [selectedSubjectForDetail, setSelectedSubjectForDetail] = useState<AttendanceSubject | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Keep track of current time (HH:MM) to highlight current active lecture
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setCurrentTimeStr(`${hh}:${mm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Map enrolled subjects into a realistic weekly academic schedule
  const scheduleByDay: Record<string, TimetableSlot[]> = useMemo(() => {
    const subjects = enrolledSubjects.length > 0
      ? enrolledSubjects
      : [
          { subjectCode: 'EAPC302', subjectName: 'Signals and Systems', attended: 49, totalHeld: 49, percentage: 100 },
          { subjectCode: 'EAPC303', subjectName: 'Probability Theory and Random Process', attended: 38, totalHeld: 49, percentage: 77.6 },
          { subjectCode: 'EAPC304', subjectName: 'Microelectronics Circuits and Applications', attended: 33, totalHeld: 41, percentage: 80.5 },
          { subjectCode: 'EAPC305', subjectName: 'Digital Circuits and Systems', attended: 30, totalHeld: 32, percentage: 93.8 },
          { subjectCode: 'EPMTC301', subjectName: 'Mathematics For Machine Learning', attended: 49, totalHeld: 53, percentage: 92.5 },
        ];

    const s0 = subjects[0 % subjects.length];
    const s1 = subjects[1 % subjects.length];
    const s2 = subjects[2 % subjects.length];
    const s3 = subjects[3 % subjects.length];
    const s4 = subjects[4 % subjects.length];

    return {
      Mon: [
        { id: 'mon-1', period: 'Period 1', time: '09:00 AM - 10:00 AM', startTime: '09:00', endTime: '10:00', subjectCode: s0.subjectCode, subjectName: s0.subjectName, room: 'APJ-102', instructor: 'Dr. A. K. Sharma' },
        { id: 'mon-2', period: 'Period 2', time: '10:00 AM - 11:00 AM', startTime: '10:00', endTime: '11:00', subjectCode: s1.subjectCode, subjectName: s1.subjectName, room: 'APJ-102', instructor: 'Prof. R. Verma' },
        { id: 'mon-3', period: 'Period 3', time: '11:00 AM - 12:00 PM', startTime: '11:00', endTime: '12:00', subjectCode: s2.subjectCode, subjectName: s2.subjectName, room: 'Block IV Lab 2', instructor: 'Dr. M. Gupta' },
        { id: 'mon-4', period: 'Period 4', time: '12:00 PM - 01:00 PM', startTime: '12:00', endTime: '13:00', subjectCode: s3.subjectCode, subjectName: s3.subjectName, room: 'APJ-04', instructor: 'Prof. N. Sen' },
        { id: 'mon-lunch', period: 'Lunch Break', time: '01:00 PM - 02:00 PM', startTime: '13:00', endTime: '14:00', subjectCode: 'BREAK', subjectName: 'Campus Lunch & Library Recess', room: 'Student Center / Canteen', isLunch: true },
        { id: 'mon-5', period: 'Period 5', time: '02:00 PM - 03:00 PM', startTime: '14:00', endTime: '15:00', subjectCode: s4.subjectCode, subjectName: s4.subjectName, room: 'APJ-108', instructor: 'Dr. P. Roy' },
        { id: 'mon-6', period: 'Period 6', time: '03:00 PM - 04:00 PM', startTime: '15:00', endTime: '16:00', subjectCode: s0.subjectCode, subjectName: `${s0.subjectName} (Tutorial)`, room: 'Block II CR-12', instructor: 'Dr. A. K. Sharma' },
      ],
      Tue: [
        { id: 'tue-1', period: 'Period 1', time: '09:00 AM - 10:00 AM', startTime: '09:00', endTime: '10:00', subjectCode: s3.subjectCode, subjectName: s3.subjectName, room: 'APJ-104', instructor: 'Prof. N. Sen' },
        { id: 'tue-2', period: 'Period 2', time: '10:00 AM - 11:00 AM', startTime: '10:00', endTime: '11:00', subjectCode: s0.subjectCode, subjectName: s0.subjectName, room: 'APJ-104', instructor: 'Dr. A. K. Sharma' },
        { id: 'tue-3', period: 'Period 3', time: '11:00 AM - 12:00 PM', startTime: '11:00', endTime: '12:00', subjectCode: s4.subjectCode, subjectName: s4.subjectName, room: 'APJ-05', instructor: 'Dr. P. Roy' },
        { id: 'tue-4', period: 'Period 4', time: '12:00 PM - 01:00 PM', startTime: '12:00', endTime: '13:00', subjectCode: s1.subjectCode, subjectName: s1.subjectName, room: 'APJ-02', instructor: 'Prof. R. Verma' },
        { id: 'tue-lunch', period: 'Lunch Break', time: '01:00 PM - 02:00 PM', startTime: '13:00', endTime: '14:00', subjectCode: 'BREAK', subjectName: 'Campus Lunch & Library Recess', room: 'Student Center / Canteen', isLunch: true },
        { id: 'tue-5', period: 'Period 5-6 (Lab)', time: '02:00 PM - 04:00 PM', startTime: '14:00', endTime: '16:00', subjectCode: s2.subjectCode, subjectName: `${s2.subjectName} Practical`, room: 'VLSI / Micro Lab 3', instructor: 'Dr. M. Gupta' },
      ],
      Wed: [
        { id: 'wed-1', period: 'Period 1', time: '09:00 AM - 10:00 AM', startTime: '09:00', endTime: '10:00', subjectCode: s4.subjectCode, subjectName: s4.subjectName, room: 'APJ-106', instructor: 'Dr. P. Roy' },
        { id: 'wed-2', period: 'Period 2', time: '10:00 AM - 11:00 AM', startTime: '10:00', endTime: '11:00', subjectCode: s2.subjectCode, subjectName: s2.subjectName, room: 'APJ-106', instructor: 'Dr. M. Gupta' },
        { id: 'wed-3', period: 'Period 3', time: '11:00 AM - 12:00 PM', startTime: '11:00', endTime: '12:00', subjectCode: s1.subjectCode, subjectName: s1.subjectName, room: 'APJ-08', instructor: 'Prof. R. Verma' },
        { id: 'wed-4', period: 'Period 4', time: '12:00 PM - 01:00 PM', startTime: '12:00', endTime: '13:00', subjectCode: s0.subjectCode, subjectName: s0.subjectName, room: 'APJ-08', instructor: 'Dr. A. K. Sharma' },
        { id: 'wed-lunch', period: 'Lunch Break', time: '01:00 PM - 02:00 PM', startTime: '13:00', endTime: '14:00', subjectCode: 'BREAK', subjectName: 'Campus Lunch & Library Recess', room: 'Student Center / Canteen', isLunch: true },
        { id: 'wed-5', period: 'Period 5', time: '02:00 PM - 03:00 PM', startTime: '14:00', endTime: '15:00', subjectCode: s3.subjectCode, subjectName: s3.subjectName, room: 'APJ-110', instructor: 'Prof. N. Sen' },
        { id: 'wed-6', period: 'Period 6', time: '03:00 PM - 04:00 PM', startTime: '15:00', endTime: '16:00', subjectCode: s4.subjectCode, subjectName: `${s4.subjectName} (Tutorial)`, room: 'Block II CR-14', instructor: 'Dr. P. Roy' },
      ],
      Thu: [
        { id: 'thu-1', period: 'Period 1', time: '09:00 AM - 10:00 AM', startTime: '09:00', endTime: '10:00', subjectCode: s1.subjectCode, subjectName: s1.subjectName, room: 'APJ-102', instructor: 'Prof. R. Verma' },
        { id: 'thu-2', period: 'Period 2', time: '10:00 AM - 11:00 AM', startTime: '10:00', endTime: '11:00', subjectCode: s3.subjectCode, subjectName: s3.subjectName, room: 'APJ-102', instructor: 'Prof. N. Sen' },
        { id: 'thu-3', period: 'Period 3', time: '11:00 AM - 12:00 PM', startTime: '11:00', endTime: '12:00', subjectCode: s0.subjectCode, subjectName: s0.subjectName, room: 'APJ-04', instructor: 'Dr. A. K. Sharma' },
        { id: 'thu-4', period: 'Period 4', time: '12:00 PM - 01:00 PM', startTime: '12:00', endTime: '13:00', subjectCode: s2.subjectCode, subjectName: s2.subjectName, room: 'APJ-04', instructor: 'Dr. M. Gupta' },
        { id: 'thu-lunch', period: 'Lunch Break', time: '01:00 PM - 02:00 PM', startTime: '13:00', endTime: '14:00', subjectCode: 'BREAK', subjectName: 'Campus Lunch & Library Recess', room: 'Student Center / Canteen', isLunch: true },
        { id: 'thu-5', period: 'Period 5-6 (Lab)', time: '02:00 PM - 04:00 PM', startTime: '14:00', endTime: '16:00', subjectCode: s3.subjectCode, subjectName: `${s3.subjectName} Digital Systems Lab`, room: 'Block IV Hardware Lab', instructor: 'Prof. N. Sen' },
      ],
      Fri: [
        { id: 'fri-1', period: 'Period 1', time: '09:00 AM - 10:00 AM', startTime: '09:00', endTime: '10:00', subjectCode: s2.subjectCode, subjectName: s2.subjectName, room: 'APJ-108', instructor: 'Dr. M. Gupta' },
        { id: 'fri-2', period: 'Period 2', time: '10:00 AM - 11:00 AM', startTime: '10:00', endTime: '11:00', subjectCode: s4.subjectCode, subjectName: s4.subjectName, room: 'APJ-108', instructor: 'Dr. P. Roy' },
        { id: 'fri-3', period: 'Period 3', time: '11:00 AM - 12:00 PM', startTime: '11:00', endTime: '12:00', subjectCode: s1.subjectCode, subjectName: s1.subjectName, room: 'APJ-06', instructor: 'Prof. R. Verma' },
        { id: 'fri-4', period: 'Period 4', time: '12:00 PM - 01:00 PM', startTime: '12:00', endTime: '13:00', subjectCode: s3.subjectCode, subjectName: s3.subjectName, room: 'APJ-06', instructor: 'Prof. N. Sen' },
        { id: 'fri-lunch', period: 'Lunch Break', time: '01:00 PM - 02:00 PM', startTime: '13:00', endTime: '14:00', subjectCode: 'BREAK', subjectName: 'Campus Lunch & Library Recess', room: 'Student Center / Canteen', isLunch: true },
        { id: 'fri-5', period: 'Period 5', time: '02:00 PM - 03:00 PM', startTime: '14:00', endTime: '15:00', subjectCode: s0.subjectCode, subjectName: s0.subjectName, room: 'APJ-112', instructor: 'Dr. A. K. Sharma' },
      ],
    };
  }, [enrolledSubjects]);

  const activeSlots = scheduleByDay[selectedDay] || [];

  // Match subject metadata from enrolledSubjects
  const subjectMap = useMemo(() => {
    const map = new Map<string, AttendanceSubject>();
    for (const sub of enrolledSubjects) {
      map.set(sub.subjectCode, sub);
    }
    return map;
  }, [enrolledSubjects]);

  // Check if slot is active right now
  const isSlotLiveNow = (slot: TimetableSlot) => {
    if (selectedDay !== todayDayId || !currentTimeStr) return false;
    return currentTimeStr >= slot.startTime && currentTimeStr < slot.endTime;
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Top Banner / Day Selector */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] p-0.5 shadow-sm">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[var(--brand-from,#84cc16)]" />
                </div>
              </div>
              <h3 className="font-bold text-white text-base sm:text-lg tracking-tight">
                Smart Weekly Timetable
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[var(--brand-from,#84cc16)]/15 text-[var(--brand-from,#84cc16)] border border-[var(--brand-from,#84cc16)]/30">
                Odd Sem 2026-27
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Personalized lecture schedule mapped directly to your enrolled courses &amp; campus venues.
            </p>
          </div>

          {/* Day Selector Pills */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-white/10 self-start sm:self-auto no-scrollbar overflow-x-auto max-w-full">
            {DAYS_OF_WEEK.map((d) => {
              const isSelected = selectedDay === d.id;
              const isToday = todayDayId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDay(d.id)}
                  className={clsx(
                    'px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5',
                    isSelected
                      ? 'bg-gradient-to-r from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] text-slate-950 shadow-md shadow-[var(--brand-from,#84cc16)]/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  )}
                >
                  <span>{d.name}</span>
                  {isToday && (
                    <span
                      className={clsx(
                        'w-1.5 h-1.5 rounded-full',
                        isSelected ? 'bg-slate-950' : 'bg-emerald-400 animate-ping'
                      )}
                      title="Today"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule Grid / Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {activeSlots.map((slot) => {
            const isLive = isSlotLiveNow(slot);
            const subData = subjectMap.get(slot.subjectCode);
            const isSafe = subData ? subData.percentage >= targetPercentage : true;

            if (slot.isLunch) {
              return (
                <div
                  key={slot.id}
                  className="md:col-span-2 p-3 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex items-center justify-between text-xs text-amber-200/90"
                >
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <strong className="text-white">{slot.period}:</strong> {slot.subjectName} ({slot.time})
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono font-medium">Recess</span>
                </div>
              );
            }

            return (
              <div
                key={slot.id}
                className={clsx(
                  'group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 shadow-md overflow-hidden',
                  isLive
                    ? 'bg-slate-900/95 border-[var(--brand-from,#84cc16)] shadow-[var(--brand-from,#84cc16)]/15 ring-1 ring-[var(--brand-from,#84cc16)]/50'
                    : 'bg-slate-900/70 border-white/5 hover:border-white/15 hover:bg-slate-850'
                )}
              >
                {/* Subtle Hover Gradient Bloom */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--brand-from,#84cc16)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="space-y-2 relative z-10">
                  {/* Top Bar: Period, Time & Live Indicator */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-300 text-[11px] bg-slate-950 px-2 py-0.5 rounded-lg border border-white/5">
                        {slot.period}
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {slot.time}
                      </span>
                    </div>

                    {isLive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black tracking-wider uppercase animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Live Now
                      </span>
                    )}
                  </div>

                  {/* Course Code & Name */}
                  <div>
                    <div className="text-[10px] font-mono font-bold text-brand-300 uppercase tracking-wider">
                      {slot.subjectCode}
                    </div>
                    <h4 className="font-bold text-white text-sm sm:text-base leading-snug tracking-tight">
                      {slot.subjectName}
                    </h4>
                  </div>
                </div>

                {/* Bottom Details Bar: Room, Instructor, Attendance Badge & Overlay Trigger */}
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] relative z-10">
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300 font-medium">
                      <MapPin className="w-3 h-3 text-brand-400" />
                      {slot.room}
                    </span>
                    {slot.instructor && (
                      <span className="hidden xs:flex items-center gap-1 text-slate-400">
                        <User className="w-3 h-3 text-slate-500" />
                        {slot.instructor}
                      </span>
                    )}
                  </div>

                  {/* Course Attendance Badge & Action */}
                  {subData && (
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectForDetail(subData)}
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95',
                        isSafe
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
                          : 'bg-rose-950/40 text-rose-300 border-rose-800/40 hover:bg-rose-900/40'
                      )}
                      title="View Daily Records & Attendance History"
                    >
                      <span>{subData.percentage}%</span>
                      <span>{isSafe ? 'Safe' : 'Risk'}</span>
                      <ChevronRight className="w-3 h-3 opacity-70" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attendance Detail Overlay (Opened when clicking attendance badge on timetable) */}
      {selectedSubjectForDetail && (
        <AttendanceDetailOverlay
          isOpen={Boolean(selectedSubjectForDetail)}
          onClose={() => setSelectedSubjectForDetail(null)}
          subject={selectedSubjectForDetail}
          targetPercentage={targetPercentage}
          initialTab="daily"
        />
      )}
    </div>
  );
}

