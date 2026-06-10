import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

// Footer link map. Items whose pages don't exist on the platform yet render as
// inert <span>s with a "coming soon" title — no dead links.
const PRODUCT_ITEMS = [
  { key: 'productItem1', href: '#solution', anchor: true },
  { key: 'productItem2', href: '/marketplace', anchor: false },
  { key: 'productItem3', href: '#virtual', anchor: true },
  { key: 'productItem4', href: '#mission', anchor: true },
  { key: 'productItem5', href: '#how', anchor: true },
] as const;

const COMPANY_ITEMS = [
  { key: 'companyItem1', href: null }, // Partners — no page yet
  { key: 'companyItem2', href: null }, // Resources — no page yet
  { key: 'companyItem3', href: '#community' },
  { key: 'companyItem4', href: null }, // About — no page yet
  { key: 'companyItem5', href: null }, // Contact — no page yet
] as const;

const LEGAL_ITEMS = [
  { key: 'legalItem1', href: '/terms' },
  { key: 'legalItem2', href: '/privacy' },
  { key: 'legalItem4', href: '/cookies' },
  { key: 'legalItem3', href: null }, // Certificate verification — no index page yet
] as const;

export function LandingFooter() {
  const t = useTranslations('home.footer');
  const locale = useLocale();

  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer-grid">
          <div>
            <Link href="/" className="mk-logo">
              <Image
                className="mk-wordmark"
                src="/assets/inturn-wordmark-white.png"
                alt="Inturn"
                width={117}
                height={30}
              />
            </Link>
            <p className="mk-footer-tagline">{t('tagline')}</p>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {t('madeWith')}
            </div>
          </div>
          <div>
            <h5>{t('colProductTitle')}</h5>
            <ul>
              {PRODUCT_ITEMS.map((item) => (
                <li key={item.key}>
                  {item.anchor ? (
                    <a href={item.href}>{t(item.key)}</a>
                  ) : (
                    <Link href={item.href}>{t(item.key)}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5>{t('colCompanyTitle')}</h5>
            <ul>
              {COMPANY_ITEMS.map((item) => (
                <li key={item.key}>
                  {item.href ? (
                    <a href={item.href}>{t(item.key)}</a>
                  ) : (
                    <span title={t('comingSoon')}>{t(item.key)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5>{t('colLegalTitle')}</h5>
            <ul>
              {LEGAL_ITEMS.map((item) => (
                <li key={item.key}>
                  {item.href ? (
                    <Link href={item.href}>{t(item.key)}</Link>
                  ) : (
                    <span title={t('comingSoon')}>{t(item.key)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mk-footer-foot">
          <span>{t('copyright')}</span>
          {/* FR/EN are live on the platform; Arabic stays a disabled teaser. */}
          <span className="mk-lang" aria-label={t('langLabel')}>
            <Link href="/" locale="fr" className={locale === 'fr' ? 'active' : undefined}>
              {'FR'}
            </Link>
            {' · '}
            <Link href="/" locale="en" className={locale === 'en' ? 'active' : undefined}>
              {'EN'}
            </Link>
            {' · '}
            <span aria-disabled="true" title={t('comingSoon')}>
              {'عربي'}
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}
