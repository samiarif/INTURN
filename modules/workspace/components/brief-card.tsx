import type { WorkspaceOverviewData } from '../queries';
import { Avatar } from '@/components/avatar';

function formatLocationLabel(locationType: string | null | undefined): string {
  switch (locationType) {
    case 'on-site':
      return 'On-site';
    case 'virtual':
      return 'Remote';
    case 'hybrid':
      return 'Hybrid';
    default:
      return 'Hybrid';
  }
}

export function BriefCard({
  data,
  view,
}: {
  data: WorkspaceOverviewData;
  view: 'intern' | 'supervisor';
}) {
  const internship = data.internship;
  const project = data.project;
  const intern = data.intern;
  const supervisor = data.supervisors[0];

  const eyebrow = `Internship · ${internship?.duration ?? 12} weeks · ${formatLocationLabel(
    internship?.locationType,
  )}`;
  const title = project?.name ?? internship?.title ?? 'Workspace';
  const description = project?.brief ?? internship?.description ?? '';
  const locationType = internship?.locationType;
  const locationHint =
    locationType === 'hybrid'
      ? '3d/wk on-site'
      : locationType === 'on-site'
        ? 'on-site full week'
        : 'remote';

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
              <b>{internship.location}</b> · {locationHint}
            </span>
          )}
          {internship?.isPaid && internship.compensation && (
            <>
              <span className="dot" />
              <span>
                Paid · <b>{internship.compensation}</b>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="ws-brief-people">
        {view === 'intern'
          ? supervisor && (
              <>
                <div className="ws-brief-person">
                  <div className="role">Supervisor</div>
                  <div className="name">
                    {supervisor.firstName} {supervisor.lastName}
                  </div>
                  <div className="org">{data.organization?.name ?? ''}</div>
                </div>
                <Avatar
                  name={`${supervisor.firstName ?? ''} ${supervisor.lastName ?? ''}`.trim()}
                  email={supervisor.email}
                  imageUrl={supervisor.imageUrl}
                  size="lg"
                />
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
                    {data.internProfile?.university ?? ''}
                    {data.internProfile?.yearOfStudy
                      ? ` · ${data.internProfile.yearOfStudy}`
                      : ''}
                  </div>
                </div>
                <Avatar
                  name={`${intern.firstName ?? ''} ${intern.lastName ?? ''}`.trim()}
                  email={intern.email}
                  imageUrl={intern.imageUrl}
                  size="lg"
                />
              </>
            )}
      </div>
    </div>
  );
}
