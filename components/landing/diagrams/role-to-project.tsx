import { useTranslations } from 'next-intl';

// Deliverable codes + the '?' / '◆' markers are code-like chrome, not copy.
const MOCK_DELIV_CODES = ['D1', 'D2', 'D3', 'D4'] as const;
const MOCK_QUESTION_MARK = '?';

export default function RoleToProject() {
  const t = useTranslations('site.diagrams.roleToProject');
  return (
    <div className="il rp">
      <div className="il-head">
        <span className="il-eyebrow">{t('eyebrow')}</span>
        <h2 className="il-title">{t('title')}</h2>
        <p className="il-sub">{t('sub')}</p>
      </div>

      <div className="rp-grid">
        <div className="rp-card old">
          <span className="rp-tag">{t('oldTag')}</span>
          <div className="rp-role">{t('oldRole')}</div>
          <ul className="rp-vague">
            {(['question1', 'question2', 'question3', 'question4'] as const).map((key) => (
              <li key={key}>
                <span className="q">{MOCK_QUESTION_MARK}</span> {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <div className="rp-mid">
          <span className="arrow">{'→'}</span>
        </div>

        <div className="rp-card new">
          <span className="rp-tag">{t('newTag')}</span>
          <div className="rp-role">{t('newRole')}</div>
          <div className="rp-meta">
            <span>{t('meta1')}</span>
            <span>{t('meta2')}</span>
            <span>{t('meta3')}</span>
          </div>
          <div className="rp-delivs">
            {MOCK_DELIV_CODES.map((code, i) => (
              <div key={code} className="rp-deliv">
                <span className="dn">{code}</span>
                <span className="dl">{t(`deliverable${i + 1}`)}</span>
              </div>
            ))}
          </div>
          <div className="rp-gate">{t('gate')}</div>
        </div>
      </div>
    </div>
  );
}
