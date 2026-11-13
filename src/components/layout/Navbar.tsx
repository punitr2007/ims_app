'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, GraduationCap, Palette, ExternalLink, Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import { AppLogo } from '../brand/AppLogo';
import { useTheme } from '@/context/ThemeContext';

export function Navbar() {
  const pathname = usePathname();
  const { setIsCustomizerOpen, resolvedTheme } = useTheme();

  const links = [
    { href: '/', label: 'Notices & Circulars', shortLabel: 'Notices', icon: Bell },
    { href: '/attendance', label: 'Attendance & Academic Tools', shortLabel: 'Attendance', icon: GraduationCap },
  ];

  return (
    <>
      {/* Desktop / Top Navbar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-3.5 sm:px-6 py-2.5 sm:py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <AppLogo size={38} showGlow={true} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  IMS NSUT
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--brand-from,#84cc16)]/15 text-[var(--brand-from,#84cc16)] border border-[var(--brand-from,#84cc16)]/30 shadow-sm">
                  Modern Pro
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden sm:block">
                Smart Attendance Tracker, Timetable &amp; 10,000+ Notices
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-2xl border border-white/10 shadow-inner">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] text-slate-950 font-bold shadow-md shadow-[var(--brand-from)]/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  )}
                >
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400')} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Tools: Personalize (Theme / Addons) & Portal Link */}
          <div className="flex items-center gap-2">
            {/* Stock Android / Theme Customizer Button */}
            <button
              type="button"
              onClick={() => setIsCustomizerOpen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-200 hover:text-white transition-all px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-[var(--brand-from)]/40 active:scale-95 shadow-sm group"
              title="Personalize Colors, Themes & Add-ons"
              aria-label="Open appearance settings"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] shadow-xs" />
              <span className="hidden xs:inline font-medium">Style</span>
              {resolvedTheme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
              )}
            </button>

            {/* Official Portal External Link */}
            <a
              href="https://www.imsnsit.org/imsnsit/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-all px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 active:scale-95 shadow-sm"
            >
              <span className="hidden xs:inline">IMS NSIT</span>
              <span>Portal</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Navigation Dock */}
      <nav className="sm:hidden fixed bottom-3 left-3 right-3 max-w-md mx-auto z-40 glass-panel bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-1.5 shadow-2xl shadow-black/95 flex items-center justify-around pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {links.map(({ href, shortLabel, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl text-xs font-semibold transition-all gap-1 active:scale-90',
                isActive
                  ? 'bg-gradient-to-r from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] text-slate-950 font-bold shadow-lg shadow-[var(--brand-from)]/25'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon className={clsx('w-4 h-4 transition-transform', isActive && 'scale-110 text-slate-950 stroke-[2.5]')} />
              <span className="text-[11px] font-medium leading-none tracking-tight">{shortLabel}</span>
            </Link>
          );
        })}

        {/* Mobile Style Switcher Trigger */}
        <button
          type="button"
          onClick={() => setIsCustomizerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white transition-all gap-1 active:scale-90"
        >
          <Palette className="w-4 h-4 text-[var(--brand-from,#84cc16)]" />
          <span className="text-[11px] font-medium leading-none tracking-tight">Theme</span>
        </button>
      </nav>
    </>
  );
}
