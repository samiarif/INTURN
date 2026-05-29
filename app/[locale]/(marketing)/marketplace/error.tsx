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
  const t = useTranslations('errors.marketplace');
  const tRoot = useTranslations('errors.root');

  useEffect(() => {
    console.error('[error.tsx /marketplace]', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <h1 className="text-display font-[family-name:var(--font-display)] mb-2">{t('title')}</h1>
      <p className="text-body text-[var(--ink-3)] mb-6">{t('body')}</p>
      {error.digest && (
        <p className="text-[var(--ink-3)] text-xs font-mono mb-6">{tRoot('reference', { digest: error.digest })}</p>
      )}
      <button
        onClick={reset}
        className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
      >
        {tRoot('tryAgain')}
      </button>
      <Link href="/" className="block mt-4 text-sm text-[var(--ink-3)] hover:text-[var(--ink)] underline">
        {t('back')}
      </Link>
    </div>
  );
}
