import { useTranslations } from 'next-intl';

// Step numbers are code-like chrome (same on every locale), not copy.
const MOCK_STEPS = [
  { n: '01', key: 'step1', isKey: false },
  { n: '02', key: 'step2', isKey: false },
  { n: '03', key: 'step3', isKey: false },
  { n: '04', key: 'step4', isKey: true },
  { n: '05', key: 'step5', isKey: false },
] as const;

export default function LoopDiagram() {
  const t = useTranslations('site.diagrams.loop');
  return (
    <div className="il loop">
      <div className="il-head">
        <span className="il-eyebrow">{t('eyebrow')}</span>
        <h2 className="il-title">{t('title')}</h2>
        <p className="il-sub">{t('sub')}</p>
      </div>

      <div className="loop-track">
        {MOCK_STEPS.map((s) => (
          <div key={s.n} className={'loop-step' + (s.isKey ? ' is-key' : '')}>
            <div className="loop-card">
              <span className="loop-num">{s.n}</span>
              <div className="loop-h">{t(`${s.key}Title`)}</div>
              <div className="loop-b">{t(`${s.key}Body`)}</div>
            </div>
            <span className="loop-arrow"></span>
          </div>
        ))}
      </div>

      <div className="loop-return">
        <span className="ic">{'↻'}</span>
        <span className="tx">
          <b>{t('returnBold')}</b> {t('returnRest')}
        </span>
        <span className="arc"></span>
      </div>
    </div>
  );
}
