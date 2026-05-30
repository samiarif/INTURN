# University Cohort Onboarding — Implementation Plan (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coordinator onboard a whole cohort at once (CSV bulk student invite) and manage pending invites (list / resend / revoke), assignment-aware on top of Plan 1.

**Architecture:** A pure CSV parser feeds a `bulkInviteStudents` service that dedupes against existing org members and reuses Plan 1's `createInvite` (with `assignedCoordinatorId`). Pending invites are `organization_members` rows with `status='invited'`, surfaced by a viewer-gated query and managed by university-flavored resend/revoke actions that reuse the team service. New UI on `/university/dashboard`.

**Tech Stack:** Next.js 16 (RSC + `'use server'`), Drizzle on Neon-http (no transactions), next-intl 4, Vitest (mocked `db`), Tailwind v4 tokens, pnpm.

**Spec:** `docs/superpowers/specs/2026-05-30-university-at-scale-design.md` (§5).

**Builds on Plan 1 (already merged on this branch):**
- `createInvite({ ..., assignedCoordinatorId?: string | null })` persists the assignment.
- `getUniversityCoordinators(orgId)` → `{ userId, name, email, role }[]` (head + encadrants).
- `getManagedStudents(orgId, { forCoordinatorId? })` is viewer-aware.
- Head = org `owner`; encadrant = `admin`. Inviting auto-assigns the inviter.
- Team service has `resendInvite({orgId,memberId}) → {token}` and `revokeInvite({orgId,memberId})` (both verify org ownership of the row).

**Gotcha:** run all commands from `/Users/mac/code/inturn-hub/inturn`; if a bare `git` errors "not a git repository", use `git -C /Users/mac/code/inturn-hub/inturn ...`. Never `git add -A` (an unrelated `docs/HANDOFF.md` + untracked `.claude/` must stay out of commits).

---

## File Structure

**Create:**
- `modules/university/csv.ts` — pure `parseStudentCsv(text)`.
- `modules/university/__tests__/csv.test.ts`.
- `app/[locale]/(platform)/university/_bulk-invite-button.tsx` — client CSV import (textarea + file reader + head encadrant picker).
- `app/[locale]/(platform)/university/_pending-invites.tsx` — client list with resend/revoke buttons.

**Modify:**
- `lib/ratelimit.ts` — add `university-bulk-invite` bucket.
- `modules/university/service.ts` — `bulkInviteStudents`, `assertStudentInviteManageable`.
- `modules/university/queries.ts` — `getPendingStudentInvites`.
- `modules/university/server-actions.ts` — `bulkInviteStudentsAction`, `resendStudentInviteAction`, `revokeStudentInviteAction`.
- `app/[locale]/(platform)/university/dashboard/page.tsx` — wire bulk-import action + replace the flat pending list with `_pending-invites`.
- `locales/fr.json`, `locales/en.json` — new strings.

**Test (extend):** `modules/university/__tests__/{service,server-actions,queries}.test.ts`, `lib/__tests__/ratelimit.test.ts` (if present; else inline in csv/service tests).

---

## Task 1: Rate-limit bucket for bulk invite

**Files:**
- Modify: `lib/ratelimit.ts:29-51`

- [ ] **Step 1: Add the bucket.** In `lib/ratelimit.ts`, add `'university-bulk-invite'` to the `LimitName` union and to `LIMITS`:

```ts
export type LimitName =
  | 'upload'
  | 'clerk-webhook'
  | 'ai-task-clarity'
  | 'ai-intern-unblocker'
  | 'ai-checkin-draft'
  | 'ai-cv-parse'
  | 'ai-project-assist'
  | 'team-invite'
  | 'university-bulk-invite';
```

```ts
  'team-invite': { max: 10, windowMs: 60_000 },
  // Bulk cohort import — a few imports per minute, each up to 100 students.
  'university-bulk-invite': { max: 5, windowMs: 60_000 },
```

- [ ] **Step 2: Typecheck.** Run: `pnpm typecheck` → PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/ratelimit.ts
git commit -m "feat(ratelimit): add university-bulk-invite bucket"
```

---

## Task 2: Pure CSV parser

**Files:**
- Create: `modules/university/csv.ts`
- Test: `modules/university/__tests__/csv.test.ts`

- [ ] **Step 1: Write failing tests** (`modules/university/__tests__/csv.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { parseStudentCsv } from '../csv';

