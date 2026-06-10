import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.virtual.meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

/* ------------------------------------------------------------------
 * Mockup / browser-chrome copy: NOT translated.
 * These are fake-app strings (URLs, task IDs, labels, dates, names)
 * kept as literals — the i18next jsx-text lint rule won't flag them.
 * ------------------------------------------------------------------ */
const mono = 'var(--font-mono)';

const MOCK_WORKSPACE = {
  url: 'inturn.app/yasmine/growth-audit/check-ins',
  sideHead: 'Virtual workspace',
  navOverview: 'Overview',
  navTasks: 'Tasks',
  navTasksCount: '6',
  navDeliverables: 'Deliverables',
  navDeliverablesCount: '2',
  navCheckIns: 'Check-ins',
  navCheckInsCount: 'W3',
  navSchedule: 'Schedule',
  teamHead: 'Team · 2 timezones',
  teamAv1: 'YB',
  teamAv2: 'LK',
  teamCities: 'Tunis · Berlin',
  checkInTitle: 'Weekly check-in · Week 3',
  checkInBadge: '● VIRTUAL',
  checkInDue: 'DUE FRI',
  checkInAv: 'YB',
  checkInName: "Yasmine's check-in",
  checkInChip: 'SUPERVISOR NOTIFIED',
  shippedLabel: 'Shipped this week',
  shippedBody: 'Competitor teardown (8 brands) + first-draft positioning matrix.',
  blockedLabel: 'Blocked on',
  blockedBody: 'Need the analytics export to size the channels — flagged Mehdi.',
  taskCode: 'T-014 · ASYNC',
  taskTitle: 'Channel sizing model',
  taskStatus: 'IN PROGRESS',
  taskScopeLabel: 'Scope',
  taskScopeBody: 'Size top 5 acquisition channels by CAC and reach for the TN market.',
  taskOutputLabel: 'Output',
  taskOutputBody: 'One sheet + a 3-slide summary, linked in Deliverables.',
  taskDeadlineLabel: 'Deadline',
  taskDeadlineBody: 'Thu 5 Jun · 17:00 CET',
  nextCallLabel: 'Next call',
  tunis: 'Tunis 14:00',
  swap: '↔',
  berlin: 'Berlin 15:00',
  tzNote: '· auto-converted',
  joinBtn: 'Join Meet →',
};

const MOCK_QUOTE = {
  avatar: 'LK',
};

const MOCK_ARROW = '→';

const MOCK_STEP_NUMS = ['01', '02', '03', '04'] as const;

const MOCK_FEATURE_ICOS = ['01', '02', '03'] as const;

