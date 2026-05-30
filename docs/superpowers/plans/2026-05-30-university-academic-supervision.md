# University Product — Academic Supervision & Review Loop (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deferred *rapport académique* review loop on top of Plan 1's shipped foundation — a dedicated `academic_report_comments` table, a shared review state-machine extracted from deliverables, the `modules/academic-reports/` service + queries + server-actions (mirroring deliverables, keyed by student+university NOT workspace), events + notifications + FR/EN report emails, a `report` upload kind, the student `/intern/university` surface and the coordinator `/university/students/[studentId]` review surface, dashboard "awaiting review" polish, a demo seed (coordinator persona + placed student + a submitted report), small Plan-1 hardening carry-forwards, and FR/EN i18n. NO new foundation — `academic_reports` (schema), `requireUniversityRole`, `getStudentInternshipSnapshot`, `getManagedStudents`, the `university` role + dashboard already shipped in Plan 1.

**Architecture:** *Extend, don't duplicate.* The rapport loop **mirrors** the deliverables versioning + review pattern but is keyed by `(studentUserId, universityOrgId)` and stays **fully isolated** from company workspace data — the coordinator only reaches a student's internship via the existing firewalled `getStudentInternshipSnapshot`, NEVER `canViewWorkspace`. Report comments live in their **own** `academic_report_comments` table (NOT the company `comments` table, whose `workspace_id` is NOT NULL — a rapport has no workspace), carry NO `workspaceId`, and matche the firewall design. The lifecycle engine is extracted once into a domain-neutral `modules/review/state-machine.ts` and reused by both deliverables and reports. The report version-stack/review-bar UI is copy-adapted from `modules/workspace/components/deliverables-*.tsx` but uses Tailwind tokens directly (NOT the workspace-scoped `dv-*` CSS) so the surfaces stay self-contained.

**Tech Stack:** Next.js 16 (App Router, async params), React 19, TypeScript strict, Drizzle ORM on Neon-http (no transactions — write-ordering instead), Clerk auth, next-intl (fr default unprefixed / en `/en`), Vitest, Tailwind v4 + CSS-variable tokens. Package manager is **pnpm**.

---

## Source spec

`docs/superpowers/specs/2026-05-30-university-product-foundation-design.md` (approved). Read it once before starting — in particular the sections **"The rapport académique review loop"**, **"UI surfaces"** (student `/intern/university`, coordinator `/university/students/[studentId]`), **"Events + notifications"**, and the **"Component reuse map"**. This plan covers spec rollout **stage 4 (the report loop) + the report UI surfaces + dashboard polish**. Plan 1 (`docs/superpowers/plans/2026-05-30-university-foundation-provisioning.md`) already shipped stages 1–3 + the isolation primitives; read its "Out of scope (Plan 2)" section — that is exactly this plan's scope.

## What Plan 1 already shipped (do NOT rebuild)

On `main`, verified by reading the tree:
- `academic_reports` table + `AcademicReportRevision` type (`db/schema/academic-reports.ts`) — columns id, studentUserId→users, universityOrgId→organizations (cascade), internshipId→internships (set null, nullable), title, description, fileUrl/fileName/fileType, status enum `draft|submitted|approved|revision-requested`, feedback, version, submittedAt, dueDate, revisionHistory jsonb, timestamps. **NO comments column** (deferred to this plan). Exported from `db/schema/index.ts`.
- Migration `0017_university_foundation.sql` (added `organizations.kind` + the `academic_reports` table; explicitly deferred `comments.report_id`). **Next migration number is `0018`.**
- `requireUniversityRole` (`modules/auth/session.ts:134`), global `university` role (`modules/auth/types.ts`), `organization_members` `student` role.
- `getStudentInternshipSnapshot(studentUserId)` (firewall) + `getManagedStudents(universityOrgId)` + `listUniversities()` (`modules/university/queries.ts`).
- `/university/dashboard` (roster, `app/[locale]/(platform)/university/dashboard/page.tsx`), `/university/layout.tsx` (gate), `/admin/universities`, provisioning actions, `inviteStudentAction`.
- `university.dashboard.*` + `university.admin.*` i18n namespaces (en.json:1504, fr.json parallel). The intern sidebar already conditionally renders a `/intern/university` link via `hasStudentMembership` (wired in `app/[locale]/(platform)/layout.tsx` + `components/platform-sidebar.tsx`).

## Critical execution guardrails (read before Task 1)

- **Run all commands from `/Users/mac/code/inturn-hub/inturn`** (the shell cwd persists as the PARENT — always `cd inturn/` first). Package manager is **pnpm**, NOT npm.
- Tests/typecheck/lint: `pnpm test` (vitest run), `pnpm typecheck` (tsc --noEmit), `pnpm lint`, `pnpm build`. If a Neon/network step hangs, prefix `NODE_OPTIONS="--dns-result-order=ipv4first"`.
- **ADDITIVE ONLY.** Never delete working behavior, routes, i18n keys, form schemas, or passing tests. The deliverables module is currently green and **must stay green** — the Task 2 state-machine extraction re-points its imports without changing behavior, and **MOVES** (does not delete) its state-machine tests to cover the shared module.
- **Migrations are hand-rolled** (see `scripts/migrate.ts` + `db/migrations/README.md`): the drizzle journal (`db/migrations/meta/`) is gitignored and out of sync — NOT authoritative. **Do NOT run `drizzle-kit generate`.** Hand-write the next-numbered `.sql` (after `0017` → **`0018`**, verified by `ls db/migrations/`) with `BEGIN; … COMMIT;` and `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` so re-runs are no-ops. Model the style on `0016`/`0017`.
- **Report comments = a DEDICATED `academic_report_comments` table — NOT the company `comments` table.** The `comments` table's `workspace_id` is `NOT NULL` (`db/schema/comments.ts:12`); a rapport has no workspace. A dedicated table keeps report threads physically isolated from company workspace comments, matching the firewall. Report comments carry **NO `workspaceId`**.
- **The report-review loop must NEVER touch `canViewWorkspace` or company workspace tables.** The coordinator reaches a student's internship phase ONLY through `getStudentInternshipSnapshot` (already firewalled). No new read may select `tasks`, `deliverables`, workspace `comments`, `projects.brief`, or `projects.goals`.
- **Drizzle `text(..., {enum:[...]})` is TS-only, NOT a DB CHECK constraint.** The new `academic_report_comments` table has no enum columns, so the SQL is a plain `CREATE TABLE` + index. `notifications.type` is a bare `text` (no enum) so new notification types need no migration.
- **No transactions** on neon-http: order writes (the row write first, then `recordEvent` fire-and-forget — `recordEvent` already dispatches notifications via `void dispatchNotificationsFor`). Best-effort external calls wrapped in try/catch.
- **Staging hazard:** `locales/en.json` / `locales/fr.json` may carry unrelated uncommitted hunks. Stage only this feature's hunks — `git add <explicit file>` for files this plan owns exclusively, and `git add -p locales/en.json locales/fr.json` for the new `academicReport` namespace + the `university.*` additions. **Never `git add -A` or `git add .`.** If a locale diff is tangled, stop and ask Sam.
- Commit per task (Conventional Commits), trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Branch is `feat/university-academic-supervision` (already checked out). Do NOT push — the lead reviews + merges.
- Read `node_modules/next/dist/docs/` before any framework-shaped change (this is NOT stock Next.js).

## File map

**Create**
- `db/schema/academic-report-comments.ts` — new `academic_report_comments` table + types
- `db/migrations/0018_academic_report_comments.sql` — the one idempotent migration
- `modules/review/state-machine.ts` — domain-neutral review state-machine (lifted from deliverables)
- `modules/review/__tests__/state-machine.test.ts` — MOVED from deliverables, re-pointed at the shared module
- `modules/academic-reports/service.ts` — report lifecycle bookkeeping + comment writes
- `modules/academic-reports/queries.ts` — `getReportForStudent`, `getReportComments`, dashboard counts
- `modules/academic-reports/server-actions.ts` — student + coordinator actions
- `modules/academic-reports/__tests__/service.test.ts`
- `modules/academic-reports/__tests__/server-actions.test.ts`
- `modules/academic-reports/__tests__/queries.test.ts`
- `lib/email/templates/academic-report-submitted.ts` — FR/EN, notify coordinator
- `lib/email/templates/academic-report-reviewed.ts` — FR/EN, notify student (approved | revision)
- `lib/email/templates/__tests__/academic-report.test.ts`
- `modules/academic-reports/components/report-version-stack.tsx` — server component, version stack
- `modules/academic-reports/components/report-review-bar.tsx` — client, coordinator approve/request-revision
- `modules/academic-reports/components/report-upload-zone.tsx` — client, student submit/resubmit (PDF)
- `modules/academic-reports/components/report-comments-thread.tsx` — client, report comment thread
- `app/[locale]/(platform)/intern/university/page.tsx` — student academic-supervision home
- `app/[locale]/(platform)/university/students/[studentId]/page.tsx` — coordinator review surface

**Modify**
- `db/schema/index.ts` — export `academicReportComments` + types
- `modules/deliverables/state-machine.ts` — re-export from the shared module (keep the deliverable-named API)
- `modules/deliverables/service.ts` — import `nextReviewState` from `modules/review` (behavior identical)
- `modules/deliverables/__tests__/` — delete the old `state-machine.test.ts` (moved to `modules/review`); deliverables `service.test.ts` unchanged
- `modules/events/types.ts` — add the three `academicReport.*` event types
- `modules/notifications/dispatcher.ts` — three new dispatcher cases + helpers
- `modules/notifications/__tests__/dispatcher.test.ts` — new cases
- `lib/uploads/allowlist.ts` — add a `report` kind (PDF, sized like cv)
- `app/api/upload/route.ts` — allow `report` kind for intern/admin
- `components/file-drop.tsx` — add `'report'` to `UploadKind`
- `app/[locale]/(platform)/university/dashboard/page.tsx` — "Awaiting your review" group/count + per-row rapport status pill + row link to `/university/students/[studentId]`
- `modules/admin/users/server-actions.ts` — guard `setUserRoleAction` against changing a user whose current role is `university`
- `components/platform-sidebar.tsx` — (optional polish) explicit intern-array construction instead of `splice(5,0,...)`
- `modules/team/authz.ts` — (optional polish) wrap `getViewerMemberships` in `React.cache`
- `scripts/seed.ts` — demo university + coordinator persona + 2 student members (1 placed) + 1 submitted report
- `modules/auth/dev-actions.ts` — `devLoginAction` redirect branch for `university`
- `app/[locale]/(auth)/dev/login/page.tsx` — add the coordinator email to the persona picker
- `locales/en.json`, `locales/fr.json` — new `academicReport` namespace + `university.*` review-surface/dashboard additions

---

## Task 1: Schema — `academic_report_comments` table + migration 0018

**Files:**
- Create: `db/schema/academic-report-comments.ts`
- Modify: `db/schema/index.ts:22` (after the academicReports export block)
- Create: `db/migrations/0018_academic_report_comments.sql`

**Decision (apply + flagged):** report comments get their OWN table, NOT the polymorphic `comments` table. The `comments` table requires `workspace_id` (NOT NULL, `db/schema/comments.ts:12`); a rapport has no workspace. A dedicated table keeps the university↔student thread physically isolated from company workspace comments — structural firewall, not a filter. The table carries `reportId`, `authorId`, `body`, `createdAt` — and crucially **no `workspaceId`**.

- [ ] **Step 1: Create the schema**

Create `db/schema/academic-report-comments.ts` (modeled on `db/schema/comments.ts`, minus `workspaceId`/`taskId`/`deliverableId`):

```ts
import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { academicReports } from './academic-reports';
import { users } from './users';

// The university↔student discussion thread on a rapport académique. A DEDICATED
// table — NOT the company `comments` table, whose workspace_id is NOT NULL (a
// rapport has no workspace). Carries NO workspaceId: report comments are
// physically isolated from company workspace comments, matching the firewall.
export const academicReportComments = pgTable(
  'academic_report_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => academicReports.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('academic_report_comments_report_idx').on(table.reportId)],
);

export type AcademicReportComment = typeof academicReportComments.$inferSelect;
export type NewAcademicReportComment = typeof academicReportComments.$inferInsert;
```

- [ ] **Step 2: Export from the schema barrel**

In `db/schema/index.ts`, add immediately after the `academicReports` export block (line 22, after the closing `} from './academic-reports';`):

```ts
} from './academic-reports';
export {
  academicReportComments,
  type AcademicReportComment,
  type NewAcademicReportComment,
} from './academic-report-comments';
```

- [ ] **Step 3: Hand-write the idempotent migration**

