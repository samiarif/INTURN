# University Product — Foundation & Provisioning (Plan 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the schema + auth + provisioning foundation for the university product — admin-provisioned universities (an `organizations` row with `kind='university'`), a coordinator established via invite→accept (global role `university`, org ownership transferred), and a coordinator who invites students (`organization_members` with a new `role='student'`). Ship the `academic_reports` table (schema only), a firewalled sanitized internship-snapshot read, a shared phase util, and the admin + coordinator UI surfaces. NO report logic — that is Plan 2.

**Architecture:** *Extend, don't duplicate.* A university is an `organizations` row discriminated by a new `kind` column; the coordinator↔student relationship reuses `organization_members` + the existing `createInvite`/`acceptInvite` machinery; phase visibility is a dedicated firewalled projection (`getStudentInternshipSnapshot`) that physically cannot return private workspace columns — never `canViewWorkspace`. Two accept-flow touch-points (promote owner/admin of a university org to global `university`; transfer ownership to the accepting owner) are the only behavioral additions to the otherwise-reused invite flow. The `academic_reports` table is modeled on `deliverables` and lands now so it exists, but carries no service/actions/UI in this plan.

**Tech Stack:** Next.js 16 (App Router, async params), React 19, TypeScript strict, Drizzle ORM on Neon-http (no transactions — write-ordering instead), Clerk auth, next-intl (fr default unprefixed / en `/en`), Vitest, Tailwind v4 + CSS-variable tokens. Package manager is **pnpm**.

---

## Source spec

`docs/superpowers/specs/2026-05-30-university-product-foundation-design.md` (approved). Read it once before starting. This plan covers **rollout stages 1–3 + the isolation primitives** (schema/migration, auth + `phase.ts` + the snapshot firewall, provisioning + invite/accept, coordinator student-invite + roster, admin & coordinator UI, i18n). Stages 4 (the rapport review loop: `academic_reports` service/actions, the `modules/review/state-machine.ts` extraction, dispatcher cases + report email templates, the student `/intern/university` + coordinator per-student review surfaces) and the rich-dashboard polish are **Plan 2** and are explicitly out of scope here.

## Critical execution guardrails (read before Task 1)

- **Run all commands from `/Users/mac/code/inturn-hub/inturn`** (the shell cwd persists as the PARENT — always `cd inturn/` first). Package manager is **pnpm**, NOT npm.
- Tests/typecheck/lint: `pnpm test` (vitest run), `pnpm typecheck` (tsc --noEmit), `pnpm lint`, `pnpm build`. If a Neon/network step hangs, prefix `NODE_OPTIONS="--dns-result-order=ipv4first"`.
- **ADDITIVE ONLY.** Never delete working behavior, routes, i18n keys, form schemas, or passing tests. Where an existing test asserts a shape this plan widens (the two `acceptInvite` happy-path tests in `modules/team/__tests__/service.test.ts`), the test is **updated to match the new shape, not deleted**. Everything else stays byte-for-byte.
- **Migrations are hand-rolled** (see `scripts/migrate.ts` + `db/migrations/README.md`): the drizzle journal (`db/migrations/meta/`) is gitignored and out of sync — NOT authoritative. **Do NOT run `drizzle-kit generate`.** Hand-write the next-numbered `.sql` (after `0016` → **`0017`**) with `BEGIN; … COMMIT;` and `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` so re-runs are safe.
- **Drizzle `text(..., {enum:[...]})` is TS-only, NOT a DB CHECK constraint.** Widening `organization_members.role` to include `'student'` and adding `organizations.kind` with a TS enum therefore needs **no ALTER for constraints**. `0015_organization_members.sql` creates `role` as a bare `text NOT NULL DEFAULT 'supervisor'` with no CHECK (verified) — so the SQL only adds the `kind` column, the `comments.report_id` column, the `academic_reports` table, and indexes. **Ordering matters:** `academic_reports` must be `CREATE`d BEFORE the `comments.report_id` FK references it.
- **The #1 silent-bug risk (Task 2):** `modules/auth/session.ts` narrows the role to `'admin'|'company'|'intern'` in **THREE** independent spots — the dev-bypass block (~lines 39–42), the main JWT/DB path (~lines 77–82), and `roleFromClerkUser` (~lines 130–135). If any one is missed, a coordinator's `university` role **silently falls back to `'intern'`** and every `/university/*` guard fails open to a wrong redirect. ALL THREE must add `'university'`. The `requireUniversityRole` test is the regression guard.
- **Staging hazard:** `locales/en.json` / `locales/fr.json` may carry unrelated uncommitted hunks. When committing, **stage only this feature's hunks** — `git add <explicit file>` for files this plan owns exclusively, and `git add -p locales/en.json locales/fr.json` to stage ONLY the new `university` / `invite` keys. **Never `git add -A` or `git add .`.** If a locale diff is tangled, stop and ask Sam.
- Commit per task (Conventional Commits), trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Work on branch `feat/university-product` (already checked out). Do NOT push.
- Read `node_modules/next/dist/docs/` before any framework-shaped change (this is NOT stock Next.js).
- **No transactions** on neon-http: order writes (additive-first), then `recordEvent` fire-and-forget. Best-effort Clerk sync is always wrapped in try/catch (DB is the source of truth).

## File map

**Create**
- `db/schema/academic-reports.ts` — new `academic_reports` table + `AcademicReportRevision` type
- `db/migrations/0017_university_foundation.sql` — the one idempotent migration
- `modules/auth/__tests__/session.test.ts` — `requireUniversityRole` guard tests
- `modules/workspace/phase.ts` — lifted `computeCurrentPhase` + `MS_PER_DAY`
- `modules/workspace/__tests__/phase.test.ts` — phase-util boundary tests
- `modules/university/queries.ts` — `getStudentInternshipSnapshot` (firewall) + `getManagedStudents`
- `modules/university/__tests__/queries.test.ts` — firewall + roster tests
- `modules/university/service.ts` — `createUniversity`
- `modules/university/__tests__/service.test.ts` — `createUniversity` tests
- `modules/university/admin-actions.ts` — `createUniversityAction`, `inviteCoordinatorAction`
- `modules/university/server-actions.ts` — `inviteStudentAction`
- `modules/university/__tests__/admin-actions.test.ts` — admin-action tests
- `modules/university/__tests__/server-actions.test.ts` — coordinator-action tests
- `lib/email/templates/university-invite.ts` — coordinator + student invite templates (FR/EN)
- `lib/email/templates/__tests__/university-invite.test.ts` — template tests
- `app/[locale]/(platform)/admin/universities/page.tsx` — admin list + create + invite-coordinator
- `app/[locale]/(platform)/admin/universities/_create-university-form.tsx` — client form
- `app/[locale]/(platform)/admin/universities/_invite-coordinator-button.tsx` — client control
- `app/[locale]/(platform)/university/dashboard/page.tsx` — coordinator roster
- `app/[locale]/(platform)/university/_invite-student-button.tsx` — client control

**Modify**
- `db/schema/organizations.ts` — add `kind` column
- `db/schema/organization-members.ts` — widen `role` enum + doc comment
- `db/schema/comments.ts` — add nullable `reportId` + index
- `db/schema/index.ts` — export `academicReports` + types
- `modules/auth/types.ts` — add `'university'` to `ROLES`
- `modules/auth/session.ts` — THREE role narrowings + `requireUniversityRole`
- `modules/workspace/__tests__/queries.test.ts` — n/a (no change; listed only if a phase import moves — it does not)
- `app/[locale]/(platform)/company/projects/[projectId]/page.tsx` — import `computeCurrentPhase`/`MS_PER_DAY` from the new util; delete the local copies
- `modules/team/service.ts` — widen `createInvite` role param; extend `acceptInvite` return shape
- `modules/team/__tests__/service.test.ts` — update the two `acceptInvite` happy-path assertions to the new shape
- `modules/team/server-actions.ts` — extend `acceptInviteAction` (promote + ownership transfer on university accept)
- `modules/team/__tests__/server-actions.test.ts` — NEW file (none exists today) for the accept-action touch-points
- `modules/profiles/company-service.ts` — scope `ownerId` lookups/updates by `kind='company'`
- `modules/profiles/__tests__/company-service.test.ts` — assert the kind-scoped where (create if absent)
- `components/platform-sidebar.tsx` — `university` nav branch + conditional intern "University" link
- `locales/en.json`, `locales/fr.json` — new `university` namespace + `platformNav` keys + `invite` role-aware copy

---

## Task 1: Schema changes + migration 0017

**Files:**
- Modify: `db/schema/organizations.ts:18` (after `logoUrl`)
- Modify: `db/schema/organization-members.ts:27` (the `role` enum) and the doc comment at `:1-17`
- Create: `db/schema/academic-reports.ts`
- Modify: `db/schema/comments.ts:18` (after `deliverableId`) and the index list `:26-33`
- Modify: `db/schema/index.ts:16` (after the comments export)
- Create: `db/migrations/0017_university_foundation.sql`

Foundation for everything downstream. All additive: a new nullable/defaulted column on `organizations`, a widened TS-only enum on `organization_members` (no DB constraint to alter), a new table, and a new nullable polymorphic FK on `comments`. No backfill. Schema lands first; the hand-rolled idempotent migration mirrors `0015`/`0016`.

- [ ] **Step 1: Add `kind` to the organizations schema**

In `db/schema/organizations.ts`, add `kind` immediately after `logoUrl` (line 18):

```ts
    logoUrl: text('logo_url'),
    // 'company' (default, backfilled) | 'university'. A university is an
    // admin-provisioned org with a coordinator (owner member + global role
    // 'university') who supervises 'student'-role members. Company-only fields
    // (industry, size, rneUrl) simply stay null on a university row.
    kind: text('kind', { enum: ['company', 'university'] }).default('company').notNull(),
    rneUrl: text('rne_url'),
```

- [ ] **Step 2: Widen the member `role` enum + update the doc comment**

In `db/schema/organization-members.ts`, change the `role` column (line 27) from:

```ts
    role: text('role', { enum: ['owner', 'admin', 'supervisor'] })
      .notNull()
      .default('supervisor'),
```

to:

```ts
    role: text('role', { enum: ['owner', 'admin', 'supervisor', 'student'] })
      .notNull()
      .default('supervisor'),
```

Then extend the file doc-comment (lines 6–17) so the `student` semantic is documented. Replace the bullet list + trailing paragraph (lines 11–16) with:

```ts
 * - `owner`      — billing + everything; cannot be removed or demoted.
 * - `admin`      — full co-manager (projects/internships/applications/team).
 * - `supervisor` — scoped only to assigned projects (via `projects.supervisorIds`).
 * - `student`    — a managed academic-supervision relationship on a `kind='university'`
 *                  org ONLY. Additive + orthogonal to company staff: a student member
 *                  keeps their GLOBAL role `intern`. Staff-only reads (`canManageOrg`,
 *                  the workspace-derived `getOrgInterns`) never include `role='student'`.
 *
 * Pending invites live here too: a row with `status='invited'`, an `inviteToken`,
 * and (until accepted) a possibly-null `userId`. Company interns are NOT members —
 * they are derived from the `workspaces` table.
```

- [ ] **Step 3: Create the `academic_reports` schema**

Create `db/schema/academic-reports.ts` (modeled on `db/schema/deliverables.ts`; **no `workspaceId`** — `internshipId` is a plain nullable reference that never rides the workspace cascade):

```ts
import { pgTable, text, timestamp, uuid, integer, date, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { organizations } from './organizations';
import { internships } from './internships';

// Mirrors deliverables' DeliverableRevision shape (newest-first snapshots), but
// for the university↔student rapport académique axis. Defined here so the
// academic_reports table (and Plan 2's review loop) share one revision shape.
export type AcademicReportRevision = {
  version: number;
  submittedAt: string; // ISO
  submittedBy: string; // user id
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  note: string | null;
  status: 'submitted' | 'approved' | 'revision-requested';
  review?: {
    reviewerId: string;
    reviewedAt: string;
    state: 'approved' | 'changes';
    text: string;
  };
};

export const academicReports = pgTable(
  'academic_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // The managed student (global role stays 'intern'). Cascades on user delete.
    studentUserId: uuid('student_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // The supervising university org. Cascades on org delete.
    universityOrgId: uuid('university_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    // Internship context ONLY — a plain reference, never workspace-scoped. Nullable
    // (a student may be managed before placement). ON DELETE SET NULL so deleting
    // the internship orphans the rapport rather than cascading it away.
    internshipId: uuid('internship_id').references(() => internships.id, {
      onDelete: 'set null',
    }),
    title: text('title'),
    description: text('description'),
    fileUrl: text('file_url'),
    fileName: text('file_name'),
    fileType: text('file_type'),
    status: text('status', {
      enum: ['draft', 'submitted', 'approved', 'revision-requested'],
    })
      .default('draft')
      .notNull(),
    feedback: text('feedback'),
    version: integer('version').default(1).notNull(),
    submittedAt: timestamp('submitted_at'),
    dueDate: date('due_date'),
    revisionHistory: jsonb('revision_history')
      .$type<AcademicReportRevision[]>()
      .default([])
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('academic_reports_university_status_idx').on(table.universityOrgId, table.status),
    index('academic_reports_student_idx').on(table.studentUserId),
  ],
);

export type AcademicReport = typeof academicReports.$inferSelect;
export type NewAcademicReport = typeof academicReports.$inferInsert;
```

