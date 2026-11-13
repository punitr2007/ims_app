'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Clock,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  Wind,
  Sparkles,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

interface RoomSchedule {
  name: string;
  floor: string;
  capacity: number;
  hasAC: boolean;
  freeSlotsByDay: Record<string, string[]>; // 'Mon' -> ['09:00 - 10:00', ...]
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
type Day = (typeof DAYS)[number];

const SLOTS = [
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 01:00',
  '01:00 - 02:00', // Lunch
  '02:00 - 03:00',
  '03:00 - 04:00',
  '04:00 - 05:00',
  '05:00 - 06:00',
];

// APJ Complex Room Directory & Standard Unscheduled Slot Matrix (NSUT Campus)
const APJ_ROOMS: RoomSchedule[] = [
  {
    name: 'APJ-01',
    floor: 'Ground Floor',
    capacity: 120,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['12:00 - 01:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Tue: ['09:00 - 10:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Wed: ['11:00 - 12:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Thu: ['09:00 - 10:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Fri: ['10:00 - 11:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
    },
  },
  {
    name: 'APJ-02',
    floor: 'Ground Floor',
    capacity: 120,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['09:00 - 10:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Tue: ['10:00 - 11:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Wed: ['09:00 - 10:00', '12:00 - 01:00', '01:00 - 02:00', '05:00 - 06:00'],
      Thu: ['11:00 - 12:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Fri: ['09:00 - 10:00', '01:00 - 02:00', '02:00 - 03:00', '04:00 - 05:00'],
    },
  },
  {
    name: 'APJ-03',
    floor: 'Ground Floor',
    capacity: 80,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['10:00 - 11:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Tue: ['11:00 - 12:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Wed: ['10:00 - 11:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Thu: ['12:00 - 01:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Fri: ['11:00 - 12:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
    },
  },
  {
    name: 'APJ-04',
    floor: '1st Floor',
    capacity: 80,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['11:00 - 12:00', '01:00 - 02:00', '02:00 - 03:00', '04:00 - 05:00'],
      Tue: ['09:00 - 10:00', '12:00 - 01:00', '01:00 - 02:00', '05:00 - 06:00'],
      Wed: ['09:00 - 10:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Thu: ['10:00 - 11:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Fri: ['12:00 - 01:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
    },
  },
  {
    name: 'APJ-05',
    floor: '1st Floor',
    capacity: 80,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['09:00 - 10:00', '12:00 - 01:00', '01:00 - 02:00', '05:00 - 06:00'],
      Tue: ['10:00 - 11:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Wed: ['11:00 - 12:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Thu: ['09:00 - 10:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Fri: ['10:00 - 11:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
    },
  },
  {
    name: 'APJ-06',
    floor: '1st Floor',
    capacity: 90,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['10:00 - 11:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Tue: ['09:00 - 10:00', '01:00 - 02:00', '02:00 - 03:00', '04:00 - 05:00'],
      Wed: ['12:00 - 01:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Thu: ['11:00 - 12:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Fri: ['09:00 - 10:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
    },
  },
  {
    name: 'APJ-07',
    floor: '2nd Floor',
    capacity: 90,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['11:00 - 12:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Tue: ['10:00 - 11:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Wed: ['09:00 - 10:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Thu: ['12:00 - 01:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Fri: ['11:00 - 12:00', '01:00 - 02:00', '02:00 - 03:00', '04:00 - 05:00'],
    },
  },
  {
    name: 'APJ-08',
    floor: '2nd Floor',
    capacity: 90,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['09:00 - 10:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Tue: ['11:00 - 12:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Wed: ['10:00 - 11:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Thu: ['09:00 - 10:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Fri: ['12:00 - 01:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
    },
  },
  {
    name: 'APJ-09',
    floor: '2nd Floor',
    capacity: 100,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['12:00 - 01:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Tue: ['09:00 - 10:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Wed: ['11:00 - 12:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Thu: ['10:00 - 11:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Fri: ['09:00 - 10:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
    },
  },
  {
    name: 'APJ-10',
    floor: '3rd Floor',
    capacity: 100,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['10:00 - 11:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Tue: ['12:00 - 01:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Wed: ['09:00 - 10:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
      Thu: ['11:00 - 12:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Fri: ['10:00 - 11:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
    },
  },
  {
    name: 'APJ-11',
    floor: '3rd Floor',
    capacity: 120,
    hasAC: true,
    freeSlotsByDay: {
      Mon: ['09:00 - 10:00', '01:00 - 02:00', '02:00 - 03:00', '04:00 - 05:00'],
      Tue: ['10:00 - 11:00', '01:00 - 02:00', '04:00 - 05:00', '05:00 - 06:00'],
      Wed: ['11:00 - 12:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Thu: ['12:00 - 01:00', '01:00 - 02:00', '03:00 - 04:00', '05:00 - 06:00'],
      Fri: ['09:00 - 10:00', '01:00 - 02:00', '02:00 - 03:00', '05:00 - 06:00'],
    },
  },
];

export function RoomFinder() {
  // Infer current day & slot
  const initialDay: Day = useMemo(() => {
    const dayIdx = new Date().getDay();
    if (dayIdx >= 1 && dayIdx <= 5) {
      return DAYS[dayIdx - 1];
    }
    return 'Mon';
  }, []);

  const [selectedDay, setSelectedDay] = useState<Day>(initialDay);
  const [selectedSlot, setSelectedSlot] = useState<string>('11:00 - 12:00');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFree, setOnlyFree] = useState(true);

  // Compute availability per room
  const roomResults = useMemo(() => {
    return APJ_ROOMS.map((room) => {
      const freeSlots = room.freeSlotsByDay[selectedDay] || [];
      const isFree = freeSlots.includes(selectedSlot);
      return {
        ...room,
        isFree,
        freeSlots,
      };
    }).filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (onlyFree && !r.isFree) return false;
      return matchesSearch;
    });
  }, [selectedDay, selectedSlot, searchQuery, onlyFree]);

  const freeCount = roomResults.filter((r) => r.isFree).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overview Card */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-500/15 text-brand-300 border border-brand-500/25">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                APJ Complex Empty Classroom Finder
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
              Find unscheduled, air-conditioned lecture theatres at NSUT for self-study and project work.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/25 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{freeCount} Rooms Free in Selected Slot</span>
            </span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2">
          {/* Day Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-brand-400" />
              <span>Day of the Week</span>
            </label>
            <div className="grid grid-cols-5 gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={clsx(
                    'py-1.5 text-xs font-bold rounded-lg transition-all',
                    selectedDay === d
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Slot Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-brand-400" />
              <span>Lecture Slot</span>
            </label>
            <div className="relative">
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-white focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                {SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s} {s === '01:00 - 02:00' ? '(Lunch Break)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Search & Toggle */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Search className="w-3 h-3 text-brand-400" />
              <span>Search &amp; Filter</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search APJ-01..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setOnlyFree((p) => !p)}
                className={clsx(
                  'px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0',
                  onlyFree
                    ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                    : 'bg-slate-900/80 border-white/10 text-slate-400'
                )}
              >
                {onlyFree ? 'Free Only' : 'All Rooms'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {roomResults.map((room) => (
          <div
            key={room.name}
            className={clsx(
              'glass-panel p-4 sm:p-5 rounded-3xl border transition-all shadow-xl space-y-3.5',
              room.isFree
                ? 'border-emerald-500/30 hover:border-emerald-500/50 bg-gradient-to-br from-emerald-950/20 to-slate-900/80'
                : 'border-white/5 opacity-80'
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                    {room.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {room.floor}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-brand-400" />
                    {room.capacity} seats
                  </span>
                  {room.hasAC && (
                    <span className="flex items-center gap-1 text-sky-400">
                      <Wind className="w-3 h-3" />
                      AC
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={clsx(
                  'px-2.5 py-1 rounded-full text-xs font-bold font-mono border flex items-center gap-1 shrink-0',
                  room.isFree
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                )}
              >
                {room.isFree ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>AVAILABLE</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>SCHEDULED</span>
                  </>
                )}
              </div>
            </div>

            {/* Current Slot Highlight */}
            <div
              className={clsx(
                'p-2.5 rounded-2xl text-xs flex items-center justify-between border',
                room.isFree
                  ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800/40'
                  : 'bg-slate-950/60 text-slate-400 border-white/5'
              )}
            >
              <span className="text-[11px] font-medium">Slot: {selectedSlot}</span>
              <span className="font-bold text-[11px]">
                {room.isFree ? 'Free for Self Study' : 'Regular Class Scheduled'}
              </span>
            </div>

            {/* All Free Slots for Day */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Free Periods on {selectedDay}:
              </span>
              <div className="flex flex-wrap gap-1">
                {room.freeSlots.map((slot) => (
                  <span
                    key={slot}
                    className={clsx(
                      'px-2 py-0.5 rounded-lg font-mono text-[10px] font-medium border',
                      slot === selectedSlot
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50 font-bold'
                        : 'bg-slate-900 text-slate-400 border-white/5'
                    )}
                  >
                    {slot}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
