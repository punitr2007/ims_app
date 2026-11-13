'use client';

import React, { useState } from 'react';
import { Notice } from '@/lib/ims/types';
import { Calendar, Building, User, FileText, ExternalLink, Share2, Check, Sparkles, Zap } from 'lucide-react';
import clsx from 'clsx';

interface NoticeCardProps {
  notice: Notice;
  onOpenNotice: (notice: Notice) => void;
  isFreshlySynced?: boolean;
}

export function NoticeCard({ notice, onOpenNotice, isFreshlySynced }: NoticeCardProps) {
  const [copied, setCopied] = useState(false);

  const getShareableUrl = () => {
    if (!notice.attachmentUrl) return '';
    if (notice.attachmentUrl.includes('imsnsit.org')) {
      const base = typeof window !== 'undefined' ? window.location.origin : 'https://ims-app-pearl.vercel.app';
      return `${base}/api/document?url=${encodeURIComponent(notice.attachmentUrl)}`;
    }
    return notice.attachmentUrl;
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getShareableUrl();
    if (!shareUrl) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const isExam =
    notice.department.toUpperCase().includes('EXAM') || notice.title.toUpperCase().includes('EXAM');

  return (
    <div
      onClick={() => onOpenNotice(notice)}
      className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-3xl cursor-pointer group flex flex-col justify-between transition-all border border-white/5 hover:border-sky-500/30 shadow-xl"
    >
      <div className="space-y-3">
        {/* Top Header: Date, New Badge & Category */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>{notice.publishedDate}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isFreshlySynced && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/25 text-sky-300 border border-sky-400/40 text-[10px] font-bold tracking-wide uppercase shadow-sm shadow-sky-500/20">
                <Zap className="w-2.5 h-2.5 text-sky-400" />
                <span>Live IMS</span>
              </span>
            )}
            {isExam && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] font-bold tracking-wide uppercase">
                Exam
              </span>
            )}
            {notice.isNew && !isFreshlySynced && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold tracking-wide uppercase shadow-sm shadow-emerald-500/20 animate-pulse">
                <Sparkles className="w-2.5 h-2.5" />
                <span>New</span>
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-slate-100 font-bold text-sm sm:text-base leading-snug group-hover:text-sky-300 transition-colors line-clamp-3">
          {notice.title}
        </h3>

        {/* Metadata: Department & Publisher */}
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-400 pt-1 font-medium">
          {notice.department && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Building className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-[240px]">{notice.department}</span>
            </div>
          )}
          {notice.publisher && (
            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate max-w-[180px]">{notice.publisher}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold group-hover:translate-x-1 transition-transform">
          <FileText className="w-4 h-4" />
          <span>{notice.attachmentUrl ? (notice.isExternalLink ? 'Open Form/Link' : 'View PDF Document') : 'View Text Notice'}</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </div>

        {notice.attachmentUrl && (
          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-90"
            title="Copy document link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
