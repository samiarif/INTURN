import { Fragment } from 'react';
import { useTranslations } from 'next-intl';

// Node positions (left/top) for the "old way" tangle — layout data, not copy.
const OLD_NODE_POS = [
  { key: 'oldNode1', x: '2%', y: '4%' },
  { key: 'oldNode2', x: '54%', y: '0%' },
  { key: 'oldNode3', x: '0%', y: '44%' },
  { key: 'oldNode4', x: '58%', y: '40%' },
  { key: 'oldNode5', x: '8%', y: '82%' },
  { key: 'oldNode6', x: '46%', y: '80%' },
] as const;

const PIPE = [
  { ic: '◆', label: 'step1Label', sub: 'step1Sub' },
  { ic: '▦', label: 'step2Label', sub: 'step2Sub' },
  { ic: '⤴', label: 'step3Label', sub: 'step3Sub' },
  { ic: '✓', label: 'step4Label', sub: 'step4Sub' },
] as const;

export function BeforeAfter() {
  const t = useTranslations('home.beforeAfter');
  const tProblem = useTranslations('home.problem');

  return (
    <div className="il ba">
      <div className="il-head">
        <span className="il-eyebrow">{tProblem('eyebrow')}</span>
        <h2 className="il-title">{tProblem('title')}</h2>
        <p className="il-sub">{tProblem('subtitle')}</p>
      </div>

      <div className="ba-grid">
        <div className="ba-panel old">
          <span className="ba-tag">{t('oldTag')}</span>
          <div className="ba-panelh">{t('oldTitle')}</div>
          <div className="ba-tangle">
            <svg viewBox="0 0 400 240" preserveAspectRatio="none">
              {[
                'M40 30 L320 150',
                'M300 20 L30 130',
                'M30 130 L260 210',
                'M40 30 L260 210',
                'M320 150 L120 215',
                'M300 20 L120 215',
                'M30 130 L320 150',
                'M40 30 L300 20',
              ].map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke="#C9C9CF"
                  strokeWidth="1.5"
                  strokeDasharray={i % 2 ? '5 5' : '0'}
                  fill="none"
                />
              ))}
            </svg>
            {OLD_NODE_POS.map((n) => (
              <span key={n.key} className="ba-node" style={{ left: n.x, top: n.y }}>
                {t(n.key)}
              </span>
            ))}
          </div>
        </div>

        <div className="ba-mid">
          <span className="arrow">{'→'}</span>
        </div>

        <div className="ba-panel new">
          <span className="ba-tag">{t('newTag')}</span>
          <div className="ba-panelh">{t('newTitle')}</div>
          <div className="ba-pipe">
            {PIPE.map((p, i) => (
              <Fragment key={p.label}>
                <div className="ba-pnode">
                  <span className="pip">{p.ic}</span>
                  <span className="lbl">
                    {t(p.label)}
                    <small>{t(p.sub)}</small>
                  </span>
                </div>
                {i < PIPE.length - 1 && <span className="ba-pconn"></span>}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="ba-foot-row">
        <div className="ba-foot">{t('oldFoot')}</div>
        <div></div>
        <div className="ba-foot new">{t('newFoot')}</div>
      </div>
    </div>
  );
}
