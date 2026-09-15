'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, GraduationCap, Sparkles, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Notices & Circulars', shortLabel: 'Notices', icon: Bell },
    { href: '/attendance', label: 'Attendance & Bunk Calc', shortLabel: 'Attendance', icon: GraduationCap },
  ];

  return (
    <>
      {/* Desktop / Top Navbar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">IMS NSUT</span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Modern
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Fast Notices Search & Attendance Dashboard</p>
            </div>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-white/5">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all',
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Portal Link */}
          <div className="flex items-center gap-2">
            <a
              href="https://www.imsnsit.org/imsnsit/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-800/40 border border-white/5 sm:border-transparent"
            >
              <span className="hidden xs:inline">Official</span>
              <span>Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-3 left-3 right-3 z-50 glass-panel bg-slate-950/90 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-2xl shadow-black/80 flex items-center justify-around">
        {links.map(({ href, shortLabel, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl text-xs font-semibold transition-all gap-1 active:scale-95',
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-sky-600 text-white shadow-lg shadow-brand-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon className={clsx('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
              <span className="text-[11px] leading-none">{shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
