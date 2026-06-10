import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import LoopDiagram from '@/components/landing/diagrams/loop-diagram';
import TheMatch from '@/components/landing/diagrams/the-match';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.how.meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

/* ------------------------------------------------------------------
 * Mockup / browser-chrome copy: NOT translated.
 * These are fake-app strings (URLs, task IDs, labels, dates) kept as
 * literals so the i18next jsx-text lint rule can't flag them.
 * ------------------------------------------------------------------ */
const mono = 'var(--font-mono)';

const MOCK_STEP5 = {
  url: 'inturn.app/yasmine/brand-audit/overview',
  sideHead: 'Workspace',
  navOverview: 'Overview',
  navTasks: 'Tasks',
  navTasksCount: '6',
  navDeliverables: 'Deliverables',
  navDeliverablesCount: '5',
  navTimeline: 'Timeline',
  briefLabel: 'PROJECT BRIEF · WEEK 1',
  briefTitle: 'Brand audit & system refresh',
  briefBody:
    "Audit Acme's current brand across every surface, surface gaps with stakeholders, deliver a refreshed identity system as a Figma library + written guidelines.",
  chip1: 'VISUAL DESIGNER',
  chip2: '12 WK',
  chip3: 'HYBRID',
  stat1Label: 'This week',
  stat1Value: '3',
  stat1Unit: 'tasks',
  stat2Label: 'Next deliverable',
  stat2Value: 'D1',
  stat2Unit: '· in 5 days',
  stat3Label: 'Weekly sync',
  stat3Value: 'Fri',
  stat3Unit: '14:00',
};

const MOCK_STEP7_CODE = 'inturn.app/v/{cert-id}';

const MOCK_ARROW = '→';