describe('parseStudentCsv', () => {
  it('parses email-only lines', () => {
    const r = parseStudentCsv('a@x.com\nb@y.com');
    expect(r.rows).toEqual([
      { email: 'a@x.com', name: null },
      { email: 'b@y.com', name: null },
    ]);
    expect(r.invalid).toEqual([]);
  });

  it('parses "email,Name" and trims', () => {
    const r = parseStudentCsv('  a@x.com , Lina Ben \n b@y.com,Amine Gharbi');
    expect(r.rows).toEqual([
      { email: 'a@x.com', name: 'Lina Ben' },
      { email: 'b@y.com', name: 'Amine Gharbi' },
    ]);
  });

  it('skips a header row and blank lines', () => {
    const r = parseStudentCsv('Email,Name\n\na@x.com,Lina\n');
    expect(r.rows).toEqual([{ email: 'a@x.com', name: 'Lina' }]);
  });

  it('collects invalid emails separately', () => {
    const r = parseStudentCsv('not-an-email\nb@y.com');
    expect(r.invalid).toEqual(['not-an-email']);
    expect(r.rows).toEqual([{ email: 'b@y.com', name: null }]);
  });

  it('dedupes case-insensitively within the input (first wins)', () => {
    const r = parseStudentCsv('A@x.com,Lina\na@X.com,Dup');
    expect(r.rows).toEqual([{ email: 'A@x.com', name: 'Lina' }]);
  });
});
```

- [ ] **Step 2: Run, confirm FAIL** — `pnpm vitest run modules/university/__tests__/csv.test.ts`

- [ ] **Step 3: Implement** (`modules/university/csv.ts`):

```ts
export type ParsedStudentRow = { email: string; name: string | null };
export type ParsedStudentCsv = { rows: ParsedStudentRow[]; invalid: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse a pasted/uploaded CSV of students. One per line: `email` or
 * `email,Full Name` (comma OR semicolon OR tab separated). A leading header row
 * (first cell not an email) is skipped. Blank lines ignored. Case-insensitive
 * de-dupe within the input (first occurrence wins). Pure — no caps, no I/O;
 * the caller enforces the row cap and dedupes against existing members.
 */
export function parseStudentCsv(text: string): ParsedStudentCsv {
  const rows: ParsedStudentRow[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const cells = trimmed.split(/[,;\t]/).map((c) => c.trim());
    const email = cells[0] ?? '';
    const name = cells.slice(1).join(' ').trim() || null;

    // Skip a header row only as the very first non-empty line.
    if (i === 0 && !EMAIL_RE.test(email)) {
      const looksLikeHeader = /e-?mail/i.test(email);
      if (looksLikeHeader) return;
    }

    if (!EMAIL_RE.test(email)) {
      invalid.push(trimmed);
      return;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ email, name });
  });

  return { rows, invalid };
}
```

- [ ] **Step 4: Run tests + typecheck** → PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/university/csv.ts modules/university/__tests__/csv.test.ts
git commit -m "feat(university): pure parseStudentCsv for bulk invite"
```

---

## Task 3: `bulkInviteStudents` service

**Files:**
- Modify: `modules/university/service.ts`
- Test: `modules/university/__tests__/service.test.ts`

- [ ] **Step 1: Write failing tests** (append to `service.test.ts`, matching its `selectQueue` + `mockInsert`/`mockSelect` mock style; `createInvite` is in `@/modules/team/service` — mock it):

At the top of the file add a mock for the team service (near the other `vi.mock`s):
```ts
vi.mock('@/modules/team/service', () => ({
  createInvite: (...a: unknown[]) => mocks.createInvite(...a),
}));
```
and add `createInvite: vi.fn()` to the `vi.hoisted` return + `import { inArray }` handling in the `drizzle-orm` mock (`inArray: vi.fn(() => 'inArray')`).

