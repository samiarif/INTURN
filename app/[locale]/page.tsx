import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';

export default function LandingPage() {
  const t = useTranslations('landing');

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)]">
        <Link href="/" className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-[14px] text-[var(--ink-2)]">
          <Link href="/marketplace" className="hover:text-[var(--ink)]">Browse internships</Link>
          <Link href="/for-companies" className="hover:text-[var(--ink)]">For companies</Link>
          <Link href="/pricing" className="hover:text-[var(--ink)]">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <Link
            href="/sign-in"
            className="text-[14px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <GradientStar size="lg" className="mb-6" />
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl text-balance mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-[var(--ink-2)] max-w-xl mb-8">{t('subtitle')}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center h-11 px-6 rounded-md text-base font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            Browse internships
          </Link>
          <Link
            href="/sign-up?role=company"
            className="inline-flex items-center justify-center h-11 px-6 rounded-md text-base font-medium border border-[var(--border-color)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--border-strong)]"
          >
            I&apos;m hiring →
          </Link>
        </div>
      </main>

      <footer className="border-t border-[var(--border-color)] bg-[var(--surface)] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[13px] text-[var(--ink-3)]">
          <div className="flex items-center gap-2">
            <GradientStar size="sm" />
            <span>Inturn · Tunisia 🇹🇳</span>
          </div>
          <nav className="flex items-center gap-5">
            <Link href="/for-universities" className="hover:text-[var(--ink-2)]">For universities</Link>
            <Link href="/about" className="hover:text-[var(--ink-2)]">About</Link>
            <Link href="/contact" className="hover:text-[var(--ink-2)]">Contact</Link>
            <Link href="/privacy" className="hover:text-[var(--ink-2)]">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
