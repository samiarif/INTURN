import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HomeHero } from '@/components/landing/home-hero';
import {
  TrustSection,
  RotatorSection,
  ProblemSection,
  SolutionSection,
  PillarsSection,
  VirtualSection,
  MissionSection,
  CommunitySection,
  QuoteSection,
  HowSection,
  CompareSection,
  CtaSection,
} from '@/components/landing/sections';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: locale === 'fr' ? '/' : '/en',
      languages: { fr: '/', en: '/en' },
    },
    openGraph: {
      title: 'Inturn',
      description: t('description'),
      type: 'website',
      locale: locale === 'fr' ? 'fr_TN' : 'en_US',
    },
  };
}

// Chrome (.mk-root wrapper, nav, footer, effects) lives in (site)/layout.tsx.
export default function LandingPage() {
  return (
    <main>
      <HomeHero />
      <TrustSection />
      <RotatorSection />
      <ProblemSection />
      <SolutionSection />
      <PillarsSection />
      <VirtualSection />
      <MissionSection />
      <CommunitySection />
      <QuoteSection />
      <HowSection />
      <CompareSection />
      <CtaSection />
    </main>
  );
}
