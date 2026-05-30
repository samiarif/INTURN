# University Supervision Structure & Gating — Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multiple coordinators per university, per-student encadrant assignment, and gated visibility (an encadrant sees only their assigned students; the head sees all).

**Architecture:** Head = org `owner`, encadrant = org `admin` (no new role). One nullable `assigned_coordinator_id` FK on the student's `organization_members` row. Inviting a student auto-assigns the inviter; the head reassigns; removing an encadrant reassigns their students to the head. Gating lives in three read paths (roster query, review-surface page, submit-notification routing).

**Tech Stack:** Next.js 16 (App Router, RSC + `'use server'`), Drizzle on Neon-http (no transactions — ordered writes), Clerk, next-intl 4, Vitest (mocked `db` select-chain), Tailwind v4 CSS-variable tokens, pnpm.

**Spec:** `docs/superpowers/specs/2026-05-30-university-at-scale-design.md` (§3, §4).

**Migration/local-DB note:** the `db:migrate` script does NOT load `.env.local`. To apply a new migration to the local dev DB run: `pnpm tsx --env-file=.env.local scripts/migrate.ts`. Run all commands from the `inturn/` dir.

---

## File Structure

**Create:**
- `db/migrations/0019_student_coordinator_assignment.sql` — add `assigned_coordinator_id` + index + backfill.
- `app/[locale]/(platform)/university/_assign-coordinator-select.tsx` — client reassign dropdown (head).
- `app/[locale]/(platform)/university/_invite-coordinator-button.tsx` — client self-service coordinator-invite dialog (head).

**Modify:**
- `db/schema/organization-members.ts` — add `assignedCoordinatorId` column.
- `modules/team/service.ts` — `createInvite` optional `assignedCoordinatorId`; `removeMember` reassign-on-removal.
- `modules/university/service.ts` — `assignStudentCoordinator`.
- `modules/university/queries.ts` — `getManagedStudents` viewer-aware + encadrant name; `getUniversityCoordinators`; `canCoordinatorViewStudent` helper.
- `modules/university/server-actions.ts` — `inviteStudentAction` auto-assign; new `inviteCoordinatorAction`, `assignStudentCoordinatorAction`.
- `modules/notifications/dispatcher.ts` — `onAcademicReportSubmitted` routes to the assigned encadrant.
- `app/[locale]/(platform)/university/students/[studentId]/page.tsx` — assignment view-gate.
- `app/[locale]/(platform)/university/dashboard/page.tsx` — viewer-aware roster, encadrant column, coordinator panel.
- `modules/team/server-actions.ts` — `acceptInviteAction` student redirect → `/intern/university`.
- `locales/fr.json`, `locales/en.json` — new strings.
- `scripts/seed.ts` — assign the demo student to the head.

**Test (extend existing):**
- `modules/team/__tests__/service.test.ts`, `modules/university/__tests__/{queries,server-actions,service}.test.ts`, `modules/notifications/__tests__/dispatcher.test.ts`.

---

## Task 1: Migration 0019 + schema column

**Files:**
- Create: `db/migrations/0019_student_coordinator_assignment.sql`
- Modify: `db/schema/organization-members.ts`

- [ ] **Step 1: Write the migration** (idempotent, matches `0017`/`0018` style)

```sql
-- 0019_student_coordinator_assignment.sql
-- Per-student encadrant assignment: link a student member to the coordinator
-- (owner=head, admin=encadrant) who supervises them. Nullable = head-owned.
BEGIN;

ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS assigned_coordinator_id uuid
  REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS org_members_assigned_coordinator_idx
  ON organization_members(assigned_coordinator_id)
  WHERE assigned_coordinator_id IS NOT NULL;

-- Backfill existing students to their org's head so none go invisible.
UPDATE organization_members sm
  SET assigned_coordinator_id = o.owner_id
  FROM organizations o
  WHERE sm.organization_id = o.id
    AND o.kind = 'university'
    AND sm.role = 'student'
    AND sm.assigned_coordinator_id IS NULL
    AND o.owner_id IS NOT NULL;

COMMIT;
```

- [ ] **Step 2: Add the column to the Drizzle schema**

In `db/schema/organization-members.ts`, after the `invitedByUserId` column (before `invitedAt`):

```ts
    assignedCoordinatorId: uuid('assigned_coordinator_id').references(() => users.id, {
      onDelete: 'set null',
    }),
```

- [ ] **Step 3: Apply locally and verify**

