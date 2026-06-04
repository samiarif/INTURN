# Project Sprints — Plan 1 of 2: Company-side sprint planning

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let a company decompose a project into **sprints** (manual or AI-generated) and brainstorm each sprint's **task blueprint** (manual or AI), on the project page.

**Architecture:** New project-level `project_sprints` table (with a `taskBlueprint` jsonb). Sprint CRUD via a service + `'use server'` actions gated to the project's org owners/admins. AI generation extends the existing `modules/ai/project-assist.ts` (mirrors `draftPhases`/`suggestDeliverables`) and the existing `/api/ai/project-assist` route — draft-then-commit, exactly like today's assists. Phases are untouched. (Plan 2 adds `tasks.sprintId` + seeding into intern workspaces.)

**Tech stack:** Next.js 16 (RSC + `'use server'`), Drizzle on Neon/local-pg, next-intl 4, Vitest (mocked `db`), Anthropic SDK (`claude-sonnet-4-5`), Tailwind v4 tokens, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-01-project-sprints-design.md`.

**Notes:** run from `inturn/`; if bare `git` errors "not a git repository", use `git -C /Users/mac/code/inturn-hub/inturn …`. Apply migrations locally with `pnpm tsx --env-file=.env.local scripts/migrate.ts`. The branch already runs against **local Postgres** (offline-dev plumbing committed). Next migration number is **0021** (note: two `0020_*` files already exist — that's a pre-existing collision, do not add a third).

---

## File Structure

**Create:**
- `db/migrations/0021_project_sprints.sql`
- `db/schema/project-sprints.ts`
- `modules/sprints/service.ts` — sprint CRUD + reorder + setTaskBlueprint (pure-ish DB ops).
- `modules/sprints/queries.ts` — `getProjectSprints(projectId)`.
- `modules/sprints/server-actions.ts` — `'use server'` actions, org-gated.
- `modules/sprints/__tests__/{service,server-actions}.test.ts`
- `app/[locale]/(platform)/company/projects/[projectId]/_sprints-section.tsx` — the Sprints UI (client).

**Modify:**
- `db/schema/index.ts` — export project-sprints.
- `modules/ai/project-assist.ts` — add `generateSprintPlan` + `brainstormSprintTasks`.
- `app/api/ai/project-assist/route.ts` — add `sprint-plan` + `sprint-tasks` kinds.
- `app/[locale]/(platform)/company/projects/[projectId]/page.tsx` — render `<SprintsSection>`.
- `locales/fr.json`, `locales/en.json` — `sprints.*` namespace.

---

## Task 1: Migration 0021 + `project_sprints` schema

**Files:** Create `db/migrations/0021_project_sprints.sql`, `db/schema/project-sprints.ts`; Modify `db/schema/index.ts`.

- [ ] **Step 1 — migration** (idempotent, match the `0019` style):

```sql
-- 0021: project_sprints — company-authored sprint blueprint for a project.
-- Each row is a sprint with an ordered task blueprint (copied into intern
-- workspaces in Plan 2). Additive, idempotent.
BEGIN;

CREATE TABLE IF NOT EXISTS project_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal text,
  order_index integer NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  task_blueprint jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_sprints_project_order_idx
  ON project_sprints(project_id, order_index);

COMMIT;
```

- [ ] **Step 2 — schema** `db/schema/project-sprints.ts`:

```ts
import { pgTable, text, timestamp, uuid, integer, date, jsonb, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export type SprintTaskBlueprint = { title: string; description?: string };

export const projectSprints = pgTable(
  'project_sprints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    goal: text('goal'),
    orderIndex: integer('order_index').notNull().default(0),
    startDate: date('start_date'),
    endDate: date('end_date'),
    taskBlueprint: jsonb('task_blueprint').$type<SprintTaskBlueprint[]>().notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('project_sprints_project_order_idx').on(table.projectId, table.orderIndex)],
);

export type ProjectSprint = typeof projectSprints.$inferSelect;
export type NewProjectSprint = typeof projectSprints.$inferInsert;
```

- [ ] **Step 3 — export** in `db/schema/index.ts`: add `export * from './project-sprints';` (match the file's existing export style).

- [ ] **Step 4 — apply + verify:** `pnpm tsx --env-file=.env.local scripts/migrate.ts` (clean), run again (idempotent, 0 new). `pnpm typecheck` → PASS.

- [ ] **Step 5 — commit:**
```bash
git add db/migrations/0021_project_sprints.sql db/schema/project-sprints.ts db/schema/index.ts
git commit -m "feat(db): add project_sprints table (sprint blueprint)"
```

---

## Task 2: Sprint queries + service

**Files:** Create `modules/sprints/queries.ts`, `modules/sprints/service.ts`, `modules/sprints/__tests__/service.test.ts`.

- [ ] **Step 1 — queries** `modules/sprints/queries.ts`:

```ts
import { db } from '@/db';
import { projectSprints, type ProjectSprint } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';

