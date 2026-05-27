'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors.root');

  useEffect(() => {
    console.error('[error.tsx /]', error);
    // Sentry capture is opt-in via NEXT_PUBLIC_SENTRY_DSN. The dynamic
    // import keeps the bundle clean when Sentry isn't configured.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
          tags: { boundary: 'app-root' },
        });
      });
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[var(--ink-3)] max-w-md mb-6">{t('body')}</p>
      {error.digest && (
        <p className="text-[var(--ink-3)] text-xs font-mono mb-6">{t('reference', { digest: error.digest })}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
        >
          {t('tryAgain')}
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium border border-[var(--border-color)] hover:border-[var(--border-strong)]"
        >
          {t('home')}
        </Link>
      </div>
    </div>
  );
}
