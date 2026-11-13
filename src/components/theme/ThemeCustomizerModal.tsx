'use client';

import React, { useEffect } from 'react';
import { useTheme, COLOR_PALETTES, ThemeMode, ColorPaletteId } from '@/context/ThemeContext';
import {
  X,
  Palette,
  Sun,
  Moon,
  Laptop,
  EyeOff,
  Eye,
  Sliders,
  Sparkles,
  Zap,
  Target,
  LayoutGrid,
  Check,
  Shield,
  Smartphone,
} from 'lucide-react';
import clsx from 'clsx';
import { AppLogo } from '../brand/AppLogo';

export function ThemeCustomizerModal() {
  const {
    isCustomizerOpen,
    setIsCustomizerOpen,
    themeMode,
    setThemeMode,
    palette,
    setPalette,
    privacyMode,
    togglePrivacyMode,
    compactMode,
    toggleCompactMode,
    ambientGlow,
    toggleAmbientGlow,
    globalTarget,
    setGlobalTarget,
  } = useTheme();

  // Close with Esc key
  useEffect(() => {
    if (!isCustomizerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCustomizerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCustomizerOpen, setIsCustomizerOpen]);

  if (!isCustomizerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Appearance & Add-ons Studio"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={() => setIsCustomizerOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
                <Palette className="w-4 h-4 text-[var(--brand-from,#84cc16)]" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-snug">Personalize &amp; Add-ons</h3>
              <p className="text-[11px] text-slate-400">Stock Android Dynamic Colors &amp; Tools</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCustomizerOpen(false)}
            className="w-9 h-9 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Section 1: Stock Android Dynamic Color Palettes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5 text-brand-400" />
                <span>Dynamic Accent Colors (Material You)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {COLOR_PALETTES.find((p) => p.id === palette)?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
              {COLOR_PALETTES.map((p) => {
                const isSelected = palette === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPalette(p.id)}
                    className={clsx(
                      'p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all active:scale-95',
                      isSelected
                        ? 'bg-slate-800 border-[var(--brand-from)] shadow-lg shadow-[var(--brand-from)]/20'
                        : 'bg-slate-950/60 border-white/5 hover:border-white/15'
                    )}
                  >
                    {/* Duo-tone Preview Swatch */}
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-xl shadow-inner shrink-0 flex items-center justify-center bg-gradient-to-tr',
                        p.previewGradient
                      )}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                    </div>

                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{p.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Light and Dark Themes */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
              <Sun className="w-3.5 h-3.5 text-brand-400" />
              <span>Theme Appearance</span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-1 rounded-2xl border border-white/10">
              {(
                [
                  { id: 'dark', label: 'Dark Mode', icon: Moon },
                  { id: 'light', label: 'Light Mode', icon: Sun },
                  { id: 'system', label: 'System Auto', icon: Laptop },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const isActive = themeMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setThemeMode(id)}
                    className={clsx(
                      'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95',
                      isActive
                        ? 'bg-gradient-to-r from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Student Addons & Utilities */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Student Add-ons &amp; Taste Tools</span>
            </div>

            <div className="space-y-2">
              {/* Addon 1: Stealth Privacy Mode */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800/80 text-brand-400 mt-0.5">
                    {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Stealth Bunk Privacy Blur</h5>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Masks attendance percentages &amp; roll numbers until hovered. Perfect for public lecture halls.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={togglePrivacyMode}
                  className={clsx(
                    'w-11 h-6 rounded-full transition-colors p-0.5 relative shrink-0',
                    privacyMode ? 'bg-[var(--brand-from,#84cc16)]' : 'bg-slate-800'
                  )}
                  aria-label="Toggle Privacy Mode"
                >
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                      privacyMode ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {/* Addon 2: Global Target Attendance Goal */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-400" />
                    <div>
                      <h5 className="text-xs font-bold text-white">Global Target Percentage</h5>
                      <p className="text-[10px] text-slate-400">Updates all cards &amp; bunk calculators</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-brand-300 bg-brand-500/20 px-2 py-0.5 rounded-lg border border-brand-500/30">
                    {globalTarget}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[75, 80, 85, 90].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setGlobalTarget(t)}
                      className={clsx(
                        'py-1.5 rounded-xl font-mono text-xs font-bold transition-all border active:scale-95',
                        globalTarget === t
                          ? 'bg-[var(--brand-from,#84cc16)] text-slate-950 border-transparent shadow-sm'
                          : 'bg-slate-800/60 text-slate-400 hover:text-white border-white/5'
                      )}
                    >
                      {t}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Addon 3: Ambient Glow Effect */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800/80 text-brand-400 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Ambient Space Aura</h5>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Radial gradient blooms. Turn off to maximize battery life on older laptops.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleAmbientGlow}
                  className={clsx(
                    'w-11 h-6 rounded-full transition-colors p-0.5 relative shrink-0',
                    ambientGlow ? 'bg-[var(--brand-from,#84cc16)]' : 'bg-slate-800'
                  )}
                  aria-label="Toggle Ambient Glow"
                >
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                      ambientGlow ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <AppLogo size={22} showGlow={false} />
            <span className="text-[11px] text-slate-400">Settings auto-saved locally</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCustomizerOpen(false)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            Apply &amp; Done
          </button>
        </div>
      </div>
    </div>
  );
}
