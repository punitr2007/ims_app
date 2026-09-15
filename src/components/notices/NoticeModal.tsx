'use client';

import React, { useState } from 'react';
import { Notice } from '@/lib/ims/types';
import { X, ExternalLink, Calendar, Building, User, Download, FileText, Share2, Check } from 'lucide-react';

interface NoticeModalProps {
  notice: Notice | null;
  onClose: () => void;
}

export function NoticeModal({ notice, onClose }: NoticeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!notice) return null;

  const getShareableUrl = (rawUrl: string) => {
    if (rawUrl.includes('imsnsit.org')) {
      const base = typeof window !== 'undefined' ? window.location.origin : 'https://ims-app-pearl.vercel.app';
      return `${base}/api/document?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  };

  const handleCopyLink = async (rawUrl: string) => {
    const shareUrl = getShareableUrl(rawUrl);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="glass-panel bg-slate-900/95 border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="space-y-1.5 sm:space-y-2 pr-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                {notice.publishedDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-sky-300 truncate max-w-[200px]">
                <Building className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{notice.department}</span>
              </span>
            </div>
            <h2 className="text-sm sm:text-xl font-bold text-white leading-snug">
              {notice.title}
            </h2>
            {notice.publisher && (
              <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">Published by: {notice.publisher}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 bg-slate-800/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Document Preview */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto min-h-[300px] sm:min-h-[350px] flex flex-col items-center justify-center">
          {notice.attachmentUrl ? (
            (() => {
              const docStreamUrl = notice.attachmentUrl.includes('imsnsit.org')
                ? `/api/document?url=${encodeURIComponent(notice.attachmentUrl)}`
                : notice.attachmentUrl;

              return (
                <div className="w-full h-full flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-white/5 text-xs">
                    <div className="flex items-center gap-2 text-slate-300 truncate">
                      <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                      <span className="truncate">{notice.attachmentUrl}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(notice.attachmentUrl!)}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs shrink-0 transition-colors border border-white/10 active:scale-[0.98]"
                        title="Copy direct shareable document link"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-brand-400" />
                            <span>Share Link</span>
                          </>
                        )}
                      </button>
                      <a
                        href={docStreamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shrink-0 transition-colors shadow-sm active:scale-[0.98]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in New Tab</span>
                      </a>
                      <a
                        href={docStreamUrl}
                        download
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs shrink-0 transition-colors border border-white/10"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {/* Embedded Document Frame */}
                  <div className="w-full flex-1 min-h-[450px] rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                    <iframe
                      src={docStreamUrl}
                      className="w-full h-full min-h-[450px]"
                      title={notice.title}
                      loading="lazy"
                    />
                  </div>
                </div>
              );
            })()
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
