import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import RoleToProject from '@/components/landing/diagrams/role-to-project';
import WhatChanges from '@/components/landing/diagrams/what-changes';
import FlywheelDiagram from '@/components/landing/diagrams/flywheel-diagram';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.forCompanies.meta' });
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

const MOCK_HERO = {
  url: 'inturn.app/acme-studio/dashboard',
  genLabel: 'Friday · 30 May · Acme Studio',
  genTitle: 'Good afternoon, ',
  genName: 'Mehdi',
  genSub: 'Two reviews waiting, one project synced this morning, weekly check-in lands at 14:00.',
  stat1Label: 'Projects',
  stat1Value: '3',
  stat1Unit: 'active',
  stat2Label: 'Awaiting review',
  stat2Value: '2',
  stat2Unit: 'items · 2h',
  stat3Label: 'Applications',
  stat3Value: '14',
  stat3Unit: 'this week',
  stat4Label: 'Team',
  stat4Value: '3',
  stat4Unit: 'interns',
  todayLabel: "Today's tasks",
  task1: 'Review BA-003 · Audit slide deck v2',
  task1Badge: 'IN REVIEW',
  task2: 'Comment on type pairings · BA-006',
  task2Badge: 'IN PROGRESS',
  task3: 'Friday digest sent',
  task3Badge: 'DONE',
};

const MOCK_SUPERVISOR = {
  url: 'inturn.app/acme/yasmine/tasks',
  sideHead: 'Workspace · Yasmine',
  navOverview: 'Overview',
  navTasks: 'Tasks',
  navTasksCount: '6',
  navDeliverables: 'Deliverables',
  navDeliverablesCount: '5',
  navTimeline: 'Timeline',
  navActivity: 'Activity',
  navComments: 'Comments',
  navCommentsCount: '1',
  alertText1: '1 task is waiting on you.',
  alertText2: ' Yasmine submitted BA-003 · Audit slide deck v2 · 2h ago.',
  alertCta: 'JUMP TO CARD →',
  col1Head: 'To do',
  col1Count: '1',
  col2Head: 'In progress',
  col2Count: '2',
  col3Head: 'In review',
  col3Count: '1',
  col4Head: 'Done',
  col4Count: '2',
  card1Tag: 'BA-007',
  card1Title: 'Logo refresh — round 1',
  card1Due: 'DUE 6 JUN',
  card2Tag: 'BA-005',
  card2Title: 'Moodboards · 3 directions',
  card2Due: 'DUE FRI',
  card3Tag: 'BA-006',
  card3Title: 'Type pairings',
  card3Due: 'DUE FRI',
  card4Tag: 'BA-003',
  card4Title: 'Audit deck v2',
  card4Due: '2H AGO',
  card5Tag: 'BA-002',
  card5Title: 'Stakeholder interviews',
  card5Due: 'CLOSED MON',
  card6Tag: 'BA-001',
  card6Title: 'Kickoff sign-off',
  card6Due: 'CLOSED 2W',
};

const MOCK_SIDEBAR = {
  genHead: 'General',
  navDashboard: 'Dashboard',
  navInbox: 'Inbox',
  navInboxCount: '14',
  navHubs: 'Project hubs',
  navHubsCount: '4',
  activeHead: 'Active projects',
  proj1: 'Brand audit',
  proj1Count: '3w',
  proj2: 'Design system',
  proj2Count: '1w',
  proj3: 'Restaurant app',
  proj3Count: '8w',
};

const MOCK_ARROW = '→';
const MOCK_AVATAR_SR = 'SR';
const MOCK_ICO_S = 'S';
const MOCK_ICO_D = 'D';
const MOCK_ICO_M = 'M';

