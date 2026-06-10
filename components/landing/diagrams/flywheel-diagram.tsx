import { useTranslations } from 'next-intl';

// Node numbers are code-like chrome, not copy.
const MOCK_NODES = [
  { n: '01', pos: 'top', key: 'node1' },
  { n: '02', pos: 'right', key: 'node2' },
  { n: '03', pos: 'bottom', key: 'node3' },
  { n: '04', pos: 'left', key: 'node4' },
] as const;

export default function FlywheelDiagram() {
  const t = useTranslations('site.diagrams.flywheel');
  return (
    <div className="il fly">
      <div className="il-head">
        <span className="il-eyebrow">{t('eyebrow')}</span>
        <h2 className="il-title">{t('title')}</h2>
      </div>

      <div className="fly-stage">
        <svg className="fly-orbit" viewBox="0 0 500 500" fill="none">
          <defs>
            <marker id="flyArrow" markerWidth="9" markerHeight="9" refX="4" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 Z" fill="#8F1FFE" />
            </marker>
          </defs>
          {/* four clockwise arcs (r=165) between the nodes */}
          <path
            d="M306.4 94.9 A165 165 0 0 1 405.1 193.6"
            stroke="#C9A6FF"
            strokeWidth="2"
            strokeDasharray="4 5"
            markerEnd="url(#flyArrow)"
          />
          <path
            d="M405.1 306.4 A165 165 0 0 1 306.4 405.1"
            stroke="#C9A6FF"
            strokeWidth="2"
            strokeDasharray="4 5"
            markerEnd="url(#flyArrow)"
          />
          <path
            d="M193.6 405.1 A165 165 0 0 1 94.9 306.4"
            stroke="#C9A6FF"
            strokeWidth="2"
            strokeDasharray="4 5"
            markerEnd="url(#flyArrow)"
          />
          <path
            d="M94.9 193.6 A165 165 0 0 1 193.6 94.9"
            stroke="#C9A6FF"
            strokeWidth="2"
            strokeDasharray="4 5"
            markerEnd="url(#flyArrow)"
          />
        </svg>

        <div className="fly-center">
          <b>{t('centerTitle')}</b>
          <span>{t('centerLine1')}</span>
          <span>{t('centerLine2')}</span>
        </div>

        {MOCK_NODES.map((node) => (
          <div key={node.n} className={`fly-node ${node.pos}`}>
            <div className="n">{node.n}</div>
            <div className="t">{t(`${node.key}Title`)}</div>
            <div className="d">{t(`${node.key}Body`)}</div>
          </div>
        ))}
      </div>

      <div className="fly-gains">
        <span className="fly-gain">
          <span className="ar down">{'↓'}</span> {t('gain1')}
        </span>
        <span className="fly-gain">
          <span className="ar up">{'↑'}</span> {t('gain2')}
        </span>
        <span className="fly-gain">
          <span className="ar up">{'↑'}</span> {t('gain3')}
        </span>
      </div>
    </div>
  );
}
