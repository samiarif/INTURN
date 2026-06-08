# Sprint-Aware Intern Workspaces — Implementation Plan (Plan 2 of the project-sprints arc)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the intern workspace **sprint-aware** when the project has sprints, transparently no-op when it doesn't. Seed the company's `project_sprints` blueprint into the workspace as tasks (one-shot), and adapt the kanban with a current-sprint banner, sprint switcher, filtered + "All sprints" views.

**Architecture:** One nullable `tasks.sprintId` column (FK with `ON DELETE SET NULL`). Pure active-sprint resolver (date-first, progress-fallback). `seedWorkspaceFromSprints` service called from `acceptApplication` AND from an "Apply sprint plan" action. The intern Tasks page branches once at the top — `sprints.length === 0` renders the existing kanban unchanged; otherwise wraps it with the sprint-aware experience.

**Tech stack:** Next.js 16 (RSC + `'use server'`), Drizzle on local-pg / Neon (driver auto-selected), next-intl 4, Vitest (mocked `db`), Tailwind v4 tokens, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-05-sprint-workspaces-design.md`.

**Notes:** run everything from `/Users/mac/code/inturn-hub/inturn`. If a bare `git` errors "not a git repository", use `git -C /Users/mac/code/inturn-hub/inturn …`. Apply local migrations with `pnpm tsx --env-file=.env.local scripts/migrate.ts`. Next migration number is **`0022`** (note: two pre-existing `0020_*.sql` files are a known collision — do not add a third).

---

## File Structure

**Create:**
- `db/migrations/0022_tasks_sprint_id.sql`
- `modules/sprints/active-sprint.ts` — pure resolver + types.
- `modules/sprints/__tests__/active-sprint.test.ts`
- `modules/workspace/sprint-seed.ts` — `seedWorkspaceFromSprints` service.
- `modules/workspace/__tests__/sprint-seed.test.ts`
- `modules/workspace/sprint-actions.ts` — `applySprintPlanAction`, `setTaskSprintAction`.
- `modules/workspace/__tests__/sprint-actions.test.ts`
- `modules/workspace/components/sprint-banner.tsx` — banner + switcher (client).
- `modules/workspace/components/apply-sprint-plan-callout.tsx` (client).

**Modify:**
- `db/schema/tasks.ts` — add `sprintId`.
- `modules/tasks/service.ts` (or `queries.ts`) — sprint-aware task selection helpers (or pass-through the column).
- `modules/workspace/page-data.ts` — surface `sprints` + `tasksBySprint` in workspace page data.
- `modules/workspace/components/workspace-tasks-page.tsx` — branch on sprints; wrap kanban with banner/switcher; render filtered or "All" view.
- `modules/applications/service.ts` — call `seedWorkspaceFromSprints` inside `acceptApplication` after the workspace insert.
- `locales/fr.json`, `locales/en.json` — `sprintWorkspace.*` namespace (FR source + EN mirror).
- `scripts/seed.ts` — give the demo workspace a small applied sprint plan.

**Test (extend existing):**
- `modules/applications/__tests__/service.test.ts` — assert the seed call.
- `modules/workspace/__tests__/page-data.test.ts` (if it exists) — assert the new fields.

---

## Task 1: Migration `0022` + schema (`tasks.sprintId`)

**Files:** Create `db/migrations/0022_tasks_sprint_id.sql`; Modify `db/schema/tasks.ts`.

- [ ] **Step 1 — migration** (idempotent, match `0021` style):

```sql
-- 0022: tasks.sprint_id — link a workspace task to a project sprint (nullable).
-- Null = "Unsorted" (existing tasks pre-seeding, or tasks the intern parks
-- outside any sprint). ON DELETE SET NULL so deleting a sprint preserves the
-- tasks. Additive, idempotent.
BEGIN;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS sprint_id uuid
  REFERENCES project_sprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_workspace_sprint_idx
  ON tasks(workspace_id, sprint_id);

