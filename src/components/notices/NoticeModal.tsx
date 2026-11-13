'use client';

import React, { useState, useEffect } from 'react';
import { Notice } from '@/lib/ims/types';
import {
  X,
  ExternalLink,
  Calendar,
  Building,
  User,
  Download,
  FileText,
  Share2,
  Check,
  Maximize2,
  Minimize2,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import clsx from 'clsx';

interface NoticeModalProps {
  notice: Notice | null;
  onClose: () => void;
}

function sanitizeFilename(title: string): string {
  const clean = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
  return (clean.slice(0, 60) || 'ims_nsut_notice') + '.pdf';
}

export function NoticeModal({ notice, onClose }: NoticeModalProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  if (!notice) return null;

  const getShareableUrl = (rawUrl: string) => {
    if (rawUrl.includes('imsnsit.org')) {
      const base =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://ims-app-pearl.vercel.app';
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

  const docStreamUrl = notice.attachmentUrl
    ? notice.attachmentUrl.includes('imsnsit.org')
      ? `/api/document?url=${encodeURIComponent(notice.attachmentUrl)}`
      : notice.attachmentUrl
    : null;

  const filename = sanitizeFilename(notice.title);

  const isExam =
    notice.department.toUpperCase().includes('EXAM') ||
    notice.title.toUpperCase().includes('EXAM') ||
    notice.title.toUpperCase().includes('DATE SHEET');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-3 md:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={clsx(
          'glass-panel bg-slate-950/95 border border-white/10 flex flex-col shadow-2xl transition-all duration-300 overflow-hidden',
          isFullscreen
            ? 'w-full h-full rounded-none fixed inset-0 z-50'
            : 'rounded-t-3xl sm:rounded-3xl w-full max-w-6xl h-[95vh] sm:h-[93vh]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-start justify-between gap-3 bg-slate-900/80 shrink-0">
          <div className="space-y-1.5 min-w-0 flex-1 pr-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono text-[11px] sm:text-xs text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                {notice.publishedDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-sky-300 truncate max-w-[220px] sm:max-w-[320px] font-medium">
                <Building className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span className="truncate">{notice.department}</span>
              </span>
              {isExam && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] font-bold tracking-wide uppercase">
                  Exam &amp; Datesheet
                </span>
              )}
            </div>

            <h2 className="text-sm sm:text-lg md:text-xl font-bold text-white leading-snug tracking-tight">
              {notice.title}
            </h2>

            {notice.publisher && (
              <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1 truncate">
                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">Signatory: <strong className="text-slate-300">{notice.publisher}</strong></span>
              </p>
            )}
          </div>

          {/* Action Buttons: Fullscreen & Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border border-white/5 active:scale-90 hidden sm:flex items-center justify-center"
              title={isFullscreen ? 'Exit full screen (Esc)' : 'Expand to full screen'}
              aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-rose-950/60 transition-all border border-white/5 active:scale-90 flex items-center justify-center"
              title="Close viewer (Esc)"
              aria-label="Close viewer"
            >
              <X className="w-5 h-5 text-slate-300 hover:text-rose-300" />
            </button>
          </div>
        </div>

        {/* Clean Document Action Ribbon (Replaced ugly PHP URL with professional toolbar) */}
        {docStreamUrl && (
          <div className="px-3.5 sm:px-5 py-2.5 bg-slate-900/90 border-b border-white/5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            {/* Left: Document Status / Type Badge */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-300 font-semibold text-[11px] sm:text-xs flex items-center gap-1.5 border border-sky-400/20">
                <FileCheck2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Official PDF Circular</span>
              </span>
              <span className="text-slate-400 font-mono text-[11px] hidden md:inline truncate max-w-xs">
                {filename}
              </span>
            </div>

            {/* Right: High-Priority Document Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-auto">
              {/* Copy Shareable Link */}
              <button
                type="button"
                onClick={() => handleCopyLink(notice.attachmentUrl!)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-white/10 active:scale-95"
                title="Copy direct shareable document link"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Share</span>
                  </>
                )}
              </button>

              {/* Open in Native Browser Tab */}
              <a
                href={docStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-white/10 active:scale-95"
                title="Open PDF directly in a new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>New Tab</span>
              </a>

              {/* Download PDF - Primary Call to Action */}
              <a
                href={docStreamUrl}
                download={filename}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/25 active:scale-95 shrink-0"
                title="Download official PDF to your device"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        )}

        {/* Modal Body / Large Document Preview Canvas */}
        <div className="flex-1 p-2 sm:p-4 bg-slate-950 flex flex-col min-h-0 overflow-hidden">
          {docStreamUrl ? (
            <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 shadow-inner relative">
              {/* Embedded Document Frame */}
              <iframe
                src={docStreamUrl}
                className="w-full h-full border-0 rounded-2xl bg-slate-900"
                title={notice.title}
                loading="lazy"
              />

              {/* Mobile Quick Download Bar (visible on touch screens where iframes might be restricted) */}
              <div className="sm:hidden absolute bottom-3 left-3 right-3 p-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/15 flex items-center justify-between gap-2 shadow-2xl">
                <span className="text-[11px] text-slate-300 font-medium truncate pl-1">
                  Viewing official document
                </span>
                <a
                  href={docStreamUrl}
                  download={filename}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center gap-1 shadow-md shrink-0"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center m-auto py-12 px-4 text-slate-400 space-y-3 max-w-md">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center mx-auto border border-white/10 shadow-lg">
                <FileText className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-base font-bold text-white">Text-Only Circular</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                This notice was published on the official NSUT portal as text only without an attached PDF document file.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 sm:py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Notice Ref:</span>
            <code className="font-mono text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/5">
              {notice.id}
            </code>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-white/5 active:scale-95"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
