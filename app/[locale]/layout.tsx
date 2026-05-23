import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { frFR, enUS } from '@clerk/localizations';

const clerkLocales = { fr: frFR, en: enUS };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`@/locales/${locale}.json`)).default;

  return (
    <ClerkProvider localization={clerkLocales[locale as keyof typeof clerkLocales]}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}