COMMIT;
```

- [ ] **Step 2 — schema.** In `db/schema/tasks.ts`, add this column to the `tasks` pgTable. Import `projectSprints` from `./project-sprints` and add right after `workspaceId`:

```ts
sprintId: uuid('sprint_id').references(() => projectSprints.id, { onDelete: 'set null' }),
```

(Note: ensure no circular import — `project-sprints.ts` doesn't reference `tasks.ts`, so this is safe.)

- [ ] **Step 3 — apply + verify.** Run: `pnpm tsx --env-file=.env.local scripts/migrate.ts` (applies cleanly). Run a SECOND time → idempotent (0 new, no error). `pnpm typecheck` → PASS.

- [ ] **Step 4 — commit:**
```bash
git add db/migrations/0022_tasks_sprint_id.sql db/schema/tasks.ts
git commit -m "feat(db): add tasks.sprint_id (link workspace tasks to sprints)"
```

---

## Task 2: Active-sprint resolver (pure)

**Files:** Create `modules/sprints/active-sprint.ts`, `modules/sprints/__tests__/active-sprint.test.ts`.

- [ ] **Step 1 — failing tests** (pure function, no DB mocks). Cover each rule from spec §4:

```ts
import { describe, it, expect } from 'vitest';
import { resolveActiveSprintIndex, type SprintProgress } from '../active-sprint';

type S = { id: string; orderIndex: number; startDate: string | null; endDate: string | null };

const today = new Date('2026-06-05');

describe('resolveActiveSprintIndex', () => {
  it('returns null when there are no sprints', () => {
    expect(resolveActiveSprintIndex([], today, new Map())).toBeNull();
  });

  it('rule 1 — today between start and end picks that sprint', () => {
    const sprints: S[] = [
      { id: 'a', orderIndex: 0, startDate: '2026-05-01', endDate: '2026-05-31' },
      { id: 'b', orderIndex: 1, startDate: '2026-06-01', endDate: '2026-06-30' },
    ];
    expect(resolveActiveSprintIndex(sprints, today, new Map())).toBe(1);
  });

  it('rule 1 tie-break — overlapping dates → lowest orderIndex wins', () => {
    const sprints: S[] = [
      { id: 'b', orderIndex: 1, startDate: '2026-05-01', endDate: '2026-06-30' },
      { id: 'a', orderIndex: 0, startDate: '2026-06-01', endDate: '2026-06-30' },
    ];
    expect(resolveActiveSprintIndex(sprints, today, new Map())).toBe(0);
  });

  it('rule 2 — no dates: first sprint with non-done tasks', () => {
    const sprints: S[] = [
      { id: 'a', orderIndex: 0, startDate: null, endDate: null },
      { id: 'b', orderIndex: 1, startDate: null, endDate: null },
    ];
    const progress = new Map<string, SprintProgress>([
      ['a', { total: 2, done: 2 }],   // all done
      ['b', { total: 3, done: 1 }],   // has non-done
    ]);
    expect(resolveActiveSprintIndex(sprints, today, progress)).toBe(1);
  });

  it('rule 2 — between sprints by date: first incomplete', () => {
    const sprints: S[] = [
      { id: 'a', orderIndex: 0, startDate: '2026-01-01', endDate: '2026-02-01' },
      { id: 'b', orderIndex: 1, startDate: '2026-09-01', endDate: '2026-10-01' },
    ];
    const progress = new Map<string, SprintProgress>([
      ['a', { total: 2, done: 0 }],
      ['b', { total: 0, done: 0 }],
    ]);
    expect(resolveActiveSprintIndex(sprints, today, progress)).toBe(0);
  });

  it('rule 3 — all sprints done: last sprint', () => {
    const sprints: S[] = [
      { id: 'a', orderIndex: 0, startDate: null, endDate: null },
      { id: 'b', orderIndex: 1, startDate: null, endDate: null },
    ];
    const progress = new Map<string, SprintProgress>([
      ['a', { total: 2, done: 2 }],
      ['b', { total: 1, done: 1 }],
    ]);
    expect(resolveActiveSprintIndex(sprints, today, progress)).toBe(1);
  });
});
```

- [ ] **Step 2 — run, confirm FAIL.**

- [ ] **Step 3 — implement** `modules/sprints/active-sprint.ts`:

```ts
export type SprintProgress = { total: number; done: number };
export type SprintForResolver = {
  id: string;
  orderIndex: number;
  startDate: string | null;
  endDate: string | null;
};

/**
 * Returns the orderIndex of the active sprint, or null if there are no sprints.
 * Pure — no DB, no clock. `today` and `progress` are supplied by the caller.
 *
 * Rules (in order):
 *   1) today between sprint.startDate..endDate → that sprint. Multiple match
 *      → lowest orderIndex.
 *   2) Otherwise → the first sprint (by orderIndex) with any non-done task.
 *   3) Otherwise (all done, or no tasks at all) → the last sprint.
 */
