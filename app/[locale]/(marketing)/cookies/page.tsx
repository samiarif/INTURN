import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.cookies' });
  return {
    title: `${t('title')} — Inturn`,
    description: t('subtitle'),
    alternates: {
      canonical: locale === 'fr' ? '/cookies' : '/en/cookies',
      languages: { fr: '/cookies', en: '/en/cookies' },
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.cookies' });
  const sections = t.raw('sections') as Array<{ heading: string; body: string }>;

  return (
    <article className="max-w-3xl mx-auto px-6 py-12">
      <p className="font-mono text-eyebrow uppercase text-[var(--ink-3)] mb-2">
        {t('eyebrow')}
      </p>
      <h1 className="text-display font-[family-name:var(--font-display)] mb-2">{t('title')}</h1>
      <p className="text-body text-[var(--ink-3)] mb-2">{t('subtitle')}</p>
      <p className="text-caption text-[var(--ink-3)] mb-10">
        {t('lastUpdated', { date: '2026-05-26' })}
      </p>
      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-heading mb-2 text-[var(--ink)]">
              {String(i + 1).padStart(2, '0')}. {s.heading}
            </h2>
            <p className="text-body text-[var(--ink-2)] leading-relaxed whitespace-pre-line">
              {s.body}
            </p>
          </section>
        ))}
      </div>
      <p className="text-caption text-[var(--ink-3)] mt-12 pt-8 border-t border-[var(--border-color)]">
        {t('contactFootnote')}
      </p>
    </article>
  );
}
