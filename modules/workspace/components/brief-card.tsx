import type { WorkspaceOverviewData } from '../queries';

export function BriefCard({
  data,
  role,
}: {
  data: WorkspaceOverviewData;
  role: 'intern' | 'supervisor';
}) {
  const internship = data.internship;
  const project = data.project;
  const intern = data.intern;
  const supervisor = data.supervisors[0];

  const eyebrow = `Internship · ${internship?.duration ?? 12} weeks · ${
    internship?.locationType ?? 'hybrid'
  }`;
  const title = project?.name ?? internship?.title ?? 'Workspace';
  const description = project?.brief ?? internship?.description ?? '';

  return (
    <div className="ws-brief">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="ws-brief-eyebrow">{eyebrow}</div>
        <h2 className="ws-brief-title">{title}</h2>
        {description && (
          <div
            style={{
              fontSize: 14,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              maxWidth: '52ch',
              marginBottom: 10,
            }}
          >
            {description}
          </div>
        )}
        <div className="ws-brief-meta">
          {internship?.location && (
            <span>
              <b>{internship.location}</b>
              {internship.locationType === 'hybrid' ? ' · 3d/wk on-site' : ''}
            </span>
          )}
          {internship?.isPaid && (
            <>
              <span className="dot" />
              <span>
                Paid · <b>{internship.compensation ?? '—'}</b>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="ws-brief-people">
        {role === 'intern'
          ? supervisor && (
              <>
                <div className="ws-brief-person">
                  <div className="role">Supervisor</div>
                  <div className="name">
                    {supervisor.firstName} {supervisor.lastName}
                  </div>
                  <div className="org">{data.organization?.name ?? ''}</div>
                </div>
                <span className="ws-avatar lg company">
                  {(supervisor.firstName?.[0] ?? '') + (supervisor.lastName?.[0] ?? '')}
                </span>
              </>
            )
          : intern && (
              <>
                <div className="ws-brief-person">
                  <div className="role">Intern</div>
                  <div className="name">
                    {intern.firstName} {intern.lastName}
                  </div>
                  <div className="org">
                    {data.internProfile?.university ?? ''} ·{' '}
                    {data.internProfile?.yearOfStudy ?? ''}
                  </div>
                </div>
                <span className="ws-avatar lg">
                  {(intern.firstName?.[0] ?? '') + (intern.lastName?.[0] ?? '')}
                </span>
              </>
            )}
      </div>
    </div>
  );
}
