'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

// Product-mockup data. Deliberately NOT translated: this is browser-chrome /
// fake-app content (task IDs, file names, dates) that reads as product UI, the
// same way the marketing site keeps it as literals.
const MOCK_URL = 'inturn.app/acme-studio/projects/brand-audit';

const MOCK_SIDE = {
  general: 'General',
  dashboard: 'Dashboard',
  inbox: 'Inbox',
  inboxCount: '14',
  hubs: 'Project hubs',
  hubsCount: '4',
  activeHead: 'Active projects',
  projects: [
    { name: 'Brand audit', count: '3w3', color: '#8F1FFE' },
    { name: 'Design system', count: '1w5', color: '#2563EB' },
    { name: 'Restaurant app', count: '8w', color: '#06B6D4' },
  ],
};

const MOCK_HEAD = {
  title: 'Brand audit · supervisor view',
  pill: '● ACTIVE',
  meta: 'WEEK 3 / 12',
};

const MOCK_STATS = [
  { l: 'Internships', v: '2', small: 'active' },
  { l: 'Awaiting review', v: '2', small: 'items · oldest 2h' },
  { l: 'Deliverables', v: '2', small: 'of 9 shipped' },
  { l: 'Days remaining', v: '63', small: 'days' },
];

type MockCard = { tag: string; title: string; due: string; urgent?: boolean; needs?: boolean; dueU?: boolean };

const MOCK_BOARD: { head: string; cls?: string; count: string; cards: MockCard[] }[] = [
  {
    head: 'To do',
    count: '1',
    cards: [{ tag: 'BA-007', title: 'Logo refresh — round 1', due: 'DUE 6 JUN' }],
  },
  {
    head: 'In progress',
    cls: 'prog',
    count: '2',
    cards: [
      { tag: 'BA-005', title: 'Visual exploration · moodboards', due: 'DUE FRI · 3D', urgent: true, dueU: true },
      { tag: 'BA-006', title: 'Type pairings — 3 options', due: 'DUE FRI · 3D', urgent: true, dueU: true },
    ],
  },
  {
    head: 'In review',
    cls: 'review',
    count: '1',
    cards: [{ tag: 'BA-003', title: 'Audit deck v2 · changes addressed', due: '2H AGO', needs: true }],
  },
  {
    head: 'Done',
    cls: 'done',
    count: '2',
    cards: [
      { tag: 'BA-002', title: 'Stakeholder interviews · 6 of 6', due: 'CLOSED MON' },
      { tag: 'BA-001', title: 'Kickoff brief sign-off', due: 'CLOSED 2W AGO' },
    ],
  },
];

export function HomeHero() {
  const t = useTranslations('home.hero');
  const [audience, setAudience] = useState<'company' | 'intern'>('company');

  return (
    <section className="mk-hero">
      <div className="mk-container">
        <div className="mk-audience" id="audienceToggle">
          <button
            className={audience === 'company' ? 'active' : undefined}
            onClick={() => setAudience('company')}
          >
            {t('toggleCompanies')}
          </button>
          <button
            className={audience === 'intern' ? 'active' : undefined}
            onClick={() => setAudience('intern')}
          >
            {t('toggleInterns')}
          </button>
        </div>

        <h1 className="mk-h1">
          {audience === 'company' ? (
            <>
              {t('companyHeadline')}
              <br />
              <span className="strike">{t('companyHeadlineStrike')}</span>
            </>
          ) : (
            <>
              {t('internHeadline')}
              <br />
              <span className="strike">{t('internHeadlineStrike')}</span>
            </>
          )}
        </h1>

        <p className="deck">{audience === 'company' ? t('companyDeck') : t('internDeck')}</p>

        <div className="mk-hero-cta">
          <Link
            href={audience === 'company' ? '/sign-up' : '/marketplace'}
            className="mk-btn mk-btn-brand lg"
          >
            {audience === 'company' ? t('companyCta') : t('internCta')}{' '}
            <span className="arrow">{'→'}</span>
          </Link>
          <a href="#how" className="mk-btn mk-btn-ghost lg">
            {t('secondaryCta')}
          </a>
        </div>

        <div className="mk-hero-trust">
          <span className="dot"></span>
          <span>
            <b>{t('tickerStat')}</b> {t('tickerRest')}
          </span>
        </div>

        {/* Product showcase: Dashboard preview in browser frame */}
        <div className="mk-hero-showcase">
          <div className="mk-frame">
            <div className="mk-frame-bar">
              <span className="dot r"></span>
              <span className="dot y"></span>
              <span className="dot g"></span>
              <span className="url">{MOCK_URL}</span>
            </div>
            <div className="mk-prev">
              <div className="mk-prev-side">
                <div className="h6">{MOCK_SIDE.general}</div>
                <div className="item">
                  <span className="ic"></span>
                  {MOCK_SIDE.dashboard}
                </div>
                <div className="item">
                  <span className="ic"></span>
                  {MOCK_SIDE.inbox}
                  <span className="count">{MOCK_SIDE.inboxCount}</span>
                </div>
                <div className="item active">
                  <span className="ic"></span>
                  {MOCK_SIDE.hubs}
                  <span className="count">{MOCK_SIDE.hubsCount}</span>
                </div>
                <div className="sep"></div>
                <div className="h6">{MOCK_SIDE.activeHead}</div>
                {MOCK_SIDE.projects.map((p) => (
                  <div className="item" key={p.name}>
                    <span className="ic" style={{ background: p.color }}></span>
                    {p.name}
                    <span className="count">{p.count}</span>
                  </div>
                ))}
              </div>
              <div className="mk-prev-main">
                <div className="mk-prev-head">
                  <span className="title">{MOCK_HEAD.title}</span>
                  <span className="pill">{MOCK_HEAD.pill}</span>
                  <span className="meta">{MOCK_HEAD.meta}</span>
                </div>
                <div className="mk-prev-stats">
                  {MOCK_STATS.map((s) => (
                    <div className="mk-prev-stat" key={s.l}>
                      <div className="l">{s.l}</div>
                      <div className="v">
                        {s.v} <small>{s.small}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mk-prev-board">
                  {MOCK_BOARD.map((col) => (
                    <div className={`mk-prev-col${col.cls ? ` ${col.cls}` : ''}`} key={col.head}>
                      <div className="mk-prev-col-head">
                        <span className="pip"></span>
                        <span>{col.head}</span>
                        <span className="count">{col.count}</span>
                      </div>
                      {col.cards.map((c) => (
                        <div
                          className={`mk-prev-card${c.urgent ? ' urgent' : ''}${c.needs ? ' needs' : ''}`}
                          key={c.tag}
                        >
                          <span className="tag">{c.tag}</span>
                          <span className="title">{c.title}</span>
                          <span className={c.dueU ? 'due u' : 'due'}>{c.due}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
