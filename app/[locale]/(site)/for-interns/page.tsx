import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import RecordAnatomy from '@/components/landing/diagrams/record-anatomy';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.forInterns.meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

/* ------------------------------------------------------------------
 * Mockup / browser-chrome copy: NOT translated.
 * These are fake-app strings (URLs, labels, skill tags, etc.) kept as
 * literals so the i18next jsx-text lint rule can't flag them.
 * ------------------------------------------------------------------ */
const mono = 'var(--font-mono)';
const MOCK_ARROW = '→';
const MOCK_AVATAR_YB = 'YB';

const MOCK_HERO = {
  url: 'inturn.app/explore',
  sideDiscover: 'Discover',
  sideExplore: 'Explore',
  sideSaved: 'Saved',
  sideSavedCount: '3',
  sideApps: 'Applications',
  sideAppsCount: '2',
  sideFilter: 'Filter · 22 open',
  filterText: 'Design ● Research ● Engineering ○ Marketing ○',
  matchBannerTitle: 'Here are 7 internships matched to you',
  matchBannerSub: "Acme Studio's Visual designer role is your closest match at ",
  matchBannerPct: '92%',
  card1Company: 'AC',
  card1Title: 'Visual designer · Brand audit',
  card1Sub: 'Acme Studio · Tunis',
  card1Match: '92% MATCH',
  card1Pay: 'Indemnité · 250 TND',
  card1Dur: '12 weeks',
  card1Mode: 'Hybrid',
  card1Skill1: '✓ Figma',
  card1Skill2: '✓ Brand systems',
  card1Skill3: 'Typography',
  card1Skill4: 'Moodboards',
  card1Deadline: 'Apply by Wed · 4 Jun',
  card1Cta: 'Apply →',
  card2Company: 'BY',
  card2Title: 'UX research intern · multi-product',
  card2Sub: 'Beyond · Remote',
  card2Match: '81% MATCH',
  card2Pay: 'Unpaid',
  card2Dur: '10 wks',
  card2Mode: 'Remote',
  card2Skill1: 'User interviews',
  card2Skill2: 'Synthesis',
  card2Skill3: '✓ Figma',
  card2Deadline: 'Apply by Fri · 6 Jun',
  card2Cta: 'Apply →',
  card3Company: 'GV',
  card3Title: 'Junior product designer',
  card3Sub: 'GreenVibe · Tunis',
  card3Pay: 'Indemnité · 150 TND',
  card3Dur: '8 weeks',
  card3Mode: 'Hybrid',
  card4Company: 'FR',
  card4Title: 'Content + brand intern',
  card4Sub: 'Forêt · Sousse',
  card4Pay: 'Unpaid',
  card4Dur: '6 weeks',
  card4Mode: 'Hybrid',
};

const MOCK_FILTER_ITEMS = [
  { label: 'Design', active: true },
  { label: 'Research', active: true },
  { label: 'Engineering', active: false },
  { label: 'Marketing', active: false },
];

const MOCK_BULLET_ON = '●';
const MOCK_BULLET_OFF = '○';
const MOCK_STAR = '✦';
const MOCK_DOT = '·';

