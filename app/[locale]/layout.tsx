import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { frFR, enUS } from '@clerk/localizations';
import { CookieBanner } from '@/components/cookie-banner';
import { isDevAuthBypassed } from '@/lib/dev-auth';
import { getSession } from '@/modules/auth/session';
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

// Distinctive display face — Bricolage Grotesque, self-hosted via next/font/local
// (woff2 vendored in app/fonts/). We deliberately DON'T use next/font/google: this
// network blocks Google's font CDN at compile time and it hung every page. The
// vendored woff2 needs zero network at build. Exposes --font-bricolage, which
// globals.css maps onto --font-display / --font-heading (Geist stays the body face).
const bricolage = localFont({
  src: '../fonts/bricolage-grotesque-var.woff2',
  variable: '--font-bricolage',
  weight: '200 800',
  display: 'swap',
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

  // No-flash theme: the cookie is the source of truth and is applied to the
  // server-rendered <html class> before paint (no FOUC). P10 cross-device
  // hydration: when the cookie is ABSENT (a fresh device) and the logged-in
  // user has a saved themePref, fall back to that pref for the SSR class so
  // their preference follows them. This stays FOUC-safe — the class is still
  // decided server-side, never on the client. Guarded so an auth/DB hiccup
  // (e.g. the dev-bypass offline path where auth() throws) never breaks the
  // layout; we just render the default theme in that case.
  const themeCookie = (await cookies()).get('inturn-theme')?.value;
  let resolvedTheme: 'light' | 'dark' | undefined =
    themeCookie === 'dark' ? 'dark' : themeCookie === 'light' ? 'light' : undefined;
  if (!resolvedTheme) {
    try {
      const session = await getSession();
      const pref = session?.user.themePref;
      // 'system' has no deterministic server value — leave it to the client
      // matchMedia default; only an explicit light/dark hydrates the SSR class.
      if (pref === 'dark' || pref === 'light') resolvedTheme = pref;
    } catch {
      // ignore — render default theme
    }
  }
  const themeClass = resolvedTheme === 'dark' ? 'dark' : '';

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
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${themeClass}`.trim()}
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