Create `db/migrations/0018_academic_report_comments.sql` (mirrors `0017`'s idempotent style):

```sql
-- 0018: academic_report_comments — the university↔student rapport discussion thread.
-- A DEDICATED table (NOT the company `comments` table, whose workspace_id is NOT
-- NULL — a rapport has no workspace). Carries NO workspace_id: report comments are
-- physically isolated from company workspace comments, matching the firewall design.
-- Additive, idempotent (safe to re-run). Hand-rolled — the drizzle journal is out
-- of sync (see scripts/migrate.ts + db/migrations/README.md). Plan-1 migration 0017
-- deferred this; this is the next number.

BEGIN;

CREATE TABLE IF NOT EXISTS academic_report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES academic_reports(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academic_report_comments_report_idx
  ON academic_report_comments (report_id);

COMMIT;
```

- [ ] **Step 4: Verify the schema typechecks**

Run: `pnpm typecheck`
Expected: PASS (0 errors). `AcademicReportComment` / `NewAcademicReportComment` are exported; `academicReportComments` is importable from `@/db/schema`.

- [ ] **Step 5: Apply the migration (optional, local) + confirm idempotent**

If a local Neon DB is reachable: `cd /Users/mac/code/inturn-hub/inturn && NODE_OPTIONS="--dns-result-order=ipv4first" pnpm db:migrate`, then run it a **second** time — the re-run must be a no-op (every statement guarded by `IF NOT EXISTS`). If the network is blocked locally, skip; the prebuild runner applies it in CI. Do NOT run `drizzle-kit generate`.

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add db/schema/academic-report-comments.ts db/schema/index.ts db/migrations/0018_academic_report_comments.sql
git commit -m "$(cat <<'EOF'
feat(db): academic_report_comments table + migration 0018

A dedicated report-comment table for the university↔student rapport thread
— NOT the company comments table (whose workspace_id is NOT NULL; a rapport
has no workspace). Carries no workspaceId, keeping report threads physically
isolated from company workspace comments per the firewall design. Additive +
idempotent.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extract the shared review state-machine

**Files:**
- Create: `modules/review/state-machine.ts`
- Create: `modules/review/__tests__/state-machine.test.ts` (MOVED from `modules/deliverables/__tests__/state-machine.test.ts`, re-pointed)
- Modify: `modules/deliverables/state-machine.ts` (re-export from the shared module)
- Modify: `modules/deliverables/service.ts:6` (import from `modules/review`)
- Delete: `modules/deliverables/__tests__/state-machine.test.ts` (its coverage moves to `modules/review`)

Lift the pure deliverables state-machine VERBATIM into a domain-neutral `modules/review/state-machine.ts` (`nextReviewState` / `isValidReviewTransition` + `ReviewStatus` / `ReviewAction`), re-point deliverables at it (keeping the deliverable-named exports as thin aliases so nothing else breaks), and MOVE its tests. The machine is already pure — no DB, no deliverable coupling — so this is a rename + relocate. TDD: move the test first (red against the missing module), create the module verbatim, watch green, then re-point deliverables + delete the old test, watch the whole suite stay green.

- [ ] **Step 1: Create the moved test against the not-yet-existing shared module**

Create `modules/review/__tests__/state-machine.test.ts` by copying `modules/deliverables/__tests__/state-machine.test.ts` VERBATIM, then renaming the imported symbols + describe labels from `Deliverable`→`Review`. The full content:

```ts
import { describe, it, expect } from 'vitest';
import {
  isValidReviewTransition,
  nextReviewState,
  type ReviewStatus,
  type ReviewAction,
} from '../state-machine';

// ---------------------------------------------------------------------------
// Pure transition matrix (no DB, no mocks). The review lifecycle (shared by
// deliverables AND academic reports) is:
//   draft → submitted → (approved | revision-requested)
//   revision-requested → submitted  (resubmission, bumps version)
//   approved is terminal.
// ---------------------------------------------------------------------------
describe('isValidReviewTransition', () => {
  const cases: Array<[ReviewStatus, ReviewStatus, boolean]> = [
    // from draft
    ['draft', 'submitted', true],
    ['draft', 'approved', false],
    ['draft', 'revision-requested', false],
    ['draft', 'draft', false],
    // from submitted
    ['submitted', 'approved', true],
    ['submitted', 'revision-requested', true],
    ['submitted', 'submitted', false],
    ['submitted', 'draft', false],
    // from revision-requested
    ['revision-requested', 'submitted', true],
    ['revision-requested', 'approved', false],
    ['revision-requested', 'draft', false],
    ['revision-requested', 'revision-requested', false],
    // from approved (terminal — nothing allowed)
    ['approved', 'submitted', false],
    ['approved', 'revision-requested', false],
    ['approved', 'draft', false],
    ['approved', 'approved', false],
  ];

  for (const [from, to, expected] of cases) {
    it(`${from} → ${to} ${expected ? 'allowed' : 'denied'}`, () => {
      expect(isValidReviewTransition(from, to)).toBe(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// nextReviewState — the pure resolver the service layer delegates to.
// It owns BOTH the transition guard and the version-increment policy.
// ---------------------------------------------------------------------------
describe('nextReviewState — valid actions', () => {
  it('draft + submit → submitted, version unchanged (first submission)', () => {
    expect(nextReviewState({ status: 'draft', version: 1 }, 'submit')).toEqual({
      status: 'submitted',
      version: 1,
    });
  });

  it('submitted + approve → approved, version unchanged', () => {
    expect(nextReviewState({ status: 'submitted', version: 1 }, 'approve')).toEqual({
      status: 'approved',
      version: 1,
    });
  });

  it('submitted + request-revision → revision-requested, version unchanged', () => {
    expect(
      nextReviewState({ status: 'submitted', version: 1 }, 'request-revision'),
    ).toEqual({ status: 'revision-requested', version: 1 });
  });

  it('revision-requested + submit → submitted, version INCREMENTED (resubmission)', () => {
    expect(
      nextReviewState({ status: 'revision-requested', version: 1 }, 'submit'),
    ).toEqual({ status: 'submitted', version: 2 });
  });

  it('version increment compounds across multiple revision cycles', () => {
    // v1 submitted → changes → resubmit (v2) → changes → resubmit (v3)
    let state = { status: 'revision-requested' as ReviewStatus, version: 2 };
    const after = nextReviewState(state, 'submit');
    expect(after).toEqual({ status: 'submitted', version: 3 });

    // approving the resubmitted version keeps that version number
    state = { status: 'submitted', version: after.version };
    expect(nextReviewState(state, 'approve')).toEqual({ status: 'approved', version: 3 });
  });
});

describe('nextReviewState — invalid actions throw', () => {
  const invalid: Array<[ReviewStatus, ReviewAction]> = [
    ['draft', 'approve'],
    ['draft', 'request-revision'],
    ['submitted', 'submit'],
    ['revision-requested', 'approve'],
    ['revision-requested', 'request-revision'],
    ['approved', 'submit'],
    ['approved', 'approve'],
    ['approved', 'request-revision'],
  ];

  for (const [status, action] of invalid) {
    it(`${action} from ${status} throws`, () => {
      expect(() => nextReviewState({ status, version: 1 }, action)).toThrow(
        `Cannot ${action} from status ${status}`,
      );
    });
  }

  it('does not mutate the input state object', () => {
    const input = { status: 'revision-requested' as ReviewStatus, version: 4 };
    nextReviewState(input, 'submit');
    expect(input).toEqual({ status: 'revision-requested', version: 4 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test modules/review/__tests__/state-machine.test.ts`
Expected: FAIL — `modules/review/state-machine.ts` does not exist (module-not-found).

- [ ] **Step 3: Create the shared module — lift VERBATIM from deliverables**

Create `modules/review/state-machine.ts` (the deliverables machine with `Deliverable`→`Review` renames; the error string format `Cannot ${action} from status ${current.status}` is preserved byte-for-byte so existing deliverables tests still pass):

```ts
// Pure review status state machine. Domain-neutral — shared by deliverables
// AND academic reports. Safe to import from client (no DB, no I/O).
export type ReviewStatus = 'draft' | 'submitted' | 'approved' | 'revision-requested';

/** Actions a reviewer/submitter can take in the review lifecycle. */
export type ReviewAction = 'submit' | 'approve' | 'request-revision';

const VALID: Record<ReviewStatus, ReviewStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'revision-requested'],
  'revision-requested': ['submitted'],
  approved: [], // terminal
};

/** Map an action to the status it drives the artifact toward. */
const ACTION_TARGET: Record<ReviewAction, ReviewStatus> = {
  submit: 'submitted',
  approve: 'approved',
  'request-revision': 'revision-requested',
};

export function isValidReviewTransition(from: ReviewStatus, to: ReviewStatus): boolean {
  return VALID[from].includes(to);
}

/**
 * Pure resolver for the review lifecycle. Given the current status + version
 * and an action, returns the next status and version. Single source of truth
 * for the transition rules AND the version-increment policy (resubmit after a
 * revision request = a new version); the service layer calls this and then
 * performs the DB write / revision-history bookkeeping around it.
 *
 * Throws on an invalid transition so callers get a consistent error message.
 *
 * Version rule:
 *   - draft → submitted:               version unchanged (first submission)
 *   - revision-requested → submitted:  version + 1 (a genuine resubmission)
 *   - approve / request-revision:      version unchanged (no new artifact)
 */
export function nextReviewState(
  current: { status: ReviewStatus; version: number },
  action: ReviewAction,
): { status: ReviewStatus; version: number } {
  const to = ACTION_TARGET[action];
  if (!isValidReviewTransition(current.status, to)) {
    throw new Error(`Cannot ${action} from status ${current.status}`);
  }

  const isResubmit = action === 'submit' && current.status === 'revision-requested';
  return {
    status: to,
    version: isResubmit ? current.version + 1 : current.version,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test modules/review/__tests__/state-machine.test.ts`
Expected: PASS (the full transition matrix + version-bump + invalid-throw + no-mutation cases).

- [ ] **Step 5: Re-point `modules/deliverables/state-machine.ts` at the shared module**

Replace the ENTIRE contents of `modules/deliverables/state-machine.ts` with thin re-exports so every existing deliverable importer (`service.ts`, the UI components' type aliases) keeps working unchanged:

```ts
// The deliverable lifecycle is the shared review lifecycle. This module keeps
// the deliverable-named API as thin aliases over modules/review/state-machine
// so existing importers are untouched; the rules live in one place now.
import {
  isValidReviewTransition,
  nextReviewState,
  type ReviewStatus,
  type ReviewAction,
} from '@/modules/review/state-machine';

export type DeliverableStatus = ReviewStatus;
export type DeliverableAction = ReviewAction;

export function isValidDeliverableTransition(
  from: DeliverableStatus,
  to: DeliverableStatus,
): boolean {
  return isValidReviewTransition(from, to);
}

export function nextDeliverableState(
  current: { status: DeliverableStatus; version: number },
  action: DeliverableAction,
): { status: DeliverableStatus; version: number } {
  return nextReviewState(current, action);
}
```

> Note: `modules/deliverables/service.ts:6` imports `{ nextDeliverableState, type DeliverableStatus }` from `./state-machine` — those names still exist as aliases, so **service.ts needs no edit**. (Optionally re-point it to import `nextReviewState` directly from `@/modules/review/state-machine` for clarity; not required. Keep the diff minimal — leave service.ts as-is.)

- [ ] **Step 6: Delete the old deliverables state-machine test (moved, not duplicated)**

```bash
cd /Users/mac/code/inturn-hub/inturn
git rm modules/deliverables/__tests__/state-machine.test.ts
```

> The coverage now lives in `modules/review/__tests__/state-machine.test.ts`. Deliverables' `service.test.ts` (which tests bookkeeping, not the pure machine) is untouched and still imports from `../service` → still green.

- [ ] **Step 7: Run the full suite to verify nothing regressed**

Run: `pnpm test modules/deliverables modules/review && pnpm typecheck`
Expected: PASS. Deliverables `service.test.ts` green against the re-pointed import; the moved state-machine test green under `modules/review`; no other module touched.

- [ ] **Step 8: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/review/state-machine.ts modules/review/__tests__/state-machine.test.ts modules/deliverables/state-machine.ts
git add modules/deliverables/__tests__/state-machine.test.ts
git commit -m "$(cat <<'EOF'
refactor(review): extract shared review state-machine

Lifts the pure deliverable lifecycle into a domain-neutral
modules/review/state-machine.ts (nextReviewState / isValidReviewTransition),
re-points deliverables at it via thin aliases (no behavior change), and moves
the transition-matrix tests to the shared module. The academic-report loop
reuses this same machine.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `modules/academic-reports/` service + queries

**Files:**
- Create: `modules/academic-reports/service.ts`
- Create: `modules/academic-reports/queries.ts`
- Create: `modules/academic-reports/__tests__/service.test.ts`
- Create: `modules/academic-reports/__tests__/queries.test.ts`

Mirror `modules/deliverables/service.ts` bookkeeping, keyed by the report row. Service functions:
- `createReportDraft` — first-create for a `(studentUserId, universityOrgId)` pair (callers check `getReportForStudent` first; the action layer handles "already exists").
- `submitReport` (student) — `draft→submitted` (first, no ghost history) or `revision-requested→submitted` (resubmit: bump version, snapshot prior row newest-first, clear stale feedback) via the shared state-machine; records `academicReport.submitted`.
- `approveReport` (coordinator) — `submitted→approved`; records `academicReport.approved`.
- `requestReportRevision` (coordinator + feedback) — `submitted→revision-requested`; records `academicReport.revision.requested`.
- `addReportComment` — inserts an `academic_report_comments` row (NO event; report comments are their own surface — deliberately omitted from the company activity feed, matching the firewall).

Query functions:
- `getReportForStudent(studentUserId, universityOrgId)` — the latest rapport for the pair (or null).
- `getReportComments(reportId)` — thread joined to authors, oldest-first (a chat reads top-to-bottom).
- `countReportsAwaitingReview(universityOrgId)` + `getReportStatusByStudent(universityOrgId)` — backs the dashboard "awaiting review" count + per-row status pill (Task 9).

TDD throughout, mocking the DB select/insert/update chains exactly as the deliverables `service.test.ts` does.

- [ ] **Step 1: Write the failing service tests**

Create `modules/academic-reports/__tests__/service.test.ts` (mock idiom copied from `modules/deliverables/__tests__/service.test.ts`; the `insert(...).values(...).returning()` chain is added for `createReportDraft` + `addReportComment`):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// db.select(...).limit() returns the current report row from a FIFO queue;
// db.update(...).returning() echoes the set() values merged onto an id;
// db.insert(...).returning() echoes the inserted values. Mirrors the
// deliverables service test harness.
const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  const updateSet = vi.fn();
  const insertValues = vi.fn();

  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    return chain;
  }

  const db = {
    select: vi.fn(() => makeSelectChain()),
    update: vi.fn(() => ({
      set: (vals: Record<string, unknown>) => {
        updateSet(vals);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 'r1', ...vals }])),
          })),
        };
      },
    })),
    insert: vi.fn(() => ({
      values: (vals: Record<string, unknown>) => {
        insertValues(vals);
        return { returning: vi.fn(() => Promise.resolve([{ id: 'new1', ...vals }])) };
      },
    })),
  };

  return { db, selectQueue, updateSet, insertValues };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({ academicReports: {}, academicReportComments: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and'), desc: vi.fn(() => 'desc') }));
vi.mock('@/modules/events/service', () => ({ recordEvent: vi.fn().mockResolvedValue({}) }));

import {
  createReportDraft,
  submitReport,
  approveReport,
  requestReportRevision,
  addReportComment,
} from '../service';
import { recordEvent } from '@/modules/events/service';

function baseReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    studentUserId: 'stu1',
    universityOrgId: 'uni1',
    internshipId: null,
    title: 'Rapport de stage',
    description: null,
    status: 'draft',
    version: 1,
    fileUrl: null,
    fileName: null,
    fileType: null,
    feedback: null,
    submittedAt: null,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    revisionHistory: [],
    ...overrides,
  };
}

