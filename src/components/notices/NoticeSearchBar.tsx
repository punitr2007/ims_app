'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface NoticeSearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  totalMatches: number;
  totalLoaded: number;
}

export function NoticeSearchBar({
  query,
  onQueryChange,
  totalMatches,
  totalLoaded,
}: NoticeSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full space-y-2.5">
      <div className="relative flex items-center group">
        <div className="absolute left-4 text-slate-400 pointer-events-none group-focus-within:text-sky-400 transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search 10,000+ notices, circulars, hostels, date sheets, faculty..."
          className="w-full pl-12 pr-24 py-3.5 sm:py-4 bg-slate-950/70 border border-white/10 rounded-3xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400/80 transition-all text-sm sm:text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:shadow-[0_0_25px_-5px_rgba(14,165,233,0.35)]"
        />

        <div className="absolute right-4 flex items-center gap-2">
          {query ? (
            <button
              onClick={() => onQueryChange('')}
              className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all active:scale-90"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-400 bg-slate-900 border border-white/10 rounded-xl shadow-inner">
              <span className="text-[10px]">⌘</span>K /
            </kbd>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 px-2">
        <span className="flex items-center gap-1.5">
          <span>Found</span>
          <strong className="text-sky-400 font-mono font-bold">{totalMatches.toLocaleString()}</strong>
          <span>circulars</span>
          {query ? (
            <span className="text-slate-300 font-medium">for &ldquo;{query}&rdquo;</span>
          ) : (
            <span className="text-slate-500">across {totalLoaded.toLocaleString()} archived records</span>
          )}
        </span>
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span>Fuzzy Index</span>
        </span>
      </div>
    </div>
  );
}
