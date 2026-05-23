import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { GradientStar } from '@/components/brand/gradient-star';

export default async function Page() {
  const t = await getTranslations('onboarding.intern.done');

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6">
      <GradientStar size="lg" />
      <h1 className="text-2xl font-semibold tracking-tight mt-6 mb-2">{t('title')}</h1>
      <p className="text-[var(--ink-3)] text-center max-w-sm mb-8">{t('subtitle')}</p>
      <Link
        href="/intern/dashboard"
        className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
      >
        {t('open')}
      </Link>
    </div>
  );
}