export function resolveActiveSprintIndex(
  sprints: SprintForResolver[],
  today: Date,
  progress: Map<string, SprintProgress>,
): number | null {
  if (sprints.length === 0) return null;
  const ordered = [...sprints].sort((a, b) => a.orderIndex - b.orderIndex);

  // Rule 1: today within [startDate, endDate]
  const dateMatches = ordered.filter((s) => {
    if (!s.startDate || !s.endDate) return false;
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    return today >= start && today <= end;
  });
  if (dateMatches.length > 0) return dateMatches[0].orderIndex;

  // Rule 2: first with any non-done task
  for (const s of ordered) {
    const p = progress.get(s.id);
    if (p && p.total > 0 && p.done < p.total) return s.orderIndex;
  }

  // Rule 3: fall back to last
  return ordered[ordered.length - 1].orderIndex;
}
```

- [ ] **Step 4 — run tests + typecheck** → PASS.

- [ ] **Step 5 — commit:**
```bash
git add modules/sprints/active-sprint.ts modules/sprints/__tests__/active-sprint.test.ts
git commit -m "feat(sprints): pure active-sprint resolver (date-first, progress fallback)"
```

---

## Task 3: `seedWorkspaceFromSprints` service

**Files:** Create `modules/workspace/sprint-seed.ts`, `modules/workspace/__tests__/sprint-seed.test.ts`.

- [ ] **Step 1 — failing tests** (mirror the mocked-`db` pattern from `modules/sprints/__tests__/service.test.ts`). Cover:
  - Resolves the workspace's projectId via `workspaces → internships`.
  - Loads `project_sprints` in order.
  - **Idempotency guard** — if any task in the workspace has `sprintId IS NOT NULL`, return early without inserting.
  - No-op when the project has 0 sprints.
  - For each sprint with `taskBlueprint = [{title, description?}, …]`, inserts one `tasks` row per blueprint entry with `workspaceId`, `sprintId`, `title`, `description`, `status: 'todo'`, ascending `order`.

- [ ] **Step 2 — run, confirm FAIL.**

- [ ] **Step 3 — implement** `modules/workspace/sprint-seed.ts`:

```ts
import { db } from '@/db';
import { workspaces, internships, projectSprints, tasks, type ProjectSprint } from '@/db/schema';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

/**
 * One-shot seed: copy a project's sprint blueprints into a workspace's task
 * board. Idempotent — if the workspace already has any task linked to a sprint,
 * does nothing (the intern has already pulled the plan).
 *
 * Project resolution: workspace.internshipId → internship.projectId.
 * Returns the number of tasks created.
 */
