import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Site-wide footer with legal links. Rendered on marketing pages
 * (landing, marketplace, internship detail) plus the public records
 * viewer — anywhere a fresh visitor lands.
 *
 * Platform pages (dashboards, workspaces) have their own minimal
 * shell and don't include the footer.
 */
export async function SiteFooter() {
  const locale = await getLocale();
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[var(--border-color)] bg-[var(--surface)]">
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-semibold text-[15px] mb-2">Inturn</p>
          <p className="text-[13px] text-[var(--ink-3)] leading-relaxed">{t('tagline')}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] font-mono mb-3">
            {t('product')}
          </p>
          <ul className="space-y-2 text-[14px]">
            <li>
              <Link href={`/${locale}/marketplace`} className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                {t('marketplace')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/sign-up?role=company`} className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                {t('forCompanies')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/sign-up?role=intern`} className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                {t('forInterns')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] font-mono mb-3">
            {t('legal')}
          </p>
          <ul className="space-y-2 text-[14px]">
            <li>
              <Link href={`/${locale}/terms`} className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                {t('terms')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/privacy`} className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                {t('privacy')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/cookies`} className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                {t('cookies')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border-color)] px-6 py-4 text-[12px] text-[var(--ink-3)] flex flex-wrap justify-between gap-2 max-w-6xl mx-auto">
        <span>© {year} Inturn · {t('madeIn')}</span>
        <span>{t('contact')}</span>
      </div>
    </footer>
  );
}
