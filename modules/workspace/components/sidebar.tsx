import type { SidebarData } from '../types';

export function WorkspaceSidebar({
  data,
  viewer,
  activeWorkspaceId,
}: {
  data: SidebarData;
  viewer: { initials: string; name: string; subtitle: string };
  activeWorkspaceId?: string;
}) {
  const isIntern = data.role === 'intern';

  return (
    <aside className="ws-side">
      <div className="ws-side-section">
        <h6>General</h6>
        <div className="ws-side-item">
          <span className="ico" />
          Dashboard
        </div>
        {isIntern ? (
          <>
            <div className="ws-side-item">
              <span className="ico" />
              Applications
              <span className="count">2</span>
            </div>
            <div className="ws-side-item">
              <span className="ico" />
              Saved
            </div>
            <div className="ws-side-item">
              <span className="ico" />
              Marketplace
            </div>
          </>
        ) : (
          <>
            <div className="ws-side-item has-dot">
              Inbox
              <span className="count">14</span>
            </div>
            <div className="ws-side-item">
              <span className="ico" />
              Listings
              <span className="count">3</span>
            </div>
            <div className="ws-side-item">
              <span className="ico" />
              Team
            </div>
          </>
        )}
      </div>

      <div className="ws-side-section">
        <h6>{isIntern ? 'My workspaces' : 'Active projects'}</h6>
        {data.role === 'intern'
          ? data.activeWorkspaces.map((w) => (
              <div
                key={w.id}
                className={`ws-side-sub ${w.id === activeWorkspaceId ? 'active' : ''} ${w.live ? 'live' : 'done'}`}
              >
                <span className="dot" />
                <span className="truncate">{w.label}</span>
              </div>
            ))
          : data.activeProjects.map((p, projectIndex) => {
              const projectIsActive = p.workspaces.some((w) => w.id === activeWorkspaceId);
              return (
                <div key={p.id} style={projectIndex > 0 ? { marginTop: 12 } : undefined}>
                  <div className={`ws-side-project ${p.status === 'draft' ? 'draft' : ''}`}>
                    <span className="chev" />
                    <span className="ico-proj">{p.code}</span>
                    <span className="truncate">{p.name}</span>
                    <span
                      className="meta"
                      style={
                        p.status === 'draft'
                          ? { background: '#FFFBEB', color: '#92400E', padding: '1px 5px', borderRadius: 3 }
                          : undefined
                      }
                    >
                      {p.meta || (p.status === 'active' ? 'A' : 'D')}
                    </span>
                  </div>
                  {projectIsActive && p.status === 'active' && (
                    <a className="ws-side-projhub">→ Project hub</a>
                  )}
                  {p.workspaces.map((w, wi) => (
                    <div
                      key={w.id}
                      className={`ws-side-sub in-proj ${wi === p.workspaces.length - 1 ? 'last' : ''} ${w.live ? 'live' : 'done'} ${w.id === activeWorkspaceId ? 'active' : ''}`}
                    >
                      <span className="dot" />
                      <span className="truncate">{w.label}</span>
                    </div>
                  ))}
                </div>
              );
            })}
      </div>

      <div className="ws-side-section">
        <h6>{isIntern ? 'Community' : 'Pipeline'}</h6>
        {isIntern ? (
          <>
            <div className="ws-side-item">
              <span className="ico" />
              Feed
            </div>
            <div className="ws-side-item">
              <span className="ico" />
              My record
            </div>
          </>
        ) : (
          <>
            <div className="ws-side-item">
              <span className="ico" />
              Candidates
              <span className="count">38</span>
            </div>
            <div className="ws-side-item">
              <span className="ico" />
              Records issued
              <span className="count">7</span>
            </div>
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