export async function seedWorkspaceFromSprints(workspaceId: string): Promise<number> {
  // 1. Resolve project via internship.
  const [row] = await db
    .select({ projectId: internships.projectId })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!row?.projectId) return 0;

  // 2. Load sprints in order.
  const sprints = (await db
    .select()
    .from(projectSprints)
    .where(eq(projectSprints.projectId, row.projectId))
    .orderBy(asc(projectSprints.orderIndex))
    .limit(100)) as ProjectSprint[];
  if (sprints.length === 0) return 0;

  // 3. Idempotency guard — any existing sprint-linked task → bail.
  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.workspaceId, workspaceId), isNotNull(tasks.sprintId)))
    .limit(1);
  if (existing) return 0;

  // 4. Insert blueprint tasks.
  let order = 0;
  let inserted = 0;
  for (const sprint of sprints) {
    const blueprint = sprint.taskBlueprint ?? [];
    for (const tb of blueprint) {
      await db.insert(tasks).values({
        workspaceId,
        sprintId: sprint.id,
        title: tb.title,
        description: tb.description ?? null,
        status: 'todo',
        order: order++,
      });
      inserted++;
    }
  }
  return inserted;
}
```

- [ ] **Step 4 — run tests + typecheck** → PASS.

- [ ] **Step 5 — commit:**
```bash
git add modules/workspace/sprint-seed.ts modules/workspace/__tests__/sprint-seed.test.ts
git commit -m "feat(workspace): seedWorkspaceFromSprints (one-shot blueprint → tasks)"
```

---

## Task 4: Auto-seed on intern placement (`acceptApplication`)

**Files:** Modify `modules/applications/service.ts`; Test `modules/applications/__tests__/service.test.ts`.

- [ ] **Step 1 — read `modules/applications/service.ts:130-200`** (the `acceptApplication` function and its workspace insert at line 177) to know where to insert the call.

- [ ] **Step 2 — failing test** in `modules/applications/__tests__/service.test.ts`: mock `seedWorkspaceFromSprints` from `@/modules/workspace/sprint-seed`; assert it's called with the newly-created workspace id after the insert. (Match the file's existing mock conventions.)

- [ ] **Step 3 — run, confirm FAIL.**

- [ ] **Step 4 — implement.** After `db.insert(workspaces).values(...).returning()` in `acceptApplication`, add:

```ts
import { seedWorkspaceFromSprints } from '@/modules/workspace/sprint-seed';
// ...
const [createdWorkspace] = await db.insert(workspaces).values(...).returning();
// Best-effort seed: if the project has sprints, copy the blueprint into the
// new workspace. seedWorkspaceFromSprints is idempotent + no-ops when there
// are no sprints, so it's safe to always call.
try {
  await seedWorkspaceFromSprints(createdWorkspace.id);
} catch (err) {
  console.error('[acceptApplication] seedWorkspaceFromSprints failed:', err);
  // Don't fail the acceptance — the intern can still "Apply sprint plan" later.
}
```

- [ ] **Step 5 — run tests + typecheck** → PASS.

- [ ] **Step 6 — commit:**
```bash
git add modules/applications/service.ts modules/applications/__tests__/service.test.ts
git commit -m "feat(applications): auto-seed sprint plan into new workspaces"
```

---

## Task 5: Sprint queries for the workspace

**Files:** Modify `modules/sprints/queries.ts` (or create `modules/workspace/sprint-queries.ts` if cleaner). Test extension to `modules/sprints/__tests__/queries.test.ts` (or new file).

- [ ] **Step 1 — failing tests** for:
  - `getSprintsForWorkspace(workspaceId)` — resolves project via internship, returns its sprints ordered.
  - `getTaskCountsBySprint(workspaceId)` — returns `Map<sprintId, { total: number; done: number }>` over the workspace's tasks. Tasks with `sprintId IS NULL` are NOT counted (Unsorted is handled separately).

- [ ] **Step 2 — implement** in `modules/sprints/queries.ts`:

```ts
import { db } from '@/db';
import { projectSprints, tasks, workspaces, internships, type ProjectSprint } from '@/db/schema';
import { and, asc, count, eq } from 'drizzle-orm';

/** All sprints for a workspace's project, ordered. Empty array when none. */
export async function getSprintsForWorkspace(workspaceId: string): Promise<ProjectSprint[]> {
  const [row] = await db
    .select({ projectId: internships.projectId })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!row?.projectId) return [];
  return db
    .select()
    .from(projectSprints)
    .where(eq(projectSprints.projectId, row.projectId))
    .orderBy(asc(projectSprints.orderIndex))
    .limit(100);
}

