'use client';

import React, { useState } from 'react';
import { Notice } from '@/lib/ims/types';
import { Calendar, Building, User, FileText, ExternalLink, Share2, Check, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface NoticeCardProps {
  notice: Notice;
  onOpenNotice: (notice: Notice) => void;
}

export function NoticeCard({ notice, onOpenNotice }: NoticeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notice.attachmentUrl) {
      navigator.clipboard.writeText(notice.attachmentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      onClick={() => onOpenNotice(notice)}
      className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl cursor-pointer group flex flex-col justify-between transition-all"
    >
      <div className="space-y-3">
        {/* Top Header: Date, New Badge & Category */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-brand-400" />
            <span>{notice.publishedDate}</span>
          </div>

          {notice.isNew && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold tracking-wide uppercase animate-pulse">
              <Sparkles className="w-2.5 h-2.5" />
              <span>New</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-slate-100 font-semibold text-sm sm:text-base leading-snug group-hover:text-brand-300 transition-colors line-clamp-3">
          {notice.title}
        </h3>

        {/* Metadata: Department & Publisher */}
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-400 pt-1">
          {notice.department && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Building className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-[240px]">{notice.department}</span>
            </div>
          )}
          {notice.publisher && (
            <div className="flex items-center gap-1 text-slate-400">
              <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate max-w-[180px]">{notice.publisher}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-brand-400 font-medium group-hover:translate-x-0.5 transition-transform">
          <FileText className="w-4 h-4" />
          <span>{notice.attachmentUrl ? (notice.isExternalLink ? 'Open Link' : 'View Document') : 'View Details'}</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </div>

        {notice.attachmentUrl && (
          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Copy document link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
