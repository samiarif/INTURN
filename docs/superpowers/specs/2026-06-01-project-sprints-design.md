# Project Sprints — Design (decompose a project into sprints → tasks)

**Date:** 2026-06-01
**Status:** Approved (design agreed; ready for spec review → plans)
**Context:** inturn — company `projects` already have a coarse `phases` arc + `goals` + `brief`; `tasks` are workspace-scoped (per-intern kanban). There is an existing AI-assist pattern (`modules/ai/project-assist.ts` + `app/api/ai/*`, rate-limited via `ai-project-assist`).

---

## 1. Motivation

A company should be able to **decompose a project into sprints** (manual or AI-generated) after the project is created and configured, then **decompose each sprint into tasks** (AI-brainstormed). Each intern placed on the project gets those sprints' tasks seeded into their workspace kanban as a running starting point they then own.

## 2. Locked decisions

- **Sprints are a project-level blueprint** the company authors at/after project setup. (NOT per-intern at authoring time.)
- **Seed once, intern owns their tasks.** The blueprint is *copied* into a workspace (on placement, or via an "Apply plan" button); after that the intern owns those tasks. **No two-way sync.**
- **Interns own their tasks, follow the company's sprint structure** (they do not fork/rename the company's sprints in v1 — no `workspace_sprints` table).
- **Phases stay as-is** — they drive the university phase-clock (`computeCurrentPhase`, `getStudentInternshipSnapshot`). Sprints are a new, finer, *actionable* layer that holds tasks; phases remain the coarse time arc. The two are independent in v1.
- **Manual-first; AI is an assist** — every sprint/task can be created by hand; AI generation is optional and always editable.

## 3. Data model — migration `0021`

**New table `project_sprints`** (project-level blueprint):
```ts
project_sprints {
  id          uuid pk default random
  projectId   uuid not null → projects.id (on delete cascade)
  name        text not null
  goal        text                       // one-line sprint objective
  orderIndex  integer not null default 0 // sprint order within the project
  startDate   date                       // optional
  endDate     date                       // optional
  taskBlueprint jsonb $type<{ title: string; description?: string }[]> not null default []
  createdAt / updatedAt timestamps
}
// index on (projectId, orderIndex)
```

**`tasks.sprintId`** — new nullable `uuid` → `project_sprints.id`, `ON DELETE SET NULL`. A workspace task may belong to a sprint (of its workspace's project) or be unsorted (`null`). The kanban groups by sprint.

No `workspace_sprints` table in v1 (interns follow the company sprint set; they own tasks within it).

## 4. AI touchpoints

New `modules/ai/sprint-planner.ts`, reusing the Anthropic-SDK setup + structured-output + error handling already in `modules/ai/project-assist.ts`, gated by the existing `ai-project-assist` rate-limit bucket.

1. **`generateSprintPlan(project)`** → `{ sprints: { name, goal, startDate?, endDate? }[] }` from the project's `brief` + `goals` + `startDate`/`endDate`. The company reviews, edits, and accepts (creates `project_sprints` rows).
2. **`brainstormSprintTasks({ sprint, project })`** → `{ tasks: { title, description? }[] }` from the sprint's `name`/`goal` + project context. The company keeps/edits/adds/regenerates; the result is saved to the sprint's `taskBlueprint`.

Both exposed as `'use server'` actions that re-validate company ownership of the project (`requireOrgRole(['owner','admin'])` on the project's org) and apply the rate limit.

## 5. Surfaces

- **Company — `app/[locale]/(platform)/company/projects/[projectId]`**: a **Sprints** section.
  - List of sprints (ordered), each showing name + goal + its blueprint task count.
  - **Add sprint** (manual), **reorder** (drag / up-down), **edit**, **delete**.
  - **Generate plan with AI** — fills the sprint list from the project (review-before-save).
  - Per-sprint **Brainstorm tasks** — AI fills/extends that sprint's `taskBlueprint`; editable list.
- **Intern — workspace kanban** (existing task board): **group tasks by sprint** (sections/columns labeled by sprint name, plus an "Unsorted" group for `sprintId = null`). When the board has no sprint-tasks yet, show an **"Apply sprint plan"** button.

## 6. Seeding (blueprint → workspace)

`seedWorkspaceFromSprints(workspaceId)`:
- Resolve the workspace's project (via `workspaces.internshipId → internships.projectId`).
- For each `project_sprints` row (in order), insert a workspace `task` per `taskBlueprint` entry with `sprintId` set, `status: 'todo'`, ascending `order`.
- **Guarded:** only seeds if the workspace has no tasks with a `sprintId` yet (re-running / "Apply plan" twice does not duplicate).
- **Called** (a) when a workspace is created (intern placement) if the project has sprints, and (b) from the "Apply sprint plan" button.

## 7. Build decomposition — 2 plans (build in order)

1. **Project sprint planning** (company side): migration `0021` (`project_sprints`) + schema; sprint service + CRUD/reorder server actions; `modules/ai/sprint-planner.ts` + the two AI actions; the company project **Sprints** UI; i18n.
2. **Workspace execution**: `tasks.sprintId` migration + schema; `seedWorkspaceFromSprints` + the placement hook + "Apply plan" action; kanban grouped by sprint; i18n.

## 8. Edge cases & invariants

- A task's `sprintId` must reference a sprint of its own workspace's project — enforced in app logic (seed/assign only from the workspace's project sprints); the DB FK only guarantees a valid sprint, and `ON DELETE SET NULL` keeps tasks alive if the company deletes a sprint.
- Deleting a project sprint orphans copied workspace tasks to "Unsorted" (sprintId → null) — they are not deleted.
- Re-seeding is idempotent (guard on existing sprint-tasks).
- AI failures degrade gracefully — the manual path always works; an AI error surfaces a retry, never blocks sprint/task creation.
- Authorization: all sprint mutations + AI actions gated by `requireOrgRole(['owner','admin'])` on the project's org (IDOR-safe).

## 9. Testing

- **Service:** sprint CRUD + reorder; `seedWorkspaceFromSprints` (copies blueprint → tasks with sprintId; idempotent guard; resolves project via internship).
- **AI:** `generateSprintPlan` / `brainstormSprintTasks` shape (mock the Anthropic client, assert structured parse + validation).
- **Actions:** ownership gate + rate-limit on the AI + mutation actions.
- **UI:** verified via build + preview (company sprints section; kanban grouped by sprint; Apply-plan seeding).

## 10. v1 non-goals (deferred)

- `workspace_sprints` / intern-editable sprint structure (interns fork the plan).
- Two-way sync between the project plan and seeded workspaces.
- Linking sprints to the existing `phases` arc (kept independent in v1).
- Conversational/iterative AI task brainstorming (v1 is generate → edit → regenerate, not a chat).
- Sprint-level progress analytics / burndown.
