'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO Sprint E: pipe to Sentry.
    console.error('[error.tsx /]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Something went wrong.</h1>
      <p className="text-[var(--ink-3)] max-w-md mb-6">
        We&apos;ve been notified. Try again, or head back to the home page.
      </p>
      {error.digest && (
        <p className="text-[var(--ink-3)] text-xs font-mono mb-6">Reference: {error.digest}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium border border-[var(--border-color)] hover:border-[var(--border-strong)]"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
