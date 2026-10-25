import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'IMS NSUT Modern Portal - Notices Search & Attendance Dashboard',
  description: 'Fast, modern web app for NSUT students with full-text fuzzy search for 10,000+ notices and instant attendance bunk calculator.',
  other: {
    'color-scheme': 'dark',
    'darkreader-lock': '',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#060913',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="darkreader-lock" content="" />
        <meta name="theme-color" content="#060913" />
      </head>
      <body className="antialiased min-h-screen flex flex-col justify-between pb-28 sm:pb-8 selection:bg-brand-500/30 selection:text-white" suppressHydrationWarning>
        <div>
          <Navbar />
          <main className="max-w-7xl mx-auto px-3.5 sm:px-6 py-3.5 sm:py-8">
            {children}
          </main>
        </div>

        <footer className="border-t border-white/5 py-6 px-4 text-center text-[11px] sm:text-xs text-slate-500 max-w-7xl mx-auto w-full mb-16 sm:mb-0">
          <p>
            Unofficial student-built interface for Netaji Subhas University of Technology (NSUT). All notices and portal data remain property of IMS NSIT.
          </p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