/** All sprints for a project, in order. No auth (queries-layer convention). */
export async function getProjectSprints(projectId: string): Promise<ProjectSprint[]> {
  return db
    .select()
    .from(projectSprints)
    .where(eq(projectSprints.projectId, projectId))
    .orderBy(asc(projectSprints.orderIndex))
    .limit(100);
}
```

- [ ] **Step 2 — failing service tests** `modules/sprints/__tests__/service.test.ts` (follow the project's mocked-`db` Vitest pattern used in `modules/team/__tests__/service.test.ts`: `vi.mock('@/db')`, `vi.mock('@/db/schema')`, `vi.mock('drizzle-orm')`, FIFO `selectQueue` + insert/update spies). Cover:
  - `createSprint` inserts `{ projectId, name, orderIndex, taskBlueprint: [] }` with `orderIndex` = current max+1.
  - `setSprintTaskBlueprint` updates `taskBlueprint`.
  - `reorderSprints` writes each id's new `orderIndex`.
  - `deleteSprint` deletes by id (scoped to projectId).

(Write the tests first, run, confirm fail.)

- [ ] **Step 3 — service** `modules/sprints/service.ts`:

```ts
import { db } from '@/db';
import { projectSprints, type ProjectSprint, type SprintTaskBlueprint } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function createSprint(input: {
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  taskBlueprint?: SprintTaskBlueprint[];
}): Promise<ProjectSprint> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${projectSprints.orderIndex}), -1)` })
    .from(projectSprints)
    .where(eq(projectSprints.projectId, input.projectId));
  const [created] = await db
    .insert(projectSprints)
    .values({
      projectId: input.projectId,
      name: input.name,
      goal: input.goal ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      orderIndex: (max ?? -1) + 1,
      taskBlueprint: input.taskBlueprint ?? [],
    })
    .returning();
  return created;
}

export async function updateSprint(input: {
  projectId: string;
  sprintId: string;
  name?: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.goal !== undefined) patch.goal = input.goal;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.endDate !== undefined) patch.endDate = input.endDate;
  await db
    .update(projectSprints)
    .set(patch)
    .where(and(eq(projectSprints.id, input.sprintId), eq(projectSprints.projectId, input.projectId)));
}

export async function setSprintTaskBlueprint(input: {
  projectId: string;
  sprintId: string;
  tasks: SprintTaskBlueprint[];
}): Promise<void> {
  await db
    .update(projectSprints)
    .set({ taskBlueprint: input.tasks, updatedAt: new Date() })
    .where(and(eq(projectSprints.id, input.sprintId), eq(projectSprints.projectId, input.projectId)));
}

export async function deleteSprint(input: { projectId: string; sprintId: string }): Promise<void> {
  await db
    .delete(projectSprints)
    .where(and(eq(projectSprints.id, input.sprintId), eq(projectSprints.projectId, input.projectId)));
}

/** Persist a new order: ids in desired order → orderIndex 0..n. */
export async function reorderSprints(input: { projectId: string; orderedIds: string[] }): Promise<void> {
  const now = new Date();
  for (let i = 0; i < input.orderedIds.length; i++) {
    await db
      .update(projectSprints)
      .set({ orderIndex: i, updatedAt: now })
      .where(and(eq(projectSprints.id, input.orderedIds[i]), eq(projectSprints.projectId, input.projectId)));
  }
}

/** Bulk-create sprints from an accepted AI plan (preserves given order). */
export async function createSprintsBulk(input: {
  projectId: string;
  sprints: { name: string; goal?: string | null; startDate?: string | null; endDate?: string | null }[];
}): Promise<void> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${projectSprints.orderIndex}), -1)` })
    .from(projectSprints)
    .where(eq(projectSprints.projectId, input.projectId));
  let next = (max ?? -1) + 1;
  for (const s of input.sprints) {
    await db.insert(projectSprints).values({
      projectId: input.projectId,
      name: s.name,
      goal: s.goal ?? null,
      startDate: s.startDate ?? null,
      endDate: s.endDate ?? null,
      orderIndex: next++,
      taskBlueprint: [],
    });
  }
}
```

- [ ] **Step 4 — run tests + typecheck** → PASS.

- [ ] **Step 5 — commit:**
```bash
git add modules/sprints/queries.ts modules/sprints/service.ts modules/sprints/__tests__/service.test.ts
git commit -m "feat(sprints): project-sprint service + queries"
```

---

## Task 3: Sprint server actions (org-gated)

**Files:** Create `modules/sprints/server-actions.ts`, `modules/sprints/__tests__/server-actions.test.ts`.

- [ ] **Step 1 — failing tests** (mock `requireActiveSession`, `requireOrgRole`, the service fns, `revalidatePath`, and a project lookup): each action (a) loads the project to find its org, (b) `requireOrgRole(user.id, project.organizationId, ['owner','admin'])`, (c) calls the service, (d) revalidates the project page. Test: rejects when not owner/admin (Forbidden); succeeds for owner.

- [ ] **Step 2 — run, confirm fail.**

- [ ] **Step 3 — implement** `modules/sprints/server-actions.ts`:

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { requireActiveSession } from '@/modules/auth/session';
import { requireOrgRole } from '@/modules/team/authz';
import {
  createSprint, updateSprint, deleteSprint, reorderSprints,
  setSprintTaskBlueprint, createSprintsBulk,
} from './service';
import type { SprintTaskBlueprint } from '@/db/schema';

type Result = { ok: true } | { ok: false; error: string };

async function gate(projectId: string) {
  const { user } = await requireActiveSession();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error('project_not_found');
  await requireOrgRole(user.id, project.organizationId, ['owner', 'admin']);
  return project;
}
function revalidate(projectId: string) {
  revalidatePath(`/company/projects/${projectId}`);
}

export async function createSprintAction(input: { projectId: string; name: string; goal?: string }): Promise<Result> {
  try {
    await gate(input.projectId);
    if (!input.name?.trim()) return { ok: false, error: 'name_required' };
    await createSprint({ projectId: input.projectId, name: input.name.trim(), goal: input.goal?.trim() || null });
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' }; }
}

export async function updateSprintAction(input: { projectId: string; sprintId: string; name?: string; goal?: string | null }): Promise<Result> {
  try {
    await gate(input.projectId);
    await updateSprint(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' }; }
}

export async function deleteSprintAction(input: { projectId: string; sprintId: string }): Promise<Result> {
  try {
    await gate(input.projectId);
    await deleteSprint(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' }; }
}

export async function reorderSprintsAction(input: { projectId: string; orderedIds: string[] }): Promise<Result> {
  try {
    await gate(input.projectId);
    await reorderSprints(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' }; }
}

export async function setSprintTasksAction(input: { projectId: string; sprintId: string; tasks: SprintTaskBlueprint[] }): Promise<Result> {
  try {
    await gate(input.projectId);
    await setSprintTaskBlueprint(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' }; }
}

export async function applySprintPlanAction(input: {
  projectId: string;
  sprints: { name: string; goal?: string | null; startDate?: string | null; endDate?: string | null }[];
}): Promise<Result> {
  try {
    await gate(input.projectId);
    await createSprintsBulk(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' }; }
}
```

