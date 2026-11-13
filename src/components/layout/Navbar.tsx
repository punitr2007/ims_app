'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, GraduationCap, Sparkles, ExternalLink, Zap } from 'lucide-react';
import clsx from 'clsx';

export function Navbar() {
  const pathname = usePathname();

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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-sky-500 to-cyan-400 p-0.5 shadow-lg shadow-sky-500/25 group-hover:shadow-sky-500/40 transition-all duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  IMS NSUT
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-300 border border-sky-400/30 shadow-sm shadow-sky-500/10">
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
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  )}
                >
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-white' : 'text-sky-400')} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Portal Link & PWA Status */}
          <div className="flex items-center gap-2">
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
      <nav className="sm:hidden fixed bottom-3 left-3 right-3 max-w-md mx-auto z-50 glass-panel bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-1.5 shadow-2xl shadow-black/95 flex items-center justify-around pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {links.map(({ href, shortLabel, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-2xl text-xs font-semibold transition-all gap-1 active:scale-90',
                isActive
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon className={clsx('w-4 h-4 transition-transform', isActive && 'scale-110 text-white')} />
              <span className="text-[11px] font-medium leading-none tracking-tight">{shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