export default async function VirtualInternshipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tHero = await getTranslations({ locale, namespace: 'site.virtual.hero' });
  const tWhy = await getTranslations({ locale, namespace: 'site.virtual.whyFails' });
  const tHow = await getTranslations({ locale, namespace: 'site.virtual.howItRuns' });
  const tOpp = await getTranslations({ locale, namespace: 'site.virtual.opportunity' });
  const tSplit = await getTranslations({ locale, namespace: 'site.virtual.split' });
  const tQuote = await getTranslations({ locale, namespace: 'site.virtual.quote' });
  const tCta = await getTranslations({ locale, namespace: 'site.virtual.cta' });

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
            <Link href="/marketplace" className="mk-btn mk-btn-brand lg">
              {tHero('ctaPrimary')} <span className="arrow">{MOCK_ARROW}</span>
            </Link>
            <a href="#how" className="mk-btn mk-btn-ghost lg">
              {tHero('ctaSecondary')}
            </a>
          </div>

          <div className="mk-hero-trust">
            <span className="dot"></span>
            <span>
              <b>{tHero('trustStat')}</b> {tHero('trustRest')}
            </span>
          </div>

          {/* Virtual workspace preview */}
          <div className="mk-hero-showcase">
            <div className="mk-frame">
              <div className="mk-frame-bar">
                <span className="dot r"></span>
                <span className="dot y"></span>
                <span className="dot g"></span>
                <span className="url">{MOCK_WORKSPACE.url}</span>
              </div>
              <div className="mk-prev">
                <div className="mk-prev-side">
                  <div className="h6">{MOCK_WORKSPACE.sideHead}</div>
                  <div className="item">
                    <span className="ic"></span>{MOCK_WORKSPACE.navOverview}
                  </div>
                  <div className="item">
                    <span className="ic"></span>{MOCK_WORKSPACE.navTasks}
                    <span className="count">{MOCK_WORKSPACE.navTasksCount}</span>
                  </div>
                  <div className="item">
                    <span className="ic"></span>{MOCK_WORKSPACE.navDeliverables}
                    <span className="count">{MOCK_WORKSPACE.navDeliverablesCount}</span>
                  </div>
                  <div className="item active">
                    <span className="ic" style={{ background: '#8F1FFE' }}></span>
                    {MOCK_WORKSPACE.navCheckIns}
                    <span className="count">{MOCK_WORKSPACE.navCheckInsCount}</span>
                  </div>
                  <div className="item">
                    <span className="ic"></span>{MOCK_WORKSPACE.navSchedule}
                  </div>
                  <div className="sep"></div>
                  <div className="h6">{MOCK_WORKSPACE.teamHead}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px' }}>
                    <span className="mk-avatar xs violet">{MOCK_WORKSPACE.teamAv1}</span>
                    <span className="mk-avatar xs sky">{MOCK_WORKSPACE.teamAv2}</span>
                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: 9.5,
                        color: '#71717A',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {MOCK_WORKSPACE.teamCities}
                    </span>
                  </div>
                </div>
                <div className="mk-prev-main" style={{ padding: '22px 26px' }}>
                  <div className="mk-prev-head" style={{ marginBottom: 16 }}>
                    <span className="title">{MOCK_WORKSPACE.checkInTitle}</span>
                    <span className="pill">{MOCK_WORKSPACE.checkInBadge}</span>
                    <span className="meta">{MOCK_WORKSPACE.checkInDue}</span>
                  </div>

                  {/* check-in card */}
                  <div
                    style={{
                      border: '1.5px solid #8F1FFE',
                      borderRadius: 10,
                      background: '#fff',
                      boxShadow: '0 0 0 1.5px #8F1FFE',
                      overflow: 'hidden',
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        background: '#FAF5FF',
                        padding: '11px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderBottom: '1px solid #EDE9FE',
                      }}
                    >
                      <span className="mk-avatar xs violet">{MOCK_WORKSPACE.checkInAv}</span>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>
                        {MOCK_WORKSPACE.checkInName}
                      </div>
                      <span
                        style={{
                          background: '#EDE9FE',
                          color: '#7C3AED',
                          padding: '2px 9px',
                          borderRadius: 99,
                          fontSize: 9.5,
                          fontWeight: 600,
                          fontFamily: mono,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {MOCK_WORKSPACE.checkInChip}
                      </span>
                    </div>
                    <div
                      style={{
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 11,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: mono,
                            fontSize: 9,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: '#71717A',
                            marginBottom: 3,
                          }}
                        >
                          {MOCK_WORKSPACE.shippedLabel}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#1F1F2A', lineHeight: 1.45 }}>
                          {MOCK_WORKSPACE.shippedBody}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: mono,
                            fontSize: 9,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: '#71717A',
                            marginBottom: 3,
                          }}
                        >
                          {MOCK_WORKSPACE.blockedLabel}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#1F1F2A', lineHeight: 1.45 }}>
                          {MOCK_WORKSPACE.blockedBody}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* async task template */}
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      background: '#fff',
                      overflow: 'hidden',
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 9,
                          color: '#71717A',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {MOCK_WORKSPACE.taskCode}
                      </span>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
                        {MOCK_WORKSPACE.taskTitle}
                      </div>
                      <span
                        style={{
                          background: '#ECFEFF',
                          color: '#0E7490',
                          fontSize: 9.5,
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontWeight: 500,
                          fontFamily: mono,
                        }}
                      >
                        {MOCK_WORKSPACE.taskStatus}
                      </span>
                    </div>
                    <div style={{ padding: '6px 16px 12px' }}>
                      <div className="vi-tt-row" style={{ borderTop: 0 }}>
                        <span className="k">{MOCK_WORKSPACE.taskScopeLabel}</span>
                        <span className="v">{MOCK_WORKSPACE.taskScopeBody}</span>
                      </div>
                      <div className="vi-tt-row">
                        <span className="k">{MOCK_WORKSPACE.taskOutputLabel}</span>
                        <span className="v">{MOCK_WORKSPACE.taskOutputBody}</span>
                      </div>
                      <div className="vi-tt-row">
                        <span className="k">{MOCK_WORKSPACE.taskDeadlineLabel}</span>
                        <span className="v" style={{ color: '#0F0F14', fontWeight: 500 }}>
                          {MOCK_WORKSPACE.taskDeadlineBody}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* schedule row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      border: '1px dashed var(--border-strong)',
                      borderRadius: 10,
                      padding: '12px 16px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: 9,
                        color: '#71717A',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {MOCK_WORKSPACE.nextCallLabel}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 12,
                      }}
                    >
                      <b style={{ color: '#0F0F14' }}>{MOCK_WORKSPACE.tunis}</b>
                      <span style={{ color: '#A1A1AA' }}>{MOCK_WORKSPACE.swap}</span>
                      <b style={{ color: '#0F0F14' }}>{MOCK_WORKSPACE.berlin}</b>
                      <span style={{ fontFamily: mono, fontSize: 9.5, color: '#71717A' }}>
                        {MOCK_WORKSPACE.tzNote}
                      </span>
                    </div>
                    <span
                      style={{
                        background: '#0F0F14',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {MOCK_WORKSPACE.joinBtn}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WHY REMOTE FAILS ==================== */}
      <section className="mk-section surface-muted">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tWhy('eyebrow')}</div>
            <h2 className="mk-h2">
              {tWhy('titleLead')}
              <br />
              <span className="grad">{tWhy('titleGrad')}</span>
            </h2>
            <p className="mk-deck">{tWhy('deck')}</p>
          </div>

          <div className="mk-grid-3">
            <div className="mk-feature">
              <div className="mk-feature-ico">{MOCK_FEATURE_ICOS[0]}</div>
              <div className="mk-feature-title">{tWhy('card1Title')}</div>
              <div className="mk-feature-body">{tWhy('card1Body')}</div>
            </div>
            <div className="mk-feature">
              <div className="mk-feature-ico">{MOCK_FEATURE_ICOS[1]}</div>
              <div className="mk-feature-title">{tWhy('card2Title')}</div>
              <div className="mk-feature-body">{tWhy('card2Body')}</div>
            </div>
            <div className="mk-feature">
              <div className="mk-feature-ico">{MOCK_FEATURE_ICOS[2]}</div>
              <div className="mk-feature-title">{tWhy('card3Title')}</div>
              <div className="mk-feature-body">{tWhy('card3Body')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT RUNS ==================== */}
      <section className="mk-section" id="how">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tHow('eyebrow')}</div>
            <h2 className="mk-h2">
              {tHow('titleLead')} <span className="grad">{tHow('titleGrad')}</span>
            </h2>
            <p className="mk-deck">{tHow('deck')}</p>
          </div>

          <div>
            {/* Step 01 */}
            <div className="mk-step">
              <div className="mk-step-num">
                {MOCK_STEP_NUMS[0]}<small>{tHow('step1Small')}</small>
              </div>
              <div className="mk-step-body">
                <h3>{tHow('step1Title')}</h3>
                <p>{tHow('step1Body')}</p>
                <div className="meta">
                  <span>
                    <b>{tHow('step1Meta1')}</b>
                  </span>
                  <span className="pip"></span>
                  <span>
                    <b>{tHow('step1Meta2')}</b>
                  </span>
                  <span className="pip"></span>
                  <span>
                    <b>{tHow('step1Meta3')}</b>
                  </span>
                </div>
              </div>
            </div>

            {/* Step 02 */}
            <div className="mk-step">
              <div className="mk-step-num">
                {MOCK_STEP_NUMS[1]}<small>{tHow('step2Small')}</small>
              </div>
              <div className="mk-step-body">
                <h3>{tHow('step2Title')}</h3>
                <p>{tHow('step2Body')}</p>
                <div className="meta">
                  <span>{tHow('step2Meta1')}</span>
                  <span className="pip"></span>
                  <span>{tHow('step2Meta2')}</span>
                  <span className="pip"></span>
                  <span>{tHow('step2Meta3')}</span>
                </div>
              </div>
            </div>

            {/* Step 03 */}
            <div className="mk-step">
              <div className="mk-step-num">
                {MOCK_STEP_NUMS[2]}<small>{tHow('step3Small')}</small>
              </div>
              <div className="mk-step-body">
                <h3>{tHow('step3Title')}</h3>
                <p>{tHow('step3Body')}</p>
                <div className="meta">
                  <span>
                    <b>{tHow('step3Meta1')}</b>
                  </span>
                  <span className="pip"></span>
                  <span>
                    <b>{tHow('step3Meta2')}</b>
                  </span>
                  <span className="pip"></span>
                  <span>{tHow('step3Meta3')}</span>
                </div>
              </div>
            </div>

            {/* Step 04 */}
            <div className="mk-step">
              <div className="mk-step-num">
                {MOCK_STEP_NUMS[3]}<small>{tHow('step4Small')}</small>
              </div>
              <div className="mk-step-body">
                <h3>{tHow('step4Title')}</h3>
                <p>{tHow('step4Body')}</p>
                <div className="meta">
                  <span>{tHow('step4Meta1')}</span>
                  <span className="pip"></span>
                  <span>{tHow('step4Meta2')}</span>
                  <span className="pip"></span>
                  <span>
                    <b>{tHow('step4Meta3')}</b>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CROSS-BORDER / OPPORTUNITY ==================== */}
      <section className="mk-section gradient">
        <div className="mk-container">
          <div className="mk-section-head center">
            <div className="mk-eyebrow dark">{tOpp('eyebrow')}</div>
            <h2 className="mk-h2">
              {tOpp('titleLead')}
              <br />
              <span className="grad">{tOpp('titleGrad')}</span>
            </h2>
            <p className="mk-deck">{tOpp('deck')}</p>
          </div>

          <div className="vi-stat-grid">
            <div className="vi-stat">
              <div className="n">
                <span className="grad">{tOpp('stat1Value')}</span>
              </div>
              <div className="l">{tOpp('stat1Label')}</div>
            </div>
            <div className="vi-stat">
              <div className="n">
                <span className="grad">{tOpp('stat2Value')}</span>
              </div>
              <div className="l">{tOpp('stat2Label')}</div>
            </div>
            <div className="vi-stat">
              <div className="n">
                <span className="grad">{tOpp('stat3Value')}</span>
              </div>
              <div className="l">{tOpp('stat3Label')}</div>
            </div>
          </div>

          <div className="vi-tz">
            <div className="vi-tz-city">
              <div className="flag">{tOpp('tz1City')}</div>
              <div className="time">{tOpp('tz1Offset').split('·')[0]?.trim()}</div>
              <div className="off">{tOpp('tz1Offset')}</div>
              <div className="vi-tz-bar"></div>
            </div>
            <div className="vi-tz-city">
              <div className="flag">{tOpp('tz2City')}</div>
              <div className="time">{tOpp('tz2Offset').split('·')[0]?.trim()}</div>
              <div className="off">{tOpp('tz2Offset')}</div>
              <div className="vi-tz-bar"></div>
            </div>
            <div className="vi-tz-city">
              <div className="flag">{tOpp('tz3City')}</div>
              <div className="time">{tOpp('tz3Offset').split('·')[0]?.trim()}</div>
              <div className="off">{tOpp('tz3Offset')}</div>
              <div className="vi-tz-bar"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SPLIT: INTERNS / COMPANIES ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-grid-2">
            <div className="mk-feature">
              <div className="vi-split-note">{tSplit('internsLabel')}</div>
              <div className="mk-feature-title" style={{ fontSize: 24, marginBottom: 12 }}>
                {tSplit('internsTitle')}
              </div>
              <div className="mk-feature-body" style={{ fontSize: 15.5 }}>
                {tSplit('internsBody')}
                <div style={{ marginTop: 22 }}>
                  <Link href="/marketplace" className="mk-btn mk-btn-brand">
                    {tSplit('internsCta')} <span className="arrow">{MOCK_ARROW}</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="mk-feature">
              <div className="vi-split-note">{tSplit('companiesLabel')}</div>
              <div className="mk-feature-title" style={{ fontSize: 24, marginBottom: 12 }}>
                {tSplit('companiesTitle')}
              </div>
              <div className="mk-feature-body" style={{ fontSize: 15.5 }}>
                {tSplit('companiesBody')}
                <div style={{ marginTop: 22 }}>
                  <Link href="/how-it-works" className="mk-btn mk-btn-ghost">
                    {tSplit('companiesCta')} <span className="arrow">{MOCK_ARROW}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== QUOTE ==================== */}
      <section className="mk-section surface-muted tight">
        <div className="mk-container">
          <div className="mk-quote">
            <blockquote>{tQuote('text')}</blockquote>
            <div className="who">
              <span className="mk-avatar sky lg">{MOCK_QUOTE.avatar}</span>
              <div className="meta">
                <div className="name">{tQuote('name')}</div>
                <div className="role">{tQuote('role')}</div>
              </div>
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
              <Link href="/marketplace" className="mk-btn mk-btn-brand lg">
                {tCta('primary')} <span className="arrow">{MOCK_ARROW}</span>
              </Link>
              <Link href="/sign-up" className="mk-btn mk-btn-ghost dark lg">
                {tCta('secondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