Run: `pnpm tsx --env-file=.env.local scripts/migrate.ts`
Expected: runs without error; reports `0019` applied.
Run: `pnpm tsx --env-file=.env.local -e "import('./db').then(async ({db})=>{const r=await db.execute(\"select column_name from information_schema.columns where table_name='organization_members' and column_name='assigned_coordinator_id'\");console.log(r.rows);process.exit(0)})"`
Expected: one row `assigned_coordinator_id`.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck` (or `pnpm tsc --noEmit`)
Expected: PASS (the new column is now on the inferred types).

- [ ] **Step 5: Commit**

```bash
git add db/migrations/0019_student_coordinator_assignment.sql db/schema/organization-members.ts
git commit -m "feat(db): add assigned_coordinator_id to organization_members"
```

---

## Task 2: `createInvite` accepts an optional assigned coordinator

**Files:**
- Modify: `modules/team/service.ts:32-66`
- Test: `modules/team/__tests__/service.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `modules/team/__tests__/service.test.ts` (match the file's existing db-mock pattern):

```ts
it('createInvite persists assignedCoordinatorId when provided', async () => {
  // queue: existing-user lookup (none), then insert().returning()
  // (use the file's existing select/insert mock helpers)
  const values = await captureInsertValues(() =>
    createInvite({ orgId: 'o1', email: 'S@X.com', role: 'student', invitedByUserId: 'u1', assignedCoordinatorId: 'coord-1' }),
  );
  expect(values).toMatchObject({ assignedCoordinatorId: 'coord-1', role: 'student', email: 's@x.com' });
});
```

(If the test file has no `captureInsertValues` helper, assert against the `insert().values` mock spy directly, following the pattern already used for `createInvite` in that file.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run modules/team/__tests__/service.test.ts -t "assignedCoordinatorId"`
Expected: FAIL (param ignored / undefined).

- [ ] **Step 3: Implement**

In `modules/team/service.ts`, extend `createInvite` input and insert:

```ts
export async function createInvite(input: {
  orgId: string;
  email: string;
  role: 'owner' | 'admin' | 'supervisor' | 'student';
  projectIds?: string[];
  assignedCoordinatorId?: string | null;
  invitedByUserId: string;
}): Promise<{ member: OrganizationMember; token: string }> {
  const { orgId, email, role, projectIds, assignedCoordinatorId, invitedByUserId } = input;
  // ...existing existingUser lookup + token...
  const [member] = await db
    .insert(organizationMembers)
    .values({
      organizationId: orgId,
      userId: existingUser?.id ?? null,
      email: email.toLowerCase(),
      role,
      status: 'invited',
      pendingProjectIds: projectIds ?? [],
      assignedCoordinatorId: assignedCoordinatorId ?? null,
      inviteToken: token,
      inviteExpiresAt: inviteExpiry(),
      invitedByUserId,
    })
    .returning();
  return { member: member as OrganizationMember, token };
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run modules/team/__tests__/service.test.ts`
Expected: PASS (new test + all existing).

- [ ] **Step 5: Commit**

```bash
git add modules/team/service.ts modules/team/__tests__/service.test.ts
git commit -m "feat(team): createInvite accepts optional assignedCoordinatorId"
```

---

## Task 3: `inviteStudentAction` auto-assigns the inviter

**Files:**
- Modify: `modules/university/server-actions.ts:29-34`
- Test: `modules/university/__tests__/server-actions.test.ts:37-52`

- [ ] **Step 1: Strengthen the existing test**

In `modules/university/__tests__/server-actions.test.ts`, extend the happy-path assertion:

```ts
expect(createInvite).toHaveBeenCalledWith(
  expect.objectContaining({
    orgId: 'uni-1', email: 'stu@uni.edu', role: 'student',
    invitedByUserId: 'coord-1', assignedCoordinatorId: 'coord-1',
  }),
);
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run modules/university/__tests__/server-actions.test.ts -t "invites a student"`
Expected: FAIL (`assignedCoordinatorId` not passed).

- [ ] **Step 3: Implement**

In `modules/university/server-actions.ts`, add to the `createInvite` call in `inviteStudentAction`:

```ts
    const { member, token } = await createInvite({
      orgId: current.org.id,
      email: input.email,
      role: 'student',
      assignedCoordinatorId: user.id, // the inviter owns the student until reassigned
      invitedByUserId: user.id,
    });
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run modules/university/__tests__/server-actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/university/server-actions.ts modules/university/__tests__/server-actions.test.ts
git commit -m "feat(university): student invite auto-assigns the inviting coordinator"
```

---

## Task 4: `getManagedStudents` is viewer-aware + carries the encadrant

**Files:**
- Modify: `modules/university/queries.ts:104-150`
- Test: `modules/university/__tests__/queries.test.ts:120-147`

- [ ] **Step 1: Write the failing tests**

Add to the `getManagedStudents` describe block:

```ts
it('maps assignedCoordinatorId + encadrant name onto each row', async () => {
  mocks.selectQueue.push([{
    memberId: 'm1', userId: 'stu-1', firstName: 'Lina', lastName: 'Ben',
    email: 'lina@uni.edu', imageUrl: null, university: 'ENIT', fieldOfStudy: 'GL',
    invitedAt: new Date(), joinedAt: new Date(),
    assignedCoordinatorId: 'coord-9', encadrantFirstName: 'Sami', encadrantLastName: 'Saidi',
  }]);
  const rows = await getManagedStudents('uni-1');
  expect(rows[0]).toMatchObject({ assignedCoordinatorId: 'coord-9', encadrantName: 'Sami Saidi' });
});

it('accepts a forCoordinatorId option (encadrant view)', async () => {
  mocks.selectQueue.push([]);
  const rows = await getManagedStudents('uni-1', { forCoordinatorId: 'coord-9' });
  expect(rows).toEqual([]);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm vitest run modules/university/__tests__/queries.test.ts -t "encadrant"`
Expected: FAIL (`encadrantName` undefined / signature rejects opts).

- [ ] **Step 3: Implement**

In `modules/university/queries.ts`: import `alias`, widen the type, add the join + optional filter + mapping.

```ts
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
// ...

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
  assignedCoordinatorId: string | null;
  encadrantName: string | null;
};

export async function getManagedStudents(
  universityOrgId: string,
  opts?: { forCoordinatorId?: string },
): Promise<ManagedStudent[]> {
  const encadrant = alias(users, 'encadrant');
  const where = [
    eq(organizationMembers.organizationId, universityOrgId),
    eq(organizationMembers.role, 'student'),
    eq(organizationMembers.status, 'active'),
  ];
  if (opts?.forCoordinatorId) {
    where.push(eq(organizationMembers.assignedCoordinatorId, opts.forCoordinatorId));
  }

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
      assignedCoordinatorId: organizationMembers.assignedCoordinatorId,
      encadrantFirstName: encadrant.firstName,
      encadrantLastName: encadrant.lastName,
    })
    .from(organizationMembers)
    .leftJoin(users, eq(users.id, organizationMembers.userId))
    .leftJoin(profiles, eq(profiles.userId, organizationMembers.userId))
    .leftJoin(encadrant, eq(encadrant.id, organizationMembers.assignedCoordinatorId))
    .where(and(...where))
    .orderBy(desc(organizationMembers.joinedAt))
    .limit(500);

  return rows.map((r) => ({
    memberId: r.memberId,
    userId: r.userId,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    imageUrl: r.imageUrl,
    university: r.university,
    fieldOfStudy: r.fieldOfStudy,
    invitedAt: r.invitedAt,
    joinedAt: r.joinedAt,
    assignedCoordinatorId: r.assignedCoordinatorId,
    encadrantName:
      [r.encadrantFirstName, r.encadrantLastName].filter(Boolean).join(' ') || null,
  }));
}
```

> Note: the WHERE filter (encadrant sees only theirs) is integration-trusted, matching the existing query tests which assert projection/shape rather than SQL. The security-critical view gate is unit-tested in Task 10, and notification routing in Task 9.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run modules/university/__tests__/queries.test.ts`
Expected: PASS (new + existing — existing rows lacking the new keys map to `null`).

- [ ] **Step 5: Commit**

```bash
git add modules/university/queries.ts modules/university/__tests__/queries.test.ts
git commit -m "feat(university): getManagedStudents is viewer-aware and carries the encadrant"
```

---

## Task 5: `getUniversityCoordinators` query

**Files:**
- Modify: `modules/university/queries.ts` (append)
- Test: `modules/university/__tests__/queries.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```ts
describe('getUniversityCoordinators', () => {
  it('returns active owner/admin members with display names', async () => {
    mocks.selectQueue.push([
      { userId: 'o1', firstName: 'Head', lastName: 'Prof', email: 'head@uni', role: 'owner' },
      { userId: 'a1', firstName: 'Enc', lastName: 'Adrant', email: 'enc@uni', role: 'admin' },
    ]);
    const rows = await getUniversityCoordinators('uni-1');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ userId: 'o1', name: 'Head Prof', role: 'owner' });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm vitest run modules/university/__tests__/queries.test.ts -t "getUniversityCoordinators"`
Expected: FAIL (not exported).

- [ ] **Step 3: Implement** (append to `queries.ts`)

```ts
export type UniversityCoordinator = {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin';
};

/** Active owner/admin members of a university org — the coordinators (head + encadrants). */
export async function getUniversityCoordinators(
  universityOrgId: string,
): Promise<UniversityCoordinator[]> {
  const rows = await db
    .select({
      userId: organizationMembers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: organizationMembers.email,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .leftJoin(users, eq(users.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.organizationId, universityOrgId),
        eq(organizationMembers.status, 'active'),
        inArray(organizationMembers.role, ['owner', 'admin']),
      ),
    )
    .orderBy(desc(organizationMembers.role)); // owner before admin

  return rows
    .filter((r): r is typeof r & { userId: string } => Boolean(r.userId))
    .map((r) => ({
      userId: r.userId,
      name: [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email,
      email: r.email,
      role: r.role as 'owner' | 'admin',
    }));
}
```

Add `inArray` to the `drizzle-orm` import. In the test's `vi.mock('drizzle-orm', ...)` add `inArray: vi.fn(() => 'inArray')`.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run modules/university/__tests__/queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/university/queries.ts modules/university/__tests__/queries.test.ts
git commit -m "feat(university): add getUniversityCoordinators"
```

---

## Task 6: `assignStudentCoordinator` service + action (head-only, IDOR-safe)

**Files:**
- Modify: `modules/university/service.ts`
- Modify: `modules/university/server-actions.ts`
- Test: `modules/university/__tests__/service.test.ts`, `modules/university/__tests__/server-actions.test.ts`

- [ ] **Step 1: Write failing service tests**

In `modules/university/__tests__/service.test.ts` (follow its db-mock pattern; queue the student lookup, then the coordinator lookup):

```ts
describe('assignStudentCoordinator', () => {
  it('rejects a student member from another org', async () => {
    mocks.selectQueue.push([{ id: 'm1', organizationId: 'OTHER', role: 'student' }]);
    await expect(assignStudentCoordinator({ orgId: 'uni-1', studentMemberId: 'm1', coordinatorUserId: 'c1' }))
      .rejects.toThrow('member_not_found');
  });
  it('rejects a non-student member', async () => {
    mocks.selectQueue.push([{ id: 'm1', organizationId: 'uni-1', role: 'admin' }]);
    await expect(assignStudentCoordinator({ orgId: 'uni-1', studentMemberId: 'm1', coordinatorUserId: 'c1' }))
      .rejects.toThrow('member_not_found');
  });
  it('rejects when the target coordinator is not an owner/admin of the org', async () => {
    mocks.selectQueue.push([{ id: 'm1', organizationId: 'uni-1', role: 'student' }]); // student ok
    mocks.selectQueue.push([]); // coordinator lookup: none
    await expect(assignStudentCoordinator({ orgId: 'uni-1', studentMemberId: 'm1', coordinatorUserId: 'cX' }))
      .rejects.toThrow('coordinator_not_found');
  });
  it('allows clearing the assignment (null)', async () => {
    mocks.selectQueue.push([{ id: 'm1', organizationId: 'uni-1', role: 'student' }]);
    await expect(assignStudentCoordinator({ orgId: 'uni-1', studentMemberId: 'm1', coordinatorUserId: null }))
      .resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm vitest run modules/university/__tests__/service.test.ts -t "assignStudentCoordinator"`
Expected: FAIL (not exported).

- [ ] **Step 3: Implement the service** (in `modules/university/service.ts`)

```ts
import { and, eq } from 'drizzle-orm';
import { organizationMembers } from '@/db/schema';
// ...

export async function assignStudentCoordinator(input: {
  orgId: string;
  studentMemberId: string;
  coordinatorUserId: string | null;
}): Promise<void> {
  const [student] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.id, input.studentMemberId))
    .limit(1);
  if (!student || student.organizationId !== input.orgId || student.role !== 'student') {
    throw new Error('member_not_found');
  }

  if (input.coordinatorUserId) {
    const [coord] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, input.orgId),
          eq(organizationMembers.userId, input.coordinatorUserId),
          eq(organizationMembers.status, 'active'),
        ),
      )
      .limit(1);
    if (!coord || (coord.role !== 'owner' && coord.role !== 'admin')) {
      throw new Error('coordinator_not_found');
    }
  }

  await db
    .update(organizationMembers)
    .set({ assignedCoordinatorId: input.coordinatorUserId, updatedAt: new Date() })
    .where(eq(organizationMembers.id, input.studentMemberId));
}
```

- [ ] **Step 4: Run service tests** — `pnpm vitest run modules/university/__tests__/service.test.ts` → PASS.

- [ ] **Step 5: Write failing action tests**

In `modules/university/__tests__/server-actions.test.ts`, add mocks for `assignStudentCoordinator` (from `../service`) and `getCurrentOrg`/`requireOrgRole` (already mocked), then:

```ts
describe('assignStudentCoordinatorAction', () => {
  it('requires the head (owner) of the university org', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', kind: 'university' }, role: 'admin' });
    requireOrgRole.mockRejectedValue(new Error('Forbidden'));
    const res = await assignStudentCoordinatorAction({ studentMemberId: 'm1', coordinatorUserId: 'c1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(requireOrgRole).toHaveBeenCalledWith('coord-1', 'uni-1', ['owner']);
  });
  it('assigns when the caller is the head', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', kind: 'university' }, role: 'owner' });
    requireOrgRole.mockResolvedValue({});
    assignStudentCoordinator.mockResolvedValue(undefined);
    const res = await assignStudentCoordinatorAction({ studentMemberId: 'm1', coordinatorUserId: 'c1' });
    expect(res).toEqual({ ok: true });
  });
});
```

Add: `const assignStudentCoordinator = vi.fn();` and mock `../service` to expose it.

- [ ] **Step 6: Implement the action** (in `modules/university/server-actions.ts`)

```ts
import { assignStudentCoordinator } from './service';

export async function assignStudentCoordinatorAction(input: {
  studentMemberId: string;
  coordinatorUserId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner']); // head-only
    await assignStudentCoordinator({
      orgId: current.org.id,
      studentMemberId: input.studentMemberId,
      coordinatorUserId: input.coordinatorUserId,
    });
    revalidatePath('/university/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
```

- [ ] **Step 7: Run action tests** — `pnpm vitest run modules/university/__tests__/server-actions.test.ts` → PASS.

- [ ] **Step 8: Commit**

```bash
git add modules/university/service.ts modules/university/server-actions.ts modules/university/__tests__/service.test.ts modules/university/__tests__/server-actions.test.ts
git commit -m "feat(university): head-only assignStudentCoordinator action + service"
```

---

## Task 7: Self-service `inviteCoordinatorAction` (head invites an encadrant)

**Files:**
- Modify: `modules/university/server-actions.ts`
- Test: `modules/university/__tests__/server-actions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe('inviteCoordinatorAction (self-service)', () => {
  it('invites an encadrant (role=admin) and emails them', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ENIT', kind: 'university' }, role: 'owner' });
    requireOrgRole.mockResolvedValue({});
    createInvite.mockResolvedValue({ member: { email: 'enc@uni' }, token: 'tok' });
    const res = await inviteCoordinatorAction({ email: 'enc@uni' });
    expect(requireOrgRole).toHaveBeenCalledWith('coord-1', 'uni-1', ['owner']);
    expect(createInvite).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'uni-1', email: 'enc@uni', role: 'admin' }));
    expect(sendEmail).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });
  it('rejects a non-head caller', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ENIT', kind: 'university' }, role: 'admin' });
    requireOrgRole.mockRejectedValue(new Error('Forbidden'));
    const res = await inviteCoordinatorAction({ email: 'x@y' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(createInvite).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to confirm failure** — `pnpm vitest run modules/university/__tests__/server-actions.test.ts -t "self-service"` → FAIL.

- [ ] **Step 3: Implement** (in `modules/university/server-actions.ts`)

```ts
export async function inviteCoordinatorAction(input: {
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner']); // only the head adds coordinators

    const rl = ratelimit('team-invite').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    const { member, token } = await createInvite({
      orgId: current.org.id,
      email: input.email,
      role: 'admin', // encadrant
      invitedByUserId: user.id,
    });

    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';
    const inviterName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const { subject, text, html } = universityInviteTemplate({
      universityName: current.org.name, inviterName, token, variant: 'coordinator', locale,
    });
    await sendEmail({ to: member.email, subject, text, html, tags: [{ name: 'type', value: 'university.invite' }] });

    revalidatePath('/university/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
```

Ensure `universityInviteTemplate` is imported (it already is for `inviteStudentAction`).

- [ ] **Step 4: Run tests** — `pnpm vitest run modules/university/__tests__/server-actions.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/university/server-actions.ts modules/university/__tests__/server-actions.test.ts
git commit -m "feat(university): head can self-service invite an encadrant (role=admin)"
```

---

## Task 8: `removeMember` reassigns the removed coordinator's students to the head

**Files:**
- Modify: `modules/team/service.ts:207-247`
- Test: `modules/team/__tests__/service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('reassigns a removed coordinator\'s students to the org owner', async () => {
  // removeMember: member lookup → org lookup (owner_id) → org projects (none)
  mocks.selectQueue.push([{ id: 'enc1', organizationId: 'uni-1', role: 'admin', userId: 'encUser' }]); // member
  mocks.selectQueue.push([{ ownerId: 'headUser' }]); // org owner lookup
  mocks.selectQueue.push([]); // org projects
  await removeMember({ orgId: 'uni-1', memberId: 'enc1' });
  // assert an update set assigned_coordinator_id to headUser was issued
  expect(captureUpdateSets()).toEqual(
    expect.arrayContaining([expect.objectContaining({ assignedCoordinatorId: 'headUser' })]),
  );
});
```

(Use the file's existing update-capture approach; if absent, spy on `db.update().set`.)

- [ ] **Step 2: Run to confirm failure** — `pnpm vitest run modules/team/__tests__/service.test.ts -t "reassigns"` → FAIL.

- [ ] **Step 3: Implement** — in `removeMember`, after the soft-delete write, before the supervisorIds strip:

```ts
import { and, eq, sql } from 'drizzle-orm';
import { organizationMembers, organizations, projects, users } from '@/db/schema';
// ...
  // Reassign any students this (university) coordinator supervised → the head
  // (org owner). Company orgs have no assigned_coordinator_id rows → no-op.
  if (m.userId) {
    const [org] = await db
      .select({ ownerId: organizations.ownerId })
      .from(organizations)
      .where(eq(organizations.id, m.organizationId))
      .limit(1);
    if (org?.ownerId && org.ownerId !== m.userId) {
      await db
        .update(organizationMembers)
        .set({ assignedCoordinatorId: org.ownerId, updatedAt: now })
        .where(
          and(
            eq(organizationMembers.organizationId, m.organizationId),
            eq(organizationMembers.assignedCoordinatorId, m.userId),
          ),
        );
    }
  }
```

(`organizations` is already imported; add `and` to the `drizzle-orm` import if not present.)

- [ ] **Step 4: Run tests** — `pnpm vitest run modules/team/__tests__/service.test.ts` → PASS (new + existing removeMember tests).

- [ ] **Step 5: Commit**

```bash
git add modules/team/service.ts modules/team/__tests__/service.test.ts
git commit -m "feat(team): removing a coordinator reassigns their students to the head"
```

---

## Task 9: Notification routing — submit notifies the assigned encadrant only

**Files:**
- Modify: `modules/notifications/dispatcher.ts:283-348` (`onAcademicReportSubmitted`)
- Test: `modules/notifications/__tests__/dispatcher.test.ts`

- [ ] **Step 1: Update the failing tests**

Adjust the existing `academicReport.submitted` test(s) so the report row's student has an `assigned_coordinator_id`, and assert **only that coordinator** is notified; add a case where assignment is `null` → the **owner** is notified. Follow the file's existing `selectQueue`/insert-spy pattern. Example assertions:

```ts
// assigned encadrant 'enc1' → exactly one notification insert with recipientId 'enc1'
expect(insertedNotifications.map((n) => n.recipientId)).toEqual(['enc1']);
// unassigned → owner 'headUser'
expect(insertedNotifications.map((n) => n.recipientId)).toEqual(['headUser']);
```

- [ ] **Step 2: Run to confirm failure** — `pnpm vitest run modules/notifications/__tests__/dispatcher.test.ts -t "submitted"` → FAIL (still broadcasts to all coordinators).

- [ ] **Step 3: Implement** — replace the "recipients = all owner/admin coordinators" block in `onAcademicReportSubmitted` with assigned-encadrant resolution:

```ts
  // Recipient = the student's assigned encadrant; fall back to the org owner
  // (head) when unassigned or the encadrant is no longer active. NEVER broadcast
  // to all coordinators — gated visibility (spec §3.3c).
  const [studentMember] = await db
    .select({ assigned: organizationMembers.assignedCoordinatorId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, row.report.universityOrgId),
        eq(organizationMembers.userId, row.report.studentUserId),
        eq(organizationMembers.role, 'student'),
      ),
    )
    .limit(1);

  let recipientId: string | null = studentMember?.assigned ?? null;

  if (recipientId) {
    const [stillActive] = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, row.report.universityOrgId),
          eq(organizationMembers.userId, recipientId),
          eq(organizationMembers.status, 'active'),
          inArray(organizationMembers.role, ['owner', 'admin']),
        ),
      )
      .limit(1);
    if (!stillActive) recipientId = null;
  }

  if (!recipientId) {
    const [org] = await db
      .select({ ownerId: organizations.ownerId })
      .from(organizations)
      .where(eq(organizations.id, row.report.universityOrgId))
      .limit(1);
    recipientId = org?.ownerId ?? null;
  }
  if (!recipientId) return;

  const coordinators = await db.select().from(users).where(eq(users.id, recipientId));
```

Keep the existing `for (const coord of coordinators)` notify/email loop unchanged below. Add `organizations` to the dispatcher's `@/db/schema` import (`inArray` and `and` are already imported).

- [ ] **Step 4: Run tests** — `pnpm vitest run modules/notifications/__tests__/dispatcher.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/notifications/dispatcher.ts modules/notifications/__tests__/dispatcher.test.ts
git commit -m "feat(notifications): route rapport-submitted to the assigned encadrant"
```

---

## Task 10: View-gate helper + wire into the review surface

**Files:**
- Modify: `modules/university/queries.ts` (append helper)
- Modify: `app/[locale]/(platform)/university/students/[studentId]/page.tsx:39-40`
- Test: `modules/university/__tests__/queries.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```ts
describe('canCoordinatorViewStudent', () => {
  it('owner sees any student', () => {
    expect(canCoordinatorViewStudent('owner', 'o1', { assignedCoordinatorId: 'someone' })).toBe(true);
  });
  it('encadrant sees only their assigned student', () => {
    expect(canCoordinatorViewStudent('admin', 'a1', { assignedCoordinatorId: 'a1' })).toBe(true);
    expect(canCoordinatorViewStudent('admin', 'a1', { assignedCoordinatorId: 'a2' })).toBe(false);
    expect(canCoordinatorViewStudent('admin', 'a1', { assignedCoordinatorId: null })).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure** — `pnpm vitest run modules/university/__tests__/queries.test.ts -t "canCoordinatorViewStudent"` → FAIL.

- [ ] **Step 3: Implement** (append to `queries.ts` — pure, no db)

```ts
/**
 * Gated visibility: the head (owner) sees any student; an encadrant (admin) sees
 * only the students assigned to them. Pure — caller supplies the membership row.
 */
export function canCoordinatorViewStudent(
  viewerRole: 'owner' | 'admin',
  viewerUserId: string,
  studentMembership: { assignedCoordinatorId: string | null },
): boolean {
  if (viewerRole === 'owner') return true;
  return studentMembership.assignedCoordinatorId === viewerUserId;
}
```

- [ ] **Step 4: Wire into the page** — in `students/[studentId]/page.tsx`, after the existing IDOR membership gate (`if (!studentMembership || studentMembership.role !== 'student') notFound();`) add:

```ts
  if (!canCoordinatorViewStudent(current.role as 'owner' | 'admin', session.user.id, studentMembership)) {
    notFound(); // encadrant viewing a student not assigned to them — same opaque outcome
  }
```

Import `canCoordinatorViewStudent` from `@/modules/university/queries`. (`current.role` is already available from `getCurrentOrg`; `studentMembership.assignedCoordinatorId` exists after Task 1.)

- [ ] **Step 5: Run tests + typecheck** — `pnpm vitest run modules/university/__tests__/queries.test.ts && pnpm typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/university/queries.ts modules/university/__tests__/queries.test.ts "app/[locale]/(platform)/university/students/[studentId]/page.tsx"
git commit -m "feat(university): gate the review surface to the assigned encadrant"
```

---

## Task 11: Dashboard roster — viewer-aware + encadrant column + reassign control

**Files:**
- Create: `app/[locale]/(platform)/university/_assign-coordinator-select.tsx`
- Modify: `app/[locale]/(platform)/university/dashboard/page.tsx`

- [ ] **Step 1: Create the client reassign select**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { assignStudentCoordinatorAction } from '@/modules/university/server-actions';

export function AssignCoordinatorSelect({
  studentMemberId,
  current,
  coordinators,
  unassignedLabel,
}: {
  studentMemberId: string;
  current: string | null;
  coordinators: { userId: string; name: string }[];
  unassignedLabel: string;
}) {
  const [value, setValue] = useState(current ?? '');
  const [pending, start] = useTransition();
  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        start(async () => {
          await assignStudentCoordinatorAction({
            studentMemberId,
            coordinatorUserId: next || null,
          });
        });
      }}
      className="rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1 text-caption text-[var(--ink-2)]"
    >
      <option value="">{unassignedLabel}</option>
      {coordinators.map((c) => (
        <option key={c.userId} value={c.userId}>{c.name}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Make the dashboard viewer-aware**

In `dashboard/page.tsx`:
- Compute `const isHead = current.role === 'owner';`
- Replace `getManagedStudents(current.org.id)` with `getManagedStudents(current.org.id, isHead ? undefined : { forCoordinatorId: session.user.id })`.
- Also fetch coordinators when head: `const coordinators = isHead ? await getUniversityCoordinators(current.org.id) : [];` (add to the `Promise.all` or a follow-up).
- Add a new column header `{t('colEncadrant')}` (head only) and, per row, a `<TableCell>` rendering `<AssignCoordinatorSelect studentMemberId={s.memberId} current={s.assignedCoordinatorId} coordinators={coordinators.map(c=>({userId:c.userId,name:c.name}))} unassignedLabel={t('unassigned')} />` (head), or `s.encadrantName ?? '—'` is not shown to encadrants (their column is omitted).

Import `AssignCoordinatorSelect` and `getUniversityCoordinators`.

- [ ] **Step 3: Verify in the browser**

Start/confirm dev server (`preview_start` if needed). As the head (coordinator owner) at `/university/dashboard`: confirm the Encadrant column renders a dropdown; changing it persists (reload → value sticks). As an encadrant (a second admin coordinator): confirm the roster shows only their assigned students and no Encadrant column. Use `preview_snapshot` to confirm DOM; `preview_console_logs` for errors.

- [ ] **Step 4: Typecheck** — `pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(platform)/university/_assign-coordinator-select.tsx" "app/[locale]/(platform)/university/dashboard/page.tsx"
git commit -m "feat(university): dashboard roster gated by viewer + head reassign control"
```

---

## Task 12: Dashboard coordinator panel + self-service invite-coordinator button

**Files:**
- Create: `app/[locale]/(platform)/university/_invite-coordinator-button.tsx`
- Modify: `app/[locale]/(platform)/university/dashboard/page.tsx`

- [ ] **Step 1: Create the invite-coordinator dialog** (mirror the existing `_invite-student-button.tsx` structure/markup; swap the action)

```tsx
'use client';
import { useState, useTransition } from 'react';
import { inviteCoordinatorAction } from '@/modules/university/server-actions';
// ...mirror _invite-student-button.tsx: a button that opens an email input + submit,
// calls inviteCoordinatorAction({ email }), shows ok/error, closes on success.
```

(Read `_invite-student-button.tsx` and copy its dialog/markup/i18n-prop pattern exactly, replacing `inviteStudentAction` with `inviteCoordinatorAction` and the labels with the coordinator namespace.)

- [ ] **Step 2: Render the coordinator panel (head only)** in `dashboard/page.tsx`

Below the roster, when `isHead`, render a section listing `coordinators` with each one's assigned-student count (tally from the head's full `students` list: `students.filter(s => s.assignedCoordinatorId === c.userId).length`), the head marked, and the `<InviteCoordinatorButton />` in the section header. Use the same `border`/`bg-[var(--surface)]` card styling as the existing pending section.

- [ ] **Step 3: Verify in the browser**

As the head: confirm the Coordinators panel lists the head + encadrants with correct counts, and "Invite coordinator" opens, submits, and (with a real/dev email) shows success. As an encadrant: confirm the panel is absent. `preview_snapshot` + `preview_console_logs`.

- [ ] **Step 4: Typecheck** — `pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(platform)/university/_invite-coordinator-button.tsx" "app/[locale]/(platform)/university/dashboard/page.tsx"
git commit -m "feat(university): coordinator roster panel + self-service coordinator invite"
```

---

## Task 13: Fix `acceptInviteAction` student redirect

**Files:**
- Modify: `modules/team/server-actions.ts:147-152`
- Test: `modules/team/__tests__/server-actions.test.ts`

- [ ] **Step 1: Add/adjust the test** — assert that a university `student` accept returns `redirectTo: '/intern/university'`.

- [ ] **Step 2: Run to confirm failure** — FAIL (`/intern/dashboard`).

- [ ] **Step 3: Implement** — change the redirect ternary:

```ts
    const redirectTo =
      result.orgKind === 'university'
        ? result.role === 'student'
          ? '/intern/university'
          : '/university/dashboard'
        : '/company/dashboard';
```

- [ ] **Step 4: Run tests** — `pnpm vitest run modules/team/__tests__/server-actions.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/team/server-actions.ts modules/team/__tests__/server-actions.test.ts
git commit -m "fix(team): student invite accept redirects to /intern/university"
```

---

## Task 14: i18n FR/EN strings

**Files:**
- Modify: `locales/fr.json`, `locales/en.json`

- [ ] **Step 1: Add the new keys** under `university.dashboard` (and a `university.coordinators` group as needed). FR is the source of truth; EN mirrors. Keys:
  - `colEncadrant`, `unassigned`, `coordinatorsTitle`, `headBadge`, `studentCount` (ICU `{count}`), `inviteCoordinator`, plus the invite-coordinator dialog strings (title, emailLabel, submit, sending, success, errors) mirroring the existing student-invite dialog keys.

FR example:
```json
"colEncadrant": "Encadrant",
"unassigned": "Non assigné",
"coordinatorsTitle": "Encadrants",
"headBadge": "Responsable",
"studentCount": "{count, plural, =0 {aucun étudiant} one {# étudiant} other {# étudiants}}",
"inviteCoordinator": "Inviter un encadrant"
```

EN example:
```json
"colEncadrant": "Supervisor",
"unassigned": "Unassigned",
"coordinatorsTitle": "Supervisors",
"headBadge": "Head",
"studentCount": "{count, plural, =0 {no students} one {# student} other {# students}}",
"inviteCoordinator": "Invite supervisor"
```

- [ ] **Step 2: Verify the build compiles messages** — `pnpm build` (or the project's i18n typecheck if present) → no missing-key/type errors.

- [ ] **Step 3: Commit**

```bash
git add locales/fr.json locales/en.json
git commit -m "i18n(university): supervision-structure strings (FR/EN)"
```

---

## Task 15: Seed — assign the demo student to the head

**Files:**
- Modify: `scripts/seed.ts` (the `seedUniversity` section)

- [ ] **Step 1: Set the assignment** — when seeding the placed student (Yasmine), set `assignedCoordinatorId` to the coordinator/owner (prof.saidi) user id on the student's `organization_members` insert (or an update right after). This makes the demo deterministic regardless of backfill timing.

- [ ] **Step 2: Re-seed locally and verify** — `pnpm tsx --env-file=.env.local scripts/seed.ts` (or the project's seed command). Then log in via `/dev/login` as `prof.saidi@enit.utm.tn` → `/university/dashboard` shows Yasmine with the head as encadrant.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat(seed): assign demo student to the head coordinator"
```

---

## Task 16: Final verification

- [ ] **Step 1: Full test suite** — `pnpm test` (or `pnpm vitest run`) → all PASS (expect ~+15–20 new tests).
- [ ] **Step 2: Typecheck + build** — `pnpm build` → PASS.
- [ ] **Step 3: Lint** — `pnpm lint` → clean.
- [ ] **Step 4: Manual gating walkthrough** (preview tools):
  - Head invites a 2nd coordinator (encadrant) → accept flow promotes to `university`, lands on `/university/dashboard`.
  - Head assigns student A to the encadrant; encadrant's roster shows only A; head's shows all.
  - Encadrant opens `/university/students/<A>` → ok; `/university/students/<not-theirs>` → 404.
  - Student A submits a rapport → only the encadrant gets the notification (check `/api`/notifications or the in-app bell).
  - Remove the encadrant → student A reassigns to the head.
- [ ] **Step 5: Report** the test count delta and any deferred follow-ups; then use **superpowers:finishing-a-development-branch**.

---

## Self-Review (author)

- **Spec coverage:** multi-coordinator (T7), assignment (T1/T3/T6), gated roster (T4/T11), gated review surface (T10), gated notification (T9), reassign-on-removal (T8), redirect fix (T13), seed (T15), i18n (T14). All §3/§4 items mapped. CSV + pending-invite mgmt are Plan 2 (intentionally out of this plan).
- **Type consistency:** `assignedCoordinatorId: string | null` used consistently across schema, `ManagedStudent`, service, action, helper. `getManagedStudents(orgId, opts?)` signature matches every caller. `getUniversityCoordinators` returns `{ userId, name, email, role }` used by both the panel and the reassign select.
- **No placeholders:** every logic step carries complete code; UI steps reference the concrete sibling component to mirror and are gated by typecheck + browser verification.
