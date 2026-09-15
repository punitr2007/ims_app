'use client';

import React from 'react';
import { Notice } from '@/lib/ims/types';
import { X, ExternalLink, Calendar, Building, User, Download, FileText } from 'lucide-react';

interface NoticeModalProps {
  notice: Notice | null;
  onClose: () => void;
}

export function NoticeModal({ notice, onClose }: NoticeModalProps) {
  if (!notice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="glass-panel bg-slate-900/95 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                {notice.publishedDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-sky-300">
                <Building className="w-3.5 h-3.5" />
                {notice.department}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white leading-snug">
              {notice.title}
            </h2>
            {notice.publisher && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Published by: {notice.publisher}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Document Preview */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-[350px] flex flex-col items-center justify-center">
          {notice.attachmentUrl ? (
            <div className="w-full h-full flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 bg-slate-800/60 p-3 rounded-xl border border-white/5 text-xs">
                <div className="flex items-center gap-2 text-slate-300 truncate">
                  <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="truncate">{notice.attachmentUrl}</span>
                </div>
                <a
                  href={notice.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium shrink-0 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Official Document</span>
                </a>
              </div>

              {/* Embedded Document Frame */}
              <div className="w-full flex-1 min-h-[450px] rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                <iframe
                  src={notice.attachmentUrl}
                  className="w-full h-full min-h-[450px]"
                  title={notice.title}
                  loading="lazy"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm">This circular contains text only with no attached PDF file.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 bg-slate-950/50">
          <span>Notice ID: <code className="font-mono text-[11px] text-slate-300">{notice.id}</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