const submitInput = {
  reportId: 'r1',
  fileUrl: 'https://blob/rapport.pdf',
  fileName: 'rapport.pdf',
  fileType: 'application/pdf',
  actorId: 'stu1',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

describe('createReportDraft', () => {
  it('inserts a draft report for the student+university pair', async () => {
    await createReportDraft({
      studentUserId: 'stu1',
      universityOrgId: 'uni1',
      internshipId: 'int1',
      title: 'Rapport de stage',
    });
    const vals = mocks.insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(vals).toMatchObject({
      studentUserId: 'stu1',
      universityOrgId: 'uni1',
      internshipId: 'int1',
      status: 'draft',
      version: 1,
    });
  });
});

describe('submitReport', () => {
  it('draft → submitted keeps version 1 and pushes NO history (first submission)', async () => {
    mocks.selectQueue.push([baseReport({ status: 'draft', version: 1 })]);
    const result = await submitReport(submitInput);
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.status).toBe('submitted');
    expect(persisted.version).toBe(1);
    expect(persisted.revisionHistory).toEqual([]);
    expect(persisted.submittedAt).toBeInstanceOf(Date);
    expect(result.status).toBe('submitted');
    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'academicReport.submitted', targetType: 'academicReport', targetId: 'r1' }),
    );
  });

  it('revision-requested → submitted increments version + snapshots prior (newest-first) + clears feedback', async () => {
    mocks.selectQueue.push([
      baseReport({
        status: 'revision-requested',
        version: 1,
        fileUrl: 'https://blob/old.pdf',
        fileName: 'old.pdf',
        fileType: 'application/pdf',
        feedback: 'Add the methodology section',
        revisionHistory: [],
      }),
    ]);
    await submitReport(submitInput);
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.version).toBe(2);
    expect(persisted.feedback).toBeNull();
    const history = persisted.revisionHistory as Array<Record<string, unknown>>;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ version: 1, status: 'revision-requested', fileUrl: 'https://blob/old.pdf' });
    expect(history[0].review).toMatchObject({ state: 'changes', text: 'Add the methodology section' });
  });

  it('prepends new snapshots so history stays newest-first', async () => {
    const older = { version: 1, status: 'revision-requested', fileUrl: 'v1.pdf' };
    mocks.selectQueue.push([baseReport({ status: 'revision-requested', version: 2, revisionHistory: [older] })]);
    await submitReport(submitInput);
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    const history = persisted.revisionHistory as Array<Record<string, unknown>>;
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(2);
    expect(history[1]).toEqual(older);
  });

  it('rejects an invalid transition (submitted → submit) and never writes', async () => {
    mocks.selectQueue.push([baseReport({ status: 'submitted', version: 1 })]);
    await expect(submitReport(submitInput)).rejects.toThrow('Cannot submit from status submitted');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it('rejects when the report does not exist', async () => {
    mocks.selectQueue.push([]);
    await expect(submitReport(submitInput)).rejects.toThrow('Report not found');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('approveReport', () => {
  it('submitted → approved persists status approved + records event', async () => {
    mocks.selectQueue.push([baseReport({ status: 'submitted', version: 2 })]);
    await approveReport({ reportId: 'r1', actorId: 'coord1' });
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.status).toBe('approved');
    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'academicReport.approved', targetType: 'academicReport', targetId: 'r1' }),
    );
  });

  it('rejects approving a draft', async () => {
    mocks.selectQueue.push([baseReport({ status: 'draft' })]);
    await expect(approveReport({ reportId: 'r1', actorId: 'coord1' })).rejects.toThrow(
      'Cannot approve from status draft',
    );
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('requestReportRevision', () => {
  it('submitted → revision-requested persists status + feedback + records event', async () => {
    mocks.selectQueue.push([baseReport({ status: 'submitted', version: 1 })]);
    await requestReportRevision({ reportId: 'r1', feedback: 'Needs sources', actorId: 'coord1' });
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.status).toBe('revision-requested');
    expect(persisted.feedback).toBe('Needs sources');
    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'academicReport.revision.requested', targetId: 'r1' }),
    );
  });

  it('rejects requesting revision on a draft', async () => {
    mocks.selectQueue.push([baseReport({ status: 'draft' })]);
    await expect(
      requestReportRevision({ reportId: 'r1', feedback: 'x', actorId: 'coord1' }),
    ).rejects.toThrow('Cannot request-revision from status draft');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('addReportComment', () => {
  it('inserts a comment row (no workspaceId) and does NOT record an event', async () => {
    await addReportComment({ reportId: 'r1', authorId: 'coord1', body: '  Looks good  ' });
    const vals = mocks.insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(vals).toEqual({ reportId: 'r1', authorId: 'coord1', body: 'Looks good' });
    expect(vals).not.toHaveProperty('workspaceId');
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('rejects an empty body', async () => {
    await expect(addReportComment({ reportId: 'r1', authorId: 'c', body: '   ' })).rejects.toThrow(
      'Comment body is required',
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test modules/academic-reports/__tests__/service.test.ts`
Expected: FAIL — `modules/academic-reports/service.ts` does not exist.

- [ ] **Step 3: Implement the service**

Create `modules/academic-reports/service.ts` (bookkeeping mirrors `modules/deliverables/service.ts:53-192`, using the shared `nextReviewState`; the snapshot/feedback-as-review logic is identical):

```ts
import { db } from '@/db';
import {
  academicReports,
  academicReportComments,
  type AcademicReportRevision,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import { nextReviewState, type ReviewStatus } from '@/modules/review/state-machine';

/** First-create a draft rapport for a student+university pair. */
export async function createReportDraft(input: {
  studentUserId: string;
  universityOrgId: string;
  internshipId?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  const [created] = await db
    .insert(academicReports)
    .values({
      studentUserId: input.studentUserId,
      universityOrgId: input.universityOrgId,
      internshipId: input.internshipId ?? null,
      title: input.title ?? null,
      description: input.description ?? null,
      status: 'draft',
      version: 1,
    })
    .returning();
  return created;
}

export async function submitReport(input: {
  reportId: string;
  fileUrl: string;
  fileName: string;
  fileType: string | null;
  note?: string | null;
  actorId: string;
}) {
  const [current] = await db
    .select()
    .from(academicReports)
    .where(eq(academicReports.id, input.reportId))
    .limit(1);
  if (!current) throw new Error('Report not found');

  const from = (current.status ?? 'draft') as ReviewStatus;
  // Pure resolver owns the transition guard + the version-bump rule.
  const next = nextReviewState({ status: from, version: current.version }, 'submit');
  const isResubmit = from === 'revision-requested';
  const nextVersion = next.version;

  // Snapshot the just-rejected version into history before overwriting — only
  // on a genuine resubmit (never on a fresh draft → submitted first pass,
  // which would leave a duplicate ghost v1).
  const history: AcademicReportRevision[] = Array.isArray(current.revisionHistory)
    ? [...current.revisionHistory]
    : [];
  if (isResubmit) {
    const snapshot: AcademicReportRevision = {
      version: current.version,
      submittedAt: (current.submittedAt ?? current.updatedAt ?? new Date()).toISOString(),
      submittedBy: input.actorId,
      fileUrl: current.fileUrl,
      fileName: current.fileName,
      fileType: current.fileType,
      note: null,
      status: 'revision-requested',
    };
    if (current.feedback) {
      snapshot.review = {
        reviewerId: input.actorId,
        reviewedAt: (current.updatedAt ?? new Date()).toISOString(),
        state: 'changes',
        text: current.feedback,
      };
    }
    history.unshift(snapshot);
  }

  const [updated] = await db
    .update(academicReports)
    .set({
      status: 'submitted',
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileType: input.fileType,
      feedback: null, // clear stale feedback — it now lives in history
      version: nextVersion,
      submittedAt: new Date(),
      revisionHistory: history,
      updatedAt: new Date(),
    })
    .where(eq(academicReports.id, input.reportId))
    .returning();

  await recordEvent({
    type: 'academicReport.submitted',
    actorId: input.actorId,
    targetType: 'academicReport',
    targetId: input.reportId,
    metadata: {
      name: current.title ?? 'Rapport',
      version: nextVersion,
      fileName: input.fileName,
      note: input.note ?? null,
    },
  });

  return updated;
}

export async function approveReport(input: { reportId: string; actorId: string }) {
  const [current] = await db
    .select()
    .from(academicReports)
    .where(eq(academicReports.id, input.reportId))
    .limit(1);
  if (!current) throw new Error('Report not found');
  const from = (current.status ?? 'draft') as ReviewStatus;
  nextReviewState({ status: from, version: current.version }, 'approve');

  await db
    .update(academicReports)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(academicReports.id, input.reportId));

  await recordEvent({
    type: 'academicReport.approved',
    actorId: input.actorId,
    targetType: 'academicReport',
    targetId: input.reportId,
    metadata: { name: current.title ?? 'Rapport', version: current.version },
  });
}

export async function requestReportRevision(input: {
  reportId: string;
  feedback: string;
  actorId: string;
}) {
  const [current] = await db
    .select()
    .from(academicReports)
    .where(eq(academicReports.id, input.reportId))
    .limit(1);
  if (!current) throw new Error('Report not found');
  const from = (current.status ?? 'draft') as ReviewStatus;
  nextReviewState({ status: from, version: current.version }, 'request-revision');

  await db
    .update(academicReports)
    .set({ status: 'revision-requested', feedback: input.feedback, updatedAt: new Date() })
    .where(eq(academicReports.id, input.reportId));

  await recordEvent({
    type: 'academicReport.revision.requested',
    actorId: input.actorId,
    targetType: 'academicReport',
    targetId: input.reportId,
    metadata: { name: current.title ?? 'Rapport', version: current.version, note: input.feedback },
  });
}

/**
 * Add a comment to the rapport thread. Writes to the DEDICATED
 * academic_report_comments table (NO workspaceId). Deliberately records NO
 * event — report comments are their own surface and must NOT leak onto the
 * company activity feed (the firewall).
 */
export async function addReportComment(input: {
  reportId: string;
  authorId: string;
  body: string;
}) {
  const trimmed = input.body.trim();
  if (!trimmed) throw new Error('Comment body is required');
  if (trimmed.length > 4000) throw new Error('Comment is too long (max 4000 chars)');

  const [created] = await db
    .insert(academicReportComments)
    .values({ reportId: input.reportId, authorId: input.authorId, body: trimmed })
    .returning();
  return created;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test modules/academic-reports/__tests__/service.test.ts`
Expected: PASS (all create/submit/resubmit/approve/request-revision/comment cases).

- [ ] **Step 5: Write the failing queries tests**

Create `modules/academic-reports/__tests__/queries.test.ts` (the chain is modeled as thenable so an `.orderBy()`-terminated query awaits to rows):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  function makeSelectChain() {
    const rows = mocks.selectQueue.shift() ?? [];
    // drizzle query builders are thenable; model the whole chain as thenable so
    // a chain terminated on .orderBy(...) (no .limit) still awaits to rows.
    const chain: Record<string, unknown> = {
      then: (res: (v: unknown) => unknown) => res(rows),
    };
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) chain[m] = () => chain;
    chain.limit = () => Promise.resolve(rows);
    return chain;
  }
  const db = { select: vi.fn(() => makeSelectChain()) };
  return { db, selectQueue };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  academicReports: {}, academicReportComments: {}, users: {}, organizationMembers: {},
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and'), desc: vi.fn(() => 'desc'), asc: vi.fn(() => 'asc'), inArray: vi.fn(() => 'inArray') }));

import {
  getReportForStudent,
  getReportComments,
  countReportsAwaitingReview,
  getReportStatusByStudent,
} from '../queries';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

describe('getReportForStudent', () => {
  it('returns the latest rapport for the student+university pair', async () => {
    mocks.selectQueue.push([{ id: 'r1', status: 'submitted', version: 2 }]);
    const r = await getReportForStudent('stu1', 'uni1');
    expect(r).toMatchObject({ id: 'r1', status: 'submitted' });
  });

  it('returns null when no rapport exists yet', async () => {
    mocks.selectQueue.push([]);
    const r = await getReportForStudent('stu1', 'uni1');
    expect(r).toBeNull();
  });
});

describe('getReportComments', () => {
  it('returns the thread joined to authors, oldest-first', async () => {
    mocks.selectQueue.push([
      { comment: { id: 'c1', body: 'Hi' }, author: { id: 'a1', firstName: 'Lina' } },
    ]);
    const rows = await getReportComments('r1');
    expect(rows).toHaveLength(1);
    expect(rows[0].author.firstName).toBe('Lina');
  });
});

describe('countReportsAwaitingReview', () => {
  it('counts reports at status submitted for the university', async () => {
    mocks.selectQueue.push([{ id: 'r1' }, { id: 'r2' }]);
    const n = await countReportsAwaitingReview('uni1');
    expect(n).toBe(2);
  });
});

describe('getReportStatusByStudent', () => {
  it('maps each student to their latest report status (newest-first wins)', async () => {
    mocks.selectQueue.push([
      { studentUserId: 'stu1', status: 'approved', createdAt: new Date('2026-02-01') },
      { studentUserId: 'stu1', status: 'submitted', createdAt: new Date('2026-01-01') },
      { studentUserId: 'stu2', status: 'submitted', createdAt: new Date('2026-01-15') },
    ]);
    const map = await getReportStatusByStudent('uni1');
    expect(map.get('stu1')).toBe('approved');
    expect(map.get('stu2')).toBe('submitted');
  });
});
```

- [ ] **Step 6: Run to verify it fails, then implement the queries**

Run: `pnpm test modules/academic-reports/__tests__/queries.test.ts` → FAIL (module missing).

Create `modules/academic-reports/queries.ts`:

```ts
import { db } from '@/db';
import { academicReports, academicReportComments, users } from '@/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { AcademicReport, AcademicReportComment, User } from '@/db/schema';

/** Latest rapport for a (student, university) pair, or null. No auth here. */
export async function getReportForStudent(
  studentUserId: string,
  universityOrgId: string,
): Promise<AcademicReport | null> {
  const [row] = await db
    .select()
    .from(academicReports)
    .where(
      and(
        eq(academicReports.studentUserId, studentUserId),
        eq(academicReports.universityOrgId, universityOrgId),
      ),
    )
    .orderBy(desc(academicReports.createdAt))
    .limit(1);
  return row ?? null;
}

export type ReportCommentWithAuthor = { comment: AcademicReportComment; author: User };

/** The rapport thread joined to authors, oldest-first (chat reads top-down). */
export async function getReportComments(reportId: string): Promise<ReportCommentWithAuthor[]> {
  return db
    .select({ comment: academicReportComments, author: users })
    .from(academicReportComments)
    .innerJoin(users, eq(users.id, academicReportComments.authorId))
    .where(eq(academicReportComments.reportId, reportId))
    .orderBy(asc(academicReportComments.createdAt));
}

/** How many of a university's rapports are awaiting review (status submitted). */
export async function countReportsAwaitingReview(universityOrgId: string): Promise<number> {
  const rows = await db
    .select({ id: academicReports.id })
    .from(academicReports)
    .where(
      and(
        eq(academicReports.universityOrgId, universityOrgId),
        eq(academicReports.status, 'submitted'),
      ),
    );
  return rows.length;
}

/**
 * Per-student latest report status for the dashboard roster pill. Returns a
 * map of studentUserId → status. One query, no per-row N+1.
 */
export async function getReportStatusByStudent(
  universityOrgId: string,
): Promise<Map<string, string>> {
  const rows = await db
    .select({
      studentUserId: academicReports.studentUserId,
      status: academicReports.status,
      createdAt: academicReports.createdAt,
    })
    .from(academicReports)
    .where(eq(academicReports.universityOrgId, universityOrgId))
    .orderBy(desc(academicReports.createdAt));
  const map = new Map<string, string>();
  for (const r of rows) {
    if (!map.has(r.studentUserId)) map.set(r.studentUserId, r.status); // newest-first wins
  }
  return map;
}
```

- [ ] **Step 7: Run to verify it passes + full task verify**

Run: `pnpm test modules/academic-reports && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/academic-reports/service.ts modules/academic-reports/queries.ts modules/academic-reports/__tests__/service.test.ts modules/academic-reports/__tests__/queries.test.ts
git commit -m "$(cat <<'EOF'
feat(academic-reports): report lifecycle service + queries

createReportDraft / submitReport (resubmit bumps version, snapshots prior
newest-first, clears stale feedback) / approveReport / requestReportRevision
via the shared review state-machine, plus addReportComment (dedicated table,
no event — kept off the company feed). Queries: getReportForStudent,
getReportComments, awaiting-review count + per-student status.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Server actions — student + coordinator + comment

**Files:**
- Create: `modules/academic-reports/server-actions.ts`
- Create: `modules/academic-reports/__tests__/server-actions.test.ts`

Authz mirrors deliverables' server-actions with roles swapped:
- **Student actions** (`createReportDraftAction`, `submitReportAction`): the student OWNS the report — `report.studentUserId === user.id`. `requireActiveSession` + rate-limited + `assertOurBlobUrl` on the file (matching `submitDeliverableAction`). For `createReportDraftAction` the student must hold an active `student` membership in the target university org (`getActiveMembership` + role check).
- **Coordinator actions** (`approveReportAction`, `requestReportRevisionAction`): membership-gated via `requireOrgRole(user.id, report.universityOrgId, ['owner','admin'])` — IDOR-safe (a foreign-university coordinator gets `Forbidden`). The student role is rejected because they hold no owner/admin membership on the university org.
- **`addReportCommentAction`** (both sides): the caller must be EITHER the owning student OR an owner/admin of the report's university org. Anyone else → `Forbidden`.

A shared `loadReport(reportId)` loads the row once; each action then applies its specific gate. TDD: authz + happy paths.

- [ ] **Step 1: Write the failing action tests**

Create `modules/academic-reports/__tests__/server-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireActiveSession = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireActiveSession: (...a: unknown[]) => requireActiveSession(...a),
}));

const requireOrgRole = vi.fn();
const getActiveMembership = vi.fn();
vi.mock('@/modules/team/authz', () => ({
  requireOrgRole: (...a: unknown[]) => requireOrgRole(...a),
  getActiveMembership: (...a: unknown[]) => getActiveMembership(...a),
}));

const svc = vi.hoisted(() => ({
  createReportDraft: vi.fn(),
  submitReport: vi.fn(),
  approveReport: vi.fn(),
  requestReportRevision: vi.fn(),
  addReportComment: vi.fn(),
}));
vi.mock('../service', () => svc);

const reportRowQueue: unknown[][] = vi.hoisted(() => []) as unknown[][];
vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(reportRowQueue.shift() ?? []) }) }),
    }),
  },
}));
vi.mock('@/db/schema', () => ({ academicReports: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/blob', () => ({ assertOurBlobUrl: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({
  ratelimit: vi.fn(() => ({ limit: vi.fn(() => ({ success: true })) })),
}));

