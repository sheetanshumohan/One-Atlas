import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { CompareProvider } from '@/components/compare-context';
import { CompareTray } from '@/components/compare-tray';
import { Header } from '@/components/header';
import './globals.css';

// Render on request (data comes from the API, which may not be reachable at build time); API responses are cached for 60s.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'OneAtlas — AI model discovery & intelligence', template: '%s · OneAtlas' },
  description: 'Discover, compare and evaluate AI models across labs and providers: pricing, context windows, capabilities and benchmarks.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans">
        <CompareProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
            Skip to content
          </a>
          {/* No Suspense here: pages render per request, so the header is in the initial HTML (works without JS). */}
          <Header />
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:pt-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800">
            OneAtlas · prices in USD per 1M tokens · benchmark scores are illustrative ·{' '}
            <Link href="/models" className="link">
              Browse models
            </Link>
          </footer>
          <CompareTray />
        </CompareProvider>
      </body>
    </html>
  );
}
