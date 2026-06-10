import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.forUniversities.meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

/* ------------------------------------------------------------------
 * Proper-noun school names: kept as a const — not translated.
 * ------------------------------------------------------------------ */
const SCHOOL_NAMES = ['ESPRIT', 'INSAT', 'ENIT', 'ENSI', 'IHEC', 'TBS'] as const;

const mono = 'var(--font-mono)';
const MOCK_ARROW = '→';
const MOCK_CHECK = '✓';

export default async function ForUniversitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tHero = await getTranslations({ locale, namespace: 'site.forUniversities.hero' });
  const tProblem = await getTranslations({ locale, namespace: 'site.forUniversities.problem' });
  const tGen = await getTranslations({ locale, namespace: 'site.forUniversities.generates' });
  const tFit = await getTranslations({ locale, namespace: 'site.forUniversities.fit' });
  const tSchools = await getTranslations({ locale, namespace: 'site.forUniversities.schools' });
  const tCta = await getTranslations({ locale, namespace: 'site.forUniversities.cta' });

  const generateItems = (
    [
      ['item1', '1'],
      ['item2', '2'],
      ['item3', '3'],
      ['item4', '4'],
      ['item5', '5'],
    ] as const
  ).map(([key]) => ({
    key,
    title: tGen(`${key}Title`),
    body: tGen(`${key}Body`),
  }));

  const fitSteps = (
    [
      ['step1', '01'],
      ['step2', '02'],
      ['step3', '03'],
    ] as const
  ).map(([key, num]) => ({
    key,
    num,
    small: tFit(`${key}Small`),
    title: tFit(`${key}Title`),
    body: tFit(`${key}Body`),
  }));

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="mk-hero">
        <div className="mk-container">
          <div className="mk-eyebrow" style={{ marginBottom: 24 }}>
            {tHero('eyebrow')}
          </div>

          <h1 className="mk-h1">
            {tHero('titleLead')}
            <br />
            <span className="grad">{tHero('titleGrad')}</span>
          </h1>

          <p className="deck">{tHero('deck')}</p>

          <div className="mk-hero-cta">
            {/* No /contact page yet — university CTA is contact-style, rendered as coming-soon */}
            <span className="mk-btn mk-btn-brand lg" title="Coming soon">
              {tHero('ctaPrimary')} <span className="arrow">{MOCK_ARROW}</span>
            </span>
            <Link href="/how-it-works" className="mk-btn mk-btn-ghost lg">
              {tHero('ctaSecondary')} <span className="arrow">{MOCK_ARROW}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== THE PFE PROBLEM ==================== */}
      <section className="mk-section surface-muted">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tProblem('eyebrow')}</div>
            <h2 className="mk-h2">{tProblem('title')}</h2>
            <p className="mk-deck">{tProblem('deck')}</p>
          </div>
        </div>
      </section>

      {/* ==================== WHAT INTURN GENERATES ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tGen('eyebrow')}</div>
            <h2 className="mk-h2">{tGen('title')}</h2>
            <p className="mk-deck">{tGen('deck')}</p>
          </div>

          <div className="mk-grid-2">
            {generateItems.map((item) => (
              <div className="mk-feature" key={item.key}>
                <div
                  className="mk-feature-ico"
                  aria-hidden="true"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: mono,
                    fontSize: 18,
                    color: 'var(--brand)',
                  }}
                >
                  {MOCK_CHECK}
                </div>
                <div className="mk-feature-title">{item.title}</div>
                <div className="mk-feature-body">{item.body}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 28,
              padding: '16px 20px',
              border: '1px dashed var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-muted)',
              fontFamily: mono,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'var(--ink-4)',
              letterSpacing: '0.01em',
            }}
          >
            {tGen('note')}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT FITS YOUR PROCESS ==================== */}
      <section className="mk-section surface-muted">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tFit('eyebrow')}</div>
            <h2 className="mk-h2">{tFit('title')}</h2>
            <p className="mk-deck">{tFit('deck')}</p>
          </div>

          <div>
            {fitSteps.map((step) => (
              <div className="mk-step" key={step.key}>
                <div className="mk-step-num">
                  {step.num}
                  <small>{step.small}</small>
                </div>
                <div className="mk-step-body">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FOR THE SCHOOLS YOU KNOW ==================== */}
      <section className="mk-section center">
        <div className="mk-container">
          <div className="mk-section-head center">
            <div className="mk-eyebrow">{tSchools('eyebrow')}</div>
            <h2 className="mk-h2">{tSchools('title')}</h2>
            <p className="mk-deck">{tSchools('deck')}</p>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'center',
            }}
          >
            {SCHOOL_NAMES.map((name) => (
              <span
                key={name}
                style={{
                  fontFamily: mono,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: 'var(--ink-2)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 99,
                  padding: '10px 20px',
                }}
              >
                {name}
              </span>
            ))}
          </div>

          <div
            style={{
              marginTop: 22,
              textAlign: 'center',
              fontFamily: mono,
              fontSize: 11.5,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--ink-5)',
            }}
          >
            {tSchools('disclaimer')}
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-cta-band">
            <div className="mk-eyebrow">{tCta('eyebrow')}</div>
            <h2 className="mk-h2">{tCta('title')}</h2>
            <p>{tCta('deck')}</p>
            <div className="mk-cta-band-actions">
              {/* Contact-style CTA: no /contact page yet, rendered as coming-soon */}
              <span className="mk-btn mk-btn-brand lg" title="Coming soon">
                {tCta('button')} <span className="arrow">{MOCK_ARROW}</span>
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
