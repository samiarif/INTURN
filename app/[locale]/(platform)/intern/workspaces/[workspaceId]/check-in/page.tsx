import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getWorkspaceOverview, getInternSidebarData } from '@/modules/workspace/queries';
import { canViewWorkspace } from '@/modules/workspace/service';
import { getUserByClerkId } from '@/modules/profiles/queries';
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
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role =
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'intern';

  const { workspaceId } = await params;
  const data = await getWorkspaceOverview(workspaceId);
  if (!data) notFound();
  if (!canViewWorkspace(data.workspace, data.project, { userId: user.id, role })) notFound();

  const sidebar = await getInternSidebarData(data.workspace.internId);
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
        viewerInitials={`${data.intern?.firstName?.[0] ?? ''}${data.intern?.lastName?.[0] ?? ''}`}
        crumbs={crumbs}
        modeChip={{ label: `${locationType} · WEEK ${current} / ${total}` }}
      />
      <div className="ws-body">
        <WorkspaceSidebar
          data={sidebar}
          viewer={{
            initials: `${data.intern?.firstName?.[0] ?? ''}${data.intern?.lastName?.[0] ?? ''}`,
            name: `${data.intern?.firstName ?? ''} ${data.intern?.lastName ?? ''}`.trim() || 'Intern',
            subtitle: `${data.internProfile?.university ?? ''} · ${data.internProfile?.yearOfStudy ?? ''}`.trim(),
          }}
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
