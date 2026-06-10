import { useTranslations } from 'next-intl';

// Mock applicant roster (fake-app strings) — deliberately NOT translated,
// same convention as MOCK_* in components/landing/sections.tsx.
const MOCK_APPS = [
  { initials: 'YB', name: 'Yasmine B.', c: 'violet', dim: false },
  { initials: 'KM', name: 'Karim M.', c: 'sky', dim: false },
  { initials: 'SL', name: 'Sofia L.', c: 'green', dim: false },
  { initials: 'AT', name: 'Aziz T.', c: 'peach', dim: true },
] as const;

const MOCK_AVBG: Record<string, string> = {
  violet: 'linear-gradient(135deg,#DDD6FE,#C4B5FD)',
  sky: 'linear-gradient(135deg,#BAE6FD,#BFDBFE)',
  green: 'linear-gradient(135deg,#BBF7D0,#A7F3D0)',
  peach: 'linear-gradient(135deg,#FED7AA,#FECACA)',
};
const MOCK_AVFG: Record<string, string> = {
  violet: '#5B21B6',
  sky: '#1E40AF',
  green: '#166534',
  peach: '#9A3412',
};

const MOCK_ACCEPT_INITIALS = 'YB';

export default function TheMatch() {
  const t = useTranslations('site.diagrams.theMatch');
  return (
    <div className="il mt">
      <div className="il-head">
        <span className="il-eyebrow">{t('eyebrow')}</span>
        <h2 className="il-title">{t('title')}</h2>
        <p className="il-sub">{t('sub')}</p>
      </div>

      <div className="mt-track">
        <div className="mt-stage">
          <span className="sh">{t('stage1Head')}</span>
          <div className="mt-card key">
            <div className="mt-proj">
              {t('projectTitle')}
              <small>{t('projectMeta')}</small>
            </div>
            <span className="rec-chip" style={{ alignSelf: 'flex-start' }}>
              {t('scopedChip')}
            </span>
          </div>
        </div>

        <div className="mt-fan">
          <svg viewBox="0 0 36 90" preserveAspectRatio="none" fill="none">
            <path d="M0 45 C18 45 18 14 36 14" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M0 45 C18 45 18 37 36 37" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M0 45 C18 45 18 60 36 60" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M0 45 C18 45 18 83 36 83" stroke="#D4D4D8" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="mt-stage">
          <span className="sh">{t('stage2Head')}</span>
          <div className="mt-card">
            <div className="mt-applicants">
              {MOCK_APPS.map((a) => (
                <div key={a.initials} className={'mt-app' + (a.dim ? ' dim' : '')}>
                  <span className="av" style={{ background: MOCK_AVBG[a.c], color: MOCK_AVFG[a.c] }}>
                    {a.initials}
                  </span>
                  <span className="nm">{a.name}</span>
                  <span className="verified">{t('verified')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-fan">
          <svg viewBox="0 0 36 90" preserveAspectRatio="none" fill="none">
            <path d="M0 14 C18 14 18 45 36 45" stroke="#C9A6FF" strokeWidth="1.5" />
            <path d="M0 37 C18 37 18 45 36 45" stroke="#8F1FFE" strokeWidth="2" />
            <path d="M0 60 C18 60 18 45 36 45" stroke="#C9A6FF" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="mt-stage">
          <span className="sh">{t('stage3Head')}</span>
          <div className="mt-accept">
            <span className="av">{MOCK_ACCEPT_INITIALS}</span>
            <span className="tx">
              {t('acceptTitle')}
              <small>{t('acceptSub')}</small>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
