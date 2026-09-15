'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

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
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full space-y-2">
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search className="w-5 h-5 text-brand-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search 10,000+ notices, circulars, hostels, date sheets, faculty..."
          className="w-full pl-11 pr-24 py-3 bg-slate-900/80 border border-white/10 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm sm:text-base shadow-inner"
        />

        <div className="absolute right-3 flex items-center gap-2">
          {query ? (
            <button
              onClick={() => onQueryChange('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60 rounded-md">
              /
            </kbd>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-brand-400 font-semibold">{totalMatches.toLocaleString()}</strong> results
          {query ? ` for "${query}"` : ` (${totalLoaded.toLocaleString()} notices indexed)`}
        </span>
        <span className="text-[11px] text-slate-500">Instant fuzzy search powered by Fuse.js</span>
      </div>
    </div>
  );
}