Tests:
```ts
describe('bulkInviteStudents', () => {
  beforeEach(() => {
    mocks.createInvite.mockReset();
    mocks.createInvite.mockImplementation(async ({ email }: { email: string }) => ({
      member: { email }, token: `tok-${email}`,
    }));
  });

  it('rejects when the target coordinator is not an active owner/admin', async () => {
    mocks.selectQueue.push([]); // coordinator validation: none
    await expect(
      bulkInviteStudents({ orgId: 'uni-1', rows: [{ email: 'a@x.com', name: null }], assignedCoordinatorId: 'cX', invitedByUserId: 'u1' }),
    ).rejects.toThrow('coordinator_not_found');
  });

  it('invites new rows and skips duplicates (existing + intra-batch)', async () => {
    mocks.selectQueue.push([{ role: 'owner' }]); // coordinator validation OK
    mocks.selectQueue.push([{ email: 'dup@x.com' }]); // existing members in org
    const res = await bulkInviteStudents({
      orgId: 'uni-1',
      rows: [
        { email: 'new@x.com', name: 'New' },
        { email: 'DUP@x.com', name: null }, // already a member (case-insensitive)
      ],
      assignedCoordinatorId: 'coord-1',
      invitedByUserId: 'coord-1',
    });
    expect(res.invited).toEqual([{ email: 'new@x.com', token: 'tok-new@x.com' }]);
    expect(res.skippedDuplicate).toEqual(['DUP@x.com']);
    expect(mocks.createInvite).toHaveBeenCalledTimes(1);
    expect(mocks.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'uni-1', email: 'new@x.com', role: 'student', assignedCoordinatorId: 'coord-1', invitedByUserId: 'coord-1' }),
    );
  });
});
```

- [ ] **Step 2: Run, confirm FAIL.**

- [ ] **Step 3: Implement** (append to `modules/university/service.ts`; add `inArray` to the `drizzle-orm` import and `import { createInvite } from '@/modules/team/service'`):

```ts
export async function bulkInviteStudents(input: {
  orgId: string;
  rows: { email: string; name: string | null }[];
  assignedCoordinatorId: string;
  invitedByUserId: string;
}): Promise<{ invited: { email: string; token: string }[]; skippedDuplicate: string[] }> {
  // Validate the batch encadrant is an active owner/admin of the org (IDOR).
  const [coord] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, input.orgId),
        eq(organizationMembers.userId, input.assignedCoordinatorId),
        eq(organizationMembers.status, 'active'),
      ),
    )
    .limit(1);
  if (!coord || (coord.role !== 'owner' && coord.role !== 'admin')) {
    throw new Error('coordinator_not_found');
  }

  // Dedupe against existing non-removed members of the org.
  const existing = await db
    .select({ email: organizationMembers.email })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, input.orgId),
        inArray(organizationMembers.status, ['active', 'invited']),
      ),
    );
  const taken = new Set(existing.map((e) => e.email.toLowerCase()));

  const invited: { email: string; token: string }[] = [];
  const skippedDuplicate: string[] = [];
  for (const row of input.rows) {
    const key = row.email.toLowerCase();
    if (taken.has(key)) {
      skippedDuplicate.push(row.email);
      continue;
    }
    taken.add(key); // guard against intra-batch repeats the parser missed
    const { token } = await createInvite({
      orgId: input.orgId,
      email: row.email,
      role: 'student',
      assignedCoordinatorId: input.assignedCoordinatorId,
      invitedByUserId: input.invitedByUserId,
    });
    invited.push({ email: row.email, token });
  }
  return { invited, skippedDuplicate };
}
```

- [ ] **Step 4: Run tests + typecheck** → PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/university/service.ts modules/university/__tests__/service.test.ts
git commit -m "feat(university): bulkInviteStudents service (dedupe + encadrant validation)"
```

---

## Task 4: `bulkInviteStudentsAction`

**Files:**
- Modify: `modules/university/server-actions.ts`
- Test: `modules/university/__tests__/server-actions.test.ts`

- [ ] **Step 1: Write failing tests** (append; add `bulkInviteStudents` to the `../service` mock and `parseStudentCsv` mock for `../csv`):

```ts
// add to the existing vi.mock('../service', ...) factory: bulkInviteStudents: (...a) => bulkInviteStudents(...a)
// and: const bulkInviteStudents = vi.fn();
// plus: vi.mock('../csv', () => ({ parseStudentCsv: (...a) => parseStudentCsv(...a) })); const parseStudentCsv = vi.fn();