- [ ] **Step 4: Add `reportId` to the comments schema**

In `db/schema/comments.ts`, import `academicReports` (after the `deliverables` import, line 5) and add the polymorphic `reportId` column + index. First the import:

```ts
import { deliverables } from './deliverables';
import { academicReports } from './academic-reports';
import { users } from './users';
```

Then add `reportId` immediately after `deliverableId` (line 18):

```ts
    deliverableId: uuid('deliverable_id').references(() => deliverables.id, { onDelete: 'cascade' }),
    // Polymorphic, mirrors taskId/deliverableId: set for a comment on a student's
    // academic report (university↔student thread). Nullable; app-layer invariant
    // that exactly one target column is set.
    reportId: uuid('report_id').references(() => academicReports.id, { onDelete: 'cascade' }),
```

Then add the index to the index list (after `comments_deliverable_idx`, line 29):

```ts
    index('comments_deliverable_idx').on(table.deliverableId),
    index('comments_report_idx').on(table.reportId),
```

- [ ] **Step 5: Export `academicReports` from the schema barrel**

In `db/schema/index.ts`, add after the comments export (line 16):

```ts
export { comments, type Comment, type NewComment } from './comments';
export {
  academicReports,
  type AcademicReport,
  type NewAcademicReport,
  type AcademicReportRevision,
} from './academic-reports';
```

- [ ] **Step 6: Hand-write the idempotent migration**

Create `db/migrations/0017_university_foundation.sql`. **Order:** `organizations.kind` → `academic_reports` table (must exist before the FK) → `comments.report_id` FK → indexes. (No `role` ALTER: the enum is TS-only and `0015` created `role` with no DB CHECK.)

```sql
-- 0017: university product foundation.
--   * organizations.kind discriminator ('company' default | 'university')
--   * academic_reports table (rapport académique; modeled on deliverables, NO workspace_id)
--   * comments.report_id polymorphic FK (mirrors task_id / deliverable_id)
-- organization_members.role gains 'student' in the Drizzle TS enum only — there is
-- NO DB CHECK on that column (see 0015_organization_members.sql), so no ALTER here.
-- Additive, idempotent (safe to re-run). Hand-rolled — the drizzle journal is out
-- of sync (see scripts/migrate.ts + db/migrations/README.md).

BEGIN;

-- 1. organizations.kind — existing rows backfill to 'company' via the default.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'company';

-- 2. academic_reports — created BEFORE comments.report_id references it.
CREATE TABLE IF NOT EXISTS academic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  university_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  internship_id uuid REFERENCES internships(id) ON DELETE SET NULL,
  title text,
  description text,
  file_url text,
  file_name text,
  file_type text,
  status text NOT NULL DEFAULT 'draft',
  feedback text,
  version integer NOT NULL DEFAULT 1,
  submitted_at timestamp,
  due_date date,
  revision_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academic_reports_university_status_idx
  ON academic_reports (university_org_id, status);
CREATE INDEX IF NOT EXISTS academic_reports_student_idx
  ON academic_reports (student_user_id);

-- 3. comments.report_id — polymorphic FK + thread index (mirrors deliverable_id).
ALTER TABLE comments ADD COLUMN IF NOT EXISTS report_id uuid
  REFERENCES academic_reports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_report_idx ON comments (report_id);

COMMIT;
```

- [ ] **Step 7: Verify the schema typechecks**

Run: `pnpm typecheck`
Expected: PASS (0 errors). `Organization['kind']` is now `'company' | 'university'`, `MemberRole` widens to include `'student'`, `AcademicReport` / `AcademicReportRevision` are exported, and `Comment['reportId']` is `string | null`.

- [ ] **Step 8: Apply the migration (optional, local) + sanity-check it is idempotent**

If a local Neon DB is reachable: `cd /Users/mac/code/inturn-hub/inturn && NODE_OPTIONS="--dns-result-order=ipv4first" pnpm db:migrate` then run it a **second** time — the re-run must be a no-op (every statement guarded by `IF NOT EXISTS`). If the network is blocked locally, skip; the prebuild runner applies it in CI. Do NOT run `drizzle-kit generate`.

- [ ] **Step 9: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add db/schema/organizations.ts db/schema/organization-members.ts db/schema/academic-reports.ts db/schema/comments.ts db/schema/index.ts db/migrations/0017_university_foundation.sql
git commit -m "$(cat <<'EOF'
feat(db): university foundation schema + migration 0017

Adds organizations.kind discriminator, widens organization_members.role
with 'student' (TS-only enum; no DB CHECK to alter), creates the
academic_reports table (modeled on deliverables, no workspace_id), and a
nullable comments.report_id polymorphic FK. Additive + idempotent;
academic_reports carries no service/UI yet (Plan 2).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Global `university` role + `requireUniversityRole` guard

**Files:**
- Modify: `modules/auth/types.ts:1`
- Modify: `modules/auth/session.ts:39-42`, `:77-82`, `:113-117` (add guard after `requireAdmin`), `:130-135`
- Create: `modules/auth/__tests__/session.test.ts`

This is the **#1 silent-bug risk** — three independent role narrowings must all gain `'university'` or a coordinator falls back to `'intern'`. TDD: write the `requireUniversityRole` guard tests first (they exercise the new role end-to-end through a mocked session), watch them fail, then widen `ROLES` + all three narrowings + add the guard.

- [ ] **Step 1: Write the failing guard tests**

Create `modules/auth/__tests__/session.test.ts`. `requireUniversityRole` calls `requireSession` internally, so we mock the module's own `requireSession` via `vi.spyOn` after importing — but since `requireSession` and `requireUniversityRole` live in the same module, mock the underlying `getSession` (which `requireSession` calls). Mock Clerk + DB to neutralize import side-effects:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Neutralize the module's import-time deps (Clerk + DB + dev-auth). We drive
// behavior purely through the mocked getSession return below.
const getSessionMock = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ users: {}, organizations: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));
vi.mock('@/lib/dev-auth', () => ({
  getDevImpersonatedClerkId: vi.fn(),
  isDevAuthBypassed: vi.fn(() => false),
}));

// requireUniversityRole composes requireSession → getSession. We can't easily
// spy on requireSession (same module), so stub getSession, the single seam both
// requireSession and requireUniversityRole funnel through.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: (fn: unknown) => fn };
});

import * as session from '../session';

beforeEach(() => {
  vi.restoreAllMocks();
});

function stubSession(role: string | null) {
  vi.spyOn(session, 'getSession').mockResolvedValue(
    role === null
      ? null
      : ({ clerkId: 'c1', user: { id: 'u1', suspendedAt: null }, role } as never),
  );
}

describe('requireUniversityRole', () => {
  it('passes for global role university', async () => {
    stubSession('university');
    const s = await session.requireUniversityRole();
    expect(s.role).toBe('university');
  });

  it('passes for admin (admin is a superset)', async () => {
    stubSession('admin');
    const s = await session.requireUniversityRole();
    expect(s.role).toBe('admin');
  });

  it('throws Forbidden for intern', async () => {
    stubSession('intern');
    await expect(session.requireUniversityRole()).rejects.toThrow('Forbidden');
  });

  it('throws Forbidden for company', async () => {
    stubSession('company');
    await expect(session.requireUniversityRole()).rejects.toThrow('Forbidden');
  });

  it('throws Unauthorized when unauthenticated', async () => {
    stubSession(null);
    await expect(session.requireUniversityRole()).rejects.toThrow('Unauthorized');
  });
});
```

> **Note on the spy seam:** `requireSession` calls `getSession`. Because both are exported from the same module, `vi.spyOn(session, 'getSession')` only re-points the binding if the call site reads it off the module namespace. If `requireSession` calls a local `getSession` reference directly (it does — `const session = await getSession()`), the spy will NOT intercept it. **If the spy doesn't take, fall back to mocking the whole module** with a partial that stubs `requireSession` and re-exports the real `requireUniversityRole`:
>
> ```ts
> vi.mock('../session', async (importOriginal) => {
>   const actual = await importOriginal<typeof import('../session')>();
>   return { ...actual, requireSession: vi.fn() };
> });
> import { requireUniversityRole, requireSession } from '../session';
> const mockRequireSession = vi.mocked(requireSession);
> // then mockRequireSession.mockResolvedValue({ role: 'university', ... } as never)
> ```
>
> Prefer whichever the existing repo tests demonstrate works; `modules/internships/__tests__/server-actions.test.ts` mocks `@/modules/auth/session` wholesale (lines 17–22) — that is the proven pattern in this codebase, so **use the module-mock fallback** and stub `requireSession` directly. Adjust the import block above to match before running.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test modules/auth/__tests__/session.test.ts`
Expected: FAIL — `requireUniversityRole` does not exist yet (import/reference error), and even once stubbed, the `university` role would be narrowed away. This proves both the missing guard and the narrowing risk are caught.

- [ ] **Step 3: Widen `ROLES`**

In `modules/auth/types.ts`, line 1:

```ts
export const ROLES = ['intern', 'company', 'admin', 'university'] as const;
```

`SELECTABLE_ROLES` stays `['intern', 'company']` — `university` is provisioning-only, never self-selected.

- [ ] **Step 4: Add `'university'` to ALL THREE role narrowings in `session.ts`**

**(a)** Dev-bypass block (lines 39–42):

```ts
        const role: Role =
          user.role === 'admin' ||
          user.role === 'company' ||
          user.role === 'intern' ||
          user.role === 'university'
            ? user.role
            : 'intern';
```

**(b)** Main JWT/DB path (lines 77–82):

```ts
  const role: Role =
    claimedRole === 'admin' ||
    claimedRole === 'company' ||
    claimedRole === 'intern' ||
    claimedRole === 'university'
      ? claimedRole
      : user.role === 'admin' ||
          user.role === 'company' ||
          user.role === 'intern' ||
          user.role === 'university'
        ? user.role
        : 'intern';
```

**(c)** `roleFromClerkUser` (lines 130–135):

```ts
export async function roleFromClerkUser(clerkId: string): Promise<Role | undefined> {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkId);
  const raw = user.publicMetadata.role;
  if (raw === 'admin' || raw === 'company' || raw === 'intern' || raw === 'university') return raw;
  return undefined;
}
```

- [ ] **Step 5: Add the `requireUniversityRole` guard after `requireAdmin`**

In `modules/auth/session.ts`, immediately after `requireAdmin` (after line 117):

```ts
/**
 * Require global role university (or admin, a superset) or throw. Gates every
 * /university/* route + coordinator server action. Mirrors requireAdmin: this
 * is the GLOBAL-role gate; per-org owner/admin scoping is layered on top via
 * requireOrgRole in the coordinator actions.
 */
export async function requireUniversityRole(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== 'university' && session.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return session;
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm test modules/auth/__tests__/session.test.ts && pnpm typecheck`
Expected: PASS (5/5 guard cases; `Role` now includes `'university'` so `setUserRoleAction`'s `Role` union in `modules/admin/users/server-actions.ts` is unaffected — that file defines its own local `Role` type and needs no change in Plan 1 — the coordinator's `university` role is set on invite-accept in Task 6, not via setUserRoleAction).

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/auth/types.ts modules/auth/session.ts modules/auth/__tests__/session.test.ts
git commit -m "$(cat <<'EOF'
feat(auth): add university global role + requireUniversityRole guard

Widens ROLES with 'university' and threads it through ALL THREE role
narrowings in session.ts (dev-bypass, JWT/DB path, roleFromClerkUser) so
a coordinator's role no longer silently falls back to 'intern'. Adds the
requireUniversityRole guard (passes for university or admin) with tests.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Shared `computeCurrentPhase` util

**Files:**
- Create: `modules/workspace/phase.ts`
- Create: `modules/workspace/__tests__/phase.test.ts`
- Modify: `app/[locale]/(platform)/company/projects/[projectId]/page.tsx:43` (delete local `MS_PER_DAY` use stays — see note), `:69-82` (delete local `computeCurrentPhase`), import from the util

Lift the inline `computeCurrentPhase` (currently a page-local helper in the company project hub) into a shared, tested util so the company page and the firewalled snapshot (Task 4) use one formula. TDD: write the util's tests first against the lifted-but-not-yet-existing module, watch them fail, create the module verbatim, watch them pass, THEN re-point the page.

- [ ] **Step 1: Write the failing phase-util tests**

Create `modules/workspace/__tests__/phase.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeCurrentPhase } from '../phase';

// Fixed "now" so week math is deterministic. startDate at day 0; each phase
// is a [fromWeek, toWeek] inclusive window on the 1-based project clock.
const start = new Date('2026-01-01T00:00:00Z');
const phases = [
  { fromWeek: 1, toWeek: 2 },
  { fromWeek: 3, toWeek: 4 },
  { fromWeek: 5, toWeek: 6 },
];
const dayMs = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(start.getTime() + days * dayMs);

describe('computeCurrentPhase', () => {
  it('returns 0 when there is no startDate', () => {
    expect(computeCurrentPhase(phases, null, at(20))).toBe(0);
  });

  it('returns 0 when there are no phases', () => {
    expect(computeCurrentPhase([], start, at(20))).toBe(0);
  });

  it('returns phase 0 in week 1 (day 0)', () => {
    expect(computeCurrentPhase(phases, start, at(0))).toBe(0);
  });

  it('returns phase 0 at the week 1→2 boundary (still phase 0)', () => {
    // day 8 → elapsedWeeks = floor(8/7)+1 = 2 → within [1,2] → phase 0
    expect(computeCurrentPhase(phases, start, at(8))).toBe(0);
  });

  it('returns phase 1 in week 3 (day 14 → week 3)', () => {
    // day 14 → floor(14/7)+1 = 3 → within [3,4] → phase 1
    expect(computeCurrentPhase(phases, start, at(14))).toBe(1);
  });

  it('returns phase 2 in week 5', () => {
    // day 28 → floor(28/7)+1 = 5 → within [5,6] → phase 2
    expect(computeCurrentPhase(phases, start, at(28))).toBe(2);
  });

  it('clamps to the last phase past the end of the arc', () => {
    // day 70 → week 11, beyond all windows → max(0, len-1) = 2
    expect(computeCurrentPhase(phases, start, at(70))).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test modules/workspace/__tests__/phase.test.ts`