- [ ] **Step 4 — run tests + typecheck** → PASS.

- [ ] **Step 5 — commit:**
```bash
git add modules/sprints/server-actions.ts modules/sprints/__tests__/server-actions.test.ts
git commit -m "feat(sprints): org-gated sprint server actions"
```

---

## Task 4: AI — generate sprint plan + brainstorm sprint tasks

**Files:** Modify `modules/ai/project-assist.ts`, `app/api/ai/project-assist/route.ts`; Test `modules/ai/__tests__/project-assist.test.ts` (extend existing if present, else create).

- [ ] **Step 1 — add AI functions** to `modules/ai/project-assist.ts` (mirror `draftPhases` / `suggestDeliverables` exactly — same `complete`/`extractJson`/`clampStr`/`clampInt`/`asArray` helpers, `claude-sonnet-4-5`, JSON-only, reply in input language, output clamped):

```ts
/* ================================================================ sprints == */

export type GenerateSprintPlanInput = { name: string; brief?: string; goals?: string[]; duration?: number };
export type DraftSprint = { name: string; goal?: string };
export type GenerateSprintPlanResult = { sprints: DraftSprint[] };

const SPRINT_PLAN_SYSTEM = `You break a company's internship project into a sequence of sprints (1–2 week iterations) an intern works through.

Rules:
- Between 2 and 8 sprints, in order.
- Each sprint: a short name (under 80 chars) and a one-line goal (under 160 chars) describing the outcome of that sprint.
- Make them specific to the project and its goals, not generic.

Reply in the SAME language as the input. Return JSON only:

{ "sprints": [ { "name": "...", "goal": "..." } ] }`;

export async function generateSprintPlan(input: GenerateSprintPlanInput): Promise<GenerateSprintPlanResult> {
  const user = [
    `Project: ${input.name}`,
    input.brief ? `Brief: ${input.brief}` : null,
    input.goals?.length ? `Goals:\n- ${input.goals.join('\n- ')}` : null,
    input.duration ? `Duration: ${input.duration} weeks` : null,
  ].filter(Boolean).join('\n');
  const text = await complete(SPRINT_PLAN_SYSTEM, user, 800);
  const raw = extractJson<{ sprints?: unknown }>(text);
  const sprints: DraftSprint[] = [];
  for (const s of asArray(raw.sprints).slice(0, 8)) {
    const obj = s as { name?: unknown; goal?: unknown };
    const name = clampStr(obj.name, 80);
    if (!name) continue;
    const goal = clampStr(obj.goal, 160);
    sprints.push({ name, ...(goal ? { goal } : {}) });
  }
  if (sprints.length === 0) throw new Error('AI returned no usable sprints');
  return { sprints };
}

export type BrainstormSprintTasksInput = { sprintName: string; sprintGoal?: string; projectName: string; brief?: string };
export type DraftSprintTask = { title: string; description?: string };
export type BrainstormSprintTasksResult = { tasks: DraftSprintTask[] };

const SPRINT_TASKS_SYSTEM = `You propose the concrete tasks an intern does to complete one sprint of an internship project.

Rules:
- Between 3 and 8 tasks, ordered logically.
- Each: a short imperative title (under 120 chars) and an optional one-line description (under 240 chars).
- Specific and actionable for THIS sprint's goal — not generic filler.

Reply in the SAME language as the input. Return JSON only:

{ "tasks": [ { "title": "...", "description": "..." } ] }`;

export async function brainstormSprintTasks(input: BrainstormSprintTasksInput): Promise<BrainstormSprintTasksResult> {
  const user = [
    `Project: ${input.projectName}`,
    input.brief ? `Brief: ${input.brief}` : null,
    `Sprint: ${input.sprintName}`,
    input.sprintGoal ? `Sprint goal: ${input.sprintGoal}` : null,
  ].filter(Boolean).join('\n');
  const text = await complete(SPRINT_TASKS_SYSTEM, user, 900);
  const raw = extractJson<{ tasks?: unknown }>(text);
  const tasks: DraftSprintTask[] = [];
  for (const t of asArray(raw.tasks).slice(0, 8)) {
    const obj = t as { title?: unknown; description?: unknown };
    const title = clampStr(obj.title, 120);
    if (!title) continue;
    const description = clampStr(obj.description, 240);
    tasks.push({ title, ...(description ? { description } : {}) });
  }
  if (tasks.length === 0) throw new Error('AI returned no usable tasks');
  return { tasks };
}
```

- [ ] **Step 2 — extend the route** `app/api/ai/project-assist/route.ts`: import the two new fns; add cases to `runAssist`:

```ts
    case 'sprint-plan': {
      const name = str(body.name);
      if (!name) throw new BadRequestError('name_required');
      return generateSprintPlan({ name, brief: str(body.brief) || undefined, goals: strArray(body.goals), duration: num(body.duration) });
    }
    case 'sprint-tasks': {
      const sprintName = str(body.sprintName);
      const projectName = str(body.projectName);
      if (!sprintName || !projectName) throw new BadRequestError('fields_required');
      return brainstormSprintTasks({ sprintName, sprintGoal: str(body.sprintGoal) || undefined, projectName, brief: str(body.brief) || undefined });
    }
```

(The route already does `requireSession` + the `ai-project-assist` rate limit + 400/502 handling — reuse it as-is.)

- [ ] **Step 3 — tests:** add unit tests for `generateSprintPlan`/`brainstormSprintTasks` mocking the Anthropic client (mirror how the existing project-assist tests stub `messages.create` to return canned JSON; assert parse + clamp + the "no usable …" throw). Run → PASS. `pnpm typecheck` → PASS.

- [ ] **Step 4 — commit:**
```bash
git add modules/ai/project-assist.ts app/api/ai/project-assist/route.ts modules/ai/__tests__/project-assist.test.ts
git commit -m "feat(ai): generate sprint plan + brainstorm sprint tasks"
```

---

## Task 5: Company project — Sprints section (UI)

**Files:** Create `app/[locale]/(platform)/company/projects/[projectId]/_sprints-section.tsx`; Modify `…/[projectId]/page.tsx`.

- [ ] **Step 1 — read** the current `[projectId]/page.tsx` to match its layout/section conventions + how it gets `project` + the viewer's role, and read an existing AI-assist client component (e.g. the project-create flow's assist buttons) to mirror the `fetch('/api/ai/project-assist', { kind })` + draft-review pattern.

