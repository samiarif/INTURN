import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { VerifyWidget } from '@/components/landing/verify-widget';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.verify.meta' });
  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
    },
  };
}

// Chrome (.mk-root wrapper, nav, footer, effects) lives in (site)/layout.tsx.
export default function VerifyPage() {
  const t = useTranslations('site.verify.hero');
  return (
    <main>
      <section className="mk-hero" style={{ paddingBottom: 48 }}>
        <div className="mk-container">
          <div className="mk-eyebrow" style={{ marginBottom: 24 }}>
            {t('eyebrow')}
          </div>

          <h1 className="mk-h1" style={{ fontSize: 44 }}>
            {t('title')}
          </h1>

          <p className="deck">{t('deck')}</p>
        </div>
      </section>

      <section className="mk-section tight" style={{ paddingTop: 0 }}>
        <div className="mk-container">
          <VerifyWidget />
        </div>
      </section>
    </main>
  );
}
