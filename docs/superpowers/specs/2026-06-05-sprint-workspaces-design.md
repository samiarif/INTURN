# Sprint-Aware Intern Workspaces — Design (Plan 2 of the Project Sprints arc)

**Date:** 2026-06-05
**Status:** Approved (design agreed; ready for spec review → plan → build)
**Builds on:** `2026-06-01-project-sprints-design.md` (Plan 1 shipped Plan 1 of that doc: company-side sprint planning + AI). This spec scopes Plan 2: bridging the company's sprint blueprint into the intern's workspace + adapting the kanban to be sprint-aware.

---

## 1. Motivation

Plan 1 lets a company decompose a project into sprints with task blueprints. But the **intern's workspace doesn't know sprints exist** — their kanban still shows To do / In progress / In review / Done with no sprint context, no current-sprint banner, no way to filter or group. The intern can't see "I'm in Sprint 2 of 3 — Discovery", which means the structure the company invested in is invisible at the place it matters most.

Sam (2026-06-05): *"the intern should know that he is in the n sprint... tasks should be a part of a sprint?"*

## 2. Locked decisions (from the design conversation)

1. **Natural state, no toggle.** A project with 0 sprints behaves like today (status-only kanban). A project with sprints lights up the sprint-aware workspace. The state of the data IS the mode; no setting to choose.
2. **`tasks.sprintId` is nullable.** Null = "Unsorted" (existing tasks pre-seeding, or tasks the intern intentionally parks outside any sprint). Set = belongs to that sprint.
3. **Intern follows the company's sprint structure** (no `workspace_sprints` table, no intern-side sprint create/rename/delete). They MOVE tasks between sprints; sprint shape stays company-owned.
4. **Seed once, intern owns.** The blueprint is copied into a workspace one time; no two-way sync.
5. **Two intern views:** default filtered (one sprint at a time, kanban) + "All sprints" stacked sections (one mini-kanban per sprint).
6. **Active sprint resolved by date first, then by progress fallback** — pure function, no manual "mark active".

## 3. Data model — migration `0022`

One additive, idempotent column:
```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS sprint_id uuid
  REFERENCES project_sprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_workspace_sprint_idx
  ON tasks(workspace_id, sprint_id);
```

Drizzle schema (`db/schema/tasks.ts`):
```ts
sprintId: uuid('sprint_id').references(() => projectSprints.id, { onDelete: 'set null' }),
```

**Invariant** (enforced in app code, not DB — same convention as elsewhere): a task's `sprintId`, when non-null, must be a sprint of that task's workspace's project. The DB FK only guarantees a valid sprint; the seed + assign paths must check the project link.

## 4. The active-sprint resolver

Pure function `resolveActiveSprintIndex(sprints, today, taskStatusBySprint)` returning the `orderIndex` of the active sprint (or `null` if there are no sprints).

```
1. If today is between any sprint's startDate and endDate → that sprint.
   Tie-break (multiple match → overlapping dates): the LOWEST orderIndex.
2. If no sprint matches by date → the FIRST sprint that has any non-done task.
3. If every sprint is fully done (or has no tasks at all) → the LAST sprint.
```

This handles:
- No dates set → falls straight to (2) — still works.
- Project not started yet → all sprints are "future"; rule (2) picks the first one.
- Between sprints (dates have gaps) → (2) picks the first incomplete.
- Project finished → (3) lands on the last sprint instead of nothing.

`taskStatusBySprint: Map<sprintId, { total: number; done: number }>` is built from the workspace's tasks; "done" = `status === 'done'`.

## 5. Seeding (company blueprint → workspace tasks)

`seedWorkspaceFromSprints(workspaceId)`:
1. Resolve the workspace's `projectId` (via `workspaces.internshipId → internships.projectId`).
2. Load `project_sprints` for the project (ordered).
3. **Idempotency guard** — if the workspace already has any task with `sprintId IS NOT NULL`, return immediately (no-op). One-time seeding.
4. For each sprint, for each `taskBlueprint` entry, insert a `tasks` row: `workspaceId`, `sprintId`, `title`, `description`, `status: 'todo'`, ascending `order`.

**Called from two places:**
- **Workspace creation** (intern placement / application acceptance). If the project has sprints, seed automatically.
- **"Apply sprint plan" button** in the workspace UI — for workspaces that exist already (today's seeded demo workspaces, anything created before Plan 2 ships). Same idempotency guard, so clicking twice does nothing destructive.

**What's NOT included** (deferred non-goal): auto-flowing new sprints added by the company AFTER the workspace was seeded. The intern's workspace is its own copy. A "Re-apply" follow-up button can land later if needed.

## 6. Intern surfaces

The intern's existing Tasks page already shows the kanban (`board / list / calendar` modes; we're focused on **board** here). The change wraps it, conditionally.

### 6.1 Decision at the top of the page

```
const sprints = await getProjectSprints(project.id);
// → []  : render today's kanban exactly, untouched
// → [...]: render the sprint-aware experience below
```

Zero behaviour change for projects without sprints. That's the whole point of "natural state".

### 6.2 Sprint-aware experience (when sprints exist)

**A. Sprint banner** at the top of the Tasks page:
```
[Sprint 2 of 3] — Discovery & audit            Week 4 → Week 7 · Active now
Goal: Interview 3 stakeholders, surface brand gaps
```
- "Active now" badge only when the current view matches the resolved active sprint.
- When view = a non-active sprint, badge shows "Past" / "Upcoming" / "" as appropriate.