Expected: FAIL — `modules/workspace/phase.ts` does not exist (module-not-found).

- [ ] **Step 3: Create the util — lift VERBATIM from the page**

Create `modules/workspace/phase.ts` (the function body is byte-for-byte the page's lines 70–82; `MS_PER_DAY` is the page's line 43 constant):

```ts
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Active 1-based phase index, or -1 if we're outside the project clock. */
export function computeCurrentPhase(
  phases: Array<{ fromWeek: number; toWeek: number }>,
  startDate: Date | null,
  now = new Date(),
): number {
  if (!startDate || phases.length === 0) return 0;
  const elapsedWeeks = Math.floor((now.getTime() - startDate.getTime()) / MS_PER_DAY / 7) + 1;
  for (let i = 0; i < phases.length; i++) {
    if (elapsedWeeks >= phases[i].fromWeek && elapsedWeeks <= phases[i].toWeek) return i;
  }
  // Past the last phase → consider the project at handoff.
  return Math.max(0, phases.length - 1);
}
```

> Note: the JSDoc says "or -1" but the implementation returns 0 / clamps — this is the EXISTING (slightly stale) comment lifted verbatim. Do NOT "fix" it; matching the source exactly keeps the diff a pure move. The tests above assert the real behavior (0 / clamp), not the comment.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test modules/workspace/__tests__/phase.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: Re-point the company project page to the util**

In `app/[locale]/(platform)/company/projects/[projectId]/page.tsx`:

(a) Add the import alongside the other `@/modules/...` imports (after line 26, the `getActiveMembership` import):

```ts
import { getActiveMembership, canManageOrg } from '@/modules/team/authz';
import { computeCurrentPhase } from '@/modules/workspace/phase';
```

(b) **Delete** the local `computeCurrentPhase` function (lines 69–82, the `/** Active 1-based phase index … */` block through its closing brace).

(c) `MS_PER_DAY` (line 43): check whether anything ELSE in the file still uses it after the function is removed. **If `MS_PER_DAY` has no other references, delete line 43 too** (the lifted util owns its own copy). If it is still referenced elsewhere in the page, leave it. Verify with: `grep -n 'MS_PER_DAY' app/\[locale\]/\(platform\)/company/projects/\[projectId\]/page.tsx` — keep it only if the count is > 0 after removing the function.

- [ ] **Step 6: Verify the page still typechecks + the existing suite is green**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. The page now imports `computeCurrentPhase`; behavior is identical (pure move). No existing test covered the page helper directly, so nothing else changes.

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/workspace/phase.ts modules/workspace/__tests__/phase.test.ts "app/[locale]/(platform)/company/projects/[projectId]/page.tsx"
git commit -m "$(cat <<'EOF'
refactor(workspace): extract computeCurrentPhase into a shared util

Lifts the inline phase-index helper out of the company project page into
modules/workspace/phase.ts (with boundary tests) so the page and the
upcoming firewalled university snapshot share one formula. Pure move.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Sanitized snapshot firewall — `getStudentInternshipSnapshot`

**Files:**
- Create: `modules/university/queries.ts`
- Create: `modules/university/__tests__/queries.test.ts`

The privacy core. A dedicated read that finds a student's most-recent workspace and returns ONLY the safe projection — structurally incapable of returning tasks/deliverables/comments/brief/goals/phase descriptions/raw week boundaries. Uses the lifted `computeCurrentPhase` (Task 3) + the existing `computeWeekOfTotal` (`modules/workspace/queries.ts:27`). The coordinator NEVER passes `canViewWorkspace`. TDD: assert the returned shape contains none of the private fields + the not-placed branch returns null, watch fail, implement, watch pass.

- [ ] **Step 1: Write the failing firewall tests**

Create `modules/university/__tests__/queries.test.ts`. Mock the DB select chain (FIFO queue, mirroring `modules/team/__tests__/service.test.ts`). The snapshot does: (1) select newest workspace by `internId` joined to internships + organizations, (2) load the project for `phases`. Queue those two:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    return chain;
  }
  const db = { select: vi.fn(() => makeSelectChain()) };
  return { db, selectQueue };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  workspaces: {}, internships: {}, organizations: {}, projects: {}, users: {},
  organizationMembers: {}, profiles: {},
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and'), desc: vi.fn(() => 'desc'),
}));

import { getStudentInternshipSnapshot } from '../queries';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

// The fields the snapshot is ALLOWED to surface.
const ALLOWED = [
  'companyName', 'internshipTitle', 'startDate', 'endDate', 'durationWeeks',
  'status', 'currentPhaseIndex', 'phaseCount', 'phaseNames', 'weekCurrent', 'weekTotal',
];
// Fields that must NEVER leak (private workspace internals).
const FORBIDDEN = [
  'tasks', 'deliverables', 'comments', 'brief', 'goals', 'supervisorIds',
  'workspaceId', 'internId', 'fromWeek', 'toWeek', 'description', 'phases',
  'notes', 'feedback',
];