describe('bulkInviteStudentsAction', () => {
  it('parses, invites, emails each invited, and returns a summary', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ENIT', kind: 'university' }, role: 'owner' });
    requireOrgRole.mockResolvedValue({});
    parseStudentCsv.mockReturnValue({ rows: [{ email: 'a@x.com', name: 'A' }], invalid: ['bad'] });
    bulkInviteStudents.mockResolvedValue({ invited: [{ email: 'a@x.com', token: 't' }], skippedDuplicate: [] });

    const res = await bulkInviteStudentsAction({ csv: 'a@x.com,A\nbad' });
    expect(bulkInviteStudents).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'uni-1', assignedCoordinatorId: 'coord-1', invitedByUserId: 'coord-1' }),
    );
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ ok: true, invited: 1, skippedDuplicate: [], invalid: ['bad'] });
  });

  it('rejects more than 100 rows', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ENIT', kind: 'university' }, role: 'owner' });
    requireOrgRole.mockResolvedValue({});
    parseStudentCsv.mockReturnValue({ rows: new Array(101).fill({ email: 'a@x.com', name: null }), invalid: [] });
    const res = await bulkInviteStudentsAction({ csv: 'x' });
    expect(res).toEqual({ ok: false, error: 'too_many_rows' });
    expect(bulkInviteStudents).not.toHaveBeenCalled();
  });

  it('an encadrant import assigns to themselves (ignores any encadrantUserId)', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ENIT', kind: 'university' }, role: 'admin' });
    requireOrgRole.mockResolvedValue({});
    parseStudentCsv.mockReturnValue({ rows: [{ email: 'a@x.com', name: null }], invalid: [] });
    bulkInviteStudents.mockResolvedValue({ invited: [], skippedDuplicate: ['a@x.com'] });
    await bulkInviteStudentsAction({ csv: 'a@x.com', encadrantUserId: 'someone-else' });
    expect(bulkInviteStudents).toHaveBeenCalledWith(expect.objectContaining({ assignedCoordinatorId: 'coord-1' }));
  });
});
```

- [ ] **Step 2: Run, confirm FAIL.**

- [ ] **Step 3: Implement** (in `modules/university/server-actions.ts`; import `parseStudentCsv` from `./csv` and `bulkInviteStudents` from `./service`):

```ts
export async function bulkInviteStudentsAction(input: {
  csv: string;
  encadrantUserId?: string | null;
}): Promise<
  | { ok: true; invited: number; skippedDuplicate: string[]; invalid: string[] }
  | { ok: false; error: string }
> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner', 'admin']);

    const rl = ratelimit('university-bulk-invite').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    const { rows, invalid } = parseStudentCsv(input.csv);
    if (rows.length + invalid.length > 100) return { ok: false, error: 'too_many_rows' };
    if (rows.length === 0) return { ok: true, invited: 0, skippedDuplicate: [], invalid };

    // The head may direct a batch to a chosen encadrant; an encadrant always
    // takes their own batch. bulkInviteStudents re-validates the coordinator.
    const assignedCoordinatorId =
      current.role === 'owner' && input.encadrantUserId ? input.encadrantUserId : user.id;

    const { invited, skippedDuplicate } = await bulkInviteStudents({
      orgId: current.org.id,
      rows,
      assignedCoordinatorId,
      invitedByUserId: user.id,
    });

    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';
    const inviterName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    for (const inv of invited) {
      const { subject, text, html } = universityInviteTemplate({
        universityName: current.org.name, inviterName, token: inv.token, variant: 'student', locale,
      });
      await sendEmail({ to: inv.email, subject, text, html, tags: [{ name: 'type', value: 'university.invite' }] });
    }

    revalidatePath('/university/dashboard');
    return { ok: true, invited: invited.length, skippedDuplicate, invalid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
```

- [ ] **Step 4: Run tests + typecheck** → PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/university/server-actions.ts modules/university/__tests__/server-actions.test.ts
git commit -m "feat(university): bulkInviteStudentsAction (CSV cohort import)"
```

---

## Task 5: `getPendingStudentInvites` query

**Files:**
- Modify: `modules/university/queries.ts`
- Test: `modules/university/__tests__/queries.test.ts`

- [ ] **Step 1: Write failing test** (append):

```ts
describe('getPendingStudentInvites', () => {
  it('maps pending student invites with encadrant name', async () => {
    mocks.selectQueue.push([{
      memberId: 'm1', email: 'pending@x.com', invitedAt: new Date('2026-05-01'),
      inviteExpiresAt: new Date('2026-05-08'), assignedCoordinatorId: 'coord-9',
      encadrantFirstName: 'Sami', encadrantLastName: 'Saidi',
    }]);
    const rows = await getPendingStudentInvites('uni-1');
    expect(rows[0]).toMatchObject({ email: 'pending@x.com', assignedCoordinatorId: 'coord-9', encadrantName: 'Sami Saidi' });
  });
  it('accepts forCoordinatorId (encadrant view)', async () => {
    mocks.selectQueue.push([]);
    expect(await getPendingStudentInvites('uni-1', { forCoordinatorId: 'coord-9' })).toEqual([]);
  });
});
```
Add `getPendingStudentInvites` to the `from '../queries'` import.

- [ ] **Step 2: Run, confirm FAIL.**

- [ ] **Step 3: Implement** (append to `queries.ts`):

```ts
export type PendingStudentInvite = {
  memberId: string;
  email: string;
  invitedAt: Date;
  inviteExpiresAt: Date | null;
  assignedCoordinatorId: string | null;
  encadrantName: string | null;
};

/** Pending (status='invited') student members. Head sees all; encadrant sees only theirs. */
export async function getPendingStudentInvites(
  universityOrgId: string,
  opts?: { forCoordinatorId?: string },
): Promise<PendingStudentInvite[]> {
  const encadrant = alias(users, 'pending_encadrant');
  const where = [
    eq(organizationMembers.organizationId, universityOrgId),
    eq(organizationMembers.role, 'student'),
    eq(organizationMembers.status, 'invited'),
  ];
  if (opts?.forCoordinatorId) {
    where.push(eq(organizationMembers.assignedCoordinatorId, opts.forCoordinatorId));
  }
  const rows = await db
    .select({
      memberId: organizationMembers.id,
      email: organizationMembers.email,
      invitedAt: organizationMembers.invitedAt,
      inviteExpiresAt: organizationMembers.inviteExpiresAt,
      assignedCoordinatorId: organizationMembers.assignedCoordinatorId,
      encadrantFirstName: encadrant.firstName,
      encadrantLastName: encadrant.lastName,
    })
    .from(organizationMembers)
    .leftJoin(encadrant, eq(encadrant.id, organizationMembers.assignedCoordinatorId))
    .where(and(...where))
    .orderBy(desc(organizationMembers.invitedAt))
    .limit(500);

  return rows.map((r) => ({
    memberId: r.memberId,
    email: r.email,
    invitedAt: r.invitedAt,
    inviteExpiresAt: r.inviteExpiresAt,
    assignedCoordinatorId: r.assignedCoordinatorId ?? null,
    encadrantName: [r.encadrantFirstName, r.encadrantLastName].filter(Boolean).join(' ') || null,
  }));
}
```

- [ ] **Step 4: Run tests + typecheck** → PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/university/queries.ts modules/university/__tests__/queries.test.ts
git commit -m "feat(university): getPendingStudentInvites query"
```

---

## Task 6: Resend / revoke pending student invites

**Files:**
- Modify: `modules/university/service.ts` (`assertStudentInviteManageable`)
- Modify: `modules/university/server-actions.ts` (two actions)
- Test: `modules/university/__tests__/service.test.ts`, `modules/university/__tests__/server-actions.test.ts`

- [ ] **Step 1: Failing service test** for the guard (append to `service.test.ts`):

```ts
describe('assertStudentInviteManageable', () => {
  it('throws for a non-student / wrong-org / wrong-status member', async () => {
    mocks.selectQueue.push([{ organizationId: 'uni-1', role: 'admin', status: 'active', assignedCoordinatorId: null }]);
    await expect(assertStudentInviteManageable({ orgId: 'uni-1', memberId: 'm1', viewerRole: 'owner', viewerUserId: 'o1' }))
      .rejects.toThrow('member_not_found');
  });
  it('throws when an encadrant targets an invite not assigned to them', async () => {
    mocks.selectQueue.push([{ organizationId: 'uni-1', role: 'student', status: 'invited', assignedCoordinatorId: 'other' }]);
    await expect(assertStudentInviteManageable({ orgId: 'uni-1', memberId: 'm1', viewerRole: 'admin', viewerUserId: 'me' }))
      .rejects.toThrow('member_not_found');
  });
  it('passes for the head on any pending student invite', async () => {
    mocks.selectQueue.push([{ organizationId: 'uni-1', role: 'student', status: 'invited', assignedCoordinatorId: 'whoever' }]);
    await expect(assertStudentInviteManageable({ orgId: 'uni-1', memberId: 'm1', viewerRole: 'owner', viewerUserId: 'o1' }))
      .resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Implement the guard** (append to `service.ts`):

```ts
export async function assertStudentInviteManageable(input: {
  orgId: string;
  memberId: string;
  viewerRole: 'owner' | 'admin';
  viewerUserId: string;
}): Promise<void> {
  const [m] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.id, input.memberId))
    .limit(1);
  if (
    !m ||
    m.organizationId !== input.orgId ||
    m.role !== 'student' ||
    m.status !== 'invited'
  ) {
    throw new Error('member_not_found');
  }
  // Encadrants may only manage invites assigned to them; the head manages any.
  if (input.viewerRole !== 'owner' && m.assignedCoordinatorId !== input.viewerUserId) {
    throw new Error('member_not_found');
  }
}
```

- [ ] **Step 3: Run service tests** → PASS.

- [ ] **Step 4: Failing action tests** (append to `server-actions.test.ts`; add `assertStudentInviteManageable`, `resendInvite`, `revokeInvite` to mocks — `resendInvite`/`revokeInvite` live in `@/modules/team/service`, so extend that mock):

```ts
describe('revokeStudentInviteAction', () => {
  it('guards then revokes', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', kind: 'university' }, role: 'owner' });
    requireOrgRole.mockResolvedValue({});
    assertStudentInviteManageable.mockResolvedValue(undefined);
    revokeInvite.mockResolvedValue(undefined);
    const res = await revokeStudentInviteAction({ memberId: 'm1' });
    expect(assertStudentInviteManageable).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'uni-1', memberId: 'm1', viewerRole: 'owner', viewerUserId: 'coord-1' }),
    );
    expect(revokeInvite).toHaveBeenCalledWith({ orgId: 'uni-1', memberId: 'm1' });
    expect(res).toEqual({ ok: true });
  });
});

describe('resendStudentInviteAction', () => {
  it('guards, regenerates the token, and emails the student', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ENIT', kind: 'university' }, role: 'admin' });
    requireOrgRole.mockResolvedValue({});
    assertStudentInviteManageable.mockResolvedValue(undefined);
    resendInvite.mockResolvedValue({ token: 'tok2' });
    // member re-fetch for the email address:
    bulkInviteStudents; // (unused here)
    const res = await resendStudentInviteAction({ memberId: 'm1', email: 'p@x.com' });
    expect(resendInvite).toHaveBeenCalledWith({ orgId: 'uni-1', memberId: 'm1' });
    expect(sendEmail).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });
});
```

> Note: pass the student's `email` into `resendStudentInviteAction` from the client (the pending row already has it) to avoid a re-fetch. The guard already proved the row is a pending student invite of this org.

- [ ] **Step 5: Implement the actions** (in `server-actions.ts`; import `assertStudentInviteManageable` from `./service`, and `resendInvite`, `revokeInvite` from `@/modules/team/service`):

```ts
export async function revokeStudentInviteAction(input: {
  memberId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner', 'admin']);
    await assertStudentInviteManageable({
      orgId: current.org.id, memberId: input.memberId,
      viewerRole: current.role as 'owner' | 'admin', viewerUserId: user.id,
    });
    await revokeInvite({ orgId: current.org.id, memberId: input.memberId });
    revalidatePath('/university/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function resendStudentInviteAction(input: {
  memberId: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner', 'admin']);
    await assertStudentInviteManageable({
      orgId: current.org.id, memberId: input.memberId,
      viewerRole: current.role as 'owner' | 'admin', viewerUserId: user.id,
    });

    const rl = ratelimit('team-invite').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    const { token } = await resendInvite({ orgId: current.org.id, memberId: input.memberId });
    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';
    const inviterName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const { subject, text, html } = universityInviteTemplate({
      universityName: current.org.name, inviterName, token, variant: 'student', locale,
    });
    await sendEmail({ to: input.email, subject, text, html, tags: [{ name: 'type', value: 'university.invite' }] });

    revalidatePath('/university/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
```

- [ ] **Step 6: Run all university + team tests + typecheck** → PASS.

- [ ] **Step 7: Commit**

```bash
git add modules/university/service.ts modules/university/server-actions.ts modules/university/__tests__/service.test.ts modules/university/__tests__/server-actions.test.ts
git commit -m "feat(university): resend/revoke pending student invites (encadrant-scoped)"
```

---

## Task 7: Bulk-import UI

**Files:**
- Create: `app/[locale]/(platform)/university/_bulk-invite-button.tsx`
- Modify: `app/[locale]/(platform)/university/dashboard/page.tsx`

- [ ] **Step 1: Create the client component.** A button that expands to a `<textarea>` (paste CSV) + a `<input type="file" accept=".csv,text/csv">` whose contents are read (FileReader) into the textarea + (head only) an encadrant `<select>` (the `coordinators` list) + a submit. On submit, call `bulkInviteStudentsAction({ csv, encadrantUserId })`; show the summary (`invited`, `skippedDuplicate.length`, `invalid.length`) using i18n; `router.refresh()`. Mirror `_invite-student-button.tsx` for structure/markup and the `Button` import.

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { bulkInviteStudentsAction } from '@/modules/university/server-actions';

export function BulkInviteButton({
  coordinators,
}: {
  coordinators: { userId: string; name: string }[];
}) {
  const t = useTranslations('university.dashboard');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [encadrant, setEncadrant] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await bulkInviteStudentsAction({ csv, encadrantUserId: encadrant || null });
      if (res.ok) {
        setMsg(t('bulkSummary', { invited: res.invited, skipped: res.skippedDuplicate.length, invalid: res.invalid.length }));
        setCsv('');
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}>{t('bulkImport')}</Button>;
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] p-3">
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={t('bulkPlaceholder')}
        aria-label={t('bulkImport')}
        rows={5}
        className="rounded-md border border-[var(--border-color)] bg-[var(--surface)] p-2 text-sm font-mono"
      />
      <input
        type="file"
        accept=".csv,text/csv"
        className="text-caption text-[var(--ink-3)]"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          f.text().then(setCsv);
        }}
      />
      {coordinators.length > 0 && (
        <select
          value={encadrant}
          onChange={(e) => setEncadrant(e.target.value)}
          className="h-8 rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2 text-caption"
        >
          <option value="">{t('bulkAssignSelf')}</option>
          {coordinators.map((c) => (
            <option key={c.userId} value={c.userId}>{c.name}</option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={pending || !csv.trim()} onClick={submit}>
          {pending ? t('sending') : t('bulkSubmit')}
        </Button>
        {msg && <span className="text-caption text-[var(--ink-3)]">{msg}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into the dashboard.** In `dashboard/page.tsx`, render `<BulkInviteButton coordinators={isHead ? coordinators.map((c) => ({ userId: c.userId, name: c.name })) : []} />` near the `InviteStudentButton` (e.g., in the header `actions` or just under it). Import it.

- [ ] **Step 3: Verify in the browser.** As the head, open the bulk import, paste two emails, submit → summary shows "2 invited"; the pending panel (Task 8) lists them; `preview_console_logs` clean.

- [ ] **Step 4: Typecheck** → PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(platform)/university/_bulk-invite-button.tsx" "app/[locale]/(platform)/university/dashboard/page.tsx"
git commit -m "feat(university): CSV bulk-invite UI on the dashboard"
```

---

## Task 8: Pending-invite management UI

**Files:**
- Create: `app/[locale]/(platform)/university/_pending-invites.tsx`
- Modify: `app/[locale]/(platform)/university/dashboard/page.tsx`

- [ ] **Step 1: Create the client panel.** Renders the pending invites (passed from the server page) with per-row Resend / Revoke buttons calling `resendStudentInviteAction({ memberId, email })` / `revokeStudentInviteAction({ memberId })`, then `router.refresh()`.

```tsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { resendStudentInviteAction, revokeStudentInviteAction } from '@/modules/university/server-actions';

type Pending = { memberId: string; email: string; encadrantName: string | null };

export function PendingInvites({ invites }: { invites: Pending[] }) {
  const t = useTranslations('university.dashboard');
  const router = useRouter();
  const [pending, start] = useTransition();

  if (invites.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-[var(--ink-2)]">{t('pendingTitle')}</h2>
      <div className="divide-y divide-[var(--border-color)] rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
        {invites.map((inv) => (
          <div key={inv.memberId} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span className="text-[var(--ink-2)]">
              {inv.email}
              {inv.encadrantName && (
                <span className="ml-2 text-caption text-[var(--ink-4)]">· {inv.encadrantName}</span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <button
                disabled={pending}
                onClick={() => start(async () => { await resendStudentInviteAction({ memberId: inv.memberId, email: inv.email }); router.refresh(); })}
                className="text-caption text-[var(--brand-700)] hover:underline disabled:opacity-60"
              >
                {t('resend')}
              </button>
              <button
                disabled={pending}
                onClick={() => start(async () => { await revokeStudentInviteAction({ memberId: inv.memberId }); router.refresh(); })}
                className="text-caption text-destructive hover:underline disabled:opacity-60"
              >
                {t('revoke')}
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into the dashboard.** In `dashboard/page.tsx`:
  - Replace the `getOrgMembers`-derived `pendingStudents` flat list with `getPendingStudentInvites(current.org.id, isHead ? undefined : { forCoordinatorId: session.user.id })` (add to the parallel fetches), and drop the now-unused `members`/`getOrgMembers` if nothing else uses it (it isn't used elsewhere on this page — verify and remove the import + the `pendingStudents` filter).
  - Replace the `{isHead && pendingStudents.length > 0 && (...)}` block with `<PendingInvites invites={pendingInvites.map((p) => ({ memberId: p.memberId, email: p.email, encadrantName: p.encadrantName }))} />`. Render it for BOTH head and encadrant (the query is already viewer-scoped).
  - Import `PendingInvites` and `getPendingStudentInvites`.

- [ ] **Step 3: Verify in the browser.** As the head: pending invites from the Task 7 import appear with Resend/Revoke; click Revoke → row disappears after refresh; `preview_console_logs` clean. As an encadrant: only their own pending invites show.

- [ ] **Step 4: Typecheck + build** → PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(platform)/university/_pending-invites.tsx" "app/[locale]/(platform)/university/dashboard/page.tsx"
git commit -m "feat(university): pending-invite management panel (resend/revoke)"
```

---

## Task 9: i18n FR/EN

**Files:**
- Modify: `locales/fr.json`, `locales/en.json` (the `university.dashboard` block)

- [ ] **Step 1: Add keys** (FR source of truth; EN mirror):
  - `bulkImport`, `bulkPlaceholder`, `bulkAssignSelf`, `bulkSubmit`, `bulkSummary` (ICU: `"{invited} invité(s), {skipped} ignoré(s), {invalid} invalide(s)"`), `resend`, `revoke`.

FR:
```json
"bulkImport": "Importer un CSV",
"bulkPlaceholder": "email@exemple.com, Prénom Nom (un par ligne)",
"bulkAssignSelf": "M'assigner ces étudiants",
"bulkSubmit": "Importer",
"bulkSummary": "{invited} invité(s), {skipped} ignoré(s), {invalid} invalide(s)",
"resend": "Renvoyer",
"revoke": "Révoquer"
```
EN:
```json
"bulkImport": "Import CSV",
"bulkPlaceholder": "email@example.com, First Last (one per line)",
"bulkAssignSelf": "Assign these students to me",
"bulkSubmit": "Import",
"bulkSummary": "{invited} invited, {skipped} skipped, {invalid} invalid",
"resend": "Resend",
"revoke": "Revoke"
```

- [ ] **Step 2: Build** (compiles messages) → PASS.

- [ ] **Step 3: Commit**

```bash
git add locales/fr.json locales/en.json
git commit -m "i18n(university): cohort-onboarding strings (FR/EN)"
```

---

## Task 10: Final verification

- [ ] **Step 1: Full test suite** — `pnpm vitest run` → all PASS (expect ~+12 new tests).
- [ ] **Step 2: Typecheck + build + lint** — `pnpm typecheck && pnpm build && pnpm lint` → clean.
- [ ] **Step 3: Browser walkthrough** (preview tools), as the head: import a 3-row CSV (one valid new, one duplicate of an existing student, one malformed) → summary reports `1 invited, 1 skipped, 1 invalid`; the new invite appears in the pending panel; Resend works (no error); Revoke removes it. Confirm `preview_console_logs` clean.
- [ ] **Step 4: Report** the test-count delta; then use **superpowers:finishing-a-development-branch** for the whole milestone (both plans).

---

## Self-Review (author)

- **Spec coverage (§5):** CSV parse + cap + partial-success (T2/T4), batch encadrant default-to-uploader + encadrant-forced-to-self (T4), dedupe (T3), dedicated rate-limit bucket (T1), pending query viewer-gated (T5), university-flavored resend/revoke with encadrant scoping (T6), UI (T7/T8), i18n (T9). All mapped.
- **Type consistency:** `bulkInviteStudents` returns `{ invited: {email,token}[]; skippedDuplicate: string[] }` consumed by the action; `parseStudentCsv` returns `{ rows: {email,name}[]; invalid: string[] }`; `getPendingStudentInvites` row shape (`memberId,email,invitedAt,inviteExpiresAt,assignedCoordinatorId,encadrantName`) matches `_pending-invites`. `assertStudentInviteManageable` takes `viewerRole: 'owner'|'admin'`, matching `current.role` casts already used in Plan 1.
- **Reuse:** leans on Plan-1 `createInvite(assignedCoordinatorId)`, team-service `resendInvite`/`revokeInvite`, `universityInviteTemplate` variant `student`, `getUniversityCoordinators` — no duplication.
- **No placeholders:** every logic step has complete code; UI steps reference the concrete sibling to mirror and are gated by typecheck/build + browser checks.
