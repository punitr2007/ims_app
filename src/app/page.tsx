'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Notice } from '@/lib/ims/types';
import { createNoticeIndex } from '@/lib/search/fuse_indexer';
import { NoticeSearchBar } from '@/components/notices/NoticeSearchBar';
import { NoticeFilterBar } from '@/components/notices/NoticeFilterBar';
import { NoticeCard } from '@/components/notices/NoticeCard';
import { NoticeModal } from '@/components/notices/NoticeModal';
import { Bell, Sparkles, Loader2, RefreshCw, FileQuestion } from 'lucide-react';
import Fuse from 'fuse.js';

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [onlyWithAttachments, setOnlyWithAttachments] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 40;

  // 1. Initial Load: Fetch recent notices for fast first paint
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/data/notices-recent.json');
        if (res.ok) {
          const data: Notice[] = await res.json();
          setNotices(data);
        }
      } catch (err) {
        console.error('Failed to load recent notices', err);
      } finally {
        setLoading(false);
      }

      // 2. Background Load: Fetch full 10,000+ archive without blocking UI
      try {
        const fullRes = await fetch('/data/notices.json');
        if (fullRes.ok) {
          const fullData: Notice[] = await fullRes.json();
          setNotices(fullData);
          setFullLoaded(true);
        }
      } catch (err) {
        console.warn('Full archive load fallback', err);
      }
    }

    loadData();
  }, []);

  // Compute available years for filtering
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    for (const n of notices) {
      const parts = n.publishedDate.split('-');
      if (parts.length === 3 && parts[2]) {
        yearsSet.add(parts[2]);
      }
    }
    return Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
  }, [notices]);

  // Create Fuse.js Index
  const fuseIndex = useMemo(() => {
    return createNoticeIndex(notices);
  }, [notices]);

  // Filter & Search Pipeline
  const filteredNotices = useMemo(() => {
    let result = notices;

    // 1. Text Search via Fuse
    if (query.trim().length >= 2) {
      const searchResults = fuseIndex.search(query.trim());
      result = searchResults.map((r) => r.item);
    }

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter((n) => {
        const titleLower = n.title.toLowerCase();
        const deptLower = n.department.toLowerCase();
        const pubLower = n.publisher.toLowerCase();

        if (selectedCategory === 'hostel') {
          return titleLower.includes('hostel') || deptLower.includes('hostel') || pubLower.includes('hostel');
        }
        if (selectedCategory === 'exam') {
          return (
            titleLower.includes('exam') ||
            titleLower.includes('date sheet') ||
            titleLower.includes('datesheet') ||
            titleLower.includes('mid sem') ||
            titleLower.includes('end sem') ||
            deptLower.includes('exam')
          );
        }
        if (selectedCategory === 'academic') {
          return (
            titleLower.includes('academic') ||
            titleLower.includes('mentor') ||
            titleLower.includes('syllabus') ||
            titleLower.includes('course') ||
            deptLower.includes('academic')
          );
        }
        if (selectedCategory === 'placement') {
          return (
            titleLower.includes('placement') ||
            titleLower.includes('intern') ||
            titleLower.includes('training') ||
            titleLower.includes('t&p')
          );
        }
        if (selectedCategory === 'sports') {
          return titleLower.includes('sports') || titleLower.includes('nss') || titleLower.includes('ncc');
        }
        return true;
      });
    }

    // 3. Year Filter
    if (selectedYear !== 'all') {
      result = result.filter((n) => n.publishedDate.endsWith(`-${selectedYear}`));
    }

    // 4. Attachments Only Filter
    if (onlyWithAttachments) {
      result = result.filter((n) => Boolean(n.attachmentUrl));
    }

    return result;
  }, [notices, query, selectedCategory, selectedYear, onlyWithAttachments, fuseIndex]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, selectedCategory, selectedYear, onlyWithAttachments]);

  const paginatedNotices = useMemo(() => {
    return filteredNotices.slice(0, page * PAGE_SIZE);
  }, [filteredNotices, page]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Hero Search Section */}
      <div className="glass-panel p-5 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <Bell className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Notices & Circulars Explorer
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Search all current and archived NSUT official circulars, datesheets, and notifications with instant filtering.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {fullLoaded ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>All {notices.length.toLocaleString()} Indexed</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 text-xs font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Indexing Archive...</span>
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <NoticeSearchBar
          query={query}
          onQueryChange={setQuery}
          totalMatches={filteredNotices.length}
          totalLoaded={notices.length}
        />

        {/* Filter Controls */}
        <NoticeFilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYear}
          onlyWithAttachments={onlyWithAttachments}
          onToggleAttachments={() => setOnlyWithAttachments((prev) => !prev)}
          availableYears={availableYears}
        />
      </div>

      {/* Notices Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading notices catalog...</p>
        </div>
      ) : paginatedNotices.length === 0 ? (
        <div className="py-16 text-center space-y-3 glass-panel rounded-3xl p-8 border border-white/5">
          <FileQuestion className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No notices found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No notices match your current search &quot;{query}&quot; or active filters. Try adjusting your search query or selecting &quot;All Notices&quot;.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setSelectedCategory('all');
              setSelectedYear('all');
              setOnlyWithAttachments(false);
            }}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors mt-2"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {paginatedNotices.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                onOpenNotice={(n) => setSelectedNotice(n)}
              />
            ))}
          </div>

          {/* Load More Button */}
          {paginatedNotices.length < filteredNotices.length && (
            <div className="text-center pt-4">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2.5 rounded-2xl bg-slate-900 border border-white/10 hover:border-brand-500/40 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-lg hover:shadow-brand-500/10"
              >
                Load More Notices ({filteredNotices.length - paginatedNotices.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* PDF / Document Modal */}
      <NoticeModal
        notice={selectedNotice}
        onClose={() => setSelectedNotice(null)}
      />
    </div>
  );
}