describe('getStudentInternshipSnapshot — firewall', () => {
  it('returns null when the student has no workspace ("not yet placed")', async () => {
    mocks.selectQueue.push([]); // no workspace row
    const snap = await getStudentInternshipSnapshot('student-1');
    expect(snap).toBeNull();
  });

  it('returns ONLY the safe projection (no private fields)', async () => {
    // Row 1: workspace + internship + organization join.
    mocks.selectQueue.push([
      {
        workspaceId: 'ws1',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2026-03-26',
        durationWeeks: 12,
        companyName: 'Acme',
        internshipTitle: 'Brand audit',
        projectId: 'proj1',
      },
    ]);
    // Row 2: project (only phases needed).
    mocks.selectQueue.push([
      {
        phases: [
          { name: 'Discovery', description: 'SECRET', fromWeek: 1, toWeek: 4 },
          { name: 'Build', description: 'SECRET', fromWeek: 5, toWeek: 12 },
        ],
        startDate: '2026-01-01',
      },
    ]);

    const snap = await getStudentInternshipSnapshot('student-1');
    expect(snap).not.toBeNull();
    const keys = Object.keys(snap!);

    // Every returned key is on the allow-list.
    for (const k of keys) expect(ALLOWED).toContain(k);
    // None of the forbidden keys are present at the top level.
    for (const f of FORBIDDEN) expect(keys).not.toContain(f);

    // phaseNames carries ONLY names — never descriptions or week boundaries.
    expect(snap!.phaseNames).toEqual(['Discovery', 'Build']);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('fromWeek');
    expect(serialized).not.toContain('toWeek');

    expect(snap!.phaseCount).toBe(2);
    expect(snap!.companyName).toBe('Acme');
    expect(snap!.internshipTitle).toBe('Brand audit');
    expect(typeof snap!.currentPhaseIndex).toBe('number');
    expect(snap!.weekTotal).toBe(12);
  });

  it('handles a placed student with no project/phases (empty phase arc)', async () => {
    mocks.selectQueue.push([
      {
        workspaceId: 'ws1', status: 'active', startDate: '2026-01-01',
        endDate: '2026-03-26', durationWeeks: 12, companyName: 'Acme',
        internshipTitle: 'Brand audit', projectId: null,
      },
    ]);
    // No second select happens when projectId is null — but if the impl always
    // queries, queue an empty result so the FIFO doesn't underflow.
    mocks.selectQueue.push([]);

    const snap = await getStudentInternshipSnapshot('student-1');
    expect(snap).not.toBeNull();
    expect(snap!.phaseNames).toEqual([]);
    expect(snap!.phaseCount).toBe(0);
    expect(snap!.currentPhaseIndex).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test modules/university/__tests__/queries.test.ts`
Expected: FAIL — `modules/university/queries.ts` does not exist.

- [ ] **Step 3: Implement the firewall**

Create `modules/university/queries.ts`. The duration source: `internships.duration` (weeks). The snapshot SELECT lists explicit safe columns only — it never selects `projects.brief`, `projects.goals`, `tasks`, `deliverables`, `comments`, or phase descriptions:

```ts
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { workspaces, internships, organizations, projects } from '@/db/schema';
import { computeCurrentPhase } from '@/modules/workspace/phase';
import { computeWeekOfTotal } from '@/modules/workspace/queries';

/**
 * The ONLY phase-visibility surface a coordinator gets. A separate read path
 * that physically cannot return private workspace columns (tasks, deliverables,
 * comments, brief, goals, phase descriptions, raw week boundaries) — structural
 * isolation, NOT post-fetch filtering. Returns null for a managed-but-unplaced
 * student. The coordinator never passes canViewWorkspace.
 *
 * Caller is responsible for the membership gate (only call for a student you
 * manage) — this read does no auth itself, matching the queries layer convention.
 */
export type StudentInternshipSnapshot = {
  companyName: string;
  internshipTitle: string;
  startDate: string | null;
  endDate: string | null;
  durationWeeks: number;
  status: string | null;
  currentPhaseIndex: number;
  phaseCount: number;
  phaseNames: string[];
  weekCurrent: number;
  weekTotal: number;
};

export async function getStudentInternshipSnapshot(
  studentUserId: string,
): Promise<StudentInternshipSnapshot | null> {
  // 1. Most-recent workspace for this student + the SAFE company/internship fields.
  const [ws] = await db
    .select({
      workspaceId: workspaces.id,
      status: workspaces.status,
      startDate: workspaces.startDate,
      endDate: workspaces.endDate,
      durationWeeks: internships.duration,
      companyName: organizations.name,
      internshipTitle: internships.title,
      projectId: internships.projectId,
    })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .where(eq(workspaces.internId, studentUserId))
    .orderBy(desc(workspaces.createdAt))
    .limit(1);

  if (!ws) return null; // managed but not yet placed

  // 2. Phase NAMES only (+ project startDate for the phase clock). Never brief/goals.
  let phaseNames: string[] = [];
  let phaseArc: Array<{ fromWeek: number; toWeek: number }> = [];
  let phaseStart: Date | null = ws.startDate ? new Date(ws.startDate) : null;
  if (ws.projectId) {
    const [proj] = await db
      .select({ phases: projects.phases, startDate: projects.startDate })
      .from(projects)
      .where(eq(projects.id, ws.projectId))
      .limit(1);
    const phases = (proj?.phases ?? []) as Array<{
      name: string;
      fromWeek: number;
      toWeek: number;
    }>;
    phaseNames = phases.map((p) => p.name);
    phaseArc = phases.map((p) => ({ fromWeek: p.fromWeek, toWeek: p.toWeek }));
    if (proj?.startDate) phaseStart = new Date(proj.startDate);
  }

  const durationWeeks = ws.durationWeeks ?? 0;
  const { current: weekCurrent, total: weekTotal } = computeWeekOfTotal(
    phaseStart,
    durationWeeks,
  );

  return {
    companyName: ws.companyName,
    internshipTitle: ws.internshipTitle,
    startDate: ws.startDate,
    endDate: ws.endDate,
    durationWeeks,
    status: ws.status,
    currentPhaseIndex: computeCurrentPhase(phaseArc, phaseStart),
    phaseCount: phaseNames.length,
    phaseNames,
    weekCurrent,
    weekTotal,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test modules/university/__tests__/queries.test.ts`
Expected: PASS (3/3). The allow-list/forbidden-list assertions prove the projection is sealed.

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/university/queries.ts modules/university/__tests__/queries.test.ts
git commit -m "$(cat <<'EOF'
feat(university): firewalled getStudentInternshipSnapshot read

A sealed projection of a student's internship (company, title, dates,
time-derived phase name+index) for the coordinator — structurally unable
to return tasks/deliverables/comments/brief/goals/phase descriptions/raw
week boundaries. Returns null for a managed-but-unplaced student. Tests
assert the shape contains no private fields.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Widen `createInvite` + extend `acceptInvite` return shape

**Files:**
- Modify: `modules/team/service.ts:32-38` (`createInvite` role param) and `:72-139` (`acceptInvite` signature + return)
- Modify: `modules/team/__tests__/service.test.ts:307-352` (the two `acceptInvite` happy-path assertions)

Widen `createInvite`'s `role` to the full member-role union so coordinator (`owner`) and student (`student`) invites are typeable. Extend `acceptInvite` to additionally load the org row and return `{ ok: true; orgId; role; orgKind }` so the action layer (Task 6) can branch on whether this was a university accept. Existing failure reasons unchanged. **The two happy-path tests assert the old `{ ok: true, orgId }` shape — update them, don't break them.** TDD-light: update the tests to the new shape first (red against current impl), then widen the service (green).

- [ ] **Step 1: Update the two `acceptInvite` happy-path tests to the new shape**

In `modules/team/__tests__/service.test.ts`:

(a) The "flips to active" test (lines 307–329) needs the org-row select queued (the new impl loads the org after flipping the member) and the assertion widened. Replace the test body's queue + assertion:

```ts
  it('flips to active and returns { ok, orgId, role, orgKind } on happy path', async () => {
    const member = makeMember({
      status: 'invited',
      role: 'admin',
      email: 'alice@example.com',
      inviteExpiresAt: new Date(Date.now() + 3600_000),
      pendingProjectIds: [],
    });
    mocks.selectQueue.push([member]);
    // NEW: acceptInvite now loads the org row (by member.organizationId) to
    // return its kind. Queue it after the member select.
    mocks.selectQueue.push([{ id: 'org-1', kind: 'company' }]);

    const result = await acceptInvite({
      token: 'tok123',
      userId: 'new-user-id',
      userEmail: 'alice@example.com',
    });

    expect(result).toEqual({ ok: true, orgId: 'org-1', role: 'admin', orgKind: 'company' });
    expect(mocks.callOrder).toContain('update');
    const updateSet = mocks.db.update.mock.results[0]?.value.set;
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', userId: 'new-user-id' }),
    );
  });
```

(b) The "updates project supervisorIds" test (lines 331–352) needs the org-row select queued too. The order is: member select → (member flip update) → org select → per-project selects/updates. **The org-row load happens before OR after the project fan-out depending on impl; to keep the FIFO robust, the impl (Step 2) loads the org row LAST** (right before returning). Update the queue:

```ts
  it('updates project supervisorIds for each pendingProjectId on accept', async () => {
    const member = makeMember({
      status: 'invited',
      email: 'alice@example.com',
      inviteExpiresAt: new Date(Date.now() + 3600_000),
      pendingProjectIds: ['proj-1', 'proj-2'],
    });
    mocks.selectQueue.push([member]);
    // For each project: select to get current supervisorIds
    mocks.selectQueue.push([{ id: 'proj-1', supervisorIds: ['existing-user'] }]);
    mocks.selectQueue.push([{ id: 'proj-2', supervisorIds: [] }]);
    // NEW: org-row load (last select before return)
    mocks.selectQueue.push([{ id: 'org-1', kind: 'company' }]);

    const result = await acceptInvite({
      token: 'tok123',
      userId: 'new-user-id',
      userEmail: 'alice@example.com',
    });

    expect(result).toMatchObject({ ok: true, orgKind: 'company' });
    // 1 member update + 2 project updates
    expect(mocks.db.update).toHaveBeenCalledTimes(3);
  });
```

(c) Add `organizations` to the `@/db/schema` mock if it is not already present. It is **not** in the current mock (lines 79–84 mock only `organizationMembers`, `projects`, `users`, `organizations`)— wait: line 83 already mocks `organizations: { id: 'org_id' }`. **Verify** by reading; if present, no change. If absent, add `organizations: { id: 'org_id' },`.

- [ ] **Step 2: Run to verify the updated tests fail**

Run: `pnpm test modules/team/__tests__/service.test.ts`
Expected: FAIL — the two happy-path tests now expect `role` + `orgKind` in the result, which the current `acceptInvite` does not return; and the queued org-row select is consumed by a load that does not exist yet. Other `acceptInvite` cases (not_found / expired / mismatch / already_member) and all other describe blocks stay green.

- [ ] **Step 3: Widen `createInvite`'s role param**

In `modules/team/service.ts`, change `createInvite`'s signature (lines 32–38). Import the `MemberRole` type at the top (line 14 already imports `OrganizationMember`):

```ts
import type { MemberRole, OrganizationMember } from '@/db/schema';
```

Then widen the param:

```ts
export async function createInvite(input: {
  orgId: string;
  email: string;
  role: 'owner' | 'admin' | 'supervisor' | 'student';
  projectIds?: string[];
  invitedByUserId: string;
}): Promise<{ member: OrganizationMember; token: string }> {
```

(The `MemberRole` import is also used by Step 4's return type; if lint flags it unused before Step 4 lands within the same task, that's fine — both land before the task's verify step.)

- [ ] **Step 4: Extend `acceptInvite` to load the org + return role/orgKind**

In `modules/team/service.ts`:

(a) Import `organizations` (line 13 currently imports `organizationMembers, projects, users`):

```ts
import { organizationMembers, organizations, projects, users } from '@/db/schema';
```

(b) Widen the return type (lines 76–79):

```ts
): Promise<
  | { ok: true; orgId: string; role: MemberRole; orgKind: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'email_mismatch' | 'already_member' }
> {
```

(c) Replace the final return (line 138, `return { ok: true, orgId: member.organizationId };`) with an org-row load + the wider shape:

```ts
  // Load the org row to report its kind (company | university) so the action
  // layer can branch on a university accept (promote + ownership transfer).
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, member.organizationId))
    .limit(1);

  return {
    ok: true,
    orgId: member.organizationId,
    role: member.role as MemberRole,
    orgKind: (org?.kind as string) ?? 'company',
  };
```

- [ ] **Step 5: Run to verify the suite passes**

Run: `pnpm test modules/team/__tests__/service.test.ts && pnpm typecheck`
Expected: PASS. The two updated happy-path tests now match `{ ok, orgId, role, orgKind }`; all failure-path + other-function tests untouched and green.

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/team/service.ts modules/team/__tests__/service.test.ts
git commit -m "$(cat <<'EOF'
feat(team): widen createInvite role + acceptInvite returns role/orgKind

createInvite now accepts owner|admin|supervisor|student (coordinator and
student invites). acceptInvite additionally loads the org and returns
{ role, orgKind } so the action layer can branch on a university accept.
Existing failure reasons unchanged; the two happy-path tests are updated
to the wider shape.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Extend `acceptInviteAction` — university promotion + ownership transfer

**Files:**
- Modify: `modules/team/server-actions.ts:88-117`
- Create: `modules/team/__tests__/server-actions.test.ts`

After a successful accept, if `orgKind === 'university'`: when `role` is `'owner'|'admin'`, promote the user's GLOBAL role to `'university'` (DB write + best-effort Clerk sync, COPYING the try/catch pattern from `modules/admin/users/server-actions.ts:96-109`); and when `role === 'owner'`, set `organizations.ownerId = user.id` (transfer from the provisioning admin). Company accepts (`orgKind === 'company'`) are entirely unaffected. TDD: new test file, write the three cases (university-owner promote+transfer / university-admin promote-only / company unaffected) red, implement, green.

- [ ] **Step 1: Write the failing action tests**

Create `modules/team/__tests__/server-actions.test.ts`. Mock `acceptInvite` (the service), the DB, Clerk, cookies, and `next/cache`. Capture the `users` + `organizations` updates:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const userUpdates: Array<Record<string, unknown>> = [];
  const orgUpdates: Array<Record<string, unknown>> = [];
  // update(table).set(payload).where(...) — route by a tag on the table mock.
  const db = {
    update: vi.fn((table: { __t?: string }) => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        if (table.__t === 'users') userUpdates.push(payload);
        else if (table.__t === 'organizations') orgUpdates.push(payload);
        return { where: vi.fn(() => Promise.resolve([])) };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) })) })),
    })),
  };
  const clerkUpdateUser = vi.fn(async () => ({}));
  return { db, userUpdates, orgUpdates, clerkUpdateUser };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  users: { __t: 'users', id: 'u' },
  organizations: { __t: 'organizations', id: 'o' },
  organizationMembers: { __t: 'members', id: 'm' },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));

const requireActiveSession = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireActiveSession: (...a: unknown[]) => requireActiveSession(...a),
}));

const acceptInvite = vi.fn();
vi.mock('../service', () => ({ acceptInvite: (...a: unknown[]) => acceptInvite(...a) }));

vi.mock('../authz', () => ({
  requireOrgRole: vi.fn(),
  ACTIVE_ORG_COOKIE: 'inturn-active-org',
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: vi.fn() })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({ users: { updateUser: mocks.clerkUpdateUser } })),
}));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/email/templates/team-invite', () => ({ teamInviteTemplate: vi.fn(() => ({ subject: '', text: '', html: '' })) }));
vi.mock('@/lib/ratelimit', () => ({ ratelimit: vi.fn(() => ({ limit: vi.fn(() => ({ success: true })) })) }));

import { acceptInviteAction } from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userUpdates.length = 0;
  mocks.orgUpdates.length = 0;
  requireActiveSession.mockResolvedValue({
    user: { id: 'user-1', email: 'coord@uni.edu', clerkId: 'clerk-1' },
  });
});

describe('acceptInviteAction — university touch-points', () => {
  it('university owner: promotes global role + transfers org ownership', async () => {
    acceptInvite.mockResolvedValue({ ok: true, orgId: 'uni-1', role: 'owner', orgKind: 'university' });

    const res = await acceptInviteAction({ token: 't' });

    expect(res).toEqual({ ok: true, orgId: 'uni-1' });
    // Global role promoted to 'university'.
    expect(mocks.userUpdates.some((u) => u.role === 'university')).toBe(true);
    // Ownership transferred to the accepting user.
    expect(mocks.orgUpdates.some((o) => o.ownerId === 'user-1')).toBe(true);
    // Best-effort Clerk sync attempted.
    expect(mocks.clerkUpdateUser).toHaveBeenCalledWith(
      'clerk-1',
      expect.objectContaining({ publicMetadata: { role: 'university' } }),
    );
  });

  it('university admin: promotes global role but does NOT transfer ownership', async () => {
    acceptInvite.mockResolvedValue({ ok: true, orgId: 'uni-1', role: 'admin', orgKind: 'university' });

    await acceptInviteAction({ token: 't' });

    expect(mocks.userUpdates.some((u) => u.role === 'university')).toBe(true);
    expect(mocks.orgUpdates).toHaveLength(0); // no ownership transfer for admin
  });

  it('company accept: no promotion, no transfer (unaffected)', async () => {
    acceptInvite.mockResolvedValue({ ok: true, orgId: 'co-1', role: 'admin', orgKind: 'company' });

    const res = await acceptInviteAction({ token: 't' });

    expect(res).toEqual({ ok: true, orgId: 'co-1' });
    expect(mocks.userUpdates).toHaveLength(0);
    expect(mocks.orgUpdates).toHaveLength(0);
    expect(mocks.clerkUpdateUser).not.toHaveBeenCalled();
  });

  it('Clerk sync failure does not break promotion (DB is source of truth)', async () => {
    acceptInvite.mockResolvedValue({ ok: true, orgId: 'uni-1', role: 'owner', orgKind: 'university' });
    mocks.clerkUpdateUser.mockRejectedValueOnce(new Error('offline'));

    const res = await acceptInviteAction({ token: 't' });

    expect(res).toEqual({ ok: true, orgId: 'uni-1' });
    expect(mocks.userUpdates.some((u) => u.role === 'university')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test modules/team/__tests__/server-actions.test.ts`
Expected: FAIL — the current `acceptInviteAction` does no promotion/transfer, so `userUpdates`/`orgUpdates` stay empty and Clerk is never called.

- [ ] **Step 3: Extend `acceptInviteAction`**

In `modules/team/server-actions.ts`:

(a) Add imports — `users` to the schema import (line 7) and `clerkClient`:

```ts
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { organizations, organizationMembers, users } from '@/db/schema';
```

(b) Replace the body between the successful-accept guard and the cookie set (lines 103–113). The result now carries `role` + `orgKind`:

```ts
    if (!result.ok) return result;

    // University touch-points (company accepts are unaffected). On a university
    // org, an owner/admin runs the supervision side, so promote their GLOBAL role
    // to 'university' (DB-first + best-effort Clerk sync — pattern copied from
    // modules/admin/users/server-actions.ts). An owner additionally takes over
    // org ownership from the provisioning admin.
    if (result.orgKind === 'university') {
      if (result.role === 'owner' || result.role === 'admin') {
        await db
          .update(users)
          .set({ role: 'university', updatedAt: new Date() })
          .where(eq(users.id, user.id));

        // Best-effort Clerk sync. Swallow + log any failure (offline / dev-bypass).
        try {
          const clerk = await clerkClient();
          await clerk.users.updateUser(user.clerkId, {
            publicMetadata: { role: 'university' },
          });
        } catch (err) {
          console.error(
            '[team/acceptInvite] clerk role sync failed (DB role is source of truth):',
            err,
          );
        }
      }
      if (result.role === 'owner') {
        await db
          .update(organizations)
          .set({ ownerId: user.id, updatedAt: new Date() })
          .where(eq(organizations.id, result.orgId));
      }
    }

    // Set the accepted org as the active org cookie
    (await cookies()).set(ACTIVE_ORG_COOKIE, result.orgId, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    revalidatePath('/company/team');
    return { ok: true, orgId: result.orgId };
```

> `eq` is already imported (line 5). `user` is already destructured from `requireActiveSession` (line 95). The return type union of `acceptInviteAction` already lists the failure reasons; the success branch stays `{ ok: true, orgId }`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test modules/team/__tests__/server-actions.test.ts && pnpm typecheck`
Expected: PASS (4/4). Company path empty; university owner promotes+transfers; university admin promotes only; Clerk failure tolerated.

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/team/server-actions.ts modules/team/__tests__/server-actions.test.ts
git commit -m "$(cat <<'EOF'
feat(team): promote + transfer ownership on university invite accept

When an owner/admin accepts an invite to a kind='university' org, promote
their global role to 'university' (DB-first + best-effort Clerk sync); an
owner additionally takes org ownership from the provisioning admin.
Company accepts are unaffected.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: University service + admin provisioning + invite email + company-service kind-scoping

**Files:**
- Create: `modules/university/service.ts`
- Create: `modules/university/__tests__/service.test.ts`
- Create: `lib/email/templates/university-invite.ts`
- Create: `lib/email/templates/__tests__/university-invite.test.ts`
- Create: `modules/university/admin-actions.ts`
- Create: `modules/university/__tests__/admin-actions.test.ts`
- Modify: `modules/profiles/company-service.ts:15-21`, `:52-67`
- Create: `modules/profiles/__tests__/company-service.test.ts`

Five pieces: (1) `createUniversity` service, (2) the FR/EN coordinator invite email template, (3) the two admin actions, (4) the company-service kind-scoping touch-point so a coordinator who also owns a company isn't conflated, plus tests for each. Reuses `createInvite` (role `owner`) for the coordinator invite. TDD throughout.

- [ ] **Step 1: Write the failing `createUniversity` tests**

Create `modules/university/__tests__/service.test.ts` (mirrors the role-selection mock idiom):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReturning, mockInsert, mockRecordEvent } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockRecordEvent = vi.fn().mockResolvedValue({});
  return { mockReturning, mockValues, mockInsert, mockRecordEvent };
});

vi.mock('@/db', () => ({ db: { insert: mockInsert } }));
vi.mock('@/db/schema', () => ({ organizations: { _: 'organizations' } }));
vi.mock('@/modules/events/service', () => ({ recordEvent: mockRecordEvent }));

import { createUniversity } from '../service';

beforeEach(() => {
  vi.clearAllMocks();
  mockReturning.mockResolvedValue([{ id: 'uni-1', name: 'ESPRIT', kind: 'university' }]);
});

describe('createUniversity', () => {
  it('inserts a kind=university org owned by the provisioning admin, verified', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'ESPRIT', city: 'Tunis', country: 'TN' });

    const values = mockInsert.mock.results[0]?.value.values;
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'admin-1',
        kind: 'university',
        name: 'ESPRIT',
        city: 'Tunis',
        country: 'TN',
        verified: true,
        verificationStatus: 'verified',
      }),
    );
  });

  it('auto-generates a slug from the name when none is given', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'École Supérieure', city: 'Tunis', country: 'TN' });
    const values = mockInsert.mock.results[0]?.value.values;
    const arg = values.mock.calls[0][0];
    expect(typeof arg.slug).toBe('string');
    expect(arg.slug.length).toBeGreaterThan(0);
    expect(arg.slug).toMatch(/^[a-z0-9-]+$/); // slugified
  });

  it('uses the provided slug verbatim when given', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'X', slug: 'custom-slug', city: 'T', country: 'TN' });
    const values = mockInsert.mock.results[0]?.value.values;
    expect(values.mock.calls[0][0].slug).toBe('custom-slug');
  });

  it('records an organization.created event', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'ESPRIT', city: 'Tunis', country: 'TN' });
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'organization.created', actorId: 'admin-1', targetId: 'uni-1' }),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test modules/university/__tests__/service.test.ts`
Expected: FAIL — `modules/university/service.ts` does not exist.

- [ ] **Step 3: Implement `createUniversity`**

Create `modules/university/service.ts` (slugify copied from `company-service.ts:7-13`; auto-slug adds a short random suffix to dodge the unique constraint, mirroring `company-service.ts:23`):

```ts
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { recordEvent } from '@/modules/events/service';
import type { Organization } from '@/db/schema';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

/**
 * Admin-provisioned university org. Trusted on creation (verified=true,
 * verificationStatus='verified') — no RNE/verification quiz (company-only).
 * The provisioning admin is the initial ownerId; ownership transfers to the
 * coordinator when they accept the owner invite (see acceptInviteAction).
 */
export async function createUniversity(input: {
  adminId: string;
  name: string;
  slug?: string;
  city: string;
  country: string;
}): Promise<Organization> {
  const slug = input.slug ?? `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;

  const [created] = await db
    .insert(organizations)
    .values({
      ownerId: input.adminId,
      kind: 'university',
      name: input.name,
      slug,
      city: input.city,
      country: input.country,
      verified: true,
      verificationStatus: 'verified',
    })
    .returning();

  await recordEvent({
    type: 'organization.created',
    actorId: input.adminId,
    targetType: 'organization',
    targetId: created.id,
    metadata: { name: input.name, kind: 'university' },
  });

  return created;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test modules/university/__tests__/service.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Write the failing invite-email template tests**

Create `lib/email/templates/__tests__/university-invite.test.ts` (mirrors the team-invite + application-status template test style):

```ts
import { describe, it, expect } from 'vitest';
import { universityInviteTemplate } from '../university-invite';

describe('universityInviteTemplate', () => {
  const base = { universityName: 'ESPRIT', inviterName: 'Admin', token: 'tok123' } as const;

  it('renders the coordinator EN variant with the invite link', () => {
    const tpl = universityInviteTemplate({ ...base, variant: 'coordinator', locale: 'en' });
    expect(tpl.subject).toContain('ESPRIT');
    expect(tpl.html).toContain('/invite/tok123');
    expect(tpl.html.toLowerCase()).toContain('coordinator');
  });

  it('renders the coordinator FR variant', () => {
    const tpl = universityInviteTemplate({ ...base, variant: 'coordinator', locale: 'fr' });
    expect(tpl.html).toContain('/invite/tok123');
    expect(tpl.html.toLowerCase()).toContain('encadrant');
  });

  it('renders the student EN variant', () => {
    const tpl = universityInviteTemplate({ ...base, variant: 'student', locale: 'en' });
    expect(tpl.html).toContain('/invite/tok123');
    expect(tpl.html.toLowerCase()).toContain('invited');
  });

  it('escapes the university name', () => {
    const tpl = universityInviteTemplate({
      ...base, universityName: '<x>', variant: 'student', locale: 'en',
    });
    expect(tpl.html).toContain('&lt;x&gt;');
    expect(tpl.html).not.toContain('<x>');
  });
});
```

- [ ] **Step 6: Run to verify it fails, then implement the template**

Run: `pnpm test lib/email/templates/__tests__/university-invite.test.ts` → FAIL (module missing).

Create `lib/email/templates/university-invite.ts` (modeled on `team-invite.ts`; one factory, two `variant`s):

```ts
import { baseUrl, emailLayout, escapeHtml } from './_layout';

export function universityInviteTemplate({
  universityName,
  inviterName,
  token,
  variant,
  locale,
}: {
  universityName: string;
  inviterName: string;
  token: string;
  variant: 'coordinator' | 'student';
  locale: 'fr' | 'en';
}): { subject: string; text: string; html: string } {
  const fr = locale !== 'en';
  const ctaHref = `${baseUrl()}/invite/${token}`;
  const uni = escapeHtml(universityName);
  const inviter = escapeHtml(inviterName);

  const subject = fr
    ? variant === 'coordinator'
      ? `Vous êtes invité(e) à encadrer ${uni} sur Inturn`
      : `${uni} vous invite sur Inturn`
    : variant === 'coordinator'
      ? `You're invited to coordinate ${uni} on Inturn`
      : `${uni} invited you to Inturn`;

  const bodyHtml = fr
    ? variant === 'coordinator'
      ? `<p><strong>${inviter}</strong> vous invite à rejoindre <strong>${uni}</strong> en tant qu'<strong>encadrant académique</strong> sur Inturn — vous pourrez inviter vos étudiants et suivre l'avancement de leurs stages.</p>
<p>Cliquez ci-dessous pour accepter. Ce lien expire dans 7 jours.</p>`
      : `<p><strong>${uni}</strong> vous invite à rejoindre Inturn pour le suivi académique de votre stage.</p>
<p>Cliquez ci-dessous pour accepter. Ce lien expire dans 7 jours.</p>`
    : variant === 'coordinator'
      ? `<p><strong>${inviter}</strong> has invited you to join <strong>${uni}</strong> as an <strong>academic coordinator</strong> on Inturn — you'll be able to invite your students and follow their internship progress.</p>
<p>Click below to accept. This link expires in 7 days.</p>`
      : `<p><strong>${uni}</strong> invited you to join Inturn for academic supervision of your internship.</p>
<p>Click below to accept. This link expires in 7 days.</p>`;

  const ctaLabel = fr ? "Accepter l'invitation" : 'Accept invitation';

  return {
    ...emailLayout({ title: subject, bodyHtml, ctaLabel, ctaHref }),
    subject,
  };
}
```

Run again → PASS (4/4).

- [ ] **Step 7: Write the failing admin-action tests**

Create `modules/university/__tests__/admin-actions.test.ts`. Mock `requireAdmin`, `createUniversity`, `createInvite`, `sendEmail`, the DB (for the org lookup in `inviteCoordinatorAction`), and `next/cache`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/modules/auth/session', () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));

const createUniversity = vi.fn();
vi.mock('../service', () => ({ createUniversity: (...a: unknown[]) => createUniversity(...a) }));

const createInvite = vi.fn();
vi.mock('@/modules/team/service', () => ({ createInvite: (...a: unknown[]) => createInvite(...a) }));

const sendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('@/lib/email/templates/university-invite', () => ({
  universityInviteTemplate: vi.fn(() => ({ subject: 's', text: 't', html: 'h' })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const orgLimit = vi.fn();
vi.mock('@/db', () => ({
  db: { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: orgLimit })) })) })) },
}));
vi.mock('@/db/schema', () => ({ organizations: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and') }));

import { createUniversityAction, inviteCoordinatorAction } from '../admin-actions';

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1', firstName: 'A', lastName: 'B', email: 'a@x.com', localePref: 'fr' } });
});

describe('createUniversityAction', () => {
  it('requires admin and delegates to createUniversity', async () => {
    createUniversity.mockResolvedValue({ id: 'uni-1' });
    const res = await createUniversityAction({ name: 'ESPRIT', city: 'Tunis', country: 'TN' });
    expect(requireAdmin).toHaveBeenCalled();
    expect(createUniversity).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 'admin-1', name: 'ESPRIT', city: 'Tunis', country: 'TN' }),
    );
    expect(res).toEqual({ ok: true, orgId: 'uni-1' });
  });

  it('returns an error result when not admin', async () => {
    requireAdmin.mockRejectedValue(new Error('Forbidden'));
    const res = await createUniversityAction({ name: 'X', city: 'T', country: 'TN' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
  });
});

describe('inviteCoordinatorAction', () => {
  it('creates an owner invite on the university org + sends the coordinator email', async () => {
    orgLimit.mockResolvedValue([{ id: 'uni-1', name: 'ESPRIT', kind: 'university' }]);
    createInvite.mockResolvedValue({ member: { email: 'coord@uni.edu' }, token: 'tok' });

    const res = await inviteCoordinatorAction({ universityOrgId: 'uni-1', email: 'coord@uni.edu' });

    expect(requireAdmin).toHaveBeenCalled();
    expect(createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'uni-1', email: 'coord@uni.edu', role: 'owner', invitedByUserId: 'admin-1' }),
    );
    expect(sendEmail).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('rejects when the org is not a university', async () => {
    orgLimit.mockResolvedValue([{ id: 'co-1', name: 'Acme', kind: 'company' }]);
    const res = await inviteCoordinatorAction({ universityOrgId: 'co-1', email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'not_a_university' });
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('rejects when the org does not exist', async () => {
    orgLimit.mockResolvedValue([]);
    const res = await inviteCoordinatorAction({ universityOrgId: 'missing', email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'org_not_found' });
  });
});
```

- [ ] **Step 8: Run to verify it fails, then implement the admin actions**

Run: `pnpm test modules/university/__tests__/admin-actions.test.ts` → FAIL (module missing).

Create `modules/university/admin-actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { requireAdmin } from '@/modules/auth/session';
import { createUniversity } from './service';
import { createInvite } from '@/modules/team/service';
import { universityInviteTemplate } from '@/lib/email/templates/university-invite';
import { sendEmail } from '@/lib/email';

export async function createUniversityAction(input: {
  name: string;
  slug?: string;
  city: string;
  country: string;
}): Promise<{ ok: true; orgId: string } | { ok: false; error: string }> {
  try {
    const { user } = await requireAdmin();
    const org = await createUniversity({
      adminId: user.id,
      name: input.name,
      slug: input.slug,
      city: input.city,
      country: input.country,
    });
    revalidatePath('/admin/universities');
    return { ok: true, orgId: org.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function inviteCoordinatorAction(input: {
  universityOrgId: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireAdmin();

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.universityOrgId))
      .limit(1);
    if (!org) return { ok: false, error: 'org_not_found' };
    if (org.kind !== 'university') return { ok: false, error: 'not_a_university' };

    const { member, token } = await createInvite({
      orgId: input.universityOrgId,
      email: input.email,
      role: 'owner',
      invitedByUserId: user.id,
    });

    const inviterName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';

    const { subject, text, html } = universityInviteTemplate({
      universityName: org.name,
      inviterName,
      token,
      variant: 'coordinator',
      locale,
    });

    await sendEmail({
      to: member.email,
      subject,
      text,
      html,
      tags: [{ name: 'type', value: 'university.invite' }],
    });

    revalidatePath('/admin/universities');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
```

Run again → PASS.

- [ ] **Step 9: Write the failing company-service kind-scoping test, then apply the scoping**

The current `createOrUpdateCompanyProfile` keys off `ownerId` alone — a coordinator who also owns a company org would collide. Create `modules/profiles/__tests__/company-service.test.ts` asserting the lookup/update is scoped by `kind='company'`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { selectWhere, updateWhere, insertReturning, mockRecordEvent, andSpy, eqSpy } = vi.hoisted(() => {
  const selectWhere = vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) }));
  const updateWhere = vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 'co-1' }])) }));
  const insertReturning = vi.fn(() => Promise.resolve([{ id: 'co-1' }]));
  const mockRecordEvent = vi.fn().mockResolvedValue({});
  const andSpy = vi.fn((...args: unknown[]) => ({ __and: args }));
  const eqSpy = vi.fn((col: unknown, val: unknown) => ({ __eq: [col, val] }));
  return { selectWhere, updateWhere, insertReturning, mockRecordEvent, andSpy, eqSpy };
});

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: selectWhere })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: insertReturning })) })),
  },
}));
vi.mock('@/db/schema', () => ({ organizations: { ownerId: 'owner_col', kind: 'kind_col' } }));
vi.mock('@/modules/events/service', () => ({ recordEvent: mockRecordEvent }));
vi.mock('drizzle-orm', () => ({ and: andSpy, eq: eqSpy }));

