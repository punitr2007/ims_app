'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Notice } from '@/lib/ims/types';
import { createNoticeIndex } from '@/lib/search/fuse_indexer';
import { NoticeSearchBar } from '@/components/notices/NoticeSearchBar';
import { NoticeFilterBar } from '@/components/notices/NoticeFilterBar';
import { NoticeCard } from '@/components/notices/NoticeCard';
import { NoticeModal } from '@/components/notices/NoticeModal';
import {
  Bell,
  Sparkles,
  Loader2,
  RefreshCw,
  FileQuestion,
  Zap,
  CheckCircle2,
  X,
} from 'lucide-react';
import clsx from 'clsx';

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

  // Live on-demand scraper sync state
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [liveSyncNotification, setLiveSyncNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [freshlySyncedIds, setFreshlySyncedIds] = useState<Set<string>>(new Set());

  // 1. Initial Load: Fetch recent notices for fast first paint + restore local live notices
  useEffect(() => {
    async function loadData() {
      let localLive: Notice[] = [];
      try {
        const saved = localStorage.getItem('ims_live_synced_notices_v1');
        if (saved) {
          localLive = JSON.parse(saved);
          if (localLive.length > 0) {
            setFreshlySyncedIds(new Set(localLive.map((n) => n.id)));
          }
        }
      } catch {
        // ignore
      }

      try {
        setLoading(true);
        const res = await fetch('/data/notices-recent.json');
        if (res.ok) {
          const recentData: Notice[] = await res.json();
          // Merge local live notices at the top without duplicates
          const seenIds = new Set(localLive.map((n) => n.id));
          const merged = [...localLive, ...recentData.filter((n) => !seenIds.has(n.id))];
          setNotices(merged);
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
          const seenIds = new Set(localLive.map((n) => n.id));
          const merged = [...localLive, ...fullData.filter((n) => !seenIds.has(n.id))];
          setNotices(merged);
          setFullLoaded(true);
        }
      } catch (err) {
        console.warn('Full archive load fallback', err);
      }
    }

    loadData();
  }, []);

  // On-Demand Real-Time Live Scraper Sync
  const handleSyncLiveNotices = useCallback(async (isManual = true) => {
    if (isLiveSyncing) return;
    setIsLiveSyncing(true);
    if (isManual) {
      setLiveSyncNotification({
        type: 'info',
        message: 'Connecting to official IMS NSUT website for latest notices...',
      });
    }

    try {
      const res = await fetch('/api/notices/live');
      const data = await res.json();

      if (data.success && Array.isArray(data.notices)) {
        const liveList: Notice[] = data.notices;

        setNotices((currentNotices) => {
          const existingIds = new Set(currentNotices.map((n) => n.id));
          const existingKeys = new Set(
            currentNotices.map((n) => `${n.publishedDate}|${n.title.toLowerCase().trim()}`)
          );

          const trulyNew = liveList.filter(
            (n) =>
              !existingIds.has(n.id) &&
              !existingKeys.has(`${n.publishedDate}|${n.title.toLowerCase().trim()}`)
          );

          if (trulyNew.length > 0) {
            const newIds = new Set(trulyNew.map((n) => n.id));
            setFreshlySyncedIds((prev) => new Set([...prev, ...newIds]));

            // Save to localStorage for offline and persistent display
            try {
              const prevLiveRaw = localStorage.getItem('ims_live_synced_notices_v1');
              const prevLive: Notice[] = prevLiveRaw ? JSON.parse(prevLiveRaw) : [];
              const combinedLive = [...trulyNew, ...prevLive.filter((p) => !newIds.has(p.id))];
              localStorage.setItem(
                'ims_live_synced_notices_v1',
                JSON.stringify(combinedLive.slice(0, 100))
              );
            } catch {
              // ignore
            }

            setLiveSyncNotification({
              type: 'success',
              message: `🎉 Synced ${trulyNew.length} newly published circular${
                trulyNew.length > 1 ? 's' : ''
              } directly from IMS NSUT!`,
            });

            return [...trulyNew, ...currentNotices];
          } else {
            if (isManual) {
              setLiveSyncNotification({
                type: 'success',
                message: '✅ Up to date! Your feed matches the newest circulars on IMS NSUT.',
              });
            }
            return currentNotices;
          }
        });
      } else {
        if (isManual) {
          setLiveSyncNotification({
            type: 'error',
            message: data.error || 'Could not connect to IMS NSUT server. Please try again in a few moments.',
          });
        }
      }
    } catch {
      if (isManual) {
        setLiveSyncNotification({
          type: 'error',
          message: 'Network error connecting to IMS NSUT server.',
        });
      }
    } finally {
      setIsLiveSyncing(false);
    }
  }, [isLiveSyncing]);

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
      <div className="glass-panel p-5 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle decorative ambient gradient blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-500/20 text-sky-400 border border-sky-500/30 shadow-inner">
                <Bell className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                Notices &amp; Circulars Explorer
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
              Search all current and archived NSUT official circulars, exam datesheets, hostel notifications, and academic orders with instant fuzzy matching.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Live IMS Direct Sync Button */}
            <button
              type="button"
              onClick={() => handleSyncLiveNotices(true)}
              disabled={isLiveSyncing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] hover:brightness-110 text-slate-950 text-xs font-bold shadow-md shadow-[var(--brand-from)]/25 transition-all active:scale-95 disabled:opacity-50"
              title="Check official IMS NSUT website for circulars published in the last few minutes"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isLiveSyncing && 'animate-spin')} />
              <span>{isLiveSyncing ? 'Fetching Live...' : 'Check Live IMS'}</span>
            </button>

            {fullLoaded ? (
              <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shadow-sm shadow-emerald-500/15">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{notices.length.toLocaleString()} Indexed</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Indexing Archive...</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Sync Status Toast / Banner */}
        {liveSyncNotification && (
          <div
            className={clsx(
              'p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all animate-in fade-in slide-in-from-top-1',
              liveSyncNotification.type === 'success' &&
                'bg-emerald-950/40 border-emerald-500/40 text-emerald-200',
              liveSyncNotification.type === 'info' &&
                'bg-sky-950/40 border-sky-500/40 text-sky-200',
              liveSyncNotification.type === 'error' &&
                'bg-rose-950/40 border-rose-500/40 text-rose-200'
            )}
          >
            <div className="flex items-center gap-2">
              {liveSyncNotification.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {liveSyncNotification.type === 'info' && (
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
              )}
              {liveSyncNotification.type === 'error' && (
                <Zap className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{liveSyncNotification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setLiveSyncNotification(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
        <div className="py-14 text-center space-y-4 glass-panel rounded-3xl p-6 sm:p-8 border border-white/5">
          <FileQuestion className="w-12 h-12 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-200">No matching circulars found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No notices match your current filters or search &ldquo;{query}&rdquo;.
            </p>
          </div>

          {/* Quick Trigger: Fetch straight from IMS NSUT */}
          <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/30 max-w-md mx-auto space-y-2">
            <p className="text-[11px] text-sky-200">
              Expecting a newly released circular or date sheet that was just announced?
            </p>
            <button
              type="button"
              onClick={() => handleSyncLiveNotices(true)}
              disabled={isLiveSyncing}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 mx-auto shadow-md shadow-sky-500/25 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isLiveSyncing && 'animate-spin')} />
              <span>{isLiveSyncing ? 'Fetching Live...' : 'Fetch Latest Notices Live from IMS NSUT'}</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setQuery('');
                setSelectedCategory('all');
                setSelectedYear('all');
                setOnlyWithAttachments(false);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {paginatedNotices.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                onOpenNotice={(n) => setSelectedNotice(n)}
                isFreshlySynced={freshlySyncedIds.has(notice.id)}
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
