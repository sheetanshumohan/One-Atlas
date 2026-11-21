import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md animate-fade-up py-24 text-center">
      <p className="text-gradient text-8xl font-semibold tracking-tighter">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-400">That model, lab or provider doesn&apos;t exist (or was renamed).</p>
      <div className="mt-8 flex justify-center gap-2">
        <Link href="/models" className="btn-primary">
          Browse models
        </Link>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
