# Workspace Suspense Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream the workspace overview so shell (topbar + sidebar + viewer chrome) paints immediately while the heavy data (overview content + activity feed) streams in behind Suspense.

**Architecture:** Split `loadWorkspacePage` into a shell loader (cheap: session + workspace authz row + sidebar) and a data loader (the existing `getWorkspaceOverview`, kept whole). The page server component renders shell synchronously; the body is an async server component wrapped in `<Suspense>`. The `loading.tsx` files keep providing instant fallback during nav; Suspense provides progressive reveal *after* the route mounts.

**Tech Stack:** Next.js 16 App Router (React 19 Suspense streaming), Drizzle ORM, existing shadcn/Tailwind workspace CSS.

---

## File Structure

- **Modify** `modules/workspace/page-data.ts` — split into `loadWorkspaceShell` (kept lightweight: session + workspace lookup + authz + sidebar + viewer + basePath) and `loadWorkspaceData` (full overview). Keep `loadWorkspacePage` as a thin caller for non-streaming routes (tasks/deliverables/comments tabs which already have their own loading skeletons and don't benefit as much).
- **Create** `modules/workspace/components/workspace-overview-body.tsx` — async server component that awaits `loadWorkspaceData` and renders BriefCard/StatTiles/TaskList/DeliverablesMini/ActivityFeed/Rails.
- **Create** `modules/workspace/components/workspace-body-skeleton.tsx` — skeleton matching the body layout (cards, list, rail). Used as Suspense fallback.
- **Modify** `modules/workspace/components/workspace-overview.tsx` — becomes the shell component (topbar + sidebar + main wrapper + `<Suspense>` boundary around `<WorkspaceOverviewBody>`).
- **Modify** `app/[locale]/(platform)/intern/workspaces/[workspaceId]/page.tsx` — call `loadWorkspaceShell` instead of `loadWorkspacePage`; pass `workspaceId` so the body can re-fetch.
- **Modify** `app/[locale]/(platform)/company/workspaces/[workspaceId]/page.tsx` — same as intern.

Tabs (`tasks`, `deliverables`, `comments`, `check-in`) keep using `loadWorkspacePage` — they don't gain enough from streaming to justify the refactor surface.

---

## Task 1: Add shell + data loaders

**Files:**
- Modify: `modules/workspace/page-data.ts`

- [ ] **Step 1: Add `loadWorkspaceShell` and `loadWorkspaceData` exports next to existing `loadWorkspacePage`**

Replace the contents of `modules/workspace/page-data.ts` with:

```ts
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';
import { canViewWorkspace } from './service';
import {
  getWorkspaceOverview,
  getInternSidebarData,
  getSupervisorSidebarData,
  type WorkspaceOverviewData,
} from './queries';
import { db } from '@/db';
import { workspaces, internships, projects, organizations, users, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { SidebarData, WorkspaceView } from './types';
import type { Session } from '@/modules/auth/session';

export type WorkspaceShell = {
  session: Session;
  workspaceId: string;
  view: WorkspaceView;
  sidebar: SidebarData;
  basePath: string;
  viewer: { initials: string; name: string; subtitle: string };
  /** Minimal workspace row, just enough to render topbar crumbs without waiting for full overview. */
  shell: {
    workspaceId: string;
    organizationName: string;
    projectOrInternshipLabel: string;
    internFirstName: string | null;
    internLastName: string | null;
    locationType: string;
    durationWeeks: number;
    startDate: Date | null;
  };
};

export type WorkspacePageData = {
  session: Session;
  data: WorkspaceOverviewData;
  sidebar: SidebarData;
  view: WorkspaceView;
  basePath: string;
  viewer: { initials: string; name: string; subtitle: string };
};

/**
 * Shell loader: session + authz + sidebar + just-enough-workspace-metadata to
 * paint topbar crumbs and the viewer chip. The heavy `getWorkspaceOverview`
 * runs separately via `loadWorkspaceData`, so the body can stream while the
 * shell is already on screen.
 */
export async function loadWorkspaceShell(
  workspaceId: string,
  view: WorkspaceView,
): Promise<WorkspaceShell> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  // Fetch the workspace row + closely-joined metadata in one shot, in parallel
  // with sidebar.
  const shellPromise = (async () => {
    const [row] = await db
      .select({
        workspaceId: workspaces.id,
        internshipId: workspaces.internshipId,
        projectId: internships.projectId,
        internId: workspaces.internId,
        startDate: workspaces.startDate,
        orgName: organizations.name,
        projectName: projects.name,
        internshipTitle: internships.title,
        locationType: internships.locationType,
        duration: internships.duration,
        supervisorIds: projects.supervisorIds,
        internFirstName: users.firstName,
        internLastName: users.lastName,
        internUniversity: profiles.university,
        internYear: profiles.yearOfStudy,
      })
      .from(workspaces)
      .innerJoin(internships, eq(internships.id, workspaces.internshipId))
      .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
      .leftJoin(projects, eq(projects.id, internships.projectId))
      .innerJoin(users, eq(users.id, workspaces.internId))
      .leftJoin(profiles, eq(profiles.userId, workspaces.internId))
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return row;
  })();

  const sidebarPromise =
    view === 'intern'
      ? getInternSidebarData(session.user.id)
      : getSupervisorSidebarData(session.user.id);

  const [row, sidebarRaw] = await Promise.all([shellPromise, sidebarPromise]);
  if (!row) notFound();

  // Authz: re-use canViewWorkspace by reconstructing a minimal workspace/project.
  const minimalWorkspace = {
    id: row.workspaceId,
    internId: row.internId,
    internshipId: row.internshipId,
    organizationId: '',
    status: null,
    startDate: row.startDate,
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Parameters<typeof canViewWorkspace>[0];
  const minimalProject = row.projectId
    ? ({
        id: row.projectId,
        supervisorIds: row.supervisorIds ?? [],
      } as Parameters<typeof canViewWorkspace>[1])
    : null;

  if (
    !canViewWorkspace(minimalWorkspace, minimalProject, {
      userId: session.user.id,
      role: session.role,
    })
  ) {
    notFound();
  }

  // For supervisor view, swap sidebar to the workspace org's owner if admin.
  const sidebar =
    view === 'supervisor' && session.role === 'admin'
      ? await getSupervisorSidebarData(session.user.id)
      : sidebarRaw;

  const viewer =
    view === 'intern'
      ? {
          initials: `${row.internFirstName?.[0] ?? ''}${row.internLastName?.[0] ?? ''}`,
          name: `${row.internFirstName ?? ''} ${row.internLastName ?? ''}`.trim() || 'Intern',
          subtitle: `${row.internUniversity ?? ''} · ${row.internYear ?? ''}`.trim(),
        }
      : {
          initials: 'AD',
          name: 'Supervisor',
          subtitle: row.orgName,
        };

  const basePath =
    view === 'intern'
      ? `/intern/workspaces/${row.workspaceId}`
      : `/company/workspaces/${row.workspaceId}`;

  return {
    session,
    workspaceId: row.workspaceId,
    view,
    sidebar,
    basePath,
    viewer,
    shell: {
      workspaceId: row.workspaceId,
      organizationName: row.orgName,
      projectOrInternshipLabel: row.projectName ?? row.internshipTitle,
      internFirstName: row.internFirstName,
      internLastName: row.internLastName,
      locationType: (row.locationType ?? 'hybrid').toUpperCase(),
      durationWeeks: row.duration ?? 12,
      startDate: row.startDate ? new Date(row.startDate) : null,
    },
  };
}

/**
 * Heavy loader: the full workspace overview (tasks, deliverables, events,
 * supervisors, intern profile, project). Designed to be called inside an
 * async server component so it can be wrapped in <Suspense>.
 *
 * Re-runs authz so this loader is safe to call directly without the shell
 * having already done it (defense in depth).
 */
export async function loadWorkspaceData(
  workspaceId: string,
): Promise<WorkspaceOverviewData> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const data = await getWorkspaceOverview(workspaceId);
  if (!data) notFound();
  if (
    !canViewWorkspace(data.workspace, data.project, {
      userId: session.user.id,
      role: session.role,
    })
  ) {
    notFound();
  }
  return data;
}

/**
 * Non-streaming loader for tabs that don't benefit from Suspense splitting
 * (tasks, deliverables, comments, check-in). Kept as-is from the previous
 * audit so we don't churn 6 page files for marginal gains.
 */
export async function loadWorkspacePage(
  workspaceId: string,
  view: WorkspaceView,
): Promise<WorkspacePageData> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const data = await getWorkspaceOverview(workspaceId);
  if (!data) notFound();

  if (
    !canViewWorkspace(data.workspace, data.project, {
      userId: session.user.id,
      role: session.role,
    })
  ) {
    notFound();
  }

  const sidebar =
    view === 'intern'
      ? await getInternSidebarData(data.workspace.internId)
      : await getSupervisorSidebarData(
          session.role === 'admin'
            ? (data.organization?.ownerId ?? session.user.id)
            : session.user.id,
        );

  const viewer =
    view === 'intern'
      ? {
          initials: `${data.intern?.firstName?.[0] ?? ''}${data.intern?.lastName?.[0] ?? ''}`,
          name:
            `${data.intern?.firstName ?? ''} ${data.intern?.lastName ?? ''}`.trim() || 'Intern',
          subtitle:
            `${data.internProfile?.university ?? ''} · ${data.internProfile?.yearOfStudy ?? ''}`.trim(),
        }
      : (() => {
          const supervisor = data.supervisors[0];
          return {
            initials: supervisor
              ? `${supervisor.firstName?.[0] ?? ''}${supervisor.lastName?.[0] ?? ''}`
              : 'AD',
            name: supervisor
              ? `${supervisor.firstName ?? ''} ${supervisor.lastName ?? ''}`.trim()
              : 'Admin',
            subtitle: data.organization?.name ?? '',
          };
        })();

  const basePath =
    view === 'intern'
      ? `/intern/workspaces/${data.workspace.id}`
      : `/company/workspaces/${data.workspace.id}`;

  return { session, data, sidebar, view, basePath, viewer };
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add modules/workspace/page-data.ts
git commit -m "feat(workspace): add loadWorkspaceShell + loadWorkspaceData loaders"
```

---

## Task 2: Skeleton component for the streaming body

**Files:**
- Create: `modules/workspace/components/workspace-body-skeleton.tsx`

- [ ] **Step 1: Write the skeleton**

```tsx
export function WorkspaceBodySkeleton() {
  return (
    <div className="ws-content" aria-busy="true">
      <div className="ws-col-main">
        <div
          className="ws-card"
          style={{ height: 160, background: 'var(--surface-muted)', borderRadius: 8 }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 12,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ height: 72, background: 'var(--surface-muted)', borderRadius: 6 }}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            height: 240,
            background: 'var(--surface-muted)',
            borderRadius: 8,
          }}
        />
        <div
          style={{
            marginTop: 16,
            height: 180,
            background: 'var(--surface-muted)',
            borderRadius: 8,
          }}
        />
      </div>
      <div className="ws-col-side">
        <div style={{ height: 320, background: 'var(--surface-muted)', borderRadius: 8 }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add modules/workspace/components/workspace-body-skeleton.tsx
git commit -m "feat(workspace): add streaming body skeleton"
```

---

## Task 3: Async body component

**Files:**
- Create: `modules/workspace/components/workspace-overview-body.tsx`

- [ ] **Step 1: Write the async body**

```tsx
import { BriefCard } from './brief-card';
import { StatTiles } from './stat-tiles';
import { TaskList } from './task-list';
import { DeliverablesMini } from './deliverables-mini';
import { ActivityFeed, type ActorLookup } from './activity-feed';
import { RailIntern } from './rail-intern';
import { RailSupervisor } from './rail-supervisor';
import { loadWorkspaceData } from '../page-data';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceView } from '../types';

function buildActorLookup(data: WorkspaceOverviewData): ActorLookup {
  const map: ActorLookup = new Map();
  if (data.intern) map.set(data.intern.id, data.intern);
  for (const s of data.supervisors) map.set(s.id, s);
  return map;
}

export async function WorkspaceOverviewBody({
  workspaceId,
  view,
}: {
  workspaceId: string;
  view: WorkspaceView;
}) {
  const data = await loadWorkspaceData(workspaceId);
  return (
    <div className="ws-content">
      <div className="ws-col-main">
        <BriefCard data={data} view={view} />
        <StatTiles data={data} view={view} />
        <TaskList tasks={data.tasks} view={view} />
        <DeliverablesMini deliverables={data.deliverables} />
        <ActivityFeed events={data.events} actors={buildActorLookup(data)} />
      </div>
      <div className="ws-col-side">
        {view === 'intern' ? <RailIntern data={data} /> : <RailSupervisor data={data} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add modules/workspace/components/workspace-overview-body.tsx
git commit -m "feat(workspace): extract async WorkspaceOverviewBody"
```

---

## Task 4: Convert shell + add Suspense

**Files:**
- Modify: `modules/workspace/components/workspace-overview.tsx`

- [ ] **Step 1: Replace WorkspaceOverview with the streaming shell**

```tsx
import { Suspense } from 'react';
import { WorkspaceTopBar, type Crumb } from './topbar';
import { WorkspaceSidebar } from './sidebar';
import { WorkspaceMHead } from './m-head';
import { WorkspaceOverviewBody } from './workspace-overview-body';
import { WorkspaceBodySkeleton } from './workspace-body-skeleton';
import { StuckPill } from './stuck-pill';
import { computeWeekOfTotal } from '../queries';
import type { WorkspaceShell } from '../page-data';

function buildShellCrumbs(shell: WorkspaceShell['shell'], view: WorkspaceShell['view']): Crumb[] {
  if (view === 'intern') {
    return [
      { label: 'My workspaces' },
      { label: `${shell.organizationName} · ${shell.projectOrInternshipLabel}` },
      { label: 'Overview', bold: true },
    ];
  }
  return [
    { label: shell.organizationName },
    { label: shell.projectOrInternshipLabel },
    { label: shell.internFirstName ?? '—' },
    { label: 'Overview', bold: true },
  ];
}

function buildShellModeChip(shell: WorkspaceShell['shell']): { label: string } {
  const { current, total } = computeWeekOfTotal(shell.startDate, shell.durationWeeks);
  return { label: `${shell.locationType} · WEEK ${current} / ${total}` };
}

export function WorkspaceOverview({ shell }: { shell: WorkspaceShell }) {
  return (
    <div
      className="ws-shell ws"
      style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <WorkspaceTopBar
        view={shell.view}
        viewerInitials={shell.viewer.initials}
        crumbs={buildShellCrumbs(shell.shell, shell.view)}
        modeChip={buildShellModeChip(shell.shell)}
      />
      <div className="ws-body">
        <WorkspaceSidebar
          data={shell.sidebar}
          viewer={shell.viewer}
          activeWorkspaceId={shell.workspaceId}
        />
        <main className="ws-main">
          <WorkspaceMHead
            data={null}
            view={shell.view}
            basePath={shell.basePath}
            activeTab="overview"
          />
          <Suspense fallback={<WorkspaceBodySkeleton />}>
            <WorkspaceOverviewBody workspaceId={shell.workspaceId} view={shell.view} />
          </Suspense>
        </main>
      </div>
      {shell.view === 'intern' && <StuckPill />}
    </div>
  );
}
```

- [ ] **Step 2: Update `WorkspaceMHead` to accept `data: WorkspaceOverviewData | null`**

Run: `grep -n "data: WorkspaceOverviewData" modules/workspace/components/m-head.tsx`

If the current signature is `data: WorkspaceOverviewData`, change it to `data: WorkspaceOverviewData | null` and handle null branches (default counts to `—` or `0`). Open the file and look at how `data` is used — if only `data.tasks.length` etc. are read, replace with `data?.tasks.length ?? 0`.

Expected after edit: typecheck clean.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/workspace-overview.tsx modules/workspace/components/m-head.tsx
git commit -m "feat(workspace): stream overview body behind Suspense"
```

---

## Task 5: Wire pages to the new shell

**Files:**
- Modify: `app/[locale]/(platform)/intern/workspaces/[workspaceId]/page.tsx`
- Modify: `app/[locale]/(platform)/company/workspaces/[workspaceId]/page.tsx`

- [ ] **Step 1: Update intern overview page**

Replace `app/[locale]/(platform)/intern/workspaces/[workspaceId]/page.tsx` with:

```tsx
import { loadWorkspaceShell } from '@/modules/workspace/page-data';
import { WorkspaceOverview } from '@/modules/workspace/components/workspace-overview';

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const shell = await loadWorkspaceShell(workspaceId, 'intern');
  return <WorkspaceOverview shell={shell} />;
}
```

- [ ] **Step 2: Update company overview page**

Replace `app/[locale]/(platform)/company/workspaces/[workspaceId]/page.tsx` with:

```tsx
import { loadWorkspaceShell } from '@/modules/workspace/page-data';
import { WorkspaceOverview } from '@/modules/workspace/components/workspace-overview';

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const shell = await loadWorkspaceShell(workspaceId, 'supervisor');
  return <WorkspaceOverview shell={shell} />;
}
```

- [ ] **Step 3: Run typecheck + lint + tests**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: All clean, 92/92 tests pass.

- [ ] **Step 4: Run production build**

Run: `pnpm build`
Expected: build completes with no errors. Both overview routes appear under `ƒ (Dynamic)`.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/\(platform\)/intern/workspaces/\[workspaceId\]/page.tsx \
        app/[locale]/\(platform\)/company/workspaces/\[workspaceId\]/page.tsx
git commit -m "feat(workspace): wire overview pages to streaming shell"
```

