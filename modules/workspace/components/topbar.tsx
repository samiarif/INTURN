import '../workspace.css';
import { getTranslations } from 'next-intl/server';
import { Search, Inbox, CircleHelp } from 'lucide-react';

export type Crumb = { label: string; bold?: boolean };

/**
 * Workspace topbar. Lives inside the platform sidebar's main content
 * area, so it intentionally does NOT re-render the global brand /
 * notifications / theme / user — those are in the sidebar footer.
 *
 * What stays here is workspace-scoped: the breadcrumb, the run-mode
 * chip ("Hybrid · Week 3/12"), and workspace-local actions
 * (workspace search + inbox + help).
 */
export async function WorkspaceTopBar({
  view: _view,
  viewerInitials: _viewerInitials,
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
          <Search size={14} />
          <span>{t('search')}</span>
          <span className="kbd">{t('keyboardShortcut')}</span>
        </div>
        <button className="ws-tb-icon" aria-label={t('inbox')}>
          <Inbox size={15} strokeWidth={1.75} />
          <span className="badge-dot" />
        </button>
        <button className="ws-tb-icon" aria-label={t('help')}>
          <CircleHelp size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