import {
  submitReportAction,
  approveReportAction,
  requestReportRevisionAction,
  addReportCommentAction,
} from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  reportRowQueue.length = 0;
});

describe('submitReportAction — student owns the report', () => {
  it('submits when the caller is the owning student', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'stu1' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'draft' }]);
    const res = await submitReportAction({
      reportId: 'r1', fileUrl: 'https://blob/r.pdf', fileName: 'r.pdf', fileType: 'application/pdf',
    });
    expect(svc.submitReport).toHaveBeenCalledWith(
      expect.objectContaining({ reportId: 'r1', actorId: 'stu1', fileName: 'r.pdf' }),
    );
    expect(res).toEqual({ ok: true });
  });

  it('rejects when the caller is NOT the owning student', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'other' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'draft' }]);
    const res = await submitReportAction({
      reportId: 'r1', fileUrl: 'https://blob/r.pdf', fileName: 'r.pdf', fileType: 'application/pdf',
    });
    expect(res.ok).toBe(false);
    expect(svc.submitReport).not.toHaveBeenCalled();
  });
});

describe('approveReportAction — coordinator membership-gated (IDOR-safe)', () => {
  it('approves when the caller owns/admins the report university org', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord1' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockResolvedValue({});
    const res = await approveReportAction({ reportId: 'r1' });
    expect(requireOrgRole).toHaveBeenCalledWith('coord1', 'uni1', ['owner', 'admin']);
    expect(svc.approveReport).toHaveBeenCalledWith({ reportId: 'r1', actorId: 'coord1' });
    expect(res).toEqual({ ok: true });
  });

  it('rejects a foreign-university coordinator (requireOrgRole throws)', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord2' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockRejectedValue(new Error('Forbidden'));
    const res = await approveReportAction({ reportId: 'r1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(svc.approveReport).not.toHaveBeenCalled();
  });

  it('rejects the owning student trying to approve their own report', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'stu1' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockRejectedValue(new Error('Forbidden')); // student has no owner/admin membership
    const res = await approveReportAction({ reportId: 'r1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
  });
});

describe('requestReportRevisionAction', () => {
  it('requires non-empty feedback', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord1' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockResolvedValue({});
    const res = await requestReportRevisionAction({ reportId: 'r1', feedback: '   ' });
    expect(res.ok).toBe(false);
    expect(svc.requestReportRevision).not.toHaveBeenCalled();
  });

  it('requests revision with trimmed feedback', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord1' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockResolvedValue({});
    await requestReportRevisionAction({ reportId: 'r1', feedback: '  fix sources  ' });
    expect(svc.requestReportRevision).toHaveBeenCalledWith(
      expect.objectContaining({ reportId: 'r1', feedback: 'fix sources', actorId: 'coord1' }),
    );
  });
});