/** Map<sprintId, {total, done}> over the workspace's sprint-linked tasks. */
export async function getTaskCountsBySprint(
  workspaceId: string,
): Promise<Map<string, { total: number; done: number }>> {
  const rows = await db
    .select({ sprintId: tasks.sprintId, status: tasks.status })
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId))
    .limit(2000);
  const map = new Map<string, { total: number; done: number }>();
  for (const r of rows) {
    if (!r.sprintId) continue;
    const cur = map.get(r.sprintId) ?? { total: 0, done: 0 };
    cur.total++;
    if (r.status === 'done') cur.done++;
    map.set(r.sprintId, cur);
  }
  return map;
}
```

- [ ] **Step 3 — run tests + typecheck** → PASS.

- [ ] **Step 4 — commit:**
```bash
git add modules/sprints/queries.ts modules/sprints/__tests__/queries.test.ts
git commit -m "feat(sprints): workspace-side sprint queries (sprints + task counts)"
```

---

## Task 6: `applySprintPlanAction` + `setTaskSprintAction`

**Files:** Create `modules/workspace/sprint-actions.ts`, `modules/workspace/__tests__/sprint-actions.test.ts`.

- [ ] **Step 1 — failing tests.** Mock `requireActiveSession`, the `db` lookups (load workspace → project), the service (`seedWorkspaceFromSprints`), and `revalidatePath`.
  - `applySprintPlanAction({ workspaceId })`:
    - Rejects when caller is not the intern of the workspace AND not an active org owner/admin (Forbidden).
    - On success, calls `seedWorkspaceFromSprints(workspaceId)` and revalidates the workspace path.
  - `setTaskSprintAction({ taskId, sprintId | null })`:
    - Loads the task → resolves its workspace → project; validates that `sprintId` (when non-null) belongs to that project.
    - Rejects when caller isn't the workspace intern or an org owner/admin.
    - Rejects when target sprint is from a different project (returns `invalid_sprint`).
    - On success, updates `tasks.sprintId` and revalidates.

- [ ] **Step 2 — run, confirm fail.**

- [ ] **Step 3 — implement** `modules/workspace/sprint-actions.ts`:

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { workspaces, internships, projectSprints, tasks } from '@/db/schema';
import { requireActiveSession } from '@/modules/auth/session';
import { getActiveMembership } from '@/modules/team/authz';
import { seedWorkspaceFromSprints } from './sprint-seed';

type Result = { ok: true } | { ok: false; error: string };

async function loadWorkspace(workspaceId: string) {
  const [row] = await db
    .select({
      ws: workspaces,
      projectId: internships.projectId,
    })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return row ?? null;
}

async function gateWorkspace(userId: string, workspaceId: string) {
  const row = await loadWorkspace(workspaceId);
  if (!row) throw new Error('workspace_not_found');
  if (row.ws.internId === userId) return row;
  const m = await getActiveMembership(userId, row.ws.organizationId);
  if (m?.role === 'owner' || m?.role === 'admin') return row;
  throw new Error('Forbidden');
}

function revalidate(workspaceId: string) {
  revalidatePath(`/intern/workspaces/${workspaceId}`);
  revalidatePath(`/company/workspaces/${workspaceId}`);
}

export async function applySprintPlanAction(input: { workspaceId: string }): Promise<Result> {
  try {
    const { user } = await requireActiveSession();
    await gateWorkspace(user.id, input.workspaceId);
    await seedWorkspaceFromSprints(input.workspaceId);
    revalidate(input.workspaceId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function setTaskSprintAction(input: {
  taskId: string;
  sprintId: string | null;
}): Promise<Result> {
  try {
    const { user } = await requireActiveSession();
    const [task] = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
    if (!task) return { ok: false, error: 'task_not_found' };
    const row = await gateWorkspace(user.id, task.workspaceId);

    if (input.sprintId) {
      const [s] = await db
        .select({ id: projectSprints.id })
        .from(projectSprints)
        .where(and(eq(projectSprints.id, input.sprintId), eq(projectSprints.projectId, row.projectId)))
        .limit(1);
      if (!s) return { ok: false, error: 'invalid_sprint' };
    }

    await db
      .update(tasks)
      .set({ sprintId: input.sprintId, updatedAt: new Date() })
      .where(eq(tasks.id, input.taskId));
    revalidate(task.workspaceId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
```

- [ ] **Step 4 — run tests + typecheck** → PASS.

- [ ] **Step 5 — commit:**
```bash
git add modules/workspace/sprint-actions.ts modules/workspace/__tests__/sprint-actions.test.ts
git commit -m "feat(workspace): applySprintPlanAction + setTaskSprintAction"
```

---

## Task 7: Sprint banner + switcher (UI)

**Files:** Create `modules/workspace/components/sprint-banner.tsx`. (Client component.)

- [ ] **Step 1 — read** `modules/workspace/components/workspace-tasks-page.tsx` (the host page) and one or two sibling client components (e.g. the existing tabs / filters) to mirror Tailwind tokens + the `useTranslations` pattern.

- [ ] **Step 2 — implement** `sprint-banner.tsx`:

```tsx
'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export type SprintForBanner = {
  id: string;
  name: string;
  goal: string | null;
  orderIndex: number;
  startDate: string | null;
  endDate: string | null;
};

export function SprintBanner({
  sprints,
  activeIndex,        // result of resolveActiveSprintIndex
  selectedKey,        // 'all' | 'unsorted' | sprintId
  unsortedCount,
  taskCountsBySprint, // Map<sprintId, {total, done}>
}: {
  sprints: SprintForBanner[];
  activeIndex: number | null;
  selectedKey: string;
  unsortedCount: number;
  taskCountsBySprint: Map<string, { total: number; done: number }>;
}) {
  const t = useTranslations('sprintWorkspace');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setSprint(key: string) {
    const q = new URLSearchParams(params);
    if (key === '__default__') q.delete('sprint'); else q.set('sprint', key);
    router.push(`${pathname}?${q.toString()}`);
  }

  const total = sprints.length;
  const selectedSprint =
    selectedKey === 'all' || selectedKey === 'unsorted'
      ? null
      : sprints.find((s) => s.id === selectedKey) ??
        (activeIndex !== null ? sprints[activeIndex] : null);

  const status =
    selectedSprint && activeIndex !== null && sprints[activeIndex]?.id === selectedSprint.id
      ? t('statusActive')
      : selectedSprint && activeIndex !== null && selectedSprint.orderIndex < sprints[activeIndex].orderIndex
      ? t('statusPast')
      : selectedSprint && activeIndex !== null && selectedSprint.orderIndex > sprints[activeIndex].orderIndex
      ? t('statusUpcoming')
      : '';

  return (
    <div className="mb-4 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4">
      {selectedSprint ? (
        <>
          <div className="flex items-baseline gap-2 text-caption font-mono uppercase text-[var(--ink-4)]">
            <span>{t('sprintOf', { current: selectedSprint.orderIndex + 1, total })}</span>
            {status && <span className="ml-2">{status}</span>}
          </div>
          <h2 className="mt-1 text-sm font-semibold text-[var(--ink)]">{selectedSprint.name}</h2>
          {selectedSprint.goal && (
            <p className="mt-1 text-caption text-[var(--ink-3)]">{selectedSprint.goal}</p>
          )}
        </>
      ) : (
        <h2 className="text-sm font-semibold text-[var(--ink)]">
          {selectedKey === 'all' ? t('allSprintsTitle') : t('unsortedTitle')}
        </h2>
      )}

      {/* Switcher */}
      <div className="mt-3 flex flex-wrap gap-2">
        {sprints.map((s, i) => {
          const counts = taskCountsBySprint.get(s.id);
          const isSel = selectedKey === s.id || (selectedKey === '__default__' && activeIndex === i);
          const isActive = activeIndex === i;
          return (
            <button
              key={s.id}
              onClick={() => setSprint(s.id)}
              className={
                'rounded-md border px-3 py-1 text-caption ' +
                (isSel
                  ? 'border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]'
                  : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--ink-2)]')
              }
            >
              {isActive && <span className="mr-1">•</span>}
              {t('sprintLabel', { n: i + 1 })}
              {counts && (
                <span className="ml-1 text-[var(--ink-4)]">
                  ({counts.done}/{counts.total})
                </span>
              )}
            </button>
          );
        })}
        {unsortedCount > 0 && (
          <button
            onClick={() => setSprint('unsorted')}
            className={
              'rounded-md border px-3 py-1 text-caption ' +
              (selectedKey === 'unsorted'
                ? 'border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]'
                : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--ink-2)]')
            }
          >
            {t('unsorted')} ({unsortedCount})
          </button>
        )}
        <button
          onClick={() => setSprint('all')}
          className={
            'rounded-md border px-3 py-1 text-caption ' +
            (selectedKey === 'all'
              ? 'border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]'
              : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--ink-2)]')
          }
        >
          {t('allSprints')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 — typecheck + build** → PASS.

- [ ] **Step 4 — commit:**
```bash
git add modules/workspace/components/sprint-banner.tsx
git commit -m "feat(workspace): SprintBanner client component (banner + switcher)"
```

---

## Task 8: Wire the Tasks page — branch on sprints, filter or stack

**Files:** Modify `modules/workspace/page-data.ts` (or wherever `WorkspaceTasksPage` receives its data) AND `modules/workspace/components/workspace-tasks-page.tsx`.

- [ ] **Step 1 — read** `modules/workspace/components/workspace-tasks-page.tsx` to find the existing kanban render and where `ctx.data.tasks` is consumed.

- [ ] **Step 2 — extend page-data.** In `modules/workspace/page-data.ts` (the `loadWorkspacePage` function), additionally fetch (in parallel with existing reads):
  - `const sprints = await getSprintsForWorkspace(workspaceId);` (Task 5)
  - `const taskCountsBySprint = await getTaskCountsBySprint(workspaceId);` (Task 5)
  Compute `activeIndex = resolveActiveSprintIndex(sprints, new Date(), taskCountsBySprint)` (Task 2). Include `sprints`, `activeIndex`, `taskCountsBySprint` in the returned `data`.

- [ ] **Step 3 — branch the Tasks page.** In `workspace-tasks-page.tsx`:
  - If `data.sprints.length === 0` → render the EXISTING kanban exactly as today. No code change inside that branch (regression-safe).
  - Else:
    - Read the query param `sprint` (server-side via the page's `searchParams` if available, or via `useSearchParams()` if the component is client). Map: missing → `'__default__'` (resolves to active); else `'all' | 'unsorted' | <sprintId>`.
    - Render `<SprintBanner sprints={…} activeIndex={…} selectedKey={selectedKey} unsortedCount={…} taskCountsBySprint={…} />`.
    - **Filtered view** (one sprint or Unsorted): filter the tasks array to that subset before passing into the existing kanban component. Pass through unchanged. New-task creation defaults to the selected sprint's `sprintId`.
    - **All view** (`selectedKey === 'all'`): for each sprint (in order), render a section: `<h3>{sprint.name}</h3>` + the existing kanban scoped to that sprint's tasks. If `unsortedCount > 0`, add a final "Unsorted" section.

  Add a small **sprint chip** on each task card (e.g., next to the title): pass a `sprintBadgeBySprintId` map to the card, or render a `<span>S{i+1}</span>` if the card already has sprint context. Keep this minimal — the chip can be the sprint's `orderIndex + 1` (mock "S1", "S2"…).

- [ ] **Step 4 — typecheck + build** → PASS. **Backward-compat regression test:** open a workspace whose project has 0 sprints (the existing demo intern workspace, before re-seeding) — must look identical to today.

- [ ] **Step 5 — commit:**
```bash
git add modules/workspace/page-data.ts "modules/workspace/components/workspace-tasks-page.tsx"
git commit -m "feat(workspace): sprint-aware Tasks page (filtered + All views)"
```

---

## Task 9: "Apply sprint plan" call-out

**Files:** Create `modules/workspace/components/apply-sprint-plan-callout.tsx`; Modify `workspace-tasks-page.tsx` to render it when applicable.

- [ ] **Step 1 — build the call-out** (client; calls `applySprintPlanAction`):

```tsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { applySprintPlanAction } from '@/modules/workspace/sprint-actions';