---

## Task 6: Manual verification

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`
Expected: server up on http://localhost:3000.

- [ ] **Step 2: Navigate to a seeded workspace as intern**

In a browser, sign in as Yasmine (intern seed account), then open `/intern/workspaces/<id>`.

Expected observation: topbar + sidebar render first, then the body skeleton flashes briefly, then the real cards appear. Open Chrome DevTools → Network tab → look at the HTML response — should see initial HTML containing the shell, with streamed chunks for the body.

- [ ] **Step 3: Navigate as supervisor**

Sign in as Mehdi (supervisor seed), open `/company/workspaces/<id>`. Same expected behavior.

- [ ] **Step 4: 360px Android emulation**

DevTools → toggle device toolbar → set to 360×800 viewport, throttle to "Slow 3G". Reload the workspace page.

Expected: shell paints within ~1s on slow 3G; body skeleton visible during data wait; full cards arrive shortly after.

- [ ] **Step 5: Push**

```bash
git push
```

Expected: Vercel build triggers automatically.

---

## Self-Review

**Spec coverage:** Each piece of the spec maps to a task — shell loader (Task 1), skeleton (Task 2), async body (Task 3), Suspense boundary (Task 4), page wiring (Task 5), runtime verification (Task 6).

**Placeholder scan:** No TBDs or "implement later" — every code block is complete.

**Type consistency:** `WorkspaceShell` type defined in Task 1 is consumed in Tasks 4 and 5; the `view: WorkspaceView` field aligns across all uses. `WorkspaceOverviewData | null` change in `WorkspaceMHead` is the one non-mechanical step — Task 4 Step 2 is explicit about reading the file and replacing usage with optional chaining.

**Known risk:** `WorkspaceMHead` currently expects non-null `data` for its tab counts. If the file is structured such that it can't trivially accept null, the alternative is to compute the counts in the shell loader from a single fast `SELECT COUNT(*)` per table and pass them in the shell. If the inline edit gets messy, fall back to that approach — but the cheaper path is to ship null support.