describe('addReportCommentAction — both sides allowed', () => {
  it('allows the owning student', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'stu1' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1' }]);
    const res = await addReportCommentAction({ reportId: 'r1', body: 'hi' });
    expect(svc.addReportComment).toHaveBeenCalledWith({ reportId: 'r1', authorId: 'stu1', body: 'hi' });
    expect(res).toEqual({ ok: true });
  });

  it('allows an owner/admin of the report university org', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord1' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1' }]);
    getActiveMembership.mockResolvedValue({ role: 'owner' });
    const res = await addReportCommentAction({ reportId: 'r1', body: 'noted' });
    expect(svc.addReportComment).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('rejects an unrelated user (not student, not org staff)', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'rando' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1' }]);
    getActiveMembership.mockResolvedValue(null);
    const res = await addReportCommentAction({ reportId: 'r1', body: 'x' });
    expect(res.ok).toBe(false);
    expect(svc.addReportComment).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails, then implement**

Run: `pnpm test modules/academic-reports/__tests__/server-actions.test.ts` → FAIL (module missing).

Create `modules/academic-reports/server-actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { academicReports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireActiveSession } from '@/modules/auth/session';
import { requireOrgRole, getActiveMembership } from '@/modules/team/authz';
import { assertOurBlobUrl } from '@/lib/blob';
import { ratelimit } from '@/lib/ratelimit';
import {
  createReportDraft,
  submitReport,
  approveReport,
  requestReportRevision,
  addReportComment,
} from './service';

type ActionResult = { ok: true } | { ok: false; error: string };

async function loadReport(reportId: string) {
  const [report] = await db
    .select()
    .from(academicReports)
    .where(eq(academicReports.id, reportId))
    .limit(1);
  if (!report) throw new Error('Report not found');
  return report;
}

function revalidateReport(studentUserId: string) {
  revalidatePath('/intern/university');
  revalidatePath(`/university/students/${studentUserId}`);
  revalidatePath('/university/dashboard');
}

/** Student: create the first draft rapport for a university they belong to. */
export async function createReportDraftAction(input: {
  universityOrgId: string;
  internshipId?: string | null;
  title?: string | null;
}): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    // Must hold an active student membership in the target university org.
    const m = await getActiveMembership(user.id, input.universityOrgId);
    if (!m || m.role !== 'student') return { ok: false, error: 'Forbidden' };

    await createReportDraft({
      studentUserId: user.id,
      universityOrgId: input.universityOrgId,
      internshipId: input.internshipId ?? null,
      title: input.title ?? null,
    });
    revalidateReport(user.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/** Student: submit / resubmit their own rapport (PDF). */
export async function submitReportAction(input: {
  reportId: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  note?: string;
}): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    const report = await loadReport(input.reportId);
    if (report.studentUserId !== user.id) return { ok: false, error: 'Forbidden' };

    assertOurBlobUrl(input.fileUrl, 'fileUrl');
    const rl = ratelimit('upload').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    await submitReport({
      reportId: input.reportId,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileType: input.fileType ?? null,
      note: input.note?.trim() || null,
      actorId: user.id,
    });
    revalidateReport(report.studentUserId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/** Coordinator: approve a submitted rapport. Membership-gated (IDOR-safe). */
export async function approveReportAction(input: { reportId: string }): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    const report = await loadReport(input.reportId);
    await requireOrgRole(user.id, report.universityOrgId, ['owner', 'admin']);

    await approveReport({ reportId: input.reportId, actorId: user.id });
    revalidateReport(report.studentUserId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/** Coordinator: request a revision (+ required feedback). Membership-gated. */
export async function requestReportRevisionAction(input: {
  reportId: string;
  feedback: string;
}): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    const report = await loadReport(input.reportId);
    await requireOrgRole(user.id, report.universityOrgId, ['owner', 'admin']);

    const feedback = input.feedback?.trim();
    if (!feedback) return { ok: false, error: 'feedback_required' };

    await requestReportRevision({ reportId: input.reportId, feedback, actorId: user.id });
    revalidateReport(report.studentUserId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/** Both sides: comment on the rapport thread (owning student OR org staff). */
export async function addReportCommentAction(input: {
  reportId: string;
  body: string;
}): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    const report = await loadReport(input.reportId);

    const isStudent = report.studentUserId === user.id;
    let isStaff = false;
    if (!isStudent) {
      const m = await getActiveMembership(user.id, report.universityOrgId);
      isStaff = m?.role === 'owner' || m?.role === 'admin';
    }
    if (!isStudent && !isStaff) return { ok: false, error: 'Forbidden' };

    await addReportComment({ reportId: input.reportId, authorId: user.id, body: input.body });
    revalidateReport(report.studentUserId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
```

> Confirm `assertOurBlobUrl` is exported from `@/lib/blob` (it is — `modules/deliverables/server-actions.ts:8` imports it) and `ratelimit('upload')` is a valid bucket (used by `app/api/upload/route.ts:37`). If the bucket name differs, reuse whichever the upload route uses.

- [ ] **Step 3: Run to verify it passes + typecheck**

Run: `pnpm test modules/academic-reports/__tests__/server-actions.test.ts && pnpm typecheck`
Expected: PASS (student-owns, coordinator membership-gate/IDOR, both-sides comment authz).

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/academic-reports/server-actions.ts modules/academic-reports/__tests__/server-actions.test.ts
git commit -m "$(cat <<'EOF'
feat(academic-reports): server actions with student/coordinator authz

Student submit/create (owns report: studentUserId === user.id, rate-limited,
blob-checked); coordinator approve/request-revision (membership-gated via
requireOrgRole owner/admin on the report university org — IDOR-safe);
addReportComment for both sides (owning student or org staff).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Events + notifications + FR/EN report email templates

**Files:**
- Modify: `modules/events/types.ts:21-23` (add the three event types)
- Modify: `modules/notifications/dispatcher.ts` (three dispatcher cases + helpers + imports)
- Modify: `modules/notifications/__tests__/dispatcher.test.ts` (new cases)
- Create: `lib/email/templates/academic-report-submitted.ts` (FR/EN, notify coordinator)
- Create: `lib/email/templates/academic-report-reviewed.ts` (FR/EN, notify student)
- Create: `lib/email/templates/__tests__/academic-report.test.ts`

Wire `academicReport.*` notifications cleanly: `submitted` → notify the coordinator(s) (the university org's owner/admin staff); `approved`/`revision.requested` → notify the student. Honor `prefsFor`/`localeFor`. New FR/EN email templates modeled on `lib/email/templates/application-status.ts` + `emailLayout`. The dispatcher resolves recipients via the report's `universityOrgId` → `organization_members` (owner/admin) for submit, and the report's `studentUserId` for the review outcomes. TDD: templates first, then dispatcher cases.

- [ ] **Step 1: Add the event types**

In `modules/events/types.ts`, add after `'deliverable.revision.requested',` (line 23):

```ts
  'deliverable.revision.requested',
  'academicReport.submitted',
  'academicReport.approved',
  'academicReport.revision.requested',
```

- [ ] **Step 2: Write the failing email-template tests**

Create `lib/email/templates/__tests__/academic-report.test.ts` (mirrors `lib/email/templates/__tests__/application-status.test.ts` style):

```ts
import { describe, it, expect } from 'vitest';
import { academicReportSubmittedTemplate } from '../academic-report-submitted';
import { academicReportReviewedTemplate } from '../academic-report-reviewed';

describe('academicReportSubmittedTemplate', () => {
  const base = { coordinatorName: 'Prof. Saidi', studentName: 'Lina Ben', version: 2, studentUserId: 'stu1' } as const;

  it('renders EN with the student name, version, and review deep-link', () => {
    const tpl = academicReportSubmittedTemplate({ ...base, locale: 'en' });
    expect(tpl.subject).toContain('Lina Ben');
    expect(tpl.html).toContain('v2');
    expect(tpl.html).toContain('/university/students/stu1');
  });

  it('renders FR', () => {
    const tpl = academicReportSubmittedTemplate({ ...base, locale: 'fr' });
    expect(tpl.html).toContain('/university/students/stu1');
    expect(tpl.html.toLowerCase()).toContain('rapport');
  });

  it('escapes the student name', () => {
    const tpl = academicReportSubmittedTemplate({ ...base, studentName: '<x>', locale: 'en' });
    expect(tpl.html).toContain('&lt;x&gt;');
    expect(tpl.html).not.toContain('<x>');
  });
});

describe('academicReportReviewedTemplate', () => {
  const base = { studentName: 'Lina', outcome: 'approved' as const } as const;

  it('renders the approved EN variant with the intern deep-link', () => {
    const tpl = academicReportReviewedTemplate({ ...base, locale: 'en' });
    expect(tpl.subject.toLowerCase()).toContain('approved');
    expect(tpl.html).toContain('/intern/university');
  });

  it('renders the revision variant with the feedback block', () => {
    const tpl = academicReportReviewedTemplate({
      studentName: 'Lina', outcome: 'revision', feedback: 'Add sources', locale: 'en',
    });
    expect(tpl.html).toContain('Add sources');
    expect(tpl.html.toLowerCase()).toContain('revision');
  });

  it('renders FR approved', () => {
    const tpl = academicReportReviewedTemplate({ ...base, locale: 'fr' });
    expect(tpl.html.toLowerCase()).toContain('approuvé');
    expect(tpl.html).toContain('/intern/university');
  });
});
```

- [ ] **Step 3: Run to verify it fails, then implement the templates**

Run: `pnpm test lib/email/templates/__tests__/academic-report.test.ts` → FAIL (modules missing).

Create `lib/email/templates/academic-report-submitted.ts`:

```ts
import { baseUrl, emailLayout, escapeHtml } from './_layout';

/** Notify a coordinator that a managed student submitted their rapport. */
export function academicReportSubmittedTemplate({
  coordinatorName,
  studentName,
  version,
  studentUserId,
  locale,
}: {
  coordinatorName: string;
  studentName: string;
  version: number;
  studentUserId: string;
  locale: 'fr' | 'en';
}): { subject: string; text: string; html: string } {
  const fr = locale === 'fr';
  const student = escapeHtml(studentName);
  const coord = escapeHtml(coordinatorName);
  const subject = fr
    ? `${student} a soumis son rapport (v${version})`
    : `${student} submitted their report (v${version})`;
  const bodyHtml = fr
    ? `<p>Bonjour ${coord},</p><p><strong>${student}</strong> a soumis la version <strong>v${version}</strong> de son rapport académique pour relecture.</p>`
    : `<p>Hi ${coord},</p><p><strong>${student}</strong> submitted <strong>v${version}</strong> of their academic report for review.</p>`;
  return {
    ...emailLayout({
      title: subject,
      bodyHtml,
      ctaLabel: fr ? 'Relire le rapport' : 'Review the report',
      ctaHref: `${baseUrl()}/university/students/${studentUserId}`,
    }),
    subject,
  };
}
```

Create `lib/email/templates/academic-report-reviewed.ts`:

```ts
import { baseUrl, emailLayout, escapeHtml } from './_layout';

/** Notify a student that their coordinator approved or requested a revision. */
export function academicReportReviewedTemplate({
  studentName,
  outcome,
  feedback,
  locale,
}: {
  studentName: string;
  outcome: 'approved' | 'revision';
  feedback?: string;
  locale: 'fr' | 'en';
}): { subject: string; text: string; html: string } {
  const fr = locale === 'fr';
  const student = escapeHtml(studentName);
  const subject =
    outcome === 'approved'
      ? fr
        ? 'Votre rapport a été approuvé'
        : 'Your report was approved'
      : fr
        ? 'Votre rapport nécessite une révision'
        : 'Your report needs a revision';

  const intro =
    outcome === 'approved'
      ? fr
        ? `<p>Bonjour ${student},</p><p>Votre encadrant a <strong>approuvé</strong> votre rapport académique. Félicitations !</p>`
        : `<p>Hi ${student},</p><p>Your coordinator <strong>approved</strong> your academic report. Congratulations!</p>`
      : fr
        ? `<p>Bonjour ${student},</p><p>Votre encadrant a demandé une <strong>révision</strong> de votre rapport.</p>`
        : `<p>Hi ${student},</p><p>Your coordinator requested a <strong>revision</strong> of your report.</p>`;

  const trimmed = feedback?.trim();
  const heading = fr ? "Retour de l'encadrant" : 'Coordinator feedback';
  const feedbackBlock =
    outcome === 'revision' && trimmed
      ? `<p style="margin-top:16px;font-weight:600;">${heading}</p><blockquote style="margin:8px 0;padding:12px 16px;border-left:3px solid #7C3AED;background:#F9FAFB;color:#374151;white-space:pre-line;">${escapeHtml(trimmed)}</blockquote>`
      : '';

  return {
    ...emailLayout({
      title: subject,
      bodyHtml: `${intro}${feedbackBlock}`,
      ctaLabel: fr ? 'Voir mon rapport' : 'View my report',
      ctaHref: `${baseUrl()}/intern/university`,
    }),
    subject,
  };
}
```

Run again → PASS.

- [ ] **Step 4: Write the failing dispatcher tests**

In `modules/notifications/__tests__/dispatcher.test.ts`, add a new describe block for the report events. **First read the existing file** to reuse its DB-mock harness (it mocks `@/db`, `sendEmail`, the templates). Add (adapting the mock to queue the rows each new path selects):

```ts
// --- academicReport.* dispatch (Plan 2) -----------------------------------
// onAcademicReportSubmitted: select the report (joined to student) → select the
// university org's owner/admin members → notify each. onAcademicReportReviewed:
// select the report (joined to student) → notify the student.
describe('dispatchNotificationsFor — academicReport.submitted', () => {
  it('notifies each owner/admin coordinator of the university org', async () => {
    // Queue: [reportRow], [coordinatorRows]. (Mirror the existing harness's
    // selectQueue mechanism — see how application.created queues its joins.)
    // ...assert db.insert(notifications) called for each coordinator + sendEmail
    // called with the academic-report-submitted template subject.
  });
});

describe('dispatchNotificationsFor — academicReport.approved / revision.requested', () => {
  it('notifies the student on approval', async () => {
    // Queue: [reportRow joined to student]. Assert the student notification +
    // email (academic-report-reviewed, outcome approved).
  });
  it('notifies the student with feedback on revision request', async () => {
    // metadata.note carries the feedback → reviewed template outcome 'revision'.
  });
});
```

> The existing `dispatcher.test.ts` harness is the source of truth for the exact mock shape — model the new cases on its `application.created` (multi-recipient) + `application.status.changed` (single-recipient) blocks. Fill in the concrete queue pushes + assertions to match that harness before running. Keep the EXISTING dispatcher tests untouched.

- [ ] **Step 5: Run to verify the new cases fail, then implement the dispatcher**

Run: `pnpm test modules/notifications/__tests__/dispatcher.test.ts` → the new cases FAIL (no handler yet); existing cases stay green.

In `modules/notifications/dispatcher.ts`:

(a) Extend the schema import (line 2-10) with `organizationMembers` + `academicReports`, and import the two new templates:

```ts
import {
  notifications,
  users,
  applications,
  internships,
  projects,
  profiles,
  workspaces,
  organizationMembers,
  academicReports,
} from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { applicationReceivedTemplate } from '@/lib/email/templates/application-received';
import {
  applicationStatusTemplate,
  type ApplicationStatusForEmail,
} from '@/lib/email/templates/application-status';
import { checkInReminderTemplate } from '@/lib/email/templates/check-in-reminder';
import { academicReportSubmittedTemplate } from '@/lib/email/templates/academic-report-submitted';
import { academicReportReviewedTemplate } from '@/lib/email/templates/academic-report-reviewed';
```

> `and` may already be unused-imported; add it only if not present. Check the existing import line for `eq, inArray` and extend.

(b) Add the three cases to the `switch` (after the `checkin.due` case, ~line 47):

```ts
      case 'academicReport.submitted':
        await onAcademicReportSubmitted(event);
        break;
      case 'academicReport.approved':
        await onAcademicReportReviewed(event, 'approved');
        break;
      case 'academicReport.revision.requested':
        await onAcademicReportReviewed(event, 'revision');
        break;
```

(c) Add the two handlers (at the end of the file, after `onCheckinDue`):

```ts
async function onAcademicReportSubmitted(event: DispatchInput): Promise<void> {
  if (!event.targetId) return;

  const [row] = await db
    .select({ report: academicReports, student: users })
    .from(academicReports)
    .innerJoin(users, eq(users.id, academicReports.studentUserId))
    .where(eq(academicReports.id, event.targetId))
    .limit(1);
  if (!row) return;

  const version = (event.metadata?.version as number | undefined) ?? row.report.version;
  const studentName =
    `${row.student.firstName ?? ''} ${row.student.lastName ?? ''}`.trim() || 'A student';

  // Recipients = active owner/admin coordinators of the university org.
  const coordinatorMembers = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, row.report.universityOrgId),
        eq(organizationMembers.status, 'active'),
        inArray(organizationMembers.role, ['owner', 'admin']),
      ),
    );
  const coordinatorIds = coordinatorMembers
    .map((m) => m.userId)
    .filter((id): id is string => Boolean(id));
  if (coordinatorIds.length === 0) return;

  const coordinators = await db.select().from(users).where(inArray(users.id, coordinatorIds));

  for (const coord of coordinators) {
    const prefs = prefsFor(coord);

    if (prefs.notifyInApp) {
      await db.insert(notifications).values({
        recipientId: coord.id,
        type: 'academicReport.submitted',
        body: `${studentName} submitted their report (v${version})`,
        href: `/university/students/${row.report.studentUserId}`,
        metadata: { reportId: row.report.id, studentUserId: row.report.studentUserId, version },
      });
    }

    if (prefs.notifyEmail) {
      const locale = await localeFor(coord.id);
      const tpl = academicReportSubmittedTemplate({
        coordinatorName: coord.firstName ?? 'Coordinator',
        studentName,
        version,
        studentUserId: row.report.studentUserId,
        locale,
      });
      await sendEmail({
        to: coord.email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
        tags: [{ name: 'type', value: 'academicReport.submitted' }],
      });
    }
  }
}

async function onAcademicReportReviewed(
  event: DispatchInput,
  outcome: 'approved' | 'revision',
): Promise<void> {
  if (!event.targetId) return;

  const [row] = await db
    .select({ report: academicReports, student: users })
    .from(academicReports)
    .innerJoin(users, eq(users.id, academicReports.studentUserId))
    .where(eq(academicReports.id, event.targetId))
    .limit(1);
  if (!row) return;

  const studentName = row.student.firstName ?? 'there';
  const feedback = (event.metadata?.note as string | undefined) ?? undefined;
  const prefs = prefsFor(row.student);

  if (prefs.notifyInApp) {
    await db.insert(notifications).values({
      recipientId: row.student.id,
      type: outcome === 'approved' ? 'academicReport.approved' : 'academicReport.revision.requested',
      body:
        outcome === 'approved'
          ? 'Your report was approved'
          : 'Your report needs a revision',
      href: `/intern/university`,
      metadata: { reportId: row.report.id, outcome },
    });
  }

  if (prefs.notifyEmail) {
    const locale = await localeFor(row.student.id);
    const tpl = academicReportReviewedTemplate({ studentName, outcome, feedback, locale });
    await sendEmail({
      to: row.student.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      tags: [{ name: 'type', value: `academicReport.${outcome}` }],
    });
  }
}
```

> `prefsFor`, `localeFor`, `DispatchInput`, `sendEmail` already exist in this file — reuse them. The dispatcher's outer try/catch already swallows errors so a notification failure never fails the originating action (which already returned from the service).

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm test modules/notifications && pnpm test lib/email/templates && pnpm typecheck`
Expected: PASS (new report cases + all existing dispatcher/template tests green).

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/events/types.ts modules/notifications/dispatcher.ts modules/notifications/__tests__/dispatcher.test.ts lib/email/templates/academic-report-submitted.ts lib/email/templates/academic-report-reviewed.ts lib/email/templates/__tests__/academic-report.test.ts
git commit -m "$(cat <<'EOF'
feat(notifications): wire academicReport.* events + FR/EN report emails

Adds academicReport.submitted/approved/revision.requested to EVENT_TYPES and
dispatcher cases: submit notifies the university org's owner/admin
coordinators; approve/revision notify the student (with feedback). New FR/EN
email templates modeled on application-status. Honors per-channel prefs +
locale.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `report` upload kind for the rapport PDF

**Files:**
- Modify: `lib/uploads/allowlist.ts:9-17`, `:40-45`
- Modify: `app/api/upload/route.ts:13-18`
- Modify: `components/file-drop.tsx:5`

`lib/uploads/allowlist.ts` has no suitable kind for a student-submitted report PDF (`deliverable` is workspace-flavored + allows images/office formats; `cv`/`registry` are PDF-only but role-gated to intern/company). Add a dedicated `report` kind — **PDF only**, sized like `cv` (8 MB) — and allow it for `intern`/`admin` in the upload route. Wire the student submit form (Task 7) to `/api/upload?kind=report`.

- [ ] **Step 1: Add the `report` kind to the allowlist**

In `lib/uploads/allowlist.ts`:

(a) Extend `ALLOWED_KINDS` (line 9) + the comment (line 2):

```ts
export const ALLOWED_KINDS = ['cv', 'logo', 'registry', 'deliverable', 'report'] as const;
```

(b) Add the size cap to `MAX_BYTES_BY_KIND` (after `deliverable`, line 16):

```ts
  deliverable: 25 * 1024 * 1024,
  report: 8 * 1024 * 1024, // rapport académique PDF — sized like a CV
```

(c) Add the signature list to `SIGNATURES_BY_KIND` (after `deliverable`, line 44):

```ts
  deliverable: [PDF, PNG, JPEG, DOCX, XLSX, PPTX],
  report: [PDF],
```

- [ ] **Step 2: Allow the `report` kind for interns in the upload route**

In `app/api/upload/route.ts`, add to `ALLOWED_ROLES_BY_KIND` (after `deliverable`, line 17):

```ts
  deliverable: ['intern', 'company', 'admin'],
  report: ['intern', 'admin'],
```

> Students hold global role `intern`, so `report` uploads are gated to `intern`/`admin`. No company access (a rapport is a student artifact). The route already validates magic-bytes via `validateUpload(kind, file)` — PDF-only is enforced.

- [ ] **Step 3: Add `'report'` to the FileDrop UploadKind**

In `components/file-drop.tsx`, line 5:

```ts
export type UploadKind = 'cv' | 'logo' | 'deliverable' | 'registry' | 'report';
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm test lib/uploads`
Expected: PASS. (If `lib/uploads/__tests__/` asserts the exact `ALLOWED_KINDS` set or per-kind maps, **update those assertions** to include `report` — additive; do not delete existing kind assertions.)

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add lib/uploads/allowlist.ts app/api/upload/route.ts components/file-drop.tsx
git commit -m "$(cat <<'EOF'
feat(uploads): add report upload kind (PDF, intern/admin)

A dedicated rapport-académique upload kind — PDF only, 8 MB cap (sized like a
CV), gated to intern/admin. The student report submit form uploads via
/api/upload?kind=report.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Student surface `/intern/university` + shared report components

**Files:**
- Create: `modules/academic-reports/components/report-version-stack.tsx` (server component)
- Create: `modules/academic-reports/components/report-upload-zone.tsx` (client)
- Create: `modules/academic-reports/components/report-comments-thread.tsx` (client)
- Create: `modules/academic-reports/components/report-review-bar.tsx` (client — used by Task 8, created here so the component set lands together)
- Create: `app/[locale]/(platform)/intern/university/page.tsx`

The student's academic-supervision home: which university + coordinator manages them, the rapport status + version stack, the comment thread, and a submit/resubmit (PDF upload) control when status is `draft`/`revision-requested`. **Mirror** the deliverables detail/version-stack UI (`modules/workspace/components/deliverables-detail.tsx`) but adapted to the report and using Tailwind tokens directly (NOT the workspace-scoped `dv-*` CSS — those classes live in `modules/workspace/workspace.css` and are not loaded outside the workspace shell). Gate: the student must hold an active `student` membership (resolved via `getViewerMemberships`).

The four components are shared by both surfaces (student here, coordinator in Task 8): the version-stack + comments-thread render for both; the upload-zone is student-only; the review-bar is coordinator-only. RSC pages aren't unit-tested here (matching the Plan 1 convention); the underlying service/queries/actions are covered by Tasks 3–5.

- [ ] **Step 1: Build the report version-stack (server component)**

Create `modules/academic-reports/components/report-version-stack.tsx`. Renders the current version + `revisionHistory` (newest-first) as a list of cards using `StatusPill` + tokens. Adapted from `DelivDetail`'s `Version` rendering, simplified (no tabs, no brief panel — the snapshot replaces the brief on the coordinator side; the student already knows their own brief):

```tsx
import type { AcademicReport, AcademicReportRevision } from '@/db/schema';
import { StatusPill, type StatusTone } from '@/components/status-pill';
import { Avatar } from '@/components/avatar';

function toneFor(status: string): StatusTone {
  if (status === 'submitted') return 'info';
  if (status === 'approved') return 'success';
  if (status === 'revision-requested') return 'warn';
  return 'neutral';
}

function fmt(d: Date | string | null, locale: string): string {
  if (!d) return '';
  return new Date(d).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type StackEntry = {
  version: number;
  status: string;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  note: string | null;
  submittedAt: string | null;
  review: { state: 'approved' | 'changes'; text: string } | null;
  active: boolean;
};

/**
 * Read-only version stack for a rapport — current row on top, then
 * revisionHistory (newest-first). Used by BOTH the student and coordinator
 * surfaces. Pure presentation; no workspace coupling, no dv-* CSS.
 */
export function ReportVersionStack({
  report,
  authorName,
  statusLabels,
  locale,
  noFileLabel,
  openLabel,
}: {
  report: AcademicReport;
  authorName: string;
  statusLabels: Record<string, string>;
  locale: string;
  noFileLabel: string;
  openLabel: string;
}) {
  const history = (report.revisionHistory ?? []) as AcademicReportRevision[];
  const current: StackEntry = {
    version: report.version,
    status: report.status,
    fileUrl: report.fileUrl,
    fileName: report.fileName,
    fileType: report.fileType,
    note: null,
    submittedAt: report.submittedAt ? new Date(report.submittedAt).toISOString() : null,
    review:
      report.status === 'revision-requested' && report.feedback
        ? { state: 'changes', text: report.feedback }
        : null,
    active: report.status === 'submitted',
  };
  const past: StackEntry[] = history.map((h) => ({
    version: h.version,
    status: h.status,
    fileUrl: h.fileUrl,
    fileName: h.fileName,
    fileType: h.fileType,
    note: h.note,
    submittedAt: h.submittedAt,
    review: h.review ? { state: h.review.state, text: h.review.text } : null,
    active: false,
  }));
  const stack = [current, ...past];

  return (
    <div className="flex flex-col gap-3">
      {stack.map((v) => (
        <div
          key={`${v.version}-${v.active ? 'cur' : 'hist'}`}
          className={
            'rounded-lg border bg-[var(--surface)] p-4 ' +
            (v.active ? 'border-[var(--brand-300)]' : 'border-[var(--border-color)]')
          }
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-caption text-[var(--ink-3)]">v{v.version}</span>
            <span className="text-sm text-[var(--ink-2)]">{authorName}</span>
            {v.submittedAt && (
              <span className="font-mono text-caption text-[var(--ink-4)]">{fmt(v.submittedAt, locale)}</span>
            )}
            <span className="ml-auto">
              <StatusPill tone={toneFor(v.status)}>{statusLabels[v.status] ?? v.status}</StatusPill>
            </span>
          </div>
          {v.note && (
            <p className="mb-2 text-sm text-[var(--ink-2)]">&ldquo;{v.note}&rdquo;</p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[var(--surface-muted)] font-mono text-[10px] text-[var(--ink-2)]">
              PDF
            </div>
            <div className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">
              {v.fileName ?? noFileLabel}
            </div>
            {v.fileUrl && (
              <a
                href={v.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[var(--brand-600)] hover:underline"
              >
                {openLabel}
              </a>
            )}
          </div>
          {v.review && (
            <div className="mt-3 rounded-md border border-[var(--border-color)] bg-[var(--surface-muted)] p-3">
              <div className="mb-1 flex items-center gap-2">
                <StatusPill tone={v.review.state === 'approved' ? 'success' : 'warn'}>
                  {v.review.state === 'approved' ? statusLabels['approved'] : statusLabels['revision-requested']}
                </StatusPill>
              </div>
              <p className="text-sm text-[var(--ink-2)]">&ldquo;{v.review.text}&rdquo;</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Build the student upload-zone (client)**

Create `modules/academic-reports/components/report-upload-zone.tsx` (adapted from `deliv-upload-zone.tsx`; `kind="report"`, `accept=".pdf"`, calls `submitReportAction`):

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Check } from 'lucide-react';
import { FileDrop } from '@/components/file-drop';
import { Button } from '@/components/ui/button';
import { submitReportAction } from '@/modules/academic-reports/server-actions';

export function ReportUploadZone({
  reportId,
  nextVersion,
  labels,
}: {
  reportId: string;
  nextVersion: number;
  labels: {
    title: string;
    helper: string;
    notePlaceholder: string;
    cancel: string;
    send: string;
    sending: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<{ url: string; fileName: string; contentType: string } | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!staged) return;
    setError(null);
    startTransition(async () => {
      const res = await submitReportAction({
        reportId,
        fileUrl: staged.url,
        fileName: staged.fileName,
        fileType: staged.contentType,
        note: note.trim() || undefined,
      });
      if (res.ok) {
        setStaged(null);
        setNote('');
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Upload size={16} aria-hidden /> {labels.title}
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-[var(--brand-100)] bg-[var(--brand-50)] p-4">
      <FileDrop
        kind="report"
        accept=".pdf"
        helper={labels.helper}
        onUploaded={(r) => setStaged({ url: r.url, fileName: r.fileName, contentType: r.contentType })}
      />
      {staged && (
        <div className="mt-2.5 flex items-center gap-2 rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm">
          <Check size={14} className="text-[var(--success)]" aria-hidden />
          <span className="truncate">{staged.fileName}</span>
        </div>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder={labels.notePlaceholder}
        className="mt-2.5 w-full rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
      />
      {error && <p className="mt-1 text-caption text-[var(--danger)]">{error}</p>}
      <div className="mt-2.5 flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => { setOpen(false); setStaged(null); setNote(''); }}>
          {labels.cancel}
        </Button>
        <Button size="sm" disabled={pending || !staged} onClick={submit}>
          {pending ? labels.sending : labels.send}
        </Button>
      </div>
    </div>
  );
}
```

> Confirm `Button`'s `variant`/`size` props (`outline`, `sm`) match `@/components/ui/button` — Plan 1's admin form uses `variant="outline" size="sm"`, so they exist. Confirm `--brand-100`/`--brand-50`/`--success`/`--danger` tokens exist (used across deliverables UI + Plan 1 pages).

- [ ] **Step 3: Build the report comments thread (client)**

Create `modules/academic-reports/components/report-comments-thread.tsx`. A self-contained thread (NOT the workspace `CommentsThread`, which is workspace-coupled) calling `addReportCommentAction`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { addReportCommentAction } from '@/modules/academic-reports/server-actions';
import type { ReportCommentWithAuthor } from '@/modules/academic-reports/queries';

export function ReportCommentsThread({
  reportId,
  comments,
  currentUserId,
  locale,
  labels,
}: {
  reportId: string;
  comments: ReportCommentWithAuthor[];
  currentUserId: string;
  locale: string;
  labels: { placeholder: string; empty: string; post: string; sending: string };
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addReportCommentAction({ reportId, body: trimmed });
      setBody('');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={labels.placeholder}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          className="w-full resize-y rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={pending || !body.trim()} onClick={submit}>
            <Send size={14} aria-hidden /> {pending ? labels.sending : labels.post}
          </Button>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--border-color)] p-8 text-center">
          <MessageSquare size={24} className="text-[var(--ink-4)]" aria-hidden />
          <p className="text-sm text-[var(--ink-3)]">{labels.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {comments.map(({ comment, author }) => (
            <li
              key={comment.id}
              className="grid grid-cols-[36px_1fr] items-start gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-3"
            >
              <Avatar
                name={`${author.firstName ?? ''} ${author.lastName ?? ''}`.trim()}
                email={author.email}
                imageUrl={author.imageUrl}
                size="md"
              />
              <div className="min-w-0">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="font-medium text-[var(--ink)]">
                    {author.firstName} {author.lastName}
                  </span>
                  <span className="font-mono text-caption text-[var(--ink-3)]">
                    {new Date(comment.createdAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {author.id === currentUserId && (
                    <span className="font-mono text-caption text-[var(--ink-4)]">·</span>
                  )}
                </div>
                <p className="whitespace-pre-line break-words text-sm text-[var(--ink-2)]">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

> No delete control (v1 — the deliverables thread has one, but report threads keep it simple; add later if Sam wants). `ReportCommentWithAuthor` is exported from `modules/academic-reports/queries.ts` (Task 3).

- [ ] **Step 4: Build the coordinator review-bar (client) — used by Task 8**

Create `modules/academic-reports/components/report-review-bar.tsx` (adapted from `deliv-review-bar.tsx`; calls `approveReportAction`/`requestReportRevisionAction`):

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  approveReportAction,
  requestReportRevisionAction,
} from '@/modules/academic-reports/server-actions';

export function ReportReviewBar({
  reportId,
  submitterName,
  whenLabel,
  labels,
}: {
  reportId: string;
  submitterName: string;
  whenLabel: string;
  labels: {
    submittedBy: string;
    requestChanges: string;
    approve: string;
    cancel: string;
    feedbackPlaceholder: string;
    sending: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showRequest, setShowRequest] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await approveReportAction({ reportId });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function sendRevision() {
    if (!feedback.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await requestReportRevisionAction({ reportId, feedback: feedback.trim() });
      if (res.ok) {
        setFeedback('');
        setShowRequest(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--ink-2)]">
          {labels.submittedBy.replace('{name}', submitterName)} · {whenLabel}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setShowRequest((v) => !v)}>
            {showRequest ? labels.cancel : labels.requestChanges}
          </Button>
          <Button size="sm" disabled={pending} onClick={approve}>
            <Check size={14} aria-hidden /> {labels.approve}
          </Button>
        </div>
      </div>
      {showRequest && (
        <div className="mt-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={labels.feedbackPlaceholder}
            className="w-full resize-y rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              disabled={pending || !feedback.trim()}
              onClick={sendRevision}
              style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }}
            >
              {pending ? labels.sending : labels.requestChanges}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-caption text-[var(--danger)]">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Build the student page `/intern/university`**

Create `app/[locale]/(platform)/intern/university/page.tsx`. Resolve the student's active `student` membership → the university org. Load (or lazily-create-on-demand) the rapport via `getReportForStudent`. Render: the supervising university + coordinator, the snapshot of their own status, the version stack, the comment thread, and the upload-zone when `draft`/`revision-requested`. If the student has NO `student` membership, show a "not supervised" empty state (do NOT 404 — the sidebar link only shows for members, but a direct hit should degrade gracefully):

```tsx
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getViewerMemberships } from '@/modules/team/authz';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill, type StatusTone } from '@/components/status-pill';
import { getReportForStudent, getReportComments } from '@/modules/academic-reports/queries';
import { createReportDraftAction } from '@/modules/academic-reports/server-actions';
import { ReportVersionStack } from '@/modules/academic-reports/components/report-version-stack';
import { ReportUploadZone } from '@/modules/academic-reports/components/report-upload-zone';
import { ReportCommentsThread } from '@/modules/academic-reports/components/report-comments-thread';

function toneFor(status: string): StatusTone {
  if (status === 'submitted') return 'info';
  if (status === 'approved') return 'success';
  if (status === 'revision-requested') return 'warn';
  return 'neutral';
}

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const [t, locale] = await Promise.all([getTranslations('academicReport'), getLocale()]);

  // The student's active university membership (role 'student').
  const memberships = await getViewerMemberships(session.user.id);
  const studentMembership = memberships.find(
    (m) => m.role === 'student' && m.org.kind === 'university',
  );

  if (!studentMembership) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 md:p-8">
        <PageHeader title={t('home.title')} description={t('home.subtitle')} className="mb-6" />
        <div className="rounded-md border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--ink-3)]">
          {t('home.notSupervised')}
        </div>
      </div>
    );
  }

  const universityOrgId = studentMembership.org.id;
  const report = await getReportForStudent(session.user.id, universityOrgId);
  const comments = report ? await getReportComments(report.id) : [];
  const studentName = [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;

  const statusLabels: Record<string, string> = {
    draft: t('status.draft'),
    submitted: t('status.submitted'),
    approved: t('status.approved'),
    'revision-requested': t('status.revisionRequested'),
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:p-8">
      <PageHeader title={t('home.title')} description={t('home.subtitle')} className="mb-6" />

      <div className="mb-6 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4">
        <div className="text-caption font-mono uppercase text-[var(--ink-4)]">{t('home.supervisedBy')}</div>
        <div className="mt-1 font-semibold text-[var(--ink)]">{studentMembership.org.name}</div>
      </div>

      {!report ? (
        <div className="rounded-md border border-dashed border-[var(--border-color)] p-8 text-center">
          <p className="mb-4 text-sm text-[var(--ink-3)]">{t('home.noReport')}</p>
          <form action={createReportDraftAction.bind(null, { universityOrgId })}>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-[var(--brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-600)]"
            >
              {t('home.startReport')}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <StatusPill tone={toneFor(report.status)}>{statusLabels[report.status]}</StatusPill>
            <span className="font-mono text-caption text-[var(--ink-3)]">v{report.version}</span>
            {(report.status === 'draft' || report.status === 'revision-requested') && (
              <span className="ml-auto">
                <ReportUploadZone
                  reportId={report.id}
                  nextVersion={report.status === 'draft' ? report.version : report.version + 1}
                  labels={{
                    title: t('upload.title'),
                    helper: t('upload.helper'),
                    notePlaceholder: t('upload.notePlaceholder'),
                    cancel: t('upload.cancel'),
                    send: t('upload.send'),
                    sending: t('upload.sending'),
                  }}
                />
              </span>
            )}
          </div>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--ink-2)]">{t('home.versionsTitle')}</h2>
            <ReportVersionStack
              report={report}
              authorName={studentName}
              statusLabels={statusLabels}
              locale={locale}
              noFileLabel={t('home.noFile')}
              openLabel={t('home.open')}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--ink-2)]">{t('home.commentsTitle')}</h2>
            <ReportCommentsThread
              reportId={report.id}
              comments={comments}
              currentUserId={session.user.id}
              locale={locale}
              labels={{
                placeholder: t('comments.placeholder'),
                empty: t('comments.empty'),
                post: t('comments.post'),
                sending: t('comments.sending'),
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
```

> **Server-action bind caveat:** `createReportDraftAction.bind(null, {...})` in a `<form action>` requires the action's first parameter to be the input object (it is). The bound action then receives the form's `FormData` as a SECOND arg which it ignores — confirm `createReportDraftAction` signature tolerates an extra ignored arg (it does; TS is fine since the form passes `FormData` positionally and the action only reads its first param). If lint/types complain, wrap in a tiny inline `'use server'` closure file action instead — but the bind form is the simplest and matches the dev-login `devLoginAction.bind(null, email)` pattern already in the repo.

- [ ] **Step 6: Verify build + typecheck**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. i18n keys (`academicReport.*`) land in Task 12 — a missing-message warning before then is expected; the page still compiles.

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/academic-reports/components/report-version-stack.tsx modules/academic-reports/components/report-upload-zone.tsx modules/academic-reports/components/report-comments-thread.tsx modules/academic-reports/components/report-review-bar.tsx "app/[locale]/(platform)/intern/university/page.tsx"
git commit -m "$(cat <<'EOF'
feat(academic-reports): student /intern/university surface + report components

Adds the shared report UI (version stack, upload zone, comments thread, review
bar) using Tailwind tokens (no workspace dv-* CSS coupling), and the student
academic-supervision home: supervising university, rapport status + version
stack + comment thread, and submit/resubmit upload when draft/revision-requested.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Coordinator review surface `/university/students/[studentId]`

**Files:**
- Create: `app/[locale]/(platform)/university/students/[studentId]/page.tsx`

Under the existing `/university` route group (already gated by `requireUniversityRole` via `university/layout.tsx`). The page additionally membership-gates the SPECIFIC student: resolve the coordinator's university org → confirm `studentId` is an active `student` member of THAT org (IDOR-safe; a foreign student → not found). Then render: header (student identity + membership), the firewalled `getStudentInternshipSnapshot` up top (the ONLY workspace-phase surface — NEVER `canViewWorkspace`), then the rapport: version stack + comment thread + a role-gated `ReportReviewBar` (Approve / Request-revision) shown only when the rapport is `submitted`.

This is an async-params route (Next.js 16): `params` is a Promise — `const { studentId } = await params;`. Read `node_modules/next/dist/docs/` for the async-params convention before writing.

- [ ] **Step 1: Build the coordinator review page**

Create `app/[locale]/(platform)/university/students/[studentId]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getCurrentOrg, getActiveMembership } from '@/modules/team/authz';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill, type StatusTone } from '@/components/status-pill';
import { Avatar } from '@/components/avatar';
import { getStudentInternshipSnapshot } from '@/modules/university/queries';
import { getReportForStudent, getReportComments } from '@/modules/academic-reports/queries';
import { ReportVersionStack } from '@/modules/academic-reports/components/report-version-stack';
import { ReportCommentsThread } from '@/modules/academic-reports/components/report-comments-thread';
import { ReportReviewBar } from '@/modules/academic-reports/components/report-review-bar';

function toneFor(status: string): StatusTone {
  if (status === 'submitted') return 'info';
  if (status === 'approved') return 'success';
  if (status === 'revision-requested') return 'warn';
  return 'neutral';
}

function relativeWhen(d: Date | string | null, locale: string): string {
  if (!d) return '';
  return new Date(d).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { studentId } = await params;

  const [t, locale] = await Promise.all([getTranslations('academicReport'), getLocale()]);
  const tUni = await getTranslations('university.review');

  // Resolve the coordinator's active university org.
  const current = await getCurrentOrg(session.user.id);
  if (!current || current.org.kind !== 'university') notFound();

  // IDOR gate: the target studentId MUST be an active student member of THIS
  // university org. A foreign student → not found (same opaque outcome).
  const studentMembership = await getActiveMembership(studentId, current.org.id);
  if (!studentMembership || studentMembership.role !== 'student') notFound();

  // Student identity (safe fields only).
  const [student] = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, imageUrl: users.imageUrl })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1);
  if (!student) notFound();

  // Firewalled snapshot + the rapport. NEVER canViewWorkspace.
  const [snapshot, report] = await Promise.all([
    getStudentInternshipSnapshot(studentId),
    getReportForStudent(studentId, current.org.id),
  ]);
  const comments = report ? await getReportComments(report.id) : [];
  const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email;

  const statusLabels: Record<string, string> = {
    draft: t('status.draft'),
    submitted: t('status.submitted'),
    approved: t('status.approved'),
    'revision-requested': t('status.revisionRequested'),
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:p-8">
      <PageHeader title={studentName} description={student.email} className="mb-6" />

      {/* Firewalled internship snapshot (no workspace internals). */}
      <section className="mb-6 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink-2)]">{tUni('snapshotTitle')}</h2>
        {snapshot ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--ink-2)]">
            <span><b>{snapshot.companyName}</b> · {snapshot.internshipTitle}</span>
            {snapshot.phaseCount > 0 && (
              <StatusPill tone="info">
                {tUni('phaseOf', { current: snapshot.currentPhaseIndex + 1, total: snapshot.phaseCount })}
              </StatusPill>
            )}
            <span className="font-mono text-caption text-[var(--ink-3)]">
              {tUni('weekOf', { current: snapshot.weekCurrent, total: snapshot.weekTotal })}
            </span>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-3)]">{tUni('notPlaced')}</p>
        )}
      </section>

      {/* The rapport. */}
      {!report ? (
        <div className="rounded-md border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--ink-3)]">
          {tUni('noReport')}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <StatusPill tone={toneFor(report.status)}>{statusLabels[report.status]}</StatusPill>
            <span className="font-mono text-caption text-[var(--ink-3)]">v{report.version}</span>
          </div>

          {/* Role-gated review bar — only when awaiting review. */}
          {report.status === 'submitted' && (
            <ReportReviewBar
              reportId={report.id}
              submitterName={studentName}
              whenLabel={relativeWhen(report.submittedAt, locale)}
              labels={{
                submittedBy: t('review.submittedBy'),
                requestChanges: t('review.requestChanges'),
                approve: t('review.approve'),
                cancel: t('review.cancel'),
                feedbackPlaceholder: t('review.feedbackPlaceholder'),
                sending: t('review.sending'),
              }}
            />
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--ink-2)]">{t('home.versionsTitle')}</h2>
            <ReportVersionStack
              report={report}
              authorName={studentName}
              statusLabels={statusLabels}
              locale={locale}
              noFileLabel={t('home.noFile')}
              openLabel={t('home.open')}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--ink-2)]">{t('home.commentsTitle')}</h2>
            <ReportCommentsThread
              reportId={report.id}
              comments={comments}
              currentUserId={session.user.id}
              locale={locale}
              labels={{
                placeholder: t('comments.placeholder'),
                empty: t('comments.empty'),
                post: t('comments.post'),
                sending: t('comments.sending'),
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
```

> **Isolation check:** this page selects ONLY `users` (student identity) + calls `getStudentInternshipSnapshot` (firewalled) + `getReportForStudent`/`getReportComments` (report tables). It NEVER touches `canViewWorkspace`, `tasks`, `deliverables`, workspace `comments`, `projects.brief`, or `projects.goals`. Do not add any such read.

- [ ] **Step 2: Verify build + typecheck**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. i18n keys land in Task 12.

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add "app/[locale]/(platform)/university/students/[studentId]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(university): coordinator per-student review surface

/university/students/[studentId] — membership-gated (IDOR-safe: the student
must be an active student member of the coordinator's university org). Shows
the firewalled internship snapshot, the rapport version stack + comment
thread, and a role-gated Approve / Request-revision bar when submitted. Never
touches canViewWorkspace or company workspace tables.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Dashboard polish — awaiting-review group + status pills + row links

**Files:**
- Modify: `app/[locale]/(platform)/university/dashboard/page.tsx`

Add to the existing coordinator dashboard (Plan 1 shipped the roster): an "Awaiting your review" count/grouping at the top (reports at `submitted`, from `countReportsAwaitingReview`), a rapport **status pill** in each roster row (from `getReportStatusByStudent`), and a **link** on each roster row to `/university/students/[studentId]`. Additive — the existing roster table + counts stay; we extend them.

- [ ] **Step 1: Add the report-status reads + awaiting count to the page**

In `app/[locale]/(platform)/university/dashboard/page.tsx`:

(a) Extend the import (line 16):

```ts
import { getManagedStudents, getStudentInternshipSnapshot } from '@/modules/university/queries';
import { countReportsAwaitingReview, getReportStatusByStudent } from '@/modules/academic-reports/queries';
import Link from 'next/link';
```

(b) Add the two reads to the parallel batch (after `getOrgMembers`, line 43-46). Replace the `Promise.all` block:

```ts
  const [students, members, awaitingReview, reportStatus] = await Promise.all([
    getManagedStudents(current.org.id),
    getOrgMembers(current.org.id),
    countReportsAwaitingReview(current.org.id),
    getReportStatusByStudent(current.org.id),
  ]);
```

(c) Add the "awaiting review" line to the counts row (after the `placedCount` span, ~line 69):

```ts
        <span className="text-[var(--ink-3)]">
          {t('placedCount', { count: snapshots.filter(Boolean).length })}
        </span>
        {awaitingReview > 0 && (
          <span className="font-medium text-[var(--brand-700)]">
            {t('awaitingReviewCount', { count: awaitingReview })}
          </span>
        )}
```

(d) Add a "Rapport" column header (after `colPhase`, ~line 85):

```ts
                <TableHead>{t('colPhase')}</TableHead>
                <TableHead>{t('colReport')}</TableHead>
```

(e) In the row body, wrap the student name in a link + add the report status pill cell. Replace the student-name `TableCell` (line 94) and add a trailing cell. The full row body becomes:

```tsx
              {students.map((s, i) => {
                const snap = snapshots[i];
                const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
                const rStatus = s.userId ? reportStatus.get(s.userId) : undefined;
                return (
                  <TableRow key={s.memberId}>
                    <TableCell className="font-medium text-[var(--ink)]">
                      {s.userId ? (
                        <Link
                          href={`/university/students/${s.userId}`}
                          className="text-[var(--brand-700)] hover:underline"
                        >
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </TableCell>
                    <TableCell className="text-caption text-[var(--ink-3)]">
                      {s.fieldOfStudy ?? s.university ?? '—'}
                    </TableCell>
                    <TableCell className="text-caption text-[var(--ink-3)]">
                      {snap ? `${snap.companyName} · ${snap.internshipTitle}` : t('notPlaced')}
                    </TableCell>
                    <TableCell>
                      {snap && snap.phaseCount > 0 ? (
                        <StatusPill tone="info">
                          {t('phaseOf', { current: snap.currentPhaseIndex + 1, total: snap.phaseCount })}
                        </StatusPill>
                      ) : (
                        <span className="text-caption text-[var(--ink-4)]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rStatus ? (
                        <StatusPill
                          tone={
                            rStatus === 'submitted'
                              ? 'info'
                              : rStatus === 'approved'
                                ? 'success'
                                : rStatus === 'revision-requested'
                                  ? 'warn'
                                  : 'neutral'
                          }
                        >
                          {t(`reportStatus.${rStatus === 'revision-requested' ? 'revisionRequested' : rStatus}`)}
                        </StatusPill>
                      ) : (
                        <span className="text-caption text-[var(--ink-4)]">{t('reportStatus.none')}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
```

> Bump the table `min-w` to accommodate the extra column: change `min-w-[760px]` → `min-w-[900px]` on the `<Table>` (line 79).

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. New i18n keys (`university.dashboard.awaitingReviewCount`, `colReport`, `reportStatus.*`) land in Task 12 — missing-message warnings until then are expected.

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add "app/[locale]/(platform)/university/dashboard/page.tsx"
git commit -m "$(cat <<'EOF'
feat(university): dashboard awaiting-review + report status pills + row links

Adds an "awaiting your review" count (reports at submitted), a per-row rapport
status pill (one query, no N+1), and links each roster row to the per-student
review surface.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Demo seed — coordinator persona + placed student + submitted report

**Files:**
- Modify: `scripts/seed.ts` (widen `upsertUser` role + add a `seedUniversity` block)
- Modify: `modules/auth/dev-actions.ts:32-37` (university redirect branch)
- Modify: `app/[locale]/(auth)/dev/login/page.tsx:10-14` (add the coordinator email to the picker)

The lead wants a populated coordinator roster + review surface in localhost. Extend the seed to add: a demo university org (`kind='university'`, verified), a **coordinator persona** (new seeded user, global role `university`, owner member of the university) so `/dev/login` offers a UNIVERSITY persona, **2 managed `student` members** (one being the already-seeded **Yasmine**, who is PLACED in the Acme "Visual designer — Brand audit" workspace — so the phase column + snapshot populate; the other a second managed student with no placement), and **one academic report in `submitted` state** for Yasmine — so the whole loop is demoable/clickable. Fully idempotent (email-keyed lookups, insert-if-absent), matching the existing seed style.

- [ ] **Step 1: Widen `upsertUser` to accept the `university` role**

In `scripts/seed.ts`, the `upsertUser` helper (line 22-33) types `role` as `'intern' | 'company' | 'admin'`. Widen it:

```ts
async function upsertUser(input: {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'intern' | 'company' | 'admin' | 'university';
}) {
```

- [ ] **Step 2: Add a `seedUniversity` block**

Add a new exported helper in `scripts/seed.ts` (before `runSeed`, after `seedSamAccounts`). It takes the already-resolved Yasmine + her internship id from `runSeed`'s context. The report's `internshipId` references Yasmine's Acme internship for realism:

```ts
// ============================================================
// University seed (Plan 2 demo): a coordinator persona + a demo university
// + 2 managed students (Yasmine is PLACED so the snapshot/phase populate) +
// one submitted rapport so the coordinator roster + review surface are
// clickable in localhost. Idempotent (email/slug-keyed, insert-if-absent).
// ============================================================
async function seedUniversity(ctx: {
  yasmineId: string;
  yasmineInternshipId: string;
}) {
  const { academicReports } = await import('../db/schema');
  const { organizationMembers } = await import('../db/schema');

  // 1. Coordinator persona (global role 'university').
  const prof = await upsertUser({
    clerkId: 'seed_user_prof_saidi',
    email: 'prof.saidi@enit.utm.tn',
    firstName: 'Nizar',
    lastName: 'Saidi',
    role: 'university',
  });
  if (prof.role !== 'university') {
    await db.update(users).set({ role: 'university', updatedAt: new Date() }).where(eq(users.id, prof.id));
  }

  // 2. Demo university org (kind='university', verified, owned by the coordinator).
  const uniSlug = 'enit-demo';
  let [uni] = await db.select().from(organizations).where(eq(organizations.slug, uniSlug)).limit(1);
  if (!uni) {
    [uni] = await db
      .insert(organizations)
      .values({
        ownerId: prof.id,
        kind: 'university',
        name: 'ENIT (demo)',
        slug: uniSlug,
        city: 'Tunis',
        country: 'Tunisia',
        verified: true,
        verificationStatus: 'verified',
      })
      .returning();
  }

  // 3. Coordinator owner membership on the university.
  const ensureMember = async (userId: string, role: 'owner' | 'student') => {
    const [existing] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, uni.id), eq(organizationMembers.userId, userId)))
      .limit(1);
    if (existing) return existing;
    const [m] = await db
      .insert(organizationMembers)
      .values({
        organizationId: uni.id,
        userId,
        email: role === 'owner' ? prof.email : 'student@demo',
        role,
        status: 'active',
        joinedAt: new Date(),
      })
      .returning();
    return m;
  };
  await ensureMember(prof.id, 'owner');

  // 4. Two managed students. Yasmine (PLACED in Acme) + a second student.
  await db
    .update(organizationMembers)
    .set({ email: 'yasmine@enit.utm.tn' })
    .where(and(eq(organizationMembers.organizationId, uni.id), eq(organizationMembers.userId, ctx.yasmineId)));
  // (the update above is a no-op if the row doesn't exist; ensureMember creates it)
  const yasmineMember = await ensureMember(ctx.yasmineId, 'student');
  // fix the placeholder email on first create
  if (yasmineMember.email === 'student@demo') {
    await db
      .update(organizationMembers)
      .set({ email: 'yasmine@enit.utm.tn' })
      .where(eq(organizationMembers.id, yasmineMember.id));
  }

  const student2 = await upsertUser({
    clerkId: 'seed_user_student_amine',
    email: 'amine@enit.utm.tn',
    firstName: 'Amine',
    lastName: 'Gharbi',
    role: 'intern',
  });
  const student2Member = await ensureMember(student2.id, 'student');
  if (student2Member.email === 'student@demo') {
    await db
      .update(organizationMembers)
      .set({ email: student2.email })
      .where(eq(organizationMembers.id, student2Member.id));
  }

  // 5. One submitted rapport for Yasmine (references her Acme internship).
  const [existingReport] = await db
    .select()
    .from(academicReports)
    .where(
      and(
        eq(academicReports.studentUserId, ctx.yasmineId),
        eq(academicReports.universityOrgId, uni.id),
      ),
    )
    .limit(1);
  if (!existingReport) {
    await db.insert(academicReports).values({
      studentUserId: ctx.yasmineId,
      universityOrgId: uni.id,
      internshipId: ctx.yasmineInternshipId,
      title: 'Rapport de stage — Brand audit',
      description: 'Premier jet du rapport de stage couvrant la phase de découverte.',
      status: 'submitted',
      version: 1,
      submittedAt: new Date(),
      fileName: 'rapport-stage-v1.pdf',
      fileType: 'application/pdf',
    });
  }

  console.log(
    `✓ University seed: ENIT (demo) + coordinator prof.saidi@enit.utm.tn (university role) + 2 managed students (Yasmine placed) + 1 submitted rapport`,
  );
}
```

> **Verify column names before writing:** `organization_members` insert needs the actual NOT NULL columns. Read `db/schema/organization-members.ts` for the exact set — at minimum `organizationId`, `email` (NOT NULL), `role`, `status`. The `invitedAt` column may be NOT NULL with a default; if the insert errors on a missing `invitedAt`, add `invitedAt: new Date()`. Adjust the insert to match the real schema before running. The placeholder `'student@demo'` email is immediately corrected per-row; alternatively, pass the real email into `ensureMember` as a param — cleaner; refactor if you prefer.

- [ ] **Step 3: Call `seedUniversity` from `runSeed`**

In `scripts/seed.ts`, `runSeed` resolves `yasmine` + `internship` (Yasmine's Acme "Visual designer — Brand audit" internship). After the `seedSamAccounts({...})` call (line ~2180), add:

```ts
  await seedUniversity({ yasmineId: yasmine.id, yasmineInternshipId: internship.id });
```

> `yasmine` and `internship` are both in scope at that point in `runSeed` (defined ~line 891 + ~947). Confirm `internship.id` is Yasmine's accepted-workspace internship (it is — her workspace is created from it at line ~987).

- [ ] **Step 4: Add the `university` redirect branch to dev-login**

In `modules/auth/dev-actions.ts`, the `devLoginAction` `dashHref` ternary (line 32-37) has no `university` branch — a coordinator would land on `/intern/dashboard`. Fix:

```ts
  const dashHref =
    user.role === 'admin'
      ? '/admin/dashboard'
      : user.role === 'company'
        ? '/company/dashboard'
        : user.role === 'university'
          ? '/university/dashboard'
          : '/intern/dashboard';
```

- [ ] **Step 5: Add the coordinator email to the dev-login persona picker**

In `app/[locale]/(auth)/dev/login/page.tsx`, the `SAM_EMAILS` array (line 10-14) is the persona list. Add the coordinator:

```ts
const SAM_EMAILS = [
  'hellowemakeitgrow@gmail.com',
  'dazzsemi@gmail.com',
  'sami.arif@thog.io',
  'prof.saidi@enit.utm.tn',
];
```

> The picker already renders `u.role` as a badge, so the coordinator shows as `university`. Clicking it sets the dev cookie + redirects to `/university/dashboard` (Step 4). Yasmine (`yasmine@enit.utm.tn`) is a managed student but is NOT in this picker — to demo the STUDENT side, either add her email here too, or sign in via the existing `sami.arif` (also a placed intern; if you want sami.arif managed instead of/in addition to Yasmine, add him as a `student` member in `seedUniversity` and create his report). **Decision: also add `yasmine@enit.utm.tn` to the picker** so both sides of the loop are clickable. Add it to the array.

- [ ] **Step 6: Run the seed (if DB reachable) + verify idempotency**

If a local Neon DB is reachable:

```bash
cd /Users/mac/code/inturn-hub/inturn && NODE_OPTIONS="--dns-result-order=ipv4first" pnpm db:seed
```

Run it **twice** — the second run must not duplicate the university, members, or report (all insert-if-absent). If the network is blocked locally, skip; verify the file typechecks (`pnpm typecheck`). Do NOT block the plan on a reachable DB.

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add scripts/seed.ts modules/auth/dev-actions.ts "app/[locale]/(auth)/dev/login/page.tsx"
git commit -m "$(cat <<'EOF'
feat(seed): demo university + coordinator persona + placed student + report

Adds a demo university (ENIT), a coordinator persona (global role university,
in the /dev/login picker), 2 managed students (Yasmine placed in the Acme
workspace so the snapshot/phase populate), and one submitted rapport — so the
coordinator roster + review surface and the student home are clickable in
localhost. Adds the university dev-login redirect branch. Idempotent.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Plan-1 hardening carry-forwards

**Files:**
- Modify: `modules/admin/users/server-actions.ts:87-94` (guard against demoting a `university` user)
- Modify: `modules/admin/users/__tests__/server-actions.test.ts` (add the guard test — create if absent)
- Modify: `components/platform-sidebar.tsx:63-80` (optional: explicit intern-array construction)
- Modify: `modules/team/authz.ts:18-24` (optional: wrap `getViewerMemberships` in `React.cache`)

Small, additive hardening. The primary item: `setUserRoleAction` must refuse to change a user whose CURRENT role is `university` (so an admin can't accidentally demote a coordinator via `/admin/users`, which would orphan their university org). The local `Role` union in that file is `'intern'|'company'|'admin'` (so setting a role TO `university` is already rejected) — we additionally block changing FROM `university`. The two optional items are quality polish flagged by Plan 1.

- [ ] **Step 1: Guard `setUserRoleAction` against changing a `university` user**

In `modules/admin/users/server-actions.ts`, after the `target` lookup + before the no-op check (after line 88, `if (!target) throw new Error('User not found');`):

```ts
  if (!target) throw new Error('User not found');

  // A university coordinator's global role is load-bearing (they own a
  // kind='university' org). Refuse to change it from /admin/users — demoting a
  // coordinator here would orphan their university. (Setting a role TO
  // 'university' is already impossible: it is not in this action's Role union.)
  if (target.role === 'university') {
    throw new Error('Cannot change a university coordinator role via this UI');
  }
```

> `target.role` is the DB enum, which now includes `'university'`, so this comparison typechecks. (`input.role` cannot be `'university'` — the local `ROLES` array excludes it — so no change there.)

- [ ] **Step 2: Add the guard test**

If `modules/admin/users/__tests__/server-actions.test.ts` exists, append a case; else create it mirroring the mock idiom from other admin-action tests:

```ts
  it('refuses to change a user whose current role is university', async () => {
    // requireAdmin → admin session; target.role === 'university'
    // expect setUserRoleAction({ userId, role: 'intern' }) to reject with the
    // coordinator-guard message; assert db.update was NOT called.
  });
```

> Fill in the concrete mock (mirror the existing `toggleSuspendAction`/`setUserRoleAction` test harness in the repo — find it with `find . -name 'server-actions.test.ts' -path '*admin*'`). If no admin-users test file exists, a minimal new file with this single guard case is acceptable; mock `requireAdmin`, the DB select (returns `{ role: 'university', ... }`), and assert the throw + no update.

- [ ] **Step 3 (optional polish): explicit intern-array construction in the sidebar**

In `components/platform-sidebar.tsx`, the `hasStudentMembership` branch uses `baseInternItems.splice(5, 0, {...})` (line 74-80) — a magic index. Replace the array-build with explicit construction so reordering the base items can't silently misplace the University link:

```ts
  const internItems: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/intern/dashboard',     label: tNav('dashboard'),    icon: LayoutDashboard },
    { href: '/intern/applications',  label: tNav('applications'), icon: Send },
    { href: '/intern/saved',         label: tNav('saved'),        icon: Bookmark },
    { href: '/intern/records',       label: tNav('records'),      icon: Award },
    { href: '/intern/community',     label: tNav('community'),    icon: MessagesSquare },
    ...(hasStudentMembership
      ? [{ href: '/intern/university', label: tNav('university'), icon: GraduationCap }]
      : []),
    { href: '/marketplace',          label: tNav('browse'),       icon: Compass },
  ];
```

Then use `internItems` instead of `baseInternItems` in the `role === 'intern'` branch (`role === 'intern' ? [...internItems, accountItem] : ...`). Delete the old `baseInternItems` + `splice` block.

> Optional — skip if you want to keep the sidebar diff out of this plan. It is a pure refactor; behavior is identical (University link still sits between Community and Browse).

- [ ] **Step 4 (optional polish): cache `getViewerMemberships`**

In `modules/team/authz.ts`, wrap `getViewerMemberships` in `React.cache` so the platform layout's membership check + any same-render reuse share one DB hit (the layout calls it for every intern render). Add `import { cache } from 'react';` (top) and:

```ts
export const getViewerMemberships = cache(async (userId: string): Promise<ViewerMembership[]> => {
  const rows = await db.select().from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')));
  return (rows as Array<{ organization_members: OrganizationMember; organizations: Organization }>)
    .map((r) => ({ ...r.organization_members, org: r.organizations }));
});
```

> Optional. `getCurrentOrg` already calls `getViewerMemberships`, and the student `/intern/university` page + the layout both call it per request — caching de-dupes. Skip if you want a tighter diff; it is a safe, behavior-preserving change.

- [ ] **Step 5: Verify + commit**

Run: `pnpm test modules/admin && pnpm typecheck && pnpm lint`
Expected: PASS (the new coordinator-guard test + existing admin tests green).

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/admin/users/server-actions.ts modules/admin/users/__tests__/server-actions.test.ts
# include these two only if you did the optional polish:
git add components/platform-sidebar.tsx modules/team/authz.ts
git commit -m "$(cat <<'EOF'
fix(admin): guard against demoting a university coordinator role

setUserRoleAction now refuses to change a user whose current global role is
'university' (demoting a coordinator via /admin/users would orphan their
university org). Optionally tidies the intern-sidebar array construction and
caches getViewerMemberships.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: i18n — new `academicReport` namespace + `university.*` additions (FR + EN)

**Files:**
- Modify: `locales/en.json`, `locales/fr.json`

A new top-level `academicReport` namespace (student home + version stack + comments + review bar + statuses) and additions to the existing `university` namespace (the coordinator review-surface keys + the dashboard "awaiting review"/`colReport`/`reportStatus.*` keys). FR is the unprefixed default; full FR/EN parity. **Staging hazard: stage only these hunks** (`git add -p`).

- [ ] **Step 1: Add the `academicReport` namespace (both locales)**

In `locales/en.json`, add a new top-level key (place it alphabetically — e.g. just before `"university"` at line ~1504, or anywhere among the top-level namespaces with valid JSON commas):

```json
  "academicReport": {
    "home": {
      "title": "My academic supervision",
      "subtitle": "Your university, your coordinator, and your internship report.",
      "notSupervised": "No university supervises you yet. When a coordinator invites you and you accept, your report will appear here.",
      "supervisedBy": "Supervised by",
      "noReport": "You haven't started your report yet.",
      "startReport": "Start my report",
      "versionsTitle": "Report versions",
      "commentsTitle": "Discussion",
      "noFile": "No file yet",
      "open": "Open"
    },
    "status": {
      "draft": "Draft",
      "submitted": "In review",
      "approved": "Approved",
      "revisionRequested": "Changes requested"
    },
    "upload": {
      "title": "Submit a new version",
      "helper": "PDF only · max 8 MB",
      "notePlaceholder": "Optional note for your coordinator…",
      "cancel": "Cancel",
      "send": "Submit",
      "sending": "Submitting…"
    },
    "comments": {
      "placeholder": "Write a message…",
      "empty": "No messages yet.",
      "post": "Send",
      "sending": "Sending…"
    },
    "review": {
      "submittedBy": "Submitted by {name}",
      "requestChanges": "Request changes",
      "approve": "Approve",
      "cancel": "Cancel",
      "feedbackPlaceholder": "What needs to change?",
      "sending": "Sending…"
    }
  },
```

In `locales/fr.json`, the parallel FR block:

```json
  "academicReport": {
    "home": {
      "title": "Mon suivi académique",
      "subtitle": "Votre université, votre encadrant et votre rapport de stage.",
      "notSupervised": "Aucune université ne vous encadre pour le moment. Lorsqu'un encadrant vous invite et que vous acceptez, votre rapport apparaît ici.",
      "supervisedBy": "Encadré par",
      "noReport": "Vous n'avez pas encore commencé votre rapport.",
      "startReport": "Démarrer mon rapport",
      "versionsTitle": "Versions du rapport",
      "commentsTitle": "Échanges",
      "noFile": "Aucun fichier",
      "open": "Ouvrir"
    },
    "status": {
      "draft": "Brouillon",
      "submitted": "En relecture",
      "approved": "Approuvé",
      "revisionRequested": "Révision demandée"
    },
    "upload": {
      "title": "Soumettre une nouvelle version",
      "helper": "PDF uniquement · max 8 Mo",
      "notePlaceholder": "Note facultative pour votre encadrant…",
      "cancel": "Annuler",
      "send": "Soumettre",
      "sending": "Envoi…"
    },
    "comments": {
      "placeholder": "Écrire un message…",
      "empty": "Aucun message pour le moment.",
      "post": "Envoyer",
      "sending": "Envoi…"
    },
    "review": {
      "submittedBy": "Soumis par {name}",
      "requestChanges": "Demander des modifications",
      "approve": "Approuver",
      "cancel": "Annuler",
      "feedbackPlaceholder": "Qu'est-ce qui doit changer ?",
      "sending": "Envoi…"
    }
  },
```

- [ ] **Step 2: Extend the `university` namespace (both locales)**

In `locales/en.json`, inside the existing `"university"` object: add the `review` sub-object and the new `dashboard` keys. Add to `"university.dashboard"` (after `"pendingTitle"`, en.json line 1541):

```json
      "pendingTitle": "Pending invitations",
      "awaitingReviewCount": "{count} awaiting review",
      "colReport": "Report",
      "reportStatus": {
        "none": "—",
        "draft": "Draft",
        "submitted": "In review",
        "approved": "Approved",
        "revisionRequested": "Changes requested"
      }
```

And add a `review` sibling to `university.admin`/`university.dashboard` (inside the `"university"` object):

```json
    "review": {
      "snapshotTitle": "Internship",
      "phaseOf": "Phase {current} of {total}",
      "weekOf": "Week {current} of {total}",
      "notPlaced": "Not yet placed.",
      "noReport": "This student hasn't submitted a report yet."
    }
```

In `locales/fr.json`, the parallel additions. `university.dashboard`:

```json
      "pendingTitle": "Invitations en attente",
      "awaitingReviewCount": "{count} à relire",
      "colReport": "Rapport",
      "reportStatus": {
        "none": "—",
        "draft": "Brouillon",
        "submitted": "En relecture",
        "approved": "Approuvé",
        "revisionRequested": "Révision demandée"
      }
```

`university.review`:

```json
    "review": {
      "snapshotTitle": "Stage",
      "phaseOf": "Phase {current} sur {total}",
      "weekOf": "Semaine {current} sur {total}",
      "notPlaced": "Pas encore en stage.",
      "noReport": "Cet étudiant n'a pas encore soumis de rapport."
    }
```

> JSON hygiene: mind the commas — when inserting `awaitingReviewCount`/`colReport`/`reportStatus` after `pendingTitle`, change `"pendingTitle": "…"` to end with a comma. The `review` block needs a comma after the object that precedes it. Validate after editing.

- [ ] **Step 3: Validate JSON + typecheck**

Run: `node -e "JSON.parse(require('fs').readFileSync('locales/fr.json','utf8'));JSON.parse(require('fs').readFileSync('locales/en.json','utf8'));console.log('json ok')" && pnpm typecheck`
Expected: `json ok` + typecheck PASS.

- [ ] **Step 4: Commit (locale hunks staged surgically)**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add -p locales/en.json locales/fr.json
git commit -m "$(cat <<'EOF'
feat(i18n): academicReport namespace + university review/dashboard keys

Adds the FR/EN academicReport namespace (student home, version stack,
comments, review bar, statuses) and extends university.* with the coordinator
review-surface keys + the dashboard awaiting-review / report-status keys.
Full FR/EN parity.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Final verification

**Files:** none (verification only).

Confirm the whole feature is green, the existing suite (383+ tests, ~552 cases across 49 files at the time of writing) is intact, and a production build passes.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: PASS. New suites green (`modules/review/__tests__/state-machine.test.ts`, `modules/academic-reports/__tests__/{service,queries,server-actions}.test.ts`, `lib/email/templates/__tests__/academic-report.test.ts`, the new `modules/notifications/__tests__/dispatcher.test.ts` cases, the new `modules/admin/users` guard case), and every pre-existing test still passes — in particular **deliverables** `service.test.ts` (re-pointed import) and the **moved** state-machine test under `modules/review`. If the count dropped below the prior baseline, a test broke — fix it, do not delete it.

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: 0 errors, 0 new lint violations.

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: PASS. If a Neon/network step hangs, prefix `NODE_OPTIONS="--dns-result-order=ipv4first" pnpm build`.

- [ ] **Step 4: Manual smoke (dev-bypass, both locales)**

With `DEV_AUTH_BYPASS=1` (prefix the dev server with `NODE_OPTIONS="--dns-result-order=ipv4first"` if needed) and after `pnpm db:seed`:
- `/dev/login` shows the **coordinator** persona (`prof.saidi@enit.utm.tn`, role `university`) and **Yasmine** (`yasmine@enit.utm.tn`).
- As **coordinator**: `/university/dashboard` (FR) + `/en/university/dashboard` — the roster shows Yasmine (placed: Acme · Visual designer, a phase pill) + Amine (not placed); an "awaiting review" count of 1; Yasmine's row links to `/university/students/[yasmineId]`.
- On the review surface: the firewalled snapshot renders (company/title/phase/week — and NO tasks/deliverables/brief), the rapport shows v1 "In review", the Approve / Request-revision bar is present. Approve it → status flips to Approved; the student gets a notification + email (check the console/Resend log). Request a revision (with feedback) → status flips to Changes requested.
- As **Yasmine** (student): `/intern/university` — the supervising university (ENIT) + the rapport status + version stack + comment thread; when status is `revision-requested`, the submit/resubmit upload zone appears. Post a comment from each side → both threads update.
- Confirm the coordinator NEVER sees Yasmine's workspace tasks/deliverables/comments anywhere on the review surface.

- [ ] **Step 5: Confirm migration idempotency once more (if DB reachable)**

Run `pnpm db:migrate` twice — the second run is a no-op (`academic_report_comments` guarded by `IF NOT EXISTS`).

- [ ] **Step 6: Final status**

Run: `git status && git log --oneline -14`
Expected: clean tree (all task commits present), branch `feat/university-academic-supervision`. **Do NOT push** — the lead reviews + merges.

---

## Out of scope (do NOT build here)

For the avoidance of doubt, none of the following are in this plan:

- Anything Plan 1 already shipped (the `academic_reports` table, `requireUniversityRole`, the global `university` role, `getStudentInternshipSnapshot`, `getManagedStudents`, the `/university/dashboard` roster, `/admin/universities`, provisioning + invite/accept, `inviteStudentAction`).
- The pre-existing `deliverable.*` dispatcher gap (the dispatcher fires for no `deliverable.*` event today). This plan wires `academicReport.*` cleanly; fixing the deliverable gap is a separate, adjacent task (flag it to Sam — see below).
- CSV bulk student invite, convention-de-stage PDF, `/for-universities` landing, billing/seats, per-student supervisor assignment, anonymized analytics, university self-service settings, `profiles.university_id` FK, a public share-token view for rapports (all spec non-goals).
- A comment-delete control on the report thread (v1 keeps the thread append-only; add later if Sam wants).
- Per-internship rapports (v1: one logical rapport per `(student, university)` pair, versioned; the schema leaves room but the UI surfaces the latest).

## Flagged for Sam (adjacent, not in scope)

- **`deliverable.*` dispatcher gap.** Pre-existing: company-side deliverable review fires no notification today (the dispatcher has no `deliverable.*` case). This plan deliberately does NOT touch it. If Sam wants parity, it's a small follow-up mirroring the `academicReport.*` cases added in Task 5.

