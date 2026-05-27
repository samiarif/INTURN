import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { frFR, enUS } from '@clerk/localizations';
import { CookieBanner } from '@/components/cookie-banner';
import { isDevAuthBypassed } from '@/lib/dev-auth';
import '../globals.css';

const clerkLocales = { fr: frFR, en: enUS };

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'inturn',
  description: 'La plateforme de stages pour la Tunisie',
};

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
  const theme = (await cookies()).get('inturn-theme')?.value;
  const themeClass = theme === 'dark' ? 'dark' : '';

  // Dev-only bypass: when DEV_AUTH_BYPASS=1 we skip <ClerkProvider> so
  // it doesn't hang on the bootstrap fetch to api.clerk.com (which is
  // blocked on some networks). This is the SAME guard the rest of the
  // bypass uses — it's belt-and-suspenders, not a security boundary.
  const skipClerk = isDevAuthBypassed();

  const inner = (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      <CookieBanner />
    </NextIntlClientProvider>
  );

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${themeClass}`.trim()}
    >
      <body className="font-sans antialiased">
        {skipClerk ? (
          inner
        ) : (
          <ClerkProvider localization={clerkLocales[locale as keyof typeof clerkLocales]}>
            {inner}
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
