import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.privacy' });
  return {
    title: `${t('title')} — Inturn`,
    description: t('subtitle'),
    alternates: {
      canonical: locale === 'fr' ? '/privacy' : '/en/privacy',
      languages: { fr: '/privacy', en: '/en/privacy' },
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.privacy' });
  const sections = t.raw('sections') as Array<{ heading: string; body: string }>;

  return (
    <article className="max-w-3xl mx-auto px-6 py-12">
      <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-2">
        {t('eyebrow')}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[var(--ink-3)] mb-2">{t('subtitle')}</p>
      <p className="text-[13px] text-[var(--ink-3)] mb-10">
        {t('lastUpdated', { date: '2026-05-26' })}
      </p>
      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold mb-2 text-[var(--ink)]">
              {String(i + 1).padStart(2, '0')}. {s.heading}
            </h2>
            <p className="text-[15px] text-[var(--ink-2)] leading-relaxed whitespace-pre-line">
              {s.body}
            </p>
          </section>
        ))}
      </div>
      <p className="text-[13px] text-[var(--ink-3)] mt-12 pt-8 border-t border-[var(--border-color)]">
        {t('contactFootnote')}
      </p>
    </article>
  );
}