- [ ] **Step 2 — build `_sprints-section.tsx`** (client). Props: `projectId`, `sprints: ProjectSprint[]`, label bag. Renders:
  - The ordered sprint list — each row: name + goal + task-count, with edit/delete and up/down reorder (calls `reorderSprintsAction`).
  - **Add sprint** (inline form → `createSprintAction`).
  - **Generate plan with AI** — `fetch('/api/ai/project-assist', {kind:'sprint-plan', name, brief, goals, duration})` → show the returned `sprints` as an editable review list → **Accept** → `applySprintPlanAction`. Errors surface a retry; manual add always works.
  - Per-sprint **Brainstorm tasks** — `fetch(..., {kind:'sprint-tasks', sprintName, sprintGoal, projectName, brief})` → editable task list → **Save** → `setSprintTasksAction`. Also allow manual add/edit/remove of blueprint tasks.
  - Use `useTransition` + `router.refresh()` after each mutation; Tailwind CSS-var tokens (`var(--surface)`, `var(--border-color)`, `var(--brand-500)`, etc.), matching sibling components.

- [ ] **Step 3 — wire into the page:** in `[projectId]/page.tsx`, fetch `const sprints = await getProjectSprints(project.id)` and render `<SprintsSection projectId={project.id} sprints={sprints} labels={…} />` in a new section (only for owners/admins — the page already establishes the viewer's manage rights; gate the section on that).

- [ ] **Step 4 — verify:** `pnpm typecheck` + `pnpm build` → PASS. Browser (dev server, local DB) as `dazzsemi@gmail.com` → open the Dazz Studio "Brand audit" project → add a sprint manually; "Generate plan" returns sprints; "Brainstorm tasks" fills a sprint. `preview_snapshot` + `preview_console_logs`.

- [ ] **Step 5 — commit:**
```bash
git add "app/[locale]/(platform)/company/projects/[projectId]/_sprints-section.tsx" "app/[locale]/(platform)/company/projects/[projectId]/page.tsx"
git commit -m "feat(company): project Sprints section (manual + AI)"
```

---

## Task 6: i18n FR/EN

**Files:** Modify `locales/fr.json`, `locales/en.json`.

- [ ] **Step 1 — add a `sprints` namespace** (merge; keep FR/EN key parity): title, addSprint, sprintName, sprintGoal, generatePlan, generating, accept, regenerate, brainstormTasks, taskTitle, save, delete, moveUp, moveDown, empty, aiError, taskCount (ICU plural). FR is source; EN mirrors.

- [ ] **Step 2 — verify:** `node -e "JSON.parse(require('fs').readFileSync('locales/fr.json','utf8'));JSON.parse(require('fs').readFileSync('locales/en.json','utf8'));console.log('ok')"` + `pnpm build` (no missing-key/type errors).

- [ ] **Step 3 — commit:**
```bash
git add locales/fr.json locales/en.json
git commit -m "i18n(sprints): FR/EN strings"
```

---

## Task 7: Final verification (Plan 1)

- [ ] `pnpm vitest run` → all PASS (expect ~+8–12 new tests).
- [ ] `pnpm build` + `pnpm lint` → clean.
- [ ] Browser walkthrough (local DB, dazzsemi → Brand audit project): manual sprint add; AI plan generate → accept; per-sprint AI task brainstorm → save; reorder + delete.
- [ ] Report test-count delta + concerns. Then Plan 2 (workspace seeding + kanban-by-sprint) follows.

---

## Self-Review (author)

- **Spec coverage (Plan-1 scope):** `project_sprints` table (T1), service+queries (T2), org-gated actions (T3), AI plan + task brainstorm reusing the project-assist pattern/route (T4), company Sprints UI manual+AI (T5), i18n (T6). Plan-2 items (`tasks.sprintId`, seeding, kanban) intentionally excluded.
- **Type consistency:** `SprintTaskBlueprint {title, description?}` from the schema is the single shape used by the service, the `setSprintTasks` action, and the AI `DraftSprintTask`. `ProjectSprint` returned by queries → consumed by the UI. Action input shapes match the service signatures.
- **No placeholders:** migration/schema/service/AI carry complete code; UI + AI-tests reference the concrete sibling patterns to mirror and are gated by build + browser verification + mocked-client unit tests.
- **Auth:** every mutation + the apply-plan action gate via `requireOrgRole(['owner','admin'])` on the project's org (IDOR-safe); the AI route transforms client-provided text only (no DB read → no IDOR there), mirroring today's assists.