const MOCK_STEP_NUMS = ['01', '02', '03', '04', '05', '06', '07'] as const;

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tHero = await getTranslations({ locale, namespace: 'site.how.hero' });
  const tTimeline = await getTranslations({ locale, namespace: 'site.how.timeline' });
  const tSteps = await getTranslations({ locale, namespace: 'site.how.steps' });
  const tLimits = await getTranslations({ locale, namespace: 'site.how.limits' });
  const tCta = await getTranslations({ locale, namespace: 'site.how.cta' });

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="mk-hero" style={{ paddingBottom: 48 }}>
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
            <Link href="/sign-up" className="mk-btn mk-btn-brand lg">
              {tHero('ctaPrimary')} <span className="arrow">{MOCK_ARROW}</span>
            </Link>
            <a href="#steps" className="mk-btn mk-btn-ghost lg">
              {tHero('ctaSecondary')}
            </a>
          </div>
        </div>
      </section>

      {/* ==================== TIMELINE OVERVIEW ==================== */}
      <section className="mk-section tight" style={{ paddingTop: 0 }}>
        <div className="mk-container">
          <div
            style={{
              background: '#FAFAFA',
              border: '1px solid #E4E4E7',
              borderRadius: 14,
              padding: '32px 40px',
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#71717A',
                marginBottom: 18,
              }}
            >
              {tTimeline('label')}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7,1fr)',
                gap: 14,
                position: 'relative',
              }}
            >
              <div
                style={{
                  gridColumn: '1/-1',
                  position: 'absolute',
                  top: 24,
                  left: 24,
                  right: 24,
                  height: 2,
                  background: 'linear-gradient(90deg,#8F1FFE 0%,#06B6D4 100%)',
                  borderRadius: 99,
                  zIndex: 0,
                }}
              ></div>

              {/* Step 01 */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 99,
                    background: '#8F1FFE',
                    border: '3px solid #FFF',
                    boxShadow: '0 0 0 1px #8F1FFE',
                    marginBottom: 14,
                  }}
                ></div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: '#71717A',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  {tTimeline('step1Label')}
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 2 }}
                >
                  {tTimeline('step1Name')}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: '#A1A1AA' }}>
                  {tTimeline('step1Duration')}
                </div>
              </div>

              {/* Step 02 */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 99,
                    background: '#FFF',
                    border: '3px solid #8F1FFE',
                    marginBottom: 14,
                  }}
                ></div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: '#71717A',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  {tTimeline('step2Label')}
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 2 }}
                >
                  {tTimeline('step2Name')}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: '#A1A1AA' }}>
                  {tTimeline('step2Duration')}
                </div>
              </div>

              {/* Step 03 */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 99,
                    background: '#FFF',
                    border: '3px solid #06B6D4',
                    marginBottom: 14,
                  }}
                ></div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: '#71717A',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  {tTimeline('step3Label')}
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 2 }}
                >
                  {tTimeline('step3Name')}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: '#A1A1AA' }}>
                  {tTimeline('step3Duration')}
                </div>
              </div>

              {/* Step 04 */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 99,
                    background: '#FFF',
                    border: '3px solid #06B6D4',
                    marginBottom: 14,
                  }}
                ></div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: '#71717A',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  {tTimeline('step4Label')}
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 2 }}
                >
                  {tTimeline('step4Name')}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: '#A1A1AA' }}>
                  {tTimeline('step4Duration')}
                </div>
              </div>

              {/* Step 05 */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 99,
                    background: '#FFF',
                    border: '3px solid #D4D4D8',
                    marginBottom: 14,
                  }}
                ></div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: '#71717A',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  {tTimeline('step5Label')}
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 2 }}
                >
                  {tTimeline('step5Name')}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: '#A1A1AA' }}>
                  {tTimeline('step5Duration')}
                </div>
              </div>

              {/* Step 06 */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 99,
                    background: '#FFF',
                    border: '3px solid #D4D4D8',
                    marginBottom: 14,
                  }}
                ></div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: '#71717A',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  {tTimeline('step6Label')}
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 2 }}
                >
                  {tTimeline('step6Name')}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: '#A1A1AA' }}>
                  {tTimeline('step6Duration')}
                </div>
              </div>

              {/* Step 07 */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 99,
                    background: '#FFF',
                    border: '3px solid #D4D4D8',
                    marginBottom: 14,
                  }}
                ></div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: '#71717A',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  {tTimeline('step7Label')}
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 2 }}
                >
                  {tTimeline('step7Name')}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: '#A1A1AA' }}>
                  {tTimeline('step7Duration')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== THE LOOP (diagram) ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-diagram-frame">
            <LoopDiagram />
          </div>
        </div>
      </section>

      {/* ==================== STEPS ==================== */}
      <section className="mk-section" id="steps">
        <div className="mk-container">
          {/* Step 01 */}
          <div className="mk-step">
            <div className="mk-step-num">
              {MOCK_STEP_NUMS[0]}<small>{tSteps('step1Role')}</small>
            </div>
            <div className="mk-step-body">
              <h3>{tSteps('step1Title')}</h3>
              <p>{tSteps('step1Body')}</p>
              <div className="meta">
                <span>
                  <b>{tSteps('step1OutputsLabel')}</b>
                </span>
                <span className="pip"></span>
                <span>{tSteps('step1OutputsValue')}</span>
                <span className="pip"></span>
                <span>
                  <b>{tSteps('step1TimeLabel')}</b> {tSteps('step1TimeValue')}
                </span>
              </div>
            </div>
          </div>

          {/* Step 02 */}
          <div className="mk-step">
            <div className="mk-step-num">
              {MOCK_STEP_NUMS[1]}<small>{tSteps('step2Role')}</small>
            </div>
            <div className="mk-step-body">
              <h3>{tSteps('step2Title')}</h3>
              <p>{tSteps('step2Body')}</p>
              <div className="meta">
                <span>
                  <b>{tSteps('step2SeeLabel')}</b> {tSteps('step2SeeValue')}
                </span>
                <span className="pip"></span>
                <span>
                  <b>{tSteps('step2TimeLabel')}</b> {tSteps('step2TimeValue')}
                </span>
              </div>
            </div>
          </div>

          {/* Step 03 */}
          <div className="mk-step">
            <div className="mk-step-num">
              {MOCK_STEP_NUMS[2]}<small>{tSteps('step3Role')}</small>
            </div>
            <div className="mk-step-body">
              <h3>{tSteps('step3Title')}</h3>
              <p>{tSteps('step3Body')}</p>
              <div className="meta">
                <span>
                  <b>{tSteps('step3MedianLabel')}</b> {tSteps('step3MedianValue')}
                </span>
                <span className="pip"></span>
                <span>
                  <b>{tSteps('step3AvgLabel')}</b> {tSteps('step3AvgValue')}
                </span>
              </div>
            </div>
          </div>

          {/* Step 04 */}
          <div className="mk-step">
            <div className="mk-step-num">
              {MOCK_STEP_NUMS[3]}<small>{tSteps('step4Role')}</small>
            </div>
            <div className="mk-step-body">
              <h3>{tSteps('step4Title')}</h3>
              <p>{tSteps('step4Body')}</p>
              <div className="meta">
                <span>
                  <b>{tSteps('step4HappensLabel')}</b> {tSteps('step4HappensValue')}
                </span>
              </div>
            </div>
          </div>

          {/* Step 05 */}
          <div className="mk-step">
            <div className="mk-step-num">
              {MOCK_STEP_NUMS[4]}<small>{tSteps('step5Role')}</small>
            </div>
            <div className="mk-step-body">
              <h3>{tSteps('step5Title')}</h3>
              <p>{tSteps('step5Body')}</p>

              <div className="mk-frame" style={{ marginTop: 32 }}>
                <div className="mk-frame-bar">
                  <span className="dot r"></span>
                  <span className="dot y"></span>
                  <span className="dot g"></span>
                  <span className="url">{MOCK_STEP5.url}</span>
                </div>
                <div className="mk-prev" style={{ minHeight: 380 }}>
                  <div className="mk-prev-side">
                    <div className="h6">{MOCK_STEP5.sideHead}</div>
                    <div className="item active">
                      <span className="ic" style={{ background: '#8F1FFE' }}></span>
                      {MOCK_STEP5.navOverview}
                    </div>
                    <div className="item">
                      <span className="ic"></span>{MOCK_STEP5.navTasks}
                      <span className="count">{MOCK_STEP5.navTasksCount}</span>
                    </div>
                    <div className="item">
                      <span className="ic"></span>{MOCK_STEP5.navDeliverables}
                      <span className="count">{MOCK_STEP5.navDeliverablesCount}</span>
                    </div>
                    <div className="item">
                      <span className="ic"></span>{MOCK_STEP5.navTimeline}
                    </div>
                  </div>
                  <div className="mk-prev-main">
                    <div
                      style={{
                        background: 'linear-gradient(135deg,#FAF5FF,#FFF)',
                        border: '1px solid #EDE9FE',
                        borderRadius: 8,
                        padding: 18,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: 10,
                          letterSpacing: '0.06em',
                          color: '#7C3AED',
                          textTransform: 'uppercase',
                          marginBottom: 8,
                        }}
                      >
                        {MOCK_STEP5.briefLabel}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          marginBottom: 6,
                        }}
                      >
                        {MOCK_STEP5.briefTitle}
                      </div>
                      <div style={{ fontSize: 12, color: '#44444E', lineHeight: 1.55 }}>
                        {MOCK_STEP5.briefBody}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {[MOCK_STEP5.chip1, MOCK_STEP5.chip2, MOCK_STEP5.chip3].map((chip) => (
                          <span
                            key={chip}
                            style={{
                              background: '#FFF',
                              border: '1px solid #EDE9FE',
                              color: '#7C3AED',
                              padding: '2px 8px',
                              borderRadius: 99,
                              fontSize: 10,
                              fontFamily: mono,
                            }}
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}
                    >
                      <div className="mk-prev-stat">
                        <div className="l">{MOCK_STEP5.stat1Label}</div>
                        <div className="v">
                          {MOCK_STEP5.stat1Value} <small>{MOCK_STEP5.stat1Unit}</small>
                        </div>
                      </div>
                      <div className="mk-prev-stat">
                        <div className="l">{MOCK_STEP5.stat2Label}</div>
                        <div className="v">
                          {MOCK_STEP5.stat2Value} <small>{MOCK_STEP5.stat2Unit}</small>
                        </div>
                      </div>
                      <div className="mk-prev-stat">
                        <div className="l">{MOCK_STEP5.stat3Label}</div>
                        <div className="v">
                          {MOCK_STEP5.stat3Value} <small>{MOCK_STEP5.stat3Unit}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 06 */}
          <div className="mk-step">
            <div className="mk-step-num">
              {MOCK_STEP_NUMS[5]}<small>{tSteps('step6Role')}</small>
            </div>
            <div className="mk-step-body">
              <h3>{tSteps('step6Title')}</h3>
              <p>{tSteps('step6Body')}</p>
              <div className="meta">
                <span>
                  <b>{tSteps('step6SupervisorLabel')}</b> {tSteps('step6SupervisorValue')}
                </span>
                <span className="pip"></span>
                <span>
                  <b>{tSteps('step6InternLabel')}</b> {tSteps('step6InternValue')}
                </span>
                <span className="pip"></span>
                <span>
                  <b>{tSteps('step6FrictionLabel')}</b> {tSteps('step6FrictionValue')}
                </span>
              </div>
            </div>
          </div>

          {/* Step 07 */}
          <div className="mk-step">
            <div className="mk-step-num">
              {MOCK_STEP_NUMS[6]}<small>{tSteps('step7Role')}</small>
            </div>
            <div className="mk-step-body">
              <h3>{tSteps('step7Title')}</h3>
              <p>
                {tSteps('step7BodyLead')}{' '}
                <code
                  style={{
                    fontFamily: mono,
                    fontSize: '0.9em',
                    background: 'var(--surface-muted)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {MOCK_STEP7_CODE}
                </code>{' '}
                {tSteps('step7BodyTail')}
              </p>
              <div className="meta">
                <span>
                  <b>{tSteps('step7ShipsLabel')}</b> {tSteps('step7ShipsValue')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== THE MATCH (diagram) ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-diagram-frame">
            <TheMatch />
          </div>
        </div>
      </section>

      {/* ==================== WHAT WE DON'T DO ==================== */}
      <section className="mk-section surface-muted">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tLimits('eyebrow')}</div>
            <h2 className="mk-h2">
              {tLimits('titleLead')} <span className="strike">{tLimits('titleStrike')}</span>
              <br />
              {tLimits('titleTail')}
            </h2>
            <p className="mk-deck">{tLimits('deck')}</p>
          </div>

          <div className="mk-grid-2">
            <div className="mk-feature">
              <div className="mk-feature-title">{tLimits('card1Title')}</div>
              <div className="mk-feature-body">{tLimits('card1Body')}</div>
            </div>
            <div className="mk-feature">
              <div className="mk-feature-title">{tLimits('card2Title')}</div>
              <div className="mk-feature-body">{tLimits('card2Body')}</div>
            </div>
            <div className="mk-feature">
              <div className="mk-feature-title">{tLimits('card3Title')}</div>
              <div className="mk-feature-body">{tLimits('card3Body')}</div>
            </div>
            <div className="mk-feature">
              <div className="mk-feature-title">{tLimits('card4Title')}</div>
              <div className="mk-feature-body">{tLimits('card4Body')}</div>
            </div>
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
              <Link href="/sign-up" className="mk-btn mk-btn-brand lg">
                {tCta('primary')} <span className="arrow">{MOCK_ARROW}</span>
              </Link>
              <Link href="/marketplace" className="mk-btn mk-btn-ghost dark lg">
                {tCta('secondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
