import { useTranslations } from 'next-intl';

// Mock record-card chrome (fake-app strings) — deliberately NOT translated,
// same convention as MOCK_* in components/landing/sections.tsx.
const MOCK_RECORD = {
  initials: 'YB',
  name: 'Yasmine Brahmi',
  role: 'Brand audit · Acme Studio · 8 weeks',
  chips: ['D1', 'D2', 'D3', 'D4'],
  stars: '★★★★★',
  url: 'inturn.app/v/yb-3f9a',
} as const;

export default function RecordAnatomy() {
  const t = useTranslations('site.diagrams.recordAnatomy');
  return (
    <div className="il rec">
      <div className="il-head">
        <span className="il-eyebrow">{t('eyebrow')}</span>
        <h2 className="il-title">{t('title')}</h2>
        <p className="il-sub">{t('sub')}</p>
      </div>

      <div className="rec-grid">
        <div className="rec-side old">
          <span className="rec-sidetag">{t('oldTag')}</span>
          <div className="rec-paper">
            <span className="seal"></span>
            <div className="ttl">{t('oldPaperTitle')}</div>
            <div className="line m"></div>
            <div className="line s"></div>
            <div className="line m"></div>
            <div className="sig">{t('oldPaperSignature')}</div>
          </div>
          <div className="rec-verdict">{t('oldVerdict')}</div>
        </div>

        <div className="rec-side new">
          <span className="rec-sidetag">{t('newTag')}</span>
          <div className="rec-card">
            <div className="rec-cardhead">
              <span className="av">{MOCK_RECORD.initials}</span>
              <div className="who">
                <div className="nm">{MOCK_RECORD.name}</div>
                <div className="rl">{MOCK_RECORD.role}</div>
              </div>
              <span className="rec-verify">{t('verified')}</span>
            </div>
            <div className="rec-rows">
              <div className="rec-row">
                <span className="k">{t('rowDeliverablesLabel')}</span>
                <span className="v">
                  {MOCK_RECORD.chips.map((chip) => (
                    <span key={chip} className="rec-chip">
                      {chip}
                    </span>
                  ))}{' '}
                  {t('rowDeliverablesValue')}
                </span>
              </div>
              <div className="rec-row">
                <span className="k">{t('rowTasksLabel')}</span>
                <span className="v">{t('rowTasksValue')}</span>
              </div>
              <div className="rec-row">
                <span className="k">{t('rowSupervisorLabel')}</span>
                <span className="v">
                  <span className="rec-stars">{MOCK_RECORD.stars}</span> {t('rowSupervisorValue')}
                </span>
              </div>
              <div className="rec-row">
                <span className="k">{t('rowVerifyLabel')}</span>
                <span className="v">
                  <span className="rec-url">{MOCK_RECORD.url}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="rec-verdict good">{t('newVerdict')}</div>
        </div>
      </div>
    </div>
  );
}
