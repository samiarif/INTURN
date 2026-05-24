import '../workspace.css';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export type Crumb = { label: string; bold?: boolean };

export async function WorkspaceTopBar({
  view,
  viewerInitials,
  crumbs,
  modeChip,
}: {
  view: 'intern' | 'supervisor';
  viewerInitials: string;
  crumbs: Crumb[];
  modeChip?: { label: string };
}) {
  const t = await getTranslations('workspace.topbar');
  return (
    <div className="ws-topbar">
      <div className="ws-tb-brand">
        <span className="star" />
        <span className="name">Inturn</span>
      </div>
      <div className="ws-tb-crumbs">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span className="sep">/</span>}
            {c.bold ? <b>{c.label}</b> : <span>{c.label}</span>}
          </span>
        ))}
        {modeChip && (
          <span className="chip-mode">
            <span className="ws-tb-chip-mode-dot" />
            {modeChip.label}
          </span>
        )}
      </div>
      <div className="ws-tb-actions">
        <div className="ws-tb-search">
          <span style={{ opacity: 0.5 }}>🔍</span>
          <span>{t('search')}</span>
          <span className="kbd">{t('keyboardShortcut')}</span>
        </div>
        <button className="ws-tb-icon" aria-label={t('inbox')}>
          <span style={{ fontSize: 14 }}>📬</span>
          <span className="badge-dot" />
        </button>
        <button className="ws-tb-icon" aria-label={t('help')}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>?</span>
        </button>
        <span
          className={cn('ws-tb-avatar', view === 'supervisor' && 'company')}
          aria-label={t('profile')}
        >
          {viewerInitials}
        </span>
      </div>
    </div>
  );
}
