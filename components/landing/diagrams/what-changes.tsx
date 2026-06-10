import { useTranslations } from 'next-intl';

const ROW_KEYS = ['row1', 'row2', 'row3', 'row4', 'row5'] as const;

export default function WhatChanges() {
  const t = useTranslations('site.diagrams.whatChanges');
  return (
    <div className="il chg on-dark">
      <div className="il-head">
        <span className="il-eyebrow on-dark">{t('eyebrow')}</span>
        <h2 className="il-title">{t('title')}</h2>
        <p className="il-sub">{t('sub')}</p>
      </div>

      <div className="chg-colhead">
        <span></span>
        <span>{t('colBefore')}</span>
        <span className="a">{t('colAfter')}</span>
      </div>

      <div className="chg-rows">
        {ROW_KEYS.map((key) => (
          <div key={key} className="chg-row">
            <div className="chg-dim">
              {t(`${key}Label`)}
              <small>{t(`${key}Tag`)}</small>
            </div>
            <div className="chg-state before">
              <div className="meter">
                <div className="fill"></div>
              </div>
              <span className="chg-cap">{t(`${key}Before`)}</span>
            </div>
            <div className="chg-state after">
              <div className="meter">
                <div className="fill"></div>
              </div>
              <span className="chg-cap">{t(`${key}After`)}</span>
            </div>
          </div>
        ))}
      </div>

      <span className="il-foot">
        <span className="dot"></span> {t('foot')}
      </span>
    </div>
  );
}
