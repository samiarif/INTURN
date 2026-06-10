import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GradientStar } from '@/components/brand/gradient-star';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <GradientStar size="lg" />
      <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-[var(--ink-3)]">{t('code')}</p>
      <h1 className="text-display text-[var(--ink)]">{t('title')}</h1>
      <p className="text-body text-[var(--ink-2)] max-w-md">{t('description')}</p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-md bg-[var(--ink)] px-4 py-2 text-label text-white hover:opacity-90"
      >
        {t('home')}
      </Link>
    </main>
  );
}