import { createOrUpdateCompanyProfile } from '../company-service';

beforeEach(() => vi.clearAllMocks());

const input = {
  name: 'Acme', industry: 'Tech', size: '11-50', country: 'TN', city: 'Tunis',
  description: 'd', website: '', logoUrl: null, rneUrl: null,
} as never;

describe('createOrUpdateCompanyProfile — kind scoping', () => {
  it('scopes the ownerId lookup by kind=company (insert path)', async () => {
    await createOrUpdateCompanyProfile('user-1', input);
    // The where clause is an AND of ownerId + kind='company'.
    expect(andSpy).toHaveBeenCalled();
    expect(eqSpy).toHaveBeenCalledWith('kind_col', 'company');
  });
});
```

Then apply the scoping in `modules/profiles/company-service.ts`. Add `and` to the drizzle import (line 3) and `import { eq, and } from 'drizzle-orm';`. Scope the SELECT (lines 16–20):

```ts
  const existing = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.ownerId, userId), eq(organizations.kind, 'company')))
    .limit(1);
```

And the UPDATE's `.where()` (line 66):

```ts
    .where(and(eq(organizations.ownerId, userId), eq(organizations.kind, 'company')))
```

Run: `pnpm test modules/profiles/__tests__/company-service.test.ts` → PASS.

> If a `modules/profiles/__tests__/company-service.test.ts` already exists, **append** the kind-scoping describe block instead of overwriting, and reconcile the mock with the existing one.

- [ ] **Step 10: Full verify for this task**

Run: `pnpm test modules/university modules/profiles lib/email/templates/__tests__/university-invite.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/university/service.ts modules/university/__tests__/service.test.ts modules/university/admin-actions.ts modules/university/__tests__/admin-actions.test.ts lib/email/templates/university-invite.ts lib/email/templates/__tests__/university-invite.test.ts modules/profiles/company-service.ts modules/profiles/__tests__/company-service.test.ts
git commit -m "$(cat <<'EOF'
feat(university): provisioning service, admin actions, invite email

