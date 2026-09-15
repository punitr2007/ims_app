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
                'px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5',
                isSelected
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.02]'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/5'
              )}
            >
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Controls: Year Filter & Attachment Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-brand-400" />
            <span>Year:</span>
          </span>
          <select
            value={selectedYear}
            onChange={(e) => onSelectYear(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            'flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all text-xs',
            onlyWithAttachments
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
              : 'bg-slate-900/40 text-slate-400 border-white/5 hover:text-slate-200'
          )}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>Attachments Only</span>
        </button>
      </div>
    </div>
  );
}
