'use client';

import React from 'react';
import { Paperclip, Sparkles, Filter } from 'lucide-react';
import clsx from 'clsx';

export const CATEGORIES = [
  { id: 'all', label: 'All Notices' },
  { id: 'hostel', label: '🏠 Hostels' },
  { id: 'exam', label: '📝 Exams & Datesheets' },
  { id: 'academic', label: '🎓 Academics' },
  { id: 'placement', label: '💼 Placement & Internships' },
  { id: 'sports', label: '🏆 Sports & NSS' },
];

interface NoticeFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onlyWithAttachments: boolean;
  onToggleAttachments: () => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  availableYears: string[];
}

export function NoticeFilterBar({
  selectedCategory,
  onSelectCategory,
  onlyWithAttachments,
  onToggleAttachments,
  selectedYear,
  onSelectYear,
  availableYears,
}: NoticeFilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={clsx(
                'px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 active:scale-95',
                isSelected
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 border border-sky-400/30'
                  : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-white/5 hover:border-white/15'
              )}
            >
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Controls: Year Filter & Attachment Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span>Academic Year:</span>
          </span>
          <select
            value={selectedYear}
            onChange={(e) => onSelectYear(e.target.value)}
            className="bg-slate-900/90 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-mono font-semibold focus:outline-none focus:border-sky-500 cursor-pointer shadow-sm"
          >
            <option value="all">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onToggleAttachments}
          className={clsx(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all text-xs font-semibold active:scale-95',
            onlyWithAttachments
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm shadow-sky-500/20'
              : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200 hover:border-white/15'
          )}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>Attachments Only</span>
        </button>
      </div>
    </div>
  );
}
