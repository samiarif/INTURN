import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { SidebarData } from '../types';

/**
 * Workspace left sidebar. Server component so it can use `getTranslations`
 * directly. Real nav links (was previously inert `<div>`s with mock counts).
 *
 * Badge counts are passed in by the caller to keep this component dumb;
 * omit a key to hide its badge.
 */
export async function WorkspaceSidebar({
  data,
  viewer,
  activeWorkspaceId,
  badges,
}: {
  data: SidebarData;
  viewer: { initials: string; name: string; subtitle: string };
  activeWorkspaceId?: string;
  badges?: {
    applications?: number;
    inbox?: number;
    listings?: number;
    candidates?: number;
    recordsIssued?: number;
  };
}) {
  const t = await getTranslations('workspaceSidebar');
  const isIntern = data.role === 'intern';

  return (
    <aside className="ws-side">
      <div className="ws-side-section">
        <h6>{t('general')}</h6>
        {isIntern ? (
          <>
            <Link href="/intern/dashboard" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('dashboard')}</span>
            </Link>
            <Link href="/intern/applications" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('applications')}</span>
              {badges?.applications !== undefined && badges.applications > 0 && (
                <span className="count">{badges.applications}</span>
              )}
            </Link>
            <Link href="/intern/saved" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('saved')}</span>
            </Link>
            <Link href="/marketplace" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('marketplace')}</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/company/dashboard" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('dashboard')}</span>
            </Link>
            <Link
              href="/company/projects"
              className={`ws-side-item ${badges?.inbox && badges.inbox > 0 ? 'has-dot' : ''}`}
            >
              {!(badges?.inbox && badges.inbox > 0) && <span className="ico" aria-hidden />}
              <span>{t('inbox')}</span>
              {badges?.inbox !== undefined && badges.inbox > 0 && (
                <span className="count">{badges.inbox}</span>
              )}
            </Link>
            <Link href="/company/projects" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('listings')}</span>
              {badges?.listings !== undefined && badges.listings > 0 && (
                <span className="count">{badges.listings}</span>
              )}
            </Link>
          </>
        )}
      </div>

      <div className="ws-side-section">
        <h6>{isIntern ? t('myWorkspaces') : t('activeProjects')}</h6>
        {data.role === 'intern'
          ? data.activeWorkspaces.map((w) => (
              <Link
                key={w.id}
                href={`/intern/workspaces/${w.id}`}
                className={`ws-side-sub ${w.id === activeWorkspaceId ? 'active' : ''} ${w.live ? 'live' : 'done'}`}
              >
                <span className="dot" aria-hidden />
                <span className="truncate">{w.label}</span>
              </Link>
            ))
          : data.activeProjects.map((p, projectIndex) => {
              const projectIsActive = p.workspaces.some((w) => w.id === activeWorkspaceId);
              return (
                <div key={p.id} style={projectIndex > 0 ? { marginTop: 12 } : undefined}>
                  <Link
                    href={`/company/projects/${p.id}`}
                    className={`ws-side-project ${p.status === 'draft' ? 'draft' : ''}`}
                  >
                    <span className="chev" aria-hidden />
                    <span className="ico-proj">{p.code}</span>
                    <span className="truncate">{p.name}</span>
                    <span
                      className="meta"
                      style={
                        p.status === 'draft'
                          ? {
                              background: 'var(--warn-bg, #FFFBEB)',
                              color: 'var(--warn-ink, #92400E)',
                              padding: '1px 5px',
                              borderRadius: 3,
                            }
                          : undefined
                      }
                    >
                      {p.meta || (p.status === 'active' ? 'A' : 'D')}
                    </span>
                  </Link>
                  {projectIsActive && p.status === 'active' && (
                    <Link href={`/company/projects/${p.id}`} className="ws-side-projhub">
                      → {t('projectHub')}
                    </Link>
                  )}
                  {p.workspaces.map((w, wi) => (
                    <Link
                      key={w.id}
                      href={`/company/workspaces/${w.id}`}
                      className={`ws-side-sub in-proj ${wi === p.workspaces.length - 1 ? 'last' : ''} ${w.live ? 'live' : 'done'} ${w.id === activeWorkspaceId ? 'active' : ''}`}
                    >
                      <span className="dot" aria-hidden />
                      <span className="truncate">{w.label}</span>
                    </Link>
                  ))}
                </div>
              );
            })}
      </div>

      <div className="ws-side-section">
        <h6>{isIntern ? t('community') : t('pipeline')}</h6>
        {isIntern ? (
          <>
            <Link href="/intern/community" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('feed')}</span>
            </Link>
            <Link href="/intern/records" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('myRecord')}</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/company/projects" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('candidates')}</span>
              {badges?.candidates !== undefined && badges.candidates > 0 && (
                <span className="count">{badges.candidates}</span>
              )}
            </Link>
            <Link href="/company/projects" className="ws-side-item">
              <span className="ico" aria-hidden />
              <span>{t('recordsIssued')}</span>
              {badges?.recordsIssued !== undefined && badges.recordsIssued > 0 && (
                <span className="count">{badges.recordsIssued}</span>
              )}
            </Link>
          </>
        )}
      </div>

      <div className="ws-side-footer">
        <span className="ws-side-footer-avatar">{viewer.initials}</span>
        <div>
          <div className="ws-side-footer-name">{viewer.name}</div>
          <div className="ws-side-footer-org">{viewer.subtitle}</div>
        </div>
      </div>
    </aside>
  );
}
