import { Fragment } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { BeforeAfter } from '@/components/landing/before-after';

const mono = 'var(--font-mono)';

/* ------------------------------------------------------------------------ *
 * Mockup data (product-UI showcases). Deliberately NOT translated — these
 * are fake-app strings (task IDs, file names, dates, browser chrome) kept as
 * literals, same as on the marketing site. Living in module-scope consts also
 * keeps them out of the i18next jsx-text lint rule's reach.
 * ------------------------------------------------------------------------ */

const TRUST_LOGOS: { mark: string; name: string; bg?: string }[] = [
  { mark: 'AC', name: 'Acme Studio' },
  { mark: 'BY', name: 'Beyond', bg: '#2563EB' },
  { mark: 'GV', name: 'GreenVibe', bg: '#15803D' },
  { mark: 'FR', name: 'Forêt', bg: '#BE185D' },
  { mark: 'NU', name: 'Numentech', bg: '#0E7490' },
  { mark: 'SK', name: 'Souk Labs', bg: '#9A3412' },
];

const MOCK_SOLUTION = {
  url: 'inturn.app/yasmine/brand-audit/deliverables',
  sideHead1: 'My workspaces',
  sideActive: 'Brand audit',
  sideActiveCount: 'W3',
  sideHead2: 'Deliverables',
  deliverables: [
    { id: 'D1', label: 'Brand audit findings', active: true },
    { id: 'D2', label: 'Visual exploration', active: false },
    { id: 'D3', label: 'Logo refresh', active: false },
    { id: 'D4', label: 'System library', active: false },
    { id: 'D5', label: 'Handoff package', active: false },
  ],
  headTitle: 'D1 · Brand audit · stakeholder findings',
  headPill: '● v2 IN REVIEW',
  meta: 'DUE 23 MAY · SUBMITTED ON TIME · LINKED TASKS: BA-001, BA-002, BA-003',
  v2: {
    tag: 'v2',
    byLead: 'Submitted by',
    byName: 'Yasmine',
    time: '2H AGO · 23 MAY, 14:12',
    status: 'In review',
    noteLead: "Yasmine's note:",
    note: '"Cleaned up the stakeholder quotes section, fixed the numbering, added a TL;DR per the v1 review."',
    files: [
      {
        kind: 'PDF',
        style: { background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' },
        name: 'brand-audit-deck-v2.pdf',
        meta: '24 SLIDES · 4.2 MB',
      },
      {
        kind: 'FIG',
        style: { background: '#ECFEFF', border: '1px solid #A5F3FC', color: '#0E7490' },
        name: 'stakeholder-quotes.fig',
        meta: 'FIGMA · 8 FRAMES',
      },
    ],
  },
  v1: {
    tag: 'v1',
    byLead: 'Submitted by',
    byName: 'Yasmine',
    time: '3D AGO · 20 MAY, 17:48',
    status: 'Changes requested',
    feedbackLead: "Mehdi's feedback:",
    feedback:
      '"Findings section needs a TL;DR up front — supervisors won\'t read 22 slides cold. Quote numbering is off on slides 8-12. Otherwise solid synthesis."',
  },
};

const MOCK_CHECKIN = {
  avatar: 'YB',
  title: 'Weekly check-in · Week 3',
  badge: 'VIRTUAL',
  shippedLabel: 'Shipped this week',
  shipped: 'Competitor teardown (8 brands) + first positioning matrix.',
  blockedLabel: 'Blocked on',
  blocked: 'Analytics export to size the channels — flagged supervisor.',
  nextLabel: 'Next call',
  tunis: 'Tunis 14:00',
  swap: '↔',
  berlin: 'Berlin 15:00',
  join: 'Join Meet →',
};

const MOCK_FEED = {
  head: 'Community feed',
  live: 'Live',
  items: [
    {
      avatar: 'YB',
      avatarCls: 'violet',
      chip: 'Shipped',
      chipCls: 'win',
      bold: 'Yasmine B.',
      body: ' shipped a full brand audit for Acme Studio — 24-slide deck, verified record.',
      meta: '2H AGO · TUNIS',
    },
    {
      avatar: 'RH',
      avatarCls: 'sky',
      chip: 'Event',
      chipCls: 'event',
      bold: 'Portfolio night',
      body: ' — 8 alumni reviewing student work, live. Thursday 18:00, El Manar.',
      meta: 'IN 3 DAYS · 41 GOING',
    },
    {
      avatar: 'SK',
      avatarCls: 'green',
      chip: 'Announcement',
      chipCls: '',
      bold: '12 new virtual internships',
      body: ' opened this week — design, data, and front-end roles with EU teams.',
      meta: 'YESTERDAY · REMOTE',
    },
  ],
};

const QUOTE_AVATAR = 'MT';

/* ==================== TRUST STRIP (marquee) ==================== */
export function TrustSection() {
  const t = useTranslations('home.trust');
  return (
    <section className="mk-trust">
      <div className="mk-container">
        <span className="mk-trust-label">{t('label')}</span>
        <div className="mk-marquee">
          <div className="mk-marquee-track">
            {[0, 1].map((dup) => (
              <div className="mk-trust-logos" key={dup} aria-hidden={dup === 1 ? true : undefined}>
                {TRUST_LOGOS.map((l) => (
                  <span className="mk-trust-logo" key={l.name}>
                    <span className="mark" style={l.bg ? { background: l.bg } : undefined}>
                      {l.mark}
                    </span>
                    {l.name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== WAVE GOODBYE (rotator) ==================== */
export function RotatorSection() {
  const t = useTranslations('home.rotator');
  const items = ['item1', 'item2', 'item3', 'item4', 'item5'] as const;
  return (
    <section className="mk-section mk-rotator-section">
      <div className="mk-container">
        <div className="mk-eyebrow" style={{ marginBottom: 28 }}>
          {t('eyebrow')}
        </div>
        <div className="mk-rotator-wrap">
          <span className="mk-rotator-lead">{t('lead')}</span>
          <div className="mk-rotator" id="mkRotator">
            {items.map((key) => (
              <span className="mk-rotator-word" key={key}>
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== PROBLEM (diagram) ==================== */
export function ProblemSection() {
  return (
    <section className="mk-section">
      <div className="mk-container">
        <div className="mk-diagram-frame">
          <BeforeAfter />
        </div>
      </div>
    </section>
  );
}

/* ==================== SOLUTION ==================== */
export function SolutionSection() {
  const t = useTranslations('home.solution');
  const m = MOCK_SOLUTION;
  return (
    <section className="mk-section surface-muted" id="solution">
      <div className="mk-container">
        <div className="mk-section-head">
          <div className="mk-eyebrow">{t('eyebrow')}</div>
          <h2 className="mk-h2">
            {t('titleLead')} <span className="grad">{t('titleGrad')}</span>
          </h2>
          <p className="mk-deck">{t('deck')}</p>
        </div>

        <div className="mk-frame">
          <div className="mk-frame-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="url">{m.url}</span>
          </div>
          <div className="mk-prev">
            <div className="mk-prev-side">
              <div className="h6">{m.sideHead1}</div>
              <div className="item active">
                <span className="ic" style={{ background: '#8F1FFE' }}></span>
                {m.sideActive}
                <span className="count">{m.sideActiveCount}</span>
              </div>
              <div className="sep"></div>
              <div className="h6">{m.sideHead2}</div>
              {m.deliverables.map((d) => (
                <div
                  className="item"
                  key={d.id}
                  style={
                    d.active ? { background: '#FAF5FF', color: '#7C3AED', fontWeight: 500 } : undefined
                  }
                >
                  <span
                    className="ic"
                    style={{
                      background: d.active ? '#8F1FFE' : '#E4E4E7',
                      width: 18,
                      height: 18,
                      fontFamily: mono,
                      color: d.active ? '#FFF' : '#71717A',
                      fontSize: 9,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                    }}
                  >
                    {d.id}
                  </span>
                  {d.label}
                </div>
              ))}
            </div>
            <div className="mk-prev-main" style={{ padding: '24px 28px' }}>
              <div className="mk-prev-head" style={{ marginBottom: 14 }}>
                <span className="title">{m.headTitle}</span>
                <span
                  style={{
                    background: '#FAF5FF',
                    border: '1px solid #EDE9FE',
                    color: '#7C3AED',
                    padding: '2px 10px',
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: mono,
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.headPill}
                </span>
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: '#71717A',
                  letterSpacing: '0.02em',
                  marginBottom: 18,
                }}
              >
                {m.meta}
              </div>

              {/* v2 version block, expanded */}
              <div
                style={{
                  border: '1.5px solid #8F1FFE',
                  borderRadius: 8,
                  background: '#FFF',
                  boxShadow: '0 0 0 1.5px #8F1FFE',
                  marginBottom: 12,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    background: '#FAF5FF',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: '1px solid #EDE9FE',
                  }}
                >
                  <span
                    style={{
                      background: '#8F1FFE',
                      color: '#FFF',
                      fontFamily: mono,
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 5,
                    }}
                  >
                    {m.v2.tag}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>
                      {m.v2.byLead} <b>{m.v2.byName}</b>
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: '#71717A', marginTop: 1 }}>
                      {m.v2.time}
                    </div>
                  </div>
                  <span
                    style={{
                      background: '#EDE9FE',
                      color: '#7C3AED',
                      padding: '2px 10px',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {m.v2.status}
                  </span>
                </div>
                <div
                  style={{
                    padding: '14px 16px',
                    fontSize: 12,
                    color: '#44444E',
                    lineHeight: 1.5,
                    background: '#FAFAFA',
                    borderLeft: '3px solid #71717A',
                    margin: '14px 16px',
                    borderRadius: 4,
                  }}
                >
                  <b style={{ color: '#0F0F14' }}>{m.v2.noteLead}</b> {m.v2.note}
                </div>
                <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
                  {m.v2.files.map((f) => (
                    <Fragment key={f.kind}>
                      <span
                        style={{
                          ...f.style,
                          fontFamily: mono,
                          fontSize: 9,
                          fontWeight: 600,
                          padding: '6px 10px',
                          borderRadius: 4,
                        }}
                      >
                        {f.kind}
                      </span>
                      <div style={{ flex: 1, fontSize: 11 }}>
                        <b style={{ color: '#0F0F14' }}>{f.name}</b>
                        <div
                          style={{ fontFamily: mono, fontSize: 9, color: '#71717A', marginTop: 1 }}
                        >
                          {f.meta}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>

              {/* v1 version block, collapsed-ish */}
              <div
                style={{
                  border: '1px solid #E4E4E7',
                  borderRadius: 8,
                  background: '#FFF',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: '1px solid #E4E4E7',
                  }}
                >
                  <span
                    style={{
                      background: '#FFF',
                      border: '1px solid #E4E4E7',
                      color: '#44444E',
                      fontFamily: mono,
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 5,
                    }}
                  >
                    {m.v1.tag}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>
                      {m.v1.byLead} <b>{m.v1.byName}</b>
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: '#71717A', marginTop: 1 }}>
                      {m.v1.time}
                    </div>
                  </div>
                  <span
                    style={{
                      background: '#FFFBEB',
                      color: '#92400E',
                      border: '1px solid #FDE68A',
                      padding: '2px 10px',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {m.v1.status}
                  </span>
                </div>
                <div
                  style={{
                    background: '#FFFBEB',
                    borderLeft: '3px solid #F59E0B',
                    margin: '14px 16px',
                    padding: '10px 14px',
                    borderRadius: 4,
                    fontSize: 12,
                    color: '#78350F',
                    lineHeight: 1.5,
                  }}
                >
                  <b style={{ color: '#92400E' }}>{m.v1.feedbackLead}</b> {m.v1.feedback}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontFamily: mono,
            fontSize: 12,
            letterSpacing: '0.08em',
            color: '#71717A',
            textTransform: 'uppercase',
            marginTop: 24,
          }}
        >
          {t('caption')}
        </p>
      </div>
    </section>
  );
}

/* ==================== WHY DIFFERENT — 3 PILLARS ==================== */
export function PillarsSection() {
  const t = useTranslations('home.pillars');
  const cards = [
    { ic: '→', title: 'card1Title', body: 'card1Body' },
    { ic: '⌘', title: 'card2Title', body: 'card2Body' },
    { ic: '✓', title: 'card3Title', body: 'card3Body' },
  ] as const;
  return (
    <section className="mk-section">
      <div className="mk-container">
        <div className="mk-section-head">
          <div className="mk-eyebrow">{t('eyebrow')}</div>
          <h2 className="mk-h2">{t('title')}</h2>
        </div>

        <div className="mk-grid-3">
          {cards.map((c) => (
            <div className="mk-feature" key={c.title}>
              <div className="mk-feature-ico">{c.ic}</div>
              <div className="mk-feature-title">{t(c.title)}</div>
              <div className="mk-feature-body">{t(c.body)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================== VIRTUAL INTERNSHIPS ==================== */
export function VirtualSection() {
  const t = useTranslations('home.virtual');
  const m = MOCK_CHECKIN;
  const bullets = ['bullet1', 'bullet2', 'bullet3'] as const;
  return (
    <section className="mk-section" id="virtual">
      <div className="mk-container">
        <div
          style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            position: 'relative',
            background:
              'radial-gradient(circle at 15% 20%, rgba(143,31,254,0.30), transparent 55%),radial-gradient(circle at 85% 80%, rgba(6,182,212,0.26), transparent 55%),linear-gradient(135deg,#0F0F14 0%,#1F1635 55%,#0F0F14 100%)',
            color: '#fff',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
              backgroundSize: '28px 28px',
              pointerEvents: 'none',
            }}
          ></div>
          <div
            className="mk-grid-2"
            style={{ alignItems: 'center', gap: 44, padding: 52, position: 'relative', zIndex: 1 }}
          >
            <div>
              <div className="mk-eyebrow dark" style={{ marginBottom: 18 }}>
                {t('eyebrow')}
              </div>
              <h2 className="mk-h2" style={{ color: '#fff', marginBottom: 18, fontSize: 46 }}>
                {t('titleLine1')}
                <br />
                <span className="grad">{t('titleLine2')}</span>
              </h2>
              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.55,
                  color: 'rgba(255,255,255,0.75)',
                  maxWidth: '46ch',
                  margin: '0 0 24px',
                }}
              >
                {t('deck')}
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 30px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 11,
                }}
              >
                {bullets.map((key) => (
                  <li
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      fontSize: 15,
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  >
                    <span style={{ color: '#B580FF', fontWeight: 700 }}>{'→'}</span>
                    {t(key)}
                  </li>
                ))}
              </ul>
              <a href="#how" className="mk-btn mk-btn-brand lg">
                {t('cta')} <span className="arrow">{'→'}</span>
              </a>
            </div>
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                boxShadow: '0 30px 70px -20px rgba(0,0,0,0.55)',
                color: '#0F0F14',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: '#FAF5FF',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderBottom: '1px solid #EDE9FE',
                }}
              >
                <span className="mk-avatar xs violet">{m.avatar}</span>
                <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{m.title}</div>
                <span
                  style={{
                    background: '#EDE9FE',
                    color: '#7C3AED',
                    padding: '2px 9px',
                    borderRadius: 99,
                    fontSize: 9,
                    fontWeight: 600,
                    fontFamily: mono,
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.badge}
                </span>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
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
                    {m.shippedLabel}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#1F1F2A', lineHeight: 1.45 }}>
                    {m.shipped}
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
                    {m.blockedLabel}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#1F1F2A', lineHeight: 1.45 }}>
                    {m.blocked}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    borderTop: '1px solid #E4E4E7',
                    paddingTop: 13,
                    flexWrap: 'wrap',
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
                    {m.nextLabel}
                  </span>
                  <b style={{ fontSize: 12.5 }}>{m.tunis}</b>
                  <span style={{ color: '#A1A1AA' }}>{m.swap}</span>
                  <b style={{ fontSize: 12.5 }}>{m.berlin}</b>
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#0F0F14',
                      color: '#fff',
                      padding: '5px 11px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {m.join}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== SDG / MISSION ==================== */
export function MissionSection() {
  const t = useTranslations('home.mission');
  const cells = [
    {
      n: '04',
      gradient: 'linear-gradient(150deg,#8F70FE,#8F1FFE)',
      tile: 'sdg1Tile',
      title: 'sdg1Title',
      body: 'sdg1Body',
    },
    {
      n: '08',
      gradient: 'linear-gradient(150deg,#2BD9C8,#0E7490)',
      tile: 'sdg2Tile',
      title: 'sdg2Title',
      body: 'sdg2Body',
    },
    {
      n: '10',
      gradient: 'linear-gradient(150deg,#E467FE,#8F1FFE)',
      tile: 'sdg3Tile',
      title: 'sdg3Title',
      body: 'sdg3Body',
    },
    {
      n: '17',
      gradient: 'linear-gradient(150deg,#4461F2,#06B6D4)',
      tile: 'sdg4Tile',
      title: 'sdg4Title',
      body: 'sdg4Body',
    },
  ] as const;
  return (
    <section className="mk-section dark" id="mission">
      <div className="mk-container">
        <div className="mk-sdg-intro">
          <div className="mk-eyebrow dark">{t('eyebrow')}</div>
          <h2 className="mk-h2" style={{ marginBottom: 18 }}>
            {t('title')}
          </h2>
          <p className="mk-deck">{t('deck')}</p>
        </div>

        <div className="mk-sdg-grid">
          {cells.map((c) => (
            <div className="mk-sdg-cell" key={c.n}>
              <div className="mk-sdg-tile" style={{ background: c.gradient }}>
                <span className="n">{c.n}</span>
                <span className="g">{t(c.tile)}</span>
              </div>
              <h4>{t(c.title)}</h4>
              <p>{t(c.body)}</p>
            </div>
          ))}
        </div>

        <div className="mk-sdg-foot">
          <span className="pill">
            {t('footLead')} <b>{t('footBold')}</b>
          </span>
        </div>
      </div>
    </section>
  );
}

/* ==================== COMMUNITY TEASER ==================== */
export function CommunitySection() {
  const t = useTranslations('home.community');
  const stats = [
    { value: 'stat1Value', label: 'stat1Label' },
    { value: 'stat2Value', label: 'stat2Label' },
    { value: 'stat3Value', label: 'stat3Label' },
    { value: 'stat4Value', label: 'stat4Label' },
  ] as const;
  return (
    <section className="mk-section surface-muted" id="community">
      <div className="mk-container">
        <div className="mk-community">
          <div>
            <div className="mk-eyebrow">{t('eyebrow')}</div>
            <h2 className="mk-h2" style={{ margin: '18px 0' }}>
              {t('titleLead')} <span className="grad">{t('titleGrad')}</span>
            </h2>
            <p className="mk-deck small">{t('deck')}</p>
            <div className="mk-community-stats">
              {stats.map((s) => (
                <div className="mk-community-stat" key={s.value}>
                  <b>{t(s.value)}</b>
                  <span>{t(s.label)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/sign-up" className="mk-btn mk-btn-brand lg">
                {t('ctaPrimary')} <span className="arrow">{'→'}</span>
              </Link>
              <a href="#community" className="mk-btn mk-btn-ghost lg">
                {t('ctaSecondary')}
              </a>
            </div>
          </div>

          <div className="mk-community-feed">
            <div className="mk-community-feed-head">
              {MOCK_FEED.head}
              <span className="live">
                <span className="dot"></span>
                {MOCK_FEED.live}
              </span>
            </div>
            {MOCK_FEED.items.map((item) => (
              <div className="mk-feed-item" key={item.meta}>
                <span className={`mk-avatar ${item.avatarCls}`}>{item.avatar}</span>
                <div>
                  <span className={`chip-kind${item.chipCls ? ` ${item.chipCls}` : ''}`}>
                    {item.chip}
                  </span>
                  <div className="body">
                    <b>{item.bold}</b>
                    {item.body}
                  </div>
                  <div className="meta">{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== QUOTE ==================== */
export function QuoteSection() {
  const t = useTranslations('home.quote');
  return (
    <section className="mk-section surface-muted tight">
      <div className="mk-container">
        <div className="mk-quote">
          <blockquote>{`"${t('text')}"`}</blockquote>
          <div className="who">
            <span className="mk-avatar peach lg">{QUOTE_AVATAR}</span>
            <div className="meta">
              <div className="name">{t('name')}</div>
              <div className="role">{t('role')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== HOW IT WORKS (compact) ==================== */
export function HowSection() {
  const t = useTranslations('home.how');
  const tFooter = useTranslations('home.footer');
  const steps = [
    { n: '1', title: 'step1Title', body: 'step1Body' },
    { n: '2', title: 'step2Title', body: 'step2Body' },
    { n: '3', title: 'step3Title', body: 'step3Body' },
    { n: '4', title: 'step4Title', body: 'step4Body' },
  ] as const;
  return (
    <section className="mk-section gradient" id="how">
      <div className="mk-container">
        <div className="mk-section-head center">
          <div className="mk-eyebrow dark">{t('eyebrow')}</div>
          <h2 className="mk-h2">
            {t('titleLead')} <span className="grad">{t('titleGrad')}</span>
            {t('titleTail')}
          </h2>
        </div>

        <div className="mk-grid-4">
          {steps.map((s) => (
            <div className="mk-feature dark" key={s.n}>
              <div
                className="mk-feature-ico"
                style={{
                  background: 'rgba(143,31,254,0.18)',
                  borderColor: 'rgba(143,31,254,0.3)',
                  color: '#B580FF',
                }}
              >
                {s.n}
              </div>
              <div className="mk-feature-title" style={{ color: '#FFF' }}>
                {t(s.title)}
              </div>
              <div className="mk-feature-body" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {t(s.body)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48, position: 'relative', zIndex: 1 }}>
          {/* The full walkthrough page doesn't exist on the platform yet. */}
          <span className="mk-btn mk-btn-ghost dark lg" title={tFooter('comingSoon')}>
            {t('cta')} <span className="arrow">{'→'}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/* ==================== COMPARISON ==================== */
export function CompareSection() {
  const t = useTranslations('home.compare');
  const rows = [
    { label: 'row1Label', email: 'row1Email', social: 'row1Social', inturn: 'row1Inturn' },
    { label: 'row2Label', email: 'row2Email', social: 'row2Social', inturn: 'row2Inturn' },
    { label: 'row3Label', email: 'row3Email', social: 'row3Social', inturn: 'row3Inturn' },
    { label: 'row4Label', email: 'row4Email', social: 'row4Social', inturn: 'row4Inturn' },
    { label: 'row5Label', email: 'row5Email', social: 'row5Social', inturn: 'row5Inturn' },
    { label: 'row6Label', email: 'row6Email', social: 'row6Social', inturn: 'row6Inturn' },
  ] as const;
  return (
    <section className="mk-section">
      <div className="mk-container">
        <div className="mk-section-head">
          <div className="mk-eyebrow">{t('eyebrow')}</div>
          <h2 className="mk-h2">
            {t('titleLead')} <span className="strike">{t('titleStrike')}</span>
            {t('titleTail')}
          </h2>
          <p className="mk-deck">{t('deck')}</p>
        </div>

        <div className="mk-compare">
          <table>
            <thead>
              <tr>
                <th>{t('colWhat')}</th>
                <th>{t('colEmail')}</th>
                <th>{t('colSocial')}</th>
                <th className="feat">{t('colInturn')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td>{t(r.label)}</td>
                  <td className="bad">{t(r.email)}</td>
                  <td className="bad">{t(r.social)}</td>
                  <td className="feat-col">{t(r.inturn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ==================== CTA BAND ==================== */
export function CtaSection() {
  const t = useTranslations('home.cta');
  return (
    <section className="mk-section">
      <div className="mk-container">
        <div className="mk-cta-band">
          <div className="mk-eyebrow">{t('eyebrow')}</div>
          <h2 className="mk-h2">{t('title')}</h2>
          <p>{t('deck')}</p>
          <div className="mk-cta-band-actions">
            <Link href="/sign-up" className="mk-btn mk-btn-brand lg">
              {t('primary')} <span className="arrow">{'→'}</span>
            </Link>
            <Link href="/marketplace" className="mk-btn mk-btn-ghost dark lg">
              {t('secondary')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
