import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'IMS NSUT Modern Portal - Notices Search & Attendance Dashboard',
  description: 'Fast, modern web app for NSUT students with full-text fuzzy search for 10,000+ notices and instant attendance bunk calculator.',
  other: {
    'color-scheme': 'dark',
    'darkreader-lock': '',
  },
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
      </head>
      <body className="antialiased min-h-screen flex flex-col justify-between" suppressHydrationWarning>
        <div>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </main>
        </div>

        <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-slate-500 max-w-7xl mx-auto w-full">
          <p>
            Unofficial student-built interface for Netaji Subhas University of Technology (NSUT). All notices and portal data remain property of IMS NSIT.
          </p>
        </footer>
      </body>
    </html>
  );
}