export default async function ForInternsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tHero = await getTranslations({ locale, namespace: 'site.forInterns.hero' });
  const tWhat = await getTranslations({ locale, namespace: 'site.forInterns.whatYouGet' });
  const tQuote = await getTranslations({ locale, namespace: 'site.forInterns.quote' });
  const tCta = await getTranslations({ locale, namespace: 'site.forInterns.cta' });

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
            <br />
            {tHero('titleTail')}
          </h1>

          <p className="deck">{tHero('deck')}</p>

          <div className="mk-hero-cta">
            <Link href="/marketplace" className="mk-btn mk-btn-brand lg">
              {tHero('ctaPrimary')} <span className="arrow">{MOCK_ARROW}</span>
            </Link>
            <a href="#listings" className="mk-btn mk-btn-ghost lg">
              {tHero('ctaSecondary')}
            </a>
          </div>

          <div className="mk-hero-trust">
            <span className="dot"></span>
            <span>
              <b>{tHero('trustStat')}</b> {tHero('trustRest')}
            </span>
          </div>

          {/* Marketplace preview */}
          <div className="mk-hero-showcase" id="listings">
            <div className="mk-frame">
              <div className="mk-frame-bar">
                <span className="dot r"></span>
                <span className="dot y"></span>
                <span className="dot g"></span>
                <span className="url">{MOCK_HERO.url}</span>
              </div>
              <div className="mk-prev">
                <div className="mk-prev-side">
                  <div className="h6">{MOCK_HERO.sideDiscover}</div>
                  <div className="item active">
                    <span className="ic" style={{ background: '#8F1FFE' }}></span>
                    {MOCK_HERO.sideExplore}
                  </div>
                  <div className="item">
                    <span className="ic"></span>{MOCK_HERO.sideSaved}
                    <span className="count">{MOCK_HERO.sideSavedCount}</span>
                  </div>
                  <div className="item">
                    <span className="ic"></span>{MOCK_HERO.sideApps}
                    <span className="count">{MOCK_HERO.sideAppsCount}</span>
                  </div>
                  <div className="sep"></div>
                  <div className="h6">{MOCK_HERO.sideFilter}</div>
                  <div style={{ fontSize: 11, color: '#71717A', padding: '4px 8px' }}>
                    {MOCK_FILTER_ITEMS.map((f, i) => (
                      <span key={f.label}>
                        {f.label}{' '}
                        <span style={f.active ? { color: '#8F1FFE' } : undefined}>
                          {f.active ? MOCK_BULLET_ON : MOCK_BULLET_OFF}
                        </span>
                        {i < MOCK_FILTER_ITEMS.length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mk-prev-main">
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#FAF5FF,#ECFEFF)',
                      border: '1px solid #EDE9FE',
                      borderRadius: 10,
                      padding: '14px 18px',
                      marginBottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        background: 'linear-gradient(135deg,#8F1FFE,#06B6D4)',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontSize: 14,
                      }}
                    >
                      {MOCK_STAR}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {MOCK_HERO.matchBannerTitle}
                      </div>
                      <div style={{ fontSize: 11, color: '#44444E' }}>
                        {MOCK_HERO.matchBannerSub}
                        <b style={{ color: '#7C3AED' }}>{MOCK_HERO.matchBannerPct}</b>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Matched card */}
                    <div
                      style={{
                        background: '#FFF',
                        border: '1px solid #8F1FFE',
                        boxShadow: '0 0 0 2px #FAF5FF',
                        borderRadius: 8,
                        padding: 14,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: 'linear-gradient(90deg,#8F1FFE,#06B6D4)',
                        }}
                      ></div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            background: 'linear-gradient(135deg,#FED7AA,#FECACA)',
                            color: '#9A3412',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: mono,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {MOCK_HERO.card1Company}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{MOCK_HERO.card1Title}</div>
                          <div style={{ fontSize: 10.5, color: '#71717A' }}>{MOCK_HERO.card1Sub}</div>
                        </div>
                        <span
                          style={{
                            background: '#FAF5FF',
                            color: '#7C3AED',
                            fontFamily: mono,
                            fontSize: 9,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 99,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {MOCK_HERO.card1Match}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: '#44444E',
                          display: 'flex',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <span>
                          <b style={{ color: '#0F0F14' }}>{MOCK_HERO.card1Pay}</b>
                        </span>
                        <span>{MOCK_DOT}</span>
                        <span>{MOCK_HERO.card1Dur}</span>
                        <span>{MOCK_DOT}</span>
                        <span>{MOCK_HERO.card1Mode}</span>
                      </div>
                      <div
                        style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}
                      >
                        {[MOCK_HERO.card1Skill1, MOCK_HERO.card1Skill2].map((s) => (
                          <span
                            key={s}
                            style={{
                              background: '#ECFDF5',
                              color: '#16A34A',
                              fontSize: 9.5,
                              padding: '2px 7px',
                              borderRadius: 99,
                              fontWeight: 500,
                            }}
                          >
                            {s}
                          </span>
                        ))}
                        {[MOCK_HERO.card1Skill3, MOCK_HERO.card1Skill4].map((s) => (
                          <span
                            key={s}
                            style={{
                              background: '#F4F4F5',
                              color: '#52525B',
                              fontSize: 9.5,
                              padding: '2px 7px',
                              borderRadius: 99,
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          borderTop: '1px solid #E4E4E7',
                          paddingTop: 8,
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: mono,
                            fontSize: 10,
                            color: '#F59E0B',
                            fontWeight: 600,
                          }}
                        >
                          {MOCK_HERO.card1Deadline}
                        </span>
                        <span
                          style={{
                            marginLeft: 'auto',
                            background: '#8F1FFE',
                            color: '#FFF',
                            padding: '5px 12px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {MOCK_HERO.card1Cta}
                        </span>
                      </div>
                    </div>
                    {/* Regular card */}
                    <div
                      style={{
                        background: '#FFF',
                        border: '1px solid #E4E4E7',
                        borderRadius: 8,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            background: '#DBEAFE',
                            color: '#1E40AF',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: mono,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {MOCK_HERO.card2Company}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{MOCK_HERO.card2Title}</div>
                          <div style={{ fontSize: 10.5, color: '#71717A' }}>{MOCK_HERO.card2Sub}</div>
                        </div>
                        <span
                          style={{
                            background: '#ECFEFF',
                            color: '#0E7490',
                            fontFamily: mono,
                            fontSize: 9,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 99,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {MOCK_HERO.card2Match}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: '#44444E',
                          display: 'flex',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <span>
                          <b style={{ color: '#0F0F14' }}>{MOCK_HERO.card2Pay}</b>
                        </span>
                        <span>{MOCK_DOT}</span>
                        <span>{MOCK_HERO.card2Dur}</span>
                        <span>{MOCK_DOT}</span>
                        <span>{MOCK_HERO.card2Mode}</span>
                      </div>
                      <div
                        style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}
                      >
                        {[MOCK_HERO.card2Skill1, MOCK_HERO.card2Skill2].map((s) => (
                          <span
                            key={s}
                            style={{
                              background: '#F4F4F5',
                              color: '#52525B',
                              fontSize: 9.5,
                              padding: '2px 7px',
                              borderRadius: 99,
                            }}
                          >
                            {s}
                          </span>
                        ))}
                        <span
                          style={{
                            background: '#ECFDF5',
                            color: '#16A34A',
                            fontSize: 9.5,
                            padding: '2px 7px',
                            borderRadius: 99,
                            fontWeight: 500,
                          }}
                        >
                          {MOCK_HERO.card2Skill3}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          borderTop: '1px solid #E4E4E7',
                          paddingTop: 8,
                          gap: 8,
                        }}
                      >
                        <span style={{ fontFamily: mono, fontSize: 10, color: '#71717A' }}>
                          {MOCK_HERO.card2Deadline}
                        </span>
                        <span
                          style={{
                            marginLeft: 'auto',
                            background: '#0F0F14',
                            color: '#FFF',
                            padding: '5px 12px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {MOCK_HERO.card2Cta}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#FFF',
                        border: '1px solid #E4E4E7',
                        borderRadius: 8,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            background: '#DCFCE7',
                            color: '#15803D',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: mono,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {MOCK_HERO.card3Company}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{MOCK_HERO.card3Title}</div>
                          <div style={{ fontSize: 10.5, color: '#71717A' }}>{MOCK_HERO.card3Sub}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#44444E' }}>
                        <b style={{ color: '#0F0F14' }}>{MOCK_HERO.card3Pay}</b> {MOCK_DOT} {MOCK_HERO.card3Dur} {MOCK_DOT} {MOCK_HERO.card3Mode}
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#FFF',
                        border: '1px solid #E4E4E7',
                        borderRadius: 8,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            background: '#FCE7F3',
                            color: '#BE185D',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: mono,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {MOCK_HERO.card4Company}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{MOCK_HERO.card4Title}</div>
                          <div style={{ fontSize: 10.5, color: '#71717A' }}>{MOCK_HERO.card4Sub}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#44444E' }}>
                        <b style={{ color: '#0F0F14' }}>{MOCK_HERO.card4Pay}</b> {MOCK_DOT} {MOCK_HERO.card4Dur} {MOCK_DOT} {MOCK_HERO.card4Mode}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WHAT YOU GET ==================== */}
      <section className="mk-section surface-muted">
        <div className="mk-container">
          <div className="mk-section-head">
            <div className="mk-eyebrow">{tWhat('eyebrow')}</div>
            <h2 className="mk-h2">
              {tWhat('titleLead')} <span className="grad">{tWhat('titleGrad')}</span>
              <br />
              {tWhat('titleTail')}
            </h2>
          </div>

          <div className="mk-grid-3">
            {(
              [
                ['card1', '$'],
                ['card2', 'B'],
                ['card3', 'W'],
                ['card4', '★'],
                ['card5', '⇄'],
                ['card6', '✓'],
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

      {/* ==================== ANATOMY OF A RECORD (diagram) ==================== */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-diagram-frame">
            <RecordAnatomy />
          </div>
        </div>
      </section>

      {/* ==================== QUOTE ==================== */}
      <section className="mk-section tight">
        <div className="mk-container">
          <div className="mk-quote">
            <blockquote>{`"${tQuote('text')}"`}</blockquote>
            <div className="who">
              <span className="mk-avatar lg">{MOCK_AVATAR_YB}</span>
              <div className="meta">
                <div className="name">{tQuote('name')}</div>
                <div className="role">{tQuote('role')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="mk-section" id="cta">
        <div className="mk-container">
          <div className="mk-cta-band">
            <div className="mk-eyebrow">{tCta('eyebrow')}</div>
            <h2 className="mk-h2">{tCta('title')}</h2>
            <p>{tCta('deck')}</p>
            <div className="mk-cta-band-actions">
              <Link href="/marketplace" className="mk-btn mk-btn-brand lg">
                {tCta('primary')} <span className="arrow">{MOCK_ARROW}</span>
              </Link>
              <Link href="/how-it-works" className="mk-btn mk-btn-ghost dark lg">
                {tCta('secondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