export default async function ForCompaniesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tHero = await getTranslations({ locale, namespace: 'site.forCompanies.hero' });
  const tWhat = await getTranslations({ locale, namespace: 'site.forCompanies.whatYouGet' });
  const tSup = await getTranslations({ locale, namespace: 'site.forCompanies.supervisor' });
  const tQuote = await getTranslations({ locale, namespace: 'site.forCompanies.quote' });
  const tUse = await getTranslations({ locale, namespace: 'site.forCompanies.useCases' });
  const tCta = await getTranslations({ locale, namespace: 'site.forCompanies.cta' });

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
            <Link href="/sign-up" className="mk-btn mk-btn-brand lg">
              {tHero('ctaPrimary')} <span className="arrow">{MOCK_ARROW}</span>
            </Link>
            <a href="#walkthrough" className="mk-btn mk-btn-ghost lg">
              {tHero('ctaSecondary')}
            </a>
          </div>

          <div className="mk-hero-trust">
            <span className="dot"></span>
            <span>
              <b>{tHero('trustStat1')}</b> {tHero('trustMid')} <b>{tHero('trustStat2')}</b>
            </span>
          </div>

          <div className="mk-hero-showcase" id="walkthrough">
            <div className="mk-frame">
              <div className="mk-frame-bar">
                <span className="dot r"></span>
                <span className="dot y"></span>
                <span className="dot g"></span>
                <span className="url">{MOCK_HERO.url}</span>
              </div>
              <div className="mk-prev">
                <div className="mk-prev-side">
                  <div className="h6">{MOCK_SIDEBAR.genHead}</div>
                  <div className="item active">
                    <span className="ic" style={{ background: '#8F1FFE' }}></span>{MOCK_SIDEBAR.navDashboard}
                  </div>
                  <div className="item">
                    <span className="ic"></span>{MOCK_SIDEBAR.navInbox}<span className="count">{MOCK_SIDEBAR.navInboxCount}</span>
                  </div>
                  <div className="item">
                    <span className="ic"></span>{MOCK_SIDEBAR.navHubs}<span className="count">{MOCK_SIDEBAR.navHubsCount}</span>
                  </div>
                  <div className="sep"></div>
                  <div className="h6">{MOCK_SIDEBAR.activeHead}</div>
                  <div className="item">
                    <span className="ic" style={{ background: '#8F1FFE' }}></span>{MOCK_SIDEBAR.proj1}
                    <span className="count">{MOCK_SIDEBAR.proj1Count}</span>
                  </div>
                  <div className="item">
                    <span className="ic" style={{ background: '#2563EB' }}></span>{MOCK_SIDEBAR.proj2}
                    <span className="count">{MOCK_SIDEBAR.proj2Count}</span>
                  </div>
                  <div className="item">
                    <span className="ic" style={{ background: '#06B6D4' }}></span>{MOCK_SIDEBAR.proj3}
                    <span className="count">{MOCK_SIDEBAR.proj3Count}</span>
                  </div>
                </div>
                <div className="mk-prev-main">
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#FAF5FF,#FFFFFF)',
                      border: '1px solid #EDE9FE',
                      borderRadius: 12,
                      padding: 22,
                      marginBottom: 16,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        color: '#71717A',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      {MOCK_HERO.genLabel}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>
                      {MOCK_HERO.genTitle}
                      <span
                        style={{
                          background: 'linear-gradient(135deg,#8F1FFE,#06B6D4)',
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {MOCK_HERO.genName}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#44444E', marginTop: 4 }}>
                      {MOCK_HERO.genSub}
                    </div>
                  </div>
                  <div className="mk-prev-stats">
                    <div className="mk-prev-stat">
                      <div className="l">{MOCK_HERO.stat1Label}</div>
                      <div className="v">
                        {MOCK_HERO.stat1Value} <small>{MOCK_HERO.stat1Unit}</small>
                      </div>
                    </div>
                    <div className="mk-prev-stat">
                      <div className="l">{MOCK_HERO.stat2Label}</div>
                      <div className="v" style={{ color: '#7C3AED' }}>
                        {MOCK_HERO.stat2Value} <small>{MOCK_HERO.stat2Unit}</small>
                      </div>
                    </div>
                    <div className="mk-prev-stat">
                      <div className="l">{MOCK_HERO.stat3Label}</div>
                      <div className="v">
                        {MOCK_HERO.stat3Value} <small>{MOCK_HERO.stat3Unit}</small>
                      </div>
                    </div>
                    <div className="mk-prev-stat">
                      <div className="l">{MOCK_HERO.stat4Label}</div>
                      <div className="v">
                        {MOCK_HERO.stat4Value} <small>{MOCK_HERO.stat4Unit}</small>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      border: '1px solid #E4E4E7',
                      borderRadius: 8,
                      padding: 14,
                      background: '#FFF',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                      {MOCK_HERO.todayLabel}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 0',
                        borderBottom: '1px solid #F4F4F5',
                        fontSize: 11.5,
                      }}
                    >
                      <span
                        style={{
                          width: 13,
                          height: 13,
                          border: '1.4px solid #A1A1AA',
                          borderRadius: 3,
                        }}
                      ></span>
                      <span style={{ flex: 1 }}>{MOCK_HERO.task1}</span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 9,
                          background: '#FAF5FF',
                          color: '#7C3AED',
                          padding: '2px 6px',
                          borderRadius: 99,
                          fontWeight: 600,
                        }}
                      >
                        {MOCK_HERO.task1Badge}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 0',
                        borderBottom: '1px solid #F4F4F5',
                        fontSize: 11.5,
                      }}
                    >
                      <span
                        style={{
                          width: 13,
                          height: 13,
                          border: '1.4px solid #A1A1AA',
                          borderRadius: 3,
                        }}
                      ></span>
                      <span style={{ flex: 1 }}>{MOCK_HERO.task2}</span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 9,
                          background: '#DBEAFE',
                          color: '#1D4ED8',
                          padding: '2px 6px',
                          borderRadius: 99,
                          fontWeight: 600,
                        }}
                      >
                        {MOCK_HERO.task2Badge}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 0',
                        fontSize: 11.5,
                        opacity: 0.6,
                      }}
                    >
                      <span
                        style={{
                          width: 13,
                          height: 13,
                          background: '#16A34A',
                          border: '1.4px solid #16A34A',
                          borderRadius: 3,
                          position: 'relative',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: 3,
                            top: 1,
                            width: 4,
                            height: 6,
                            borderRight: '1.4px solid #FFF',
                            borderBottom: '1.4px solid #FFF',
                            transform: 'rotate(45deg)',
                          }}
                        ></span>
                      </span>
                      <span style={{ flex: 1, textDecoration: 'line-through', color: '#71717A' }}>
                        {MOCK_HERO.task3}
                      </span>
                      <span style={{ fontFamily: mono, fontSize: 9, color: '#71717A' }}>
                        {MOCK_HERO.task3Badge}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== THE REFRAME (diagram) ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-diagram-frame">
            <RoleToProject />
          </div>
        </div>
      </section>

      {/* ==================== WHAT YOU GET ==================== */}
      <section className="mk-section surface-muted">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tWhat('eyebrow')}</div>
            <h2 className="mk-h2">
              {tWhat('titleLead')}
              <br />
              <span className="grad">{tWhat('titleGrad')}</span>
            </h2>
            <p className="mk-deck">{tWhat('deck')}</p>
          </div>

          <div className="mk-grid-2">
            {(
              [
                ['card1', 'P'],
                ['card2', '⇄'],
                ['card3', '⏱'],
                ['card4', '⇈'],
                ['card5', '∞'],
                ['card6', '★'],
              ] as const
            ).map(([key, ico]) => (
              <div className="mk-feature" key={key}>
                <div className="mk-feature-ico">{ico}</div>
                <div className="mk-feature-title">{tWhat(`${key}Title`)}</div>
                <div className="mk-feature-body">{tWhat(`${key}Body`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== WHAT CHANGES (dark diagram) ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-diagram-frame dark">
            <WhatChanges />
          </div>
        </div>
      </section>

      {/* ==================== SUPERVISOR VIEW DEEP DIVE ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tSup('eyebrow')}</div>
            <h2 className="mk-h2">
              {tSup('titleLead')} <span className="grad">{tSup('titleGrad')}</span>
              <br />
              {tSup('titleTail')}
            </h2>
          </div>

          <div className="mk-frame">
            <div className="mk-frame-bar">
              <span className="dot r"></span>
              <span className="dot y"></span>
              <span className="dot g"></span>
              <span className="url">{MOCK_SUPERVISOR.url}</span>
            </div>
            <div className="mk-prev">
              <div className="mk-prev-side">
                <div className="h6">{MOCK_SUPERVISOR.sideHead}</div>
                <div className="item">
                  <span className="ic"></span>{MOCK_SUPERVISOR.navOverview}
                </div>
                <div className="item active">
                  <span className="ic" style={{ background: '#8F1FFE' }}></span>
                  {MOCK_SUPERVISOR.navTasks}
                  <span className="count">{MOCK_SUPERVISOR.navTasksCount}</span>
                </div>
                <div className="item">
                  <span className="ic"></span>{MOCK_SUPERVISOR.navDeliverables}
                  <span className="count">{MOCK_SUPERVISOR.navDeliverablesCount}</span>
                </div>
                <div className="item">
                  <span className="ic"></span>{MOCK_SUPERVISOR.navTimeline}
                </div>
                <div className="item">
                  <span className="ic"></span>{MOCK_SUPERVISOR.navActivity}
                </div>
                <div className="item">
                  <span className="ic"></span>{MOCK_SUPERVISOR.navComments}
                  <span className="count" style={{ background: '#8F1FFE', color: '#FFF' }}>
                    {MOCK_SUPERVISOR.navCommentsCount}
                  </span>
                </div>
              </div>
              <div className="mk-prev-main">
                <div
                  style={{
                    background: '#FAF5FF',
                    border: '1px solid #EDE9FE',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 12,
                    color: '#7C3AED',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: '#8F1FFE',
                      boxShadow: '0 0 0 3px rgba(124,58,237,0.18)',
                    }}
                  ></span>
                  <span>
                    <b style={{ color: '#7C3AED' }}>{MOCK_SUPERVISOR.alertText1}</b>
                    {MOCK_SUPERVISOR.alertText2}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: mono,
                      fontSize: 10,
                      color: '#7C3AED',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {MOCK_SUPERVISOR.alertCta}
                  </span>
                </div>
                <div className="mk-prev-board">
                  <div className="mk-prev-col">
                    <div className="mk-prev-col-head">
                      <span className="pip"></span>
                      <span>{MOCK_SUPERVISOR.col1Head}</span>
                      <span className="count">{MOCK_SUPERVISOR.col1Count}</span>
                    </div>
                    <div className="mk-prev-card">
                      <span className="tag">{MOCK_SUPERVISOR.card1Tag}</span>
                      <span className="title">{MOCK_SUPERVISOR.card1Title}</span>
                      <span className="due">{MOCK_SUPERVISOR.card1Due}</span>
                    </div>
                  </div>
                  <div className="mk-prev-col prog">
                    <div className="mk-prev-col-head">
                      <span className="pip"></span>
                      <span>{MOCK_SUPERVISOR.col2Head}</span>
                      <span className="count">{MOCK_SUPERVISOR.col2Count}</span>
                    </div>
                    <div className="mk-prev-card urgent">
                      <span className="tag">{MOCK_SUPERVISOR.card2Tag}</span>
                      <span className="title">{MOCK_SUPERVISOR.card2Title}</span>
                      <span className="due u">{MOCK_SUPERVISOR.card2Due}</span>
                    </div>
                    <div className="mk-prev-card urgent">
                      <span className="tag">{MOCK_SUPERVISOR.card3Tag}</span>
                      <span className="title">{MOCK_SUPERVISOR.card3Title}</span>
                      <span className="due u">{MOCK_SUPERVISOR.card3Due}</span>
                    </div>
                  </div>
                  <div className="mk-prev-col review">
                    <div className="mk-prev-col-head">
                      <span className="pip"></span>
                      <span>{MOCK_SUPERVISOR.col3Head}</span>
                      <span className="count">{MOCK_SUPERVISOR.col3Count}</span>
                    </div>
                    <div className="mk-prev-card needs">
                      <span className="tag">{MOCK_SUPERVISOR.card4Tag}</span>
                      <span className="title">{MOCK_SUPERVISOR.card4Title}</span>
                      <span className="due">{MOCK_SUPERVISOR.card4Due}</span>
                    </div>
                  </div>
                  <div className="mk-prev-col done">
                    <div className="mk-prev-col-head">
                      <span className="pip"></span>
                      <span>{MOCK_SUPERVISOR.col4Head}</span>
                      <span className="count">{MOCK_SUPERVISOR.col4Count}</span>
                    </div>
                    <div className="mk-prev-card">
                      <span className="tag">{MOCK_SUPERVISOR.card5Tag}</span>
                      <span className="title">{MOCK_SUPERVISOR.card5Title}</span>
                      <span className="due">{MOCK_SUPERVISOR.card5Due}</span>
                    </div>
                    <div className="mk-prev-card">
                      <span className="tag">{MOCK_SUPERVISOR.card6Tag}</span>
                      <span className="title">{MOCK_SUPERVISOR.card6Title}</span>
                      <span className="due">{MOCK_SUPERVISOR.card6Due}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mk-grid-3" style={{ marginTop: 64 }}>
            <div>
              <h3 className="mk-h4" style={{ marginBottom: 10 }}>
                {tSup('point1Title')}
              </h3>
              <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                {tSup('point1Body')}
              </p>
            </div>
            <div>
              <h3 className="mk-h4" style={{ marginBottom: 10 }}>
                {tSup('point2Title')}
              </h3>
              <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                {tSup('point2Body')}
              </p>
            </div>
            <div>
              <h3 className="mk-h4" style={{ marginBottom: 10 }}>
                {tSup('point3Title')}
              </h3>
              <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                {tSup('point3Body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== QUOTE ==================== */}
      <section className="mk-section surface-muted tight">
        <div className="mk-container">
          <div className="mk-quote">
            <blockquote>{`"${tQuote('text')}"`}</blockquote>
            <div className="who">
              <span className="mk-avatar sky lg">{MOCK_AVATAR_SR}</span>
              <div className="meta">
                <div className="name">{tQuote('name')}</div>
                <div className="role">{tQuote('role')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== USE CASES ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tUse('eyebrow')}</div>
            <h2 className="mk-h2">
              {tUse('titleLead')} <span className="grad">{tUse('titleGrad')}</span>
              <br />
              {tUse('titleTail')}
            </h2>
          </div>

          <div className="mk-grid-3">
            <div className="mk-feature">
              <div className="mk-feature-ico">{MOCK_ICO_S}</div>
              <div className="mk-feature-title">{tUse('card1Title')}</div>
              <div className="mk-feature-body">{tUse('card1Body')}</div>
            </div>
            <div className="mk-feature">
              <div className="mk-feature-ico">{MOCK_ICO_D}</div>
              <div className="mk-feature-title">{tUse('card2Title')}</div>
              <div className="mk-feature-body">{tUse('card2Body')}</div>
            </div>
            <div className="mk-feature">
              <div className="mk-feature-ico">{MOCK_ICO_M}</div>
              <div className="mk-feature-title">{tUse('card3Title')}</div>
              <div className="mk-feature-body">{tUse('card3Body')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WHY IT COMPOUNDS (diagram) ==================== */}
      <section className="mk-section surface-muted">
        <div className="mk-container">
          <div className="mk-diagram-frame">
            <FlywheelDiagram />
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
              <Link href="/for-interns" className="mk-btn mk-btn-ghost dark lg">
                {tCta('secondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
