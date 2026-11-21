import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">That model, lab or provider doesn&apos;t exist (or was renamed).</p>
      <Link href="/models" className="btn-primary mt-6">
        Browse models
      </Link>
    </div>
  );
}