Adds createUniversity (admin-provisioned, verified org), createUniversityAction
+ inviteCoordinatorAction (requireAdmin, reuse createInvite role=owner), the
FR/EN university invite email (coordinator + student variants), and scopes
the company-profile upsert by kind='company' so a coordinator who also owns
a company isn't conflated.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Coordinator student-invite + managed-students roster

**Files:**
- Create: `modules/university/server-actions.ts`
- Create: `modules/university/__tests__/server-actions.test.ts`
- Modify: `modules/university/queries.ts` (add `getManagedStudents`)
- Modify: `modules/university/__tests__/queries.test.ts` (add roster tests)

`inviteStudentAction` (requireUniversityRole → resolve the coordinator's university org via `getCurrentOrg` → `requireOrgRole(['owner','admin'])` → `createInvite` role `'student'` + student-variant email). `getManagedStudents(universityOrgId)` returns active `student`-role members joined to `users` + `profiles`. TDD for both.

- [ ] **Step 1: Add the failing roster tests to the queries test file**

Append to `modules/university/__tests__/queries.test.ts` (the DB mock already exists from Task 4; `getManagedStudents` runs ONE select returning the joined rows):

```ts
import { getManagedStudents } from '../queries';

describe('getManagedStudents', () => {
  it('returns active student-role members with user + profile fields', async () => {
    mocks.selectQueue.push([
      {
        memberId: 'm1',
        userId: 'stu-1',
        firstName: 'Lina',
        lastName: 'Ben',
        email: 'lina@uni.edu',
        imageUrl: null,
        university: 'ESPRIT',
        fieldOfStudy: 'Design',
        invitedAt: new Date('2026-01-01'),
        joinedAt: new Date('2026-01-02'),
      },
    ]);

    const rows = await getManagedStudents('uni-1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: 'stu-1', firstName: 'Lina', university: 'ESPRIT' });
  });

  it('returns [] when the university has no managed students', async () => {
    mocks.selectQueue.push([]);
    const rows = await getManagedStudents('uni-1');
    expect(rows).toEqual([]);
  });
});
```

> Add `profiles: {}` to the existing `@/db/schema` mock in this file if it is not already there (Task 4's mock list included `profiles: {}` — verify).

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test modules/university/__tests__/queries.test.ts`
Expected: FAIL — `getManagedStudents` is not exported yet.

- [ ] **Step 3: Implement `getManagedStudents`**

Append to `modules/university/queries.ts`. Add the needed imports to the existing import block (`and`, `organizationMembers`, `users`, `profiles`):

```ts
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  workspaces,
  internships,
  organizations,
  projects,
  organizationMembers,
  users,
  profiles,
} from '@/db/schema';
```

Then the function (mirrors `getOrgMembers` + the profile join shape from `getOrgInterns`):

```ts
export type ManagedStudent = {
  memberId: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  invitedAt: Date;
  joinedAt: Date | null;
};

/**
 * Active student-role members of a university org, joined to the user + their
 * profile (field/university for the roster card). Staff members (owner/admin)
 * are excluded — this is the supervised-students list only.
 */
export async function getManagedStudents(universityOrgId: string): Promise<ManagedStudent[]> {
  const rows = await db
    .select({
      memberId: organizationMembers.id,
      userId: organizationMembers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: organizationMembers.email,
      imageUrl: users.imageUrl,
      university: profiles.university,
      fieldOfStudy: profiles.fieldOfStudy,
      invitedAt: organizationMembers.invitedAt,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .leftJoin(users, eq(users.id, organizationMembers.userId))
    .leftJoin(profiles, eq(profiles.userId, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.organizationId, universityOrgId),
        eq(organizationMembers.role, 'student'),
        eq(organizationMembers.status, 'active'),
      ),
    )
    .orderBy(desc(organizationMembers.joinedAt));

  return rows as ManagedStudent[];
}
```

> **Verify `profiles.fieldOfStudy` exists** — read `db/schema/profiles.ts` before writing. If the field/year column is named differently (e.g. `field`, `studyField`, `year`), use the actual column. If there is no field-of-study column at all, drop `fieldOfStudy` from the select + type (keep `university`). This is the one column name to confirm against the real schema.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test modules/university/__tests__/queries.test.ts`
Expected: PASS (Task 4's 3 + the 2 roster cases).

- [ ] **Step 5: Write the failing `inviteStudentAction` tests**

Create `modules/university/__tests__/server-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireUniversityRole = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireUniversityRole: (...a: unknown[]) => requireUniversityRole(...a),
}));

const getCurrentOrg = vi.fn();
const requireOrgRole = vi.fn();
vi.mock('@/modules/team/authz', () => ({
  getCurrentOrg: (...a: unknown[]) => getCurrentOrg(...a),
  requireOrgRole: (...a: unknown[]) => requireOrgRole(...a),
}));

const createInvite = vi.fn();
vi.mock('@/modules/team/service', () => ({ createInvite: (...a: unknown[]) => createInvite(...a) }));

const sendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('@/lib/email/templates/university-invite', () => ({
  universityInviteTemplate: vi.fn(() => ({ subject: 's', text: 't', html: 'h' })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({
  ratelimit: vi.fn(() => ({ limit: vi.fn(() => ({ success: true })) })),
}));

import { inviteStudentAction } from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  requireUniversityRole.mockResolvedValue({
    user: { id: 'coord-1', firstName: 'C', lastName: 'O', email: 'c@uni.edu', localePref: 'fr' },
  });
});

describe('inviteStudentAction', () => {
  it('invites a student (role=student) on the coordinator university org + emails them', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ESPRIT', kind: 'university' }, role: 'owner' });
    requireOrgRole.mockResolvedValue({});
    createInvite.mockResolvedValue({ member: { email: 'stu@uni.edu' }, token: 'tok' });

    const res = await inviteStudentAction({ email: 'stu@uni.edu' });

    expect(requireUniversityRole).toHaveBeenCalled();
    expect(requireOrgRole).toHaveBeenCalledWith('coord-1', 'uni-1', ['owner', 'admin']);
    expect(createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'uni-1', email: 'stu@uni.edu', role: 'student', invitedByUserId: 'coord-1' }),
    );
    expect(sendEmail).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('rejects when the coordinator has no active university org', async () => {
    getCurrentOrg.mockResolvedValue(null);
    const res = await inviteStudentAction({ email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'no_university' });
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('rejects when the active org is not a university', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'co-1', name: 'Acme', kind: 'company' }, role: 'owner' });
    const res = await inviteStudentAction({ email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'no_university' });
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('returns the guard error when not a university-role user', async () => {
    requireUniversityRole.mockRejectedValue(new Error('Forbidden'));
    const res = await inviteStudentAction({ email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
  });
});
```

- [ ] **Step 6: Run to verify it fails, then implement**

Run: `pnpm test modules/university/__tests__/server-actions.test.ts` → FAIL (module missing).

Create `modules/university/server-actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireUniversityRole } from '@/modules/auth/session';
import { getCurrentOrg, requireOrgRole } from '@/modules/team/authz';
import { createInvite } from '@/modules/team/service';
import { universityInviteTemplate } from '@/lib/email/templates/university-invite';
import { sendEmail } from '@/lib/email';
import { ratelimit } from '@/lib/ratelimit';

export async function inviteStudentAction(input: {
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();

    // Resolve the coordinator's active org; must be a university they own/admin.
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') {
      return { ok: false, error: 'no_university' };
    }
    await requireOrgRole(user.id, current.org.id, ['owner', 'admin']);

    const rl = ratelimit('team-invite').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    const { member, token } = await createInvite({
      orgId: current.org.id,
      email: input.email,
      role: 'student',
      invitedByUserId: user.id,
    });

    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';
    const inviterName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

    const { subject, text, html } = universityInviteTemplate({
      universityName: current.org.name,
      inviterName,
      token,
      variant: 'student',
      locale,
    });

    await sendEmail({
      to: member.email,
      subject,
      text,
      html,
      tags: [{ name: 'type', value: 'university.invite' }],
    });

    revalidatePath('/university/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
```

Run again → PASS (4/4).

- [ ] **Step 7: Full verify + commit**

Run: `pnpm test modules/university && pnpm typecheck`
Expected: PASS.

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/university/server-actions.ts modules/university/__tests__/server-actions.test.ts modules/university/queries.ts modules/university/__tests__/queries.test.ts
git commit -m "$(cat <<'EOF'
feat(university): coordinator student-invite + managed-students roster

inviteStudentAction (requireUniversityRole → getCurrentOrg →
requireOrgRole owner/admin → createInvite role=student + student email)
and getManagedStudents (active student members joined to user + profile).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Admin UI — `/admin/universities`

**Files:**
- Create: `app/[locale]/(platform)/admin/universities/page.tsx`
- Create: `app/[locale]/(platform)/admin/universities/_create-university-form.tsx`
- Create: `app/[locale]/(platform)/admin/universities/_invite-coordinator-button.tsx`
- Modify: `modules/university/queries.ts` (add `listUniversities`)

A server page (the `(platform)/admin` layout already gates `requireAdmin`-equivalent via `session.role !== 'admin'`) that lists universities, with a create-university form and a per-row invite-coordinator control. Follows the `admin/users` + `admin/dashboard` patterns (PageHeader + Table + a `'use client'` control using `useTransition`). UI primitives are real and shipping; keep this functional, not polished — rich dashboards are Plan 2. No new test for the page itself (RSC pages aren't unit-tested here); the actions are already covered (Task 7).

- [ ] **Step 1: Add `listUniversities` to the queries module**

Append to `modules/university/queries.ts`:

```ts
export type UniversityRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  createdAt: Date;
};

/** All university orgs, newest first — backs the admin /admin/universities list. */
export async function listUniversities(): Promise<UniversityRow[]> {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      city: organizations.city,
      country: organizations.country,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.kind, 'university'))
    .orderBy(desc(organizations.createdAt));
  return rows as UniversityRow[];
}
```

> Optional quick test: add a `listUniversities` case to `modules/university/__tests__/queries.test.ts` queueing one row and asserting `kind='university'` scoping (mirror the `eqSpy` style from the company-service test if you want the where-clause assertion). Not required for the page to ship.

- [ ] **Step 2: Create the create-university client form**

Create `app/[locale]/(platform)/admin/universities/_create-university-form.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { createUniversityAction } from '@/modules/university/admin-actions';

export function CreateUniversityForm() {
  const t = useTranslations('university.admin');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createUniversityAction({ name, city, country });
      if (res.ok) {
        setName(''); setCity(''); setCountry('');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 mb-6">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--ink-3)]">{t('name')}</span>
        <input
          required value={name} onChange={(e) => setName(e.target.value)}
          className="h-9 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--ink-3)]">{t('city')}</span>
        <input
          required value={city} onChange={(e) => setCity(e.target.value)}
          className="h-9 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--ink-3)]">{t('country')}</span>
        <input
          required value={country} onChange={(e) => setCountry(e.target.value)}
          className="h-9 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? t('creating') : t('createSubmit')}
      </Button>
      {error && <p className="text-sm text-destructive w-full">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Create the invite-coordinator client control**

Create `app/[locale]/(platform)/admin/universities/_invite-coordinator-button.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { inviteCoordinatorAction } from '@/modules/university/admin-actions';

export function InviteCoordinatorButton({ universityOrgId }: { universityOrgId: string }) {
  const t = useTranslations('university.admin');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await inviteCoordinatorAction({ universityOrgId, email });
      if (res.ok) {
        setMsg(t('inviteSent'));
        setEmail('');
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('inviteCoordinator')}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email" value={email} placeholder={t('coordinatorEmail')}
        onChange={(e) => setEmail(e.target.value)}
        className="h-8 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
      />
      <Button size="sm" disabled={pending || !email} onClick={submit}>
        {pending ? t('sending') : t('send')}
      </Button>
      {msg && <span className="text-caption text-[var(--ink-3)]">{msg}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Create the admin page**

Create `app/[locale]/(platform)/admin/universities/page.tsx`:

```tsx
import { getTranslations, getLocale } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listUniversities } from '@/modules/university/queries';
import { CreateUniversityForm } from './_create-university-form';
import { InviteCoordinatorButton } from './_invite-coordinator-button';

export default async function Page() {
  const [universities, t, locale] = await Promise.all([
    listUniversities(),
    getTranslations('university.admin'),
    getLocale(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 md:p-8">
      <PageHeader title={t('title')} description={t('subtitle')} className="mb-6" />

      <CreateUniversityForm />

      {universities.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('empty')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-hidden">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('colName')}</TableHead>
                <TableHead>{t('colLocation')}</TableHead>
                <TableHead>{t('colCreated')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {universities.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-[var(--ink)]">{u.name}</TableCell>
                  <TableCell className="text-caption text-[var(--ink-3)]">
                    {[u.city, u.country].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-caption text-[var(--ink-3)] whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                  </TableCell>
                  <TableCell className="text-right">
                    <InviteCoordinatorButton universityOrgId={u.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add the admin sidebar nav link**

The admin nav branch in `components/platform-sidebar.tsx` (lines 78–86) gets a "Universities" entry — added in Task 10's sidebar edit (kept together so the file is touched once). Note this dependency here; do not edit the sidebar in this task.

- [ ] **Step 6: Verify + commit**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: PASS. Visit `/admin/universities` (FR) and `/en/admin/universities` (EN) as an admin (dev-bypass) to smoke-test create + invite once i18n lands (Task 11) — the keys won't resolve until then, so a missing-message warning before Task 11 is expected.

```bash
cd /Users/mac/code/inturn-hub/inturn
git add "app/[locale]/(platform)/admin/universities/page.tsx" "app/[locale]/(platform)/admin/universities/_create-university-form.tsx" "app/[locale]/(platform)/admin/universities/_invite-coordinator-button.tsx" modules/university/queries.ts
git commit -m "$(cat <<'EOF'
feat(university): admin /admin/universities surface

Lists universities with a create-university form and a per-row
invite-coordinator control, behind the existing admin layout guard.
Adds listUniversities query.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Coordinator UI — `/university/dashboard` + sidebar nav

**Files:**
- Create: `app/[locale]/(platform)/university/dashboard/page.tsx`
- Create: `app/[locale]/(platform)/university/_invite-student-button.tsx`
- Modify: `components/platform-sidebar.tsx` (add `university` branch, admin "Universities" link, conditional intern "University" link)
- Modify: `app/[locale]/(platform)/layout.tsx` (compute + pass `hasStudentMembership` to the sidebar)
- Create: `app/[locale]/(platform)/university/layout.tsx` (guard with `requireUniversityRole`)

The coordinator dashboard: managed-students roster (`getManagedStudents` + per-student `getStudentInternshipSnapshot`), an invite-student control, and the pending-invites list (reusing `getOrgMembers` filtered to `invited` students). Sidebar gains a `university` branch (Dashboard) and the intern sidebar conditionally shows a "University" link when the viewer has an active `student` membership. The `/university` route group sits under `(platform)` so it keeps the platform shell; a thin `university/layout.tsx` adds the `requireUniversityRole` gate. Keep MINIMAL — no awaiting-review grouping/counts (Plan 2). No page unit tests (RSC); the underlying queries/actions are covered.

- [ ] **Step 1: Create the `/university` route-group guard layout**

Create `app/[locale]/(platform)/university/layout.tsx` (mirrors `admin/layout.tsx`):

```tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';

export default async function UniversityLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.role !== 'university' && session.role !== 'admin') {
    redirect(`/${session.role}/dashboard`);
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Create the invite-student client control**

Create `app/[locale]/(platform)/university/_invite-student-button.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { inviteStudentAction } from '@/modules/university/server-actions';

export function InviteStudentButton() {
  const t = useTranslations('university.dashboard');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await inviteStudentAction({ email });
      if (res.ok) {
        setMsg(t('inviteSent'));
        setEmail('');
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}>{t('inviteStudent')}</Button>;
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email" value={email} placeholder={t('studentEmail')}
        onChange={(e) => setEmail(e.target.value)}
        className="h-8 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
      />
      <Button size="sm" disabled={pending || !email} onClick={submit}>
        {pending ? t('sending') : t('send')}
      </Button>
      {msg && <span className="text-caption text-[var(--ink-3)]">{msg}</span>}
    </div>
  );
}
```

- [ ] **Step 3: Create the coordinator dashboard page**

Create `app/[locale]/(platform)/university/dashboard/page.tsx`. Resolve the coordinator's university org via `getCurrentOrg`, load the roster, then fan out the per-student snapshot (independent → `Promise.all`), and the pending student invites via `getOrgMembers` filtered to `role==='student' && status==='invited'`:

```tsx
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getCurrentOrg } from '@/modules/team/authz';
import { getOrgMembers } from '@/modules/team/queries';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill } from '@/components/status-pill';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getManagedStudents, getStudentInternshipSnapshot } from '@/modules/university/queries';
import { InviteStudentButton } from '../_invite-student-button';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const t = await getTranslations('university.dashboard');
  const current = await getCurrentOrg(session.user.id);
  if (!current || current.org.kind !== 'university') {
    // university-role user without an active university org — nothing to manage yet.
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
        <PageHeader title={t('title')} description={t('subtitle')} className="mb-6" />
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('noOrg')}
        </div>
      </div>
    );
  }

  const [students, members] = await Promise.all([
    getManagedStudents(current.org.id),
    getOrgMembers(current.org.id),
  ]);

  // Per-student sanitized snapshot (independent → parallel). Students with a
  // null userId (invite not yet linked) get no snapshot.
  const snapshots = await Promise.all(
    students.map((s) => (s.userId ? getStudentInternshipSnapshot(s.userId) : Promise.resolve(null))),
  );

  const pendingStudents = members.filter((m) => m.role === 'student' && m.status === 'invited');

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={<InviteStudentButton />}
        className="mb-6"
      />

      {/* Minimal counts only (Plan 2 adds awaiting-review grouping). */}
      <div className="flex gap-6 mb-6 text-sm">
        <span className="text-[var(--ink-3)]">{t('managedCount', { count: students.length })}</span>
        <span className="text-[var(--ink-3)]">
          {t('placedCount', { count: snapshots.filter(Boolean).length })}
        </span>
      </div>

      {students.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm mb-8">
          {t('emptyRoster')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-hidden mb-8">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('colStudent')}</TableHead>
                <TableHead>{t('colField')}</TableHead>
                <TableHead>{t('colInternship')}</TableHead>
                <TableHead>{t('colPhase')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, i) => {
                const snap = snapshots[i];
                const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
                return (
                  <TableRow key={s.memberId}>
                    <TableCell className="font-medium text-[var(--ink)]">{name}</TableCell>
                    <TableCell className="text-caption text-[var(--ink-3)]">
                      {s.fieldOfStudy ?? s.university ?? '—'}
                    </TableCell>
                    <TableCell className="text-caption text-[var(--ink-3)]">
                      {snap ? `${snap.companyName} · ${snap.internshipTitle}` : t('notPlaced')}
                    </TableCell>
                    <TableCell>
                      {snap && snap.phaseCount > 0 ? (
                        <StatusPill tone="info">
                          {t('phaseOf', {
                            current: snap.currentPhaseIndex + 1,
                            total: snap.phaseCount,
                          })}
                        </StatusPill>
                      ) : (
                        <span className="text-caption text-[var(--ink-4)]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pendingStudents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-2">{t('pendingTitle')}</h2>
          <ul className="text-sm text-[var(--ink-3)] flex flex-col gap-1">
            {pendingStudents.map((m) => (
              <li key={m.id}>{m.email}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

> Pending-invite resend/revoke controls reuse the existing team actions (`resendInviteAction`/`revokeInviteAction`) — wiring those buttons is a small follow-up; the MINIMAL surface lists pending emails. Add the controls only if trivial; otherwise leave for Plan 2 polish.

- [ ] **Step 4: Wire the sidebar — `university` branch + admin link + conditional intern link**

In `components/platform-sidebar.tsx`:

(a) Add a `GraduationCap` (or `School`) icon to the lucide import (line 6–21):

```ts
  ScrollText,
  GraduationCap,
  type LucideIcon,
```

(b) Add `hasStudentMembership?: boolean` to `Props` (after `forceVisible`, line 37):

```ts
  forceVisible?: boolean;
  /** Intern viewer holds an active university 'student' membership → show the link. */
  hasStudentMembership?: boolean;
```

and destructure it (line 47): `forceVisible = false, hasStudentMembership = false,`.

(c) Add the `university` nav branch and extend the admin branch + the conditional intern link. Replace the `navItems` ternary (lines 58–87):

```ts
  const baseInternItems: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/intern/dashboard',     label: tNav('dashboard'),    icon: LayoutDashboard },
    { href: '/intern/applications',  label: tNav('applications'), icon: Send },
    { href: '/intern/saved',         label: tNav('saved'),        icon: Bookmark },
    { href: '/intern/records',       label: tNav('records'),      icon: Award },
    { href: '/intern/community',     label: tNav('community'),    icon: MessagesSquare },
    { href: '/marketplace',          label: tNav('browse'),       icon: Compass },
  ];
  // Intern who is also a managed student gets a University link to their
  // academic-supervision home (the page itself lands in Plan 2; the link is
  // additive and harmless until then — it routes to /intern/university).
  if (hasStudentMembership) {
    baseInternItems.splice(5, 0, {
      href: '/intern/university',
      label: tNav('university'),
      icon: GraduationCap,
    });
  }

  const navItems: { href: string; label: string; icon: LucideIcon }[] =
    role === 'intern'
      ? [...baseInternItems, accountItem]
      : role === 'company'
        ? [
            { href: '/company/dashboard',  label: tNav('dashboard'),  icon: LayoutDashboard },
            { href: '/company/projects',   label: tNav('projects'),   icon: FolderKanban },
            { href: '/company/workspaces', label: tNav('workspaces'), icon: Briefcase },
            { href: '/company/team',       label: tNav('team'),       icon: Users },
            { href: '/marketplace',        label: tNav('browse'),     icon: Compass },
            accountItem,
          ]
        : role === 'university'
          ? [
              { href: '/university/dashboard', label: tNav('dashboard'), icon: LayoutDashboard },
              { href: '/marketplace',          label: tNav('browse'),    icon: Compass },
              accountItem,
            ]
          : role === 'admin'
            ? [
                { href: '/admin/dashboard',     label: tNav('dashboard'),     icon: LayoutDashboard },
                { href: '/admin/verifications', label: tNav('verifications'), icon: ShieldCheck },
                { href: '/admin/universities',  label: tNav('universities'),  icon: GraduationCap },
                { href: '/admin/reports',       label: tNav('reports'),       icon: Flag },
                { href: '/admin/users',         label: tNav('users'),         icon: Users },
                { href: '/admin/audit',         label: tNav('audit'),         icon: ScrollText },
                { href: '/marketplace',         label: tNav('browse'),        icon: Compass },
                accountItem,
              ]
            : [];
```

> The header logo `Link` (line 100–101) uses `href={`/${role}/dashboard`}` — `university` resolves to `/university/dashboard`, which exists. No change needed there.

- [ ] **Step 5: Pass `hasStudentMembership` from the platform layout**

In `app/[locale]/(platform)/layout.tsx`, compute whether an intern holds an active `student` membership and pass it. Add the import + the computation. Only relevant for interns, so gate the query:

```ts
import { getViewerMemberships } from '@/modules/team/authz';
```

Inside the component, after `notifications` are loaded (after line 22), compute:

```ts
  // An intern who is also a managed university student gets a conditional nav
  // link. Only query for interns (others never show the link).
  let hasStudentMembership = false;
  if (session.role === 'intern') {
    const memberships = await getViewerMemberships(session.user.id);
    hasStudentMembership = memberships.some((m) => m.role === 'student');
  }
```

and add it to `userProps` (after `devBypassed`, line 35):

```ts
    devBypassed: isDevAuthBypassed(),
    hasStudentMembership,
```

> `PlatformMobileTopStrip` also spreads `userProps` (line 46) — if its prop type is a strict subset that rejects the extra field, widen its props to accept `hasStudentMembership?: boolean` (pass-through to its inner `PlatformSidebar`). Check `components/platform-mobile-top-strip.tsx`; if it `{...userProps}` onto `PlatformSidebar`, just thread the optional prop through its Props type.

- [ ] **Step 6: Verify + commit**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: PASS. i18n keys (`platformNav.university`, `platformNav.universities`, the `university.dashboard.*` namespace) land in Task 11 — a missing-message warning before then is expected. Smoke-test after Task 11.

```bash
cd /Users/mac/code/inturn-hub/inturn
git add "app/[locale]/(platform)/university/layout.tsx" "app/[locale]/(platform)/university/dashboard/page.tsx" "app/[locale]/(platform)/university/_invite-student-button.tsx" components/platform-sidebar.tsx "app/[locale]/(platform)/layout.tsx"
git commit -m "$(cat <<'EOF'
feat(university): coordinator dashboard + sidebar nav

Adds the /university route group (requireUniversityRole layout), the
coordinator roster dashboard (managed students + firewalled per-student
snapshot + invite-student + pending invites), a university sidebar branch,
the admin Universities link, and a conditional intern University link
shown when the viewer holds an active student membership.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: i18n — FR + EN keys (new `university` namespace + nav keys)

**Files:**
- Modify: `locales/fr.json`, `locales/en.json`
- Modify: `app/[locale]/invite/[token]/page.tsx` + `app/[locale]/invite/[token]/accept-button.tsx` (role-aware copy)

All new admin + coordinator strings. FR is the unprefixed default. Two `platformNav` keys (`university`, `universities`) and a new top-level `university` namespace (with `admin` + `dashboard` sub-objects). The invite **accept page** uses page-local `STR` objects (not the locale JSON) — extend those to add a `student` role label + role-aware post-accept routing. **Staging hazard: stage only these hunks** (`git add -p`).

- [ ] **Step 1: Add the two `platformNav` keys (both locales)**

In `locales/en.json`, inside `"platformNav"` (after `"team": "Team"`, line 68):

```json
    "team": "Team",
    "university": "University",
    "universities": "Universities"
```

In `locales/fr.json`, same location:

```json
    "team": "Équipe",
    "university": "Université",
    "universities": "Universités"
```

- [ ] **Step 2: Add the top-level `university` namespace (both locales)**

In `locales/en.json`, add a new top-level key (anywhere among the namespaces; place it alphabetically near the others — e.g. after the existing namespace that precedes it):

```json
  "university": {
    "admin": {
      "title": "Universities",
      "subtitle": "Provision universities and invite their coordinators.",
      "name": "Name",
      "city": "City",
      "country": "Country",
      "createSubmit": "Create university",
      "creating": "Creating…",
      "empty": "No universities yet. Create the first one above.",
      "colName": "University",
      "colLocation": "Location",
      "colCreated": "Created",
      "inviteCoordinator": "Invite coordinator",
      "coordinatorEmail": "coordinator@university.edu",
      "send": "Send",
      "sending": "Sending…",
      "inviteSent": "Invitation sent"
    },
    "dashboard": {
      "title": "My students",
      "subtitle": "Students you supervise and their internship progress.",
      "noOrg": "No university is linked to your account yet.",
      "inviteStudent": "Invite student",
      "studentEmail": "student@email.com",
      "send": "Send",
      "sending": "Sending…",
      "inviteSent": "Invitation sent",
      "managedCount": "{count} managed",
      "placedCount": "{count} placed",
      "emptyRoster": "No students yet. Invite your first student above.",
      "colStudent": "Student",
      "colField": "Field",
      "colInternship": "Internship",
      "colPhase": "Phase",
      "notPlaced": "Not yet placed",
      "phaseOf": "Phase {current} of {total}",
      "pendingTitle": "Pending invitations"
    }
  }
```

In `locales/fr.json`, the parallel FR block:

```json
  "university": {
    "admin": {
      "title": "Universités",
      "subtitle": "Créez des universités et invitez leurs encadrants.",
      "name": "Nom",
      "city": "Ville",
      "country": "Pays",
      "createSubmit": "Créer l'université",
      "creating": "Création…",
      "empty": "Aucune université pour le moment. Créez la première ci-dessus.",
      "colName": "Université",
      "colLocation": "Localisation",
      "colCreated": "Créée le",
      "inviteCoordinator": "Inviter un encadrant",
      "coordinatorEmail": "encadrant@universite.edu",
      "send": "Envoyer",
      "sending": "Envoi…",
      "inviteSent": "Invitation envoyée"
    },
    "dashboard": {
      "title": "Mes étudiants",
      "subtitle": "Les étudiants que vous encadrez et l'avancement de leurs stages.",
      "noOrg": "Aucune université n'est encore liée à votre compte.",
      "inviteStudent": "Inviter un étudiant",
      "studentEmail": "etudiant@email.com",
      "send": "Envoyer",
      "sending": "Envoi…",
      "inviteSent": "Invitation envoyée",
      "managedCount": "{count} encadré(s)",
      "placedCount": "{count} en stage",
      "emptyRoster": "Aucun étudiant pour le moment. Invitez votre premier étudiant ci-dessus.",
      "colStudent": "Étudiant",
      "colField": "Filière",
      "colInternship": "Stage",
      "colPhase": "Phase",
      "notPlaced": "Pas encore en stage",
      "phaseOf": "Phase {current} sur {total}",
      "pendingTitle": "Invitations en attente"
    }
  }
```

> JSON hygiene: add a trailing comma to the preceding namespace's closing brace as needed; do not leave a dangling comma after the new block if it is last. Validate with `node -e "JSON.parse(require('fs').readFileSync('locales/fr.json','utf8'))"` and the same for `en.json`.

- [ ] **Step 3: Add role-aware copy to the invite accept page**

The accept page (`app/[locale]/invite/[token]/page.tsx`) reuses ALL existing edge screens as-is. The only additions are a `student` + (already-present) `owner` role label and role-aware post-accept routing. In the `STR` object, the `roleLabel` maps already include `owner` (lines 33, 58) but not `student`. Add `student` to both `roleLabel` maps:

`fr` (line 33): `roleLabel: { admin: 'Administrateur', supervisor: 'Superviseur', owner: 'Encadrant', student: 'Étudiant' } as Record<string, string>,`

`en` (line 58): `roleLabel: { admin: 'Admin', supervisor: 'Supervisor', owner: 'Coordinator', student: 'Student' } as Record<string, string>,`

> (For a university owner invite the role is `owner`; relabel it "Encadrant"/"Coordinator" only if you can distinguish university orgs on this page — the page loads `org` at line 132–136, so you MAY branch the owner label on `org.kind === 'university'`. Keep it simple: the generic "owner" label is acceptable for v1; relabeling is optional polish.)

- [ ] **Step 4: Role-aware post-accept routing in the accept button**

In `app/[locale]/invite/[token]/accept-button.tsx`, `handleClick` always pushes `/company/dashboard` (line 57). `acceptInviteAction` returns `{ ok, orgId }` only — it does NOT return the role/kind to the client. **Minimal approach:** leave the redirect as-is for company; for university the coordinator's global role is now `university`, and `/company/dashboard` will bounce them via the platform layout's role-based routing to their correct home. **Cleaner approach (preferred):** have `acceptInviteAction` also return the post-accept destination. Since Task 6 already computes `orgKind`/`role` server-side, extend its success return with a `redirectTo` field:

In `modules/team/server-actions.ts`, change the success return (the `return { ok: true, orgId: result.orgId };` added in Task 6) to:

```ts
    const redirectTo =
      result.orgKind === 'university'
        ? result.role === 'student'
          ? '/intern/university'
          : '/university/dashboard'
        : '/company/dashboard';
    revalidatePath('/company/team');
    return { ok: true, orgId: result.orgId, redirectTo };
```

and widen the action's return type union's success arm to `{ ok: true; orgId: string; redirectTo: string }`. Then in `accept-button.tsx`:

```ts
      const res = await acceptInviteAction({ token });
      if (res.ok) {
        router.push(res.redirectTo ?? '/company/dashboard');
      } else {
        setError(mapReason(res.reason));
      }
```

> `/intern/university` does not exist until Plan 2 — but a `student` accept routing there will 404 gracefully until then. If you prefer no dead route in Plan 1, route `student` to `/intern/dashboard` and switch to `/intern/university` in Plan 2. **Decision: route student → `/intern/dashboard` in Plan 1** (no dead link), leave a `// TODO(plan2): /intern/university` marker. Update the Task-6 test's expectation only if you assert `redirectTo` (the existing Task-6 tests assert `{ ok: true, orgId }` via `toEqual` — change them to `toMatchObject({ ok: true, orgId })` so the added `redirectTo` field doesn't fail the strict equality, OR include `redirectTo` in the expected object).

- [ ] **Step 5: Validate JSON + typecheck + stage ONLY this feature's hunks**

Run: `node -e "JSON.parse(require('fs').readFileSync('locales/fr.json','utf8'));JSON.parse(require('fs').readFileSync('locales/en.json','utf8'));console.log('json ok')" && pnpm typecheck`
Expected: `json ok` + typecheck PASS.

- [ ] **Step 6: Commit (locale hunks staged surgically)**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add "app/[locale]/invite/[token]/page.tsx" "app/[locale]/invite/[token]/accept-button.tsx" modules/team/server-actions.ts modules/team/__tests__/server-actions.test.ts
git add -p locales/en.json locales/fr.json
git commit -m "$(cat <<'EOF'
feat(i18n): university namespace + nav keys + role-aware accept routing

Adds platformNav.university/universities and the FR/EN university
namespace (admin + dashboard). The invite accept flow gains a student
role label and role-aware post-accept routing (coordinator →
/university/dashboard; student → /intern/dashboard for now).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Final verification

**Files:** none (verification only).

Confirm the whole feature is green and the existing suite (344+ tests) is intact, then a production build.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: PASS. New suites green (`modules/auth/__tests__/session.test.ts`, `modules/workspace/__tests__/phase.test.ts`, `modules/university/__tests__/{queries,service,admin-actions,server-actions}.test.ts`, `lib/email/templates/__tests__/university-invite.test.ts`, `modules/team/__tests__/server-actions.test.ts`, `modules/profiles/__tests__/company-service.test.ts`), and every pre-existing test still passes — in particular the **updated** `modules/team/__tests__/service.test.ts` (two `acceptInvite` happy-path assertions) and the Task-6 action tests reconciled with `redirectTo`. If the count dropped below the prior baseline, a test was broken — fix it, do not delete it.

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: 0 errors, 0 new lint violations.

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: PASS. If a Neon/network step hangs, prefix `NODE_OPTIONS="--dns-result-order=ipv4first" pnpm build`.

- [ ] **Step 4: Manual smoke (dev-bypass, both locales)**

With `DEV_AUTH_BYPASS=1`, prefix the dev server with `NODE_OPTIONS="--dns-result-order=ipv4first"` if needed:
- As **admin**: `/admin/universities` (FR) + `/en/admin/universities` — create a university, invite a coordinator (check the email log / Resend dashboard or console).
- Accept the coordinator invite as that email → lands on `/university/dashboard`, global role is now `university`, org `ownerId` transferred.
- As **coordinator**: invite a student → student appears under pending; accept as the student → student stays global role `intern`, shows in the roster; if the student has a workspace, the phase pill + sanitized snapshot render (and expose NO private workspace data).
- Confirm the intern sidebar shows the conditional "University" link only for a student-member.

- [ ] **Step 5: Confirm migration idempotency once more (if DB reachable)**

Run `pnpm db:migrate` twice — the second run is a no-op. (Already done in Task 1 Step 8 if the DB was reachable; re-confirm here after all schema edits are committed.)

- [ ] **Step 6: Final status**

Run: `git status && git log --oneline -12`
Expected: clean tree (all task commits present), branch `feat/university-product`. **Do NOT push** — the lead reviews + merges.

---

## Out of scope (Plan 2 — do NOT build here)

For the avoidance of doubt, none of the following are in this plan; they are listed so an executing agent does not "helpfully" add them:

- The `academic_reports` **service / server-actions / UI** (the table exists from Task 1; it carries no logic).
- The `modules/review/state-machine.ts` extraction (re-pointing deliverables at a shared review machine).
- The notification **dispatcher cases** for `academicReport.*` + the report email templates + the `EVENT_TYPES` additions (`academicReport.submitted` / `.approved` / `.revision.requested`).
- The student `/intern/university` report-submission surface (Plan 1 routes a student accept to `/intern/dashboard` with a TODO marker).
- The coordinator `/university/students/[studentId]` per-student review surface.
- Rich dashboard polish: awaiting-review grouping/counts, resend/revoke pending-invite controls (beyond the minimal email list), status pills for rapports.
- `getReportComments`, `getReportForStudent`, and any `comments.reportId` read/write logic (the column exists from Task 1; nothing reads it yet).
