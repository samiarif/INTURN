import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LandingPage() {
  const t = useTranslations('landing');
  const tA11y = useTranslations('a11y');
  const internPoints = t.raw('interns.points') as Array<{ heading: string; body: string }>;
  const companyPoints = t.raw('companies.points') as Array<{ heading: string; body: string }>;
  const howSteps = t.raw('how.steps') as Array<{ step: string; heading: string; body: string }>;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)] sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-[14px] text-[var(--ink-2)]">
          <Link href="/marketplace" className="hover:text-[var(--ink)]">{t('nav.marketplace')}</Link>
          <a href="#for-companies" className="hover:text-[var(--ink)]">{t('nav.forCompanies')}</a>
          <a href="#how-it-works" className="hover:text-[var(--ink)]">{t('nav.howItWorks')}</a>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <ThemeToggle labelDark={tA11y('switchToDark')} labelLight={tA11y('switchToLight')} />
          <Link
            href="/sign-in"
            className="text-[14px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            {t('nav.logIn')}
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            {t('nav.signUp')}
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="flex flex-col items-center justify-center px-6 py-20 md:py-28 text-center">
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
              {t('browseCta')}
            </Link>
            <Link
              href="/sign-up?role=company"
              className="inline-flex items-center justify-center h-11 px-6 rounded-md text-base font-medium border border-[var(--border-color)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--border-strong)]"
            >
              {t('hiringCta')}
            </Link>
          </div>
        </section>

        <section className="border-t border-[var(--border-color)] bg-[var(--surface)] py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">{t('interns.title')}</h2>
            <p className="text-[var(--ink-3)] mb-8">{t('interns.subtitle')}</p>
            <div className="grid md:grid-cols-3 gap-6">
              {internPoints.map((p) => (
                <div key={p.heading} className="border border-[var(--border-color)] rounded-lg p-6 bg-[var(--bg)]">
                  <h3 className="font-medium text-[var(--ink)] mb-2">{p.heading}</h3>
                  <p className="text-sm text-[var(--ink-2)] leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="for-companies" className="border-t border-[var(--border-color)] py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">{t('companies.title')}</h2>
            <p className="text-[var(--ink-3)] mb-8">{t('companies.subtitle')}</p>
            <div className="grid md:grid-cols-2 gap-6">
              {companyPoints.map((p) => (
                <div key={p.heading} className="border border-[var(--border-color)] rounded-lg p-6 bg-[var(--surface)]">
                  <h3 className="font-medium text-[var(--ink)] mb-2">{p.heading}</h3>
                  <p className="text-sm text-[var(--ink-2)] leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-[var(--border-color)] bg-[var(--surface)] py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8">{t('how.title')}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {howSteps.map((s) => (
                <div key={s.step} className="flex gap-4">
                  <div className="flex-none h-10 w-10 rounded-full bg-[var(--brand-100)] text-[var(--brand-700)] font-semibold flex items-center justify-center">{s.step}</div>
                  <div>
                    <h3 className="font-medium text-[var(--ink)] mb-1">{s.heading}</h3>
                    <p className="text-sm text-[var(--ink-2)] leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-color)] bg-[var(--surface)] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[13px] text-[var(--ink-3)]">
          <div className="flex items-center gap-2">
            <GradientStar size="sm" />
            <span>{t('footer.tagline')}</span>
          </div>
          <nav className="flex items-center gap-5">
            <Link href="/for-universities" className="hover:text-[var(--ink-2)]">{t('footer.universities')}</Link>
            <Link href="/about" className="hover:text-[var(--ink-2)]">{t('footer.about')}</Link>
            <Link href="/contact" className="hover:text-[var(--ink-2)]">{t('footer.contact')}</Link>
            <Link href="/privacy" className="hover:text-[var(--ink-2)]">{t('footer.privacy')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
