import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import Link from 'next/link';
import { CompareProvider } from '@/components/compare-context';
import { CompareTray } from '@/components/compare-tray';
import { Header } from '@/components/header';
import { getMeta } from '@/lib/meta';
import './globals.css';

// Render on request (data comes from the API, which may not be reachable at build time); API responses are cached for 60s.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'OneAtlas: AI model discovery & intelligence', template: '%s · OneAtlas' },
  description: 'Discover, compare and evaluate AI models across labs and providers: pricing, context windows, capabilities and benchmarks.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#05060a' };

const FOOTER_LINKS = [
  { href: '/models', label: 'Models' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/compare', label: 'Compare' },
  { href: '/labs', label: 'AI Labs' },
  { href: '/providers', label: 'Providers' },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Compare limit from the API. If the API is unreachable the page itself shows the error state;
  // the layout stays up (no cap client-side; the API still enforces it).
  const compareMax = await getMeta().then((m) => m.limits.compare.max, () => undefined);
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        {/* Decorative background: grid + slowly drifting colour glows (fixed, never scrolls or overflows) */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="bg-grid absolute inset-0" />
          {/* Glows are radial gradients, not blur() filters: painted once, then only moved (cheap on every device). */}
          <div className="glow absolute -left-64 -top-64 h-[48rem] w-[48rem] animate-float [--glow:rgba(79,70,229,0.28)]" />
          <div className="glow absolute -right-56 -top-24 h-[44rem] w-[44rem] animate-float-slow [--glow:rgba(192,38,211,0.18)]" />
          <div className="glow absolute -bottom-48 left-1/4 h-[40rem] w-[40rem] animate-float [--glow:rgba(6,182,212,0.12)]" />
        </div>

        <CompareProvider max={compareMax}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-ink-950">
            Skip to content
          </a>
          {/* No Suspense here: pages render per request, so the header is in the initial HTML (works without JS). */}
          <Header />
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-32 pt-8 sm:px-6 sm:pt-12">
            {children}
          </main>
          <footer className="border-t border-white/[0.06] bg-ink-950/60 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <span className="font-semibold text-white">OneAtlas</span>
                <span className="text-slate-500"> · AI model discovery &amp; intelligence</span>
                <p className="mt-1 text-xs text-slate-500">Prices in USD per 1M tokens · benchmark scores are illustrative</p>
              </div>
              <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-slate-400">
                {FOOTER_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} className="transition hover:text-white">
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          </footer>
          <CompareTray />
        </CompareProvider>
      </body>
    </html>
  );
}
