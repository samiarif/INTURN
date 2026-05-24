import Link from 'next/link';
import { loadWorkspacePage } from '@/modules/workspace/page-data';
import { WorkspaceTopBar, type Crumb } from '@/modules/workspace/components/topbar';
import { WorkspaceSidebar } from '@/modules/workspace/components/sidebar';
import { StuckPill } from '@/modules/workspace/components/stuck-pill';
import { WeeklyCheckInForm } from '@/modules/workspace/components/weekly-checkin-form';
import { computeWeekOfTotal } from '@/modules/workspace/queries';

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { data, sidebar, viewer } = await loadWorkspacePage(workspaceId, 'intern');

  const start = data.workspace.startDate ? new Date(data.workspace.startDate) : null;
  const { current, total } = computeWeekOfTotal(start, data.internship?.duration ?? 12);
  const locationType = (data.internship?.locationType ?? 'hybrid').toUpperCase();

  const crumbs: Crumb[] = [
    { label: 'My workspaces' },
    {
      label: `${data.organization?.name ?? '—'} · ${data.project?.name ?? data.internship?.title ?? '—'}`,
    },
    { label: 'Weekly check-in', bold: true },
  ];

  return (
    <div
      className="ws-shell ws"
      style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <WorkspaceTopBar
        view="intern"
        viewerInitials={viewer.initials}
        crumbs={crumbs}
        modeChip={{ label: `${locationType} · WEEK ${current} / ${total}` }}
      />
      <div className="ws-body">
        <WorkspaceSidebar
          data={sidebar}
          viewer={viewer}
          activeWorkspaceId={data.workspace.id}
        />
        <main className="ws-main">
          <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px', width: '100%' }}>
            <div style={{ marginBottom: 16 }}>
              <Link
                href={`/intern/workspaces/${data.workspace.id}`}
                style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}
                className="hover:text-[var(--ink)]"
              >
                ← Workspace
              </Link>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 6 }}>
              Week {current} check-in
            </h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24 }}>
              Quick summary for {data.supervisors[0]?.firstName ?? 'your supervisor'}. Generate a
              draft from this week&apos;s activity or write it yourself.
            </p>
            <WeeklyCheckInForm workspaceId={data.workspace.id} />
          </div>
        </main>
      </div>
      <StuckPill />
    </div>
  );
}
