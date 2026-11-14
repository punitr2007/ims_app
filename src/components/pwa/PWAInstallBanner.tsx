'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import clsx from 'clsx';
import { AppLogo } from '../brand/AppLogo';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already in standalone / installed mode
    const standaloneMatch =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (standaloneMatch) {
      setIsStandalone(true);
      return;
    }

    // Check if user dismissed recently (24 hours)
    const dismissedUntil = localStorage.getItem('ims_pwa_dismissed_v1');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // Check for iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Listen for Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // On iOS Safari, show gentle install suggestion once after 3 seconds
    if (isIOSDevice && !standaloneMatch) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('PWA install prompt error', err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss for 48 hours
    localStorage.setItem('ims_pwa_dismissed_v1', (Date.now() + 48 * 3600 * 1000).toString());
  };

  if (isStandalone || isInstalled || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Toast / Banner (Responsive across phones, foldables & desktops) */}
      <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="glass-panel p-4 rounded-3xl border border-[var(--brand-from,#84cc16)]/30 bg-slate-950/95 backdrop-blur-2xl shadow-2xl shadow-black/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AppLogo size={36} showGlow={false} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                  Install IMS NSUT App
                </h4>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--brand-from,#84cc16)]/15 text-[var(--brand-from,#84cc16)] border border-[var(--brand-from,#84cc16)]/30 shrink-0">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                0-lag offline access, timetable &amp; quick bunk checks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] hover:brightness-110 text-slate-950 text-xs font-bold shadow-md shadow-[var(--brand-from)]/25 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-panel p-5 rounded-3xl border border-white/10 bg-slate-900/95 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-brand-400" />
                <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Safari lets you install IMS NSUT directly onto your home screen for full standalone experience:
            </p>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Tap the</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-white font-medium text-[11px]">
                    <Share className="w-3 h-3 text-sky-400" /> Share
                  </span>
                  <span>button in Safari bar</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <div className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Scroll down &amp; tap</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-white font-medium text-[11px]">
                    <PlusSquare className="w-3 h-3 text-brand-400" /> Add to Home Screen
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <span>Tap <strong>Add</strong> in the top-right corner</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/20"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