export function ApplySprintPlanCallout({ workspaceId, sprintCount }: { workspaceId: string; sprintCount: number }) {
  const t = useTranslations('sprintWorkspace');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="mb-4 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--surface)] p-4 flex items-center gap-3">
      <p className="text-sm text-[var(--ink-2)]">
        {t('applyCalloutBody', { count: sprintCount })}
      </p>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await applySprintPlanAction({ workspaceId });
            router.refresh();
          })
        }
        className="ml-auto inline-flex items-center rounded-md bg-[var(--brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-600)] disabled:opacity-50"
      >
        {pending ? t('applyingCta') : t('applyCta')}
      </button>
    </div>
  );
}
```

- [ ] **Step 2 — render condition.** In `workspace-tasks-page.tsx`, when `data.sprints.length > 0` AND no task in the workspace has a non-null `sprintId` yet → render `<ApplySprintPlanCallout workspaceId={…} sprintCount={data.sprints.length} />` above the banner. Once tasks are seeded, the call-out disappears.

- [ ] **Step 3 — typecheck + build** → PASS.

- [ ] **Step 4 — commit:**
```bash
git add modules/workspace/components/apply-sprint-plan-callout.tsx "modules/workspace/components/workspace-tasks-page.tsx"
git commit -m "feat(workspace): apply-sprint-plan call-out for unseeded workspaces"
```

---

## Task 10: i18n FR/EN — `sprintWorkspace` namespace

**Files:** Modify `locales/fr.json`, `locales/en.json`.

- [ ] **Step 1 — add keys** (keep FR/EN parity; `t('tasks')`-style ICU plurals where needed):

Used by `SprintBanner`:
- `sprintOf` — FR `"Sprint {current} sur {total}"` / EN `"Sprint {current} of {total}"`
- `sprintLabel` — FR `"Sprint {n}"` / EN `"Sprint {n}"`
- `statusActive` — FR `"En cours"` / EN `"Active now"`
- `statusPast` — FR `"Terminé"` / EN `"Past"`
- `statusUpcoming` — FR `"À venir"` / EN `"Upcoming"`
- `allSprints` — FR `"Tous les sprints"` / EN `"All sprints"`
- `allSprintsTitle` — FR `"Tous les sprints"` / EN `"All sprints"`
- `unsorted` — FR `"Non classés"` / EN `"Unsorted"`
- `unsortedTitle` — FR `"Tâches non classées"` / EN `"Unsorted tasks"`

Used by `ApplySprintPlanCallout`:
- `applyCalloutBody` — FR `"Votre encadrant a préparé {count, plural, one {# sprint} other {# sprints}} pour ce projet."` / EN `"Your supervisor has set up {count, plural, one {# sprint} other {# sprints}} for this project."`
- `applyCta` — FR `"Appliquer le plan"` / EN `"Apply sprint plan"`
- `applyingCta` — FR `"Application…"` / EN `"Applying…"`

- [ ] **Step 2 — verify:** `pnpm check:i18n` (parity OK), `pnpm build` (no missing-key errors).

- [ ] **Step 3 — commit:**
```bash
git add locales/fr.json locales/en.json
git commit -m "i18n(sprintWorkspace): FR/EN strings"
```

---

## Task 11: Seed update — give the demo workspace a sprint plan

**Files:** Modify `scripts/seed.ts`.

- [ ] **Step 1 — locate** the Dazz Studio "Brand audit" project seed and Sami Arif's workspace seed.

- [ ] **Step 2 — add a small sprint plan** to the project (3 sprints, each with 2–3 blueprint tasks). Use the existing `createSprint` / `setSprintTaskBlueprint` services if convenient, or direct inserts mirroring the table shape. After the workspace is inserted, call `seedWorkspaceFromSprints(workspaceId)` so the demo intern lands on a board that already shows the sprint-aware experience.

- [ ] **Step 3 — re-seed locally:** `pnpm db:seed`. Confirm via psql: `select s.name, count(t.id) from project_sprints s left join tasks t on t.sprint_id = s.id where s.project_id = '<brand-audit>' group by s.name;` — 3 sprints, each with their seeded tasks.

- [ ] **Step 4 — commit:**
```bash
git add scripts/seed.ts
git commit -m "feat(seed): give the demo workspace a sample sprint plan"
```

---

## Task 12: Final verification

- [ ] `pnpm vitest run` → all PASS (expect ~+12 new tests).
- [ ] `pnpm typecheck` + `pnpm build` + `pnpm lint` + `pnpm check:i18n` → clean.
- [ ] **Browser walkthrough** (dev server, local Postgres):
  - **No-sprints workspace** (a workspace whose project still has 0 sprints) → kanban looks exactly like today. **This is the regression must-pass.**
  - **Seeded workspace** (Sami Arif on Brand audit, post Task 11) → banner says "Sprint X of 3 — …", switcher shows all sprints with task counts, default selection = active sprint, filtered kanban has the seeded tasks.
  - Switch to **All sprints** → stacked sections render, one mini-kanban per sprint.
  - Switch to **Unsorted** (after manually nulling one task's sprint_id) → renders correctly.
  - **Apply sprint plan** call-out — only shows for an unseeded workspace; clicking it seeds; idempotent (clicking twice doesn't dupe).
  - Change a task's sprint via the task detail panel → persists; cross-project sprint rejected.
- [ ] Report test count delta + concerns. **Do NOT merge** — leave the branch for Sam's review.

---

## Self-Review (author)

- **Spec coverage** (§3 schema → §10 testing): all sections mapped to a task. Migration + schema (T1). Resolver (T2). Seed service (T3). Auto-seed on placement (T4). Workspace queries (T5). Actions incl. IDOR & project-link validation (T6). Banner + switcher (T7). Branched Tasks page + filtered + All view (T8). Apply call-out (T9). i18n (T10). Demo seed (T11). Final verify (T12).
- **Backward compatibility:** Task 8 Step 3 explicitly preserves the existing kanban for 0-sprint projects (no code change in that branch). Regression check in T12.
- **Type consistency:** `ProjectSprint` from `@/db/schema` flows through queries → page-data → banner. `SprintProgress` is the only new shape, owned by `active-sprint.ts`, consumed by `getTaskCountsBySprint` and the resolver.
- **No placeholders:** every task carries the actual code or precise files-to-mirror, gated by `pnpm vitest run`, `pnpm typecheck`, `pnpm build` and a concrete browser scenario.