**B. Sprint switcher** (tabs below the banner):
```
[ Sprint 1 ]  [• Sprint 2 ]  [ Sprint 3 ]  [ Unsorted ]  [ All sprints ]
```
- Default selected = active sprint (per the resolver). Bullet/dot on the active one.
- `Unsorted` tab appears only when there's at least one task with `sprintId = null`.
- View choice persists per workspace (URL `?sprint=<id|all|unsorted>` — bookmarkable, shareable; defaults to active on first load).

**C. Filtered view** (one sprint selected — the default):
- The existing kanban (To do / In progress / In review / Done), scoped to that sprint's tasks.
- New-task creation defaults to the currently-viewed sprint's `sprintId`.

**D. "All sprints" view**:
- Stacked **sections**, one per sprint, in order. Each section: sprint header (name + goal + status pill: Active / Upcoming / Past), then the FULL kanban (same 4 columns) scoped to that sprint.
- "Unsorted" is the last section, only when non-empty.
- Vertical scroll-heavy by design; same kanban affordances inside each section.

**E. Task badges** (across both views): each task card shows a small sprint chip (e.g., "S2") so context isn't lost when scrolling through the All view or when looking at a task in isolation.

### 6.3 Empty / "Apply plan" affordance

A workspace whose project has sprints but no seeded tasks (`tasks.sprintId IS NULL for all rows`, or no tasks at all) shows a **call-out above the kanban**:
> *Your supervisor has set up 3 sprints for this project.* `[Apply sprint plan]`

Clicking the button calls `applySprintPlanAction({ workspaceId })` → seeds + refreshes. Auto-seeding on placement (§5) means this affordance mostly serves pre-existing workspaces.

### 6.4 Task → sprint reassignment

In v1, the intern can change a task's `sprintId` via the task detail panel (a Sprint dropdown next to Status/Priority). Drag-from-one-sprint-section-to-another is a v1.1 (see Non-goals).

## 7. Edge cases & invariants

- **Project deletes a sprint** → tasks in workspaces fall to `sprintId = null` automatically (FK `ON DELETE SET NULL`). Those tasks appear under "Unsorted" — never deleted.
- **Workspace seeded before sprints existed** → tasks have `sprintId = null`; the "Apply sprint plan" call-out appears, intern can pull the plan in. Existing tasks stay Unsorted unless the intern moves them.
- **Re-applying** — the idempotency guard (§5.3) ensures no duplication: if ANY sprint task exists in the workspace, re-apply is a no-op. (Trade-off: a workspace that pulled the plan early, then the company added Sprint 4 later, will NOT auto-pick up Sprint 4. That's the "seed once" trade we accepted.)
- **All sprints completed** → active resolver lands on the last sprint (§4.3); banner shows "Past" / "Project complete" badge.
- **Reassigning a task to a sprint of a different project** is prevented in the action layer (validate target sprint belongs to this workspace's project). DB FK alone doesn't catch this.
- **No sprints AT ALL on the project** — the page never branches into the sprint-aware experience. 100% identical to today.

## 8. Build decomposition — Plan 2 tasks (overview)

1. Migration `0022` + schema (`tasks.sprintId`).
2. `resolveActiveSprintIndex` pure resolver + unit tests.
3. `seedWorkspaceFromSprints` service + idempotency + project-link integrity.
4. Placement hook (auto-seed on workspace create when project has sprints) + `applySprintPlanAction`.
5. Workspace queries: `getSprintsForWorkspace(workspaceId)`, `getTaskCountsBySprint(workspaceId)`.
6. Task action: `setTaskSprintAction(taskId, sprintId|null)` with project-membership validation.
7. Intern Tasks UI — banner + switcher + URL-persisted view + filtered kanban + sprint chip on cards.
8. Intern Tasks UI — "All sprints" stacked sections + Unsorted section.
9. "Apply sprint plan" call-out + action wire-up.
10. i18n FR/EN for all new surfaces.
11. Seed update — give Yasmine or sami.arif a small sprint plan + seeded tasks so the demo shows the sprint-aware experience out of the box.
12. Final verification (tests + build + lint + browser walkthrough).

Sized similarly to Plan 1.

## 9. Non-goals (deferred)

- **`workspace_sprints` table / intern-edits-sprints** — sprint shape stays company-owned (locked decision).
- **Two-way sync** between project plan and workspace — one-shot seed only.
- **Cross-sprint drag-and-drop** in the All view — assign via task detail in v1.
- **Sprint analytics / burndown / progress dashboards** — separate milestone if we want it.
- **Notifying the intern when a new sprint becomes active** — a quiet visual change in v1; an in-app/email notification can come later.
- **Auto-flowing sprints added AFTER initial seed** — out of scope; a "Re-apply" UX can land later.

## 10. Testing

- **Resolver** (`resolveActiveSprintIndex`): each of the 3 rules + tie-break; "no sprints" → null.
- **Service** (`seedWorkspaceFromSprints`): copies blueprint → tasks with sprintId; idempotency guard; resolves projectId via internship; no-ops when project has no sprints.
- **Action** (`setTaskSprintAction`): membership gate (intern of the workspace, or workspace org owner/admin); rejects target sprint that doesn't belong to this workspace's project; null clears.
- **Queries:** `getSprintsForWorkspace` returns the project's sprints in order; `getTaskCountsBySprint` tallies by status correctly.
- **UI:** verified via build + preview (intern board with sprints + without — backward compat is the must-pass; All view sections render; "Apply plan" works for an unseeded workspace).
