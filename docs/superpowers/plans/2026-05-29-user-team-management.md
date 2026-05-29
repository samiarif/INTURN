# User & Team Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a company org real multi-user teams — invite staff by email (Owner/Admin/Supervisor), scope supervisors to projects, and surface a Team page that also lists active interns.

**Architecture:** Strangler approach. Add one additive `organization_members` table (invited members = pending rows). Introduce a membership-aware authz/org-context layer and migrate only the core company surfaces to it (leave the ~20 other `ownerId` reads working). Interns are NOT memberships — they're derived from the existing `workspaces` table. Build on Base UI primitives + the HTML-string email system already in the repo.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, Drizzle ORM (Neon/Postgres), Clerk (identity), next-intl (fr default unprefixed / en `/en`), Resend (email), Base UI components, Vitest.

---

## Ground truth (verified during recon — do not re-derive)

- **No `pgEnum`.** Enums are inline `text('col', { enum: [...] })`.
- **Migrations are hand-written idempotent SQL** in `db/migrations/`, applied by `scripts/migrate.ts` (tracker table `_inturn_migrations`, wired as `prebuild`). Next file: `0015_*`. NOT drizzle-kit. Template: `BEGIN; … IF NOT EXISTS …; COMMIT;`. `gen_random_uuid()` is available (used by existing migrations).
- **users**: `id, clerkId, email, firstName, lastName, imageUrl, role(nullable enum intern|company|admin), suspendedAt, localePref(en|fr), …`. No `name` column. Avatar = `imageUrl`.
- **organizations**: single `ownerId` (NOT NULL → users), `name`, `slug`, `verificationStatus`.
- **projects**: `organizationId` (NOT NULL), `supervisorIds jsonb<string[]> default []` (GIN index). JSONB containment: `sql\`${projects.supervisorIds} @> ${JSON.stringify([id])}::jsonb\``.
- **internships**: `projectId` (nullable → projects), `organizationId` (NOT NULL), `title`, `status(draft|published|closed|archived)`, `duration` (weeks).
- **workspaces** (the canonical "intern is in this org" link, created on application accept): `internId → users`, `organizationId → organizations`, `internshipId`, `status(active|completed|cancelled)`, `startDate`, `endDate`. **`getOrgInterns` reads this**, not raw applications.
- **session** (`modules/auth/session.ts`): `getSession()` → `{ clerkId, user, role } | null` (used by pages); `requireSession()`, `requireActiveSession()` (throws `account_suspended`), `requireAdmin()`. `getViewerOrganizations` exists but has **zero call sites**.
- **Org resolution today**: inline `db.select().from(organizations).where(eq(organizations.ownerId, session.user.id)).limit(1)` (~25 sites). Per-project authz: `if (role !== 'admin' && !project.supervisorIds?.includes(user.id)) notFound()` — note `role` here is the **global** role (`'admin'` = platform staff, company users are `'company'`).
- **Server-action conventions**: file-level `'use server'`. Object-arg actions return `{ ok: boolean; error?: string }` (e.g. `updateProjectGoalsPhasesAction`); FormData actions `throw` + `redirect()`. Clients call actions inside `useTransition` + `router.refresh()`, read `{ok,error}`. No `useActionState` anywhere.
- **Auth in actions**: use `requireActiveSession()` (test-friendly; mocked as the wrapper, never Clerk directly).
- **UI primitives** (`components/ui/`, Base UI — compose with the **`render` prop**, not `asChild`): `Button` (variant default|outline|secondary|ghost|destructive|link; size default|xs|sm|lg|icon…), `Card`+`CardHeader/Title/Description/Content/Footer`, `Dialog`+`DialogTrigger/Content/Header/Footer/Title/Description/Close`, `Popover`+`PopoverTrigger/Content`, `Avatar`+`AvatarImage/Fallback`, `Select`, `Input`, `Label`, `Textarea`. **No Badge/StatusPill** — roll a small pill with Tailwind or `.pi-*` classes.
- **Email** (`lib/email.ts`): `sendEmail({ to, subject, text, html, tags? })`; `RESEND_API_KEY=test-mode` short-circuits (logs, returns null). Templates = HTML-string builders using `emailLayout({ title, bodyHtml, ctaLabel, ctaHref })` + helpers `escapeHtml`, `baseUrl()` from `lib/email/templates/_layout.ts`.
- **Next 16**: `params`/`searchParams` are Promises (`await` them). `cookies()` is **async** (`(await cookies()).get(...)`); `.set/.delete` only in Server Actions/Route Handlers, never Server Components. Sidebar/pages use plain `next/link`. Clerk sign-in return-URL is **not** wired anywhere — must add.
- **i18n**: 36 top-level namespaces, EN/FR parity enforced. Client `useTranslations('ns')` (`next-intl`); server `getTranslations('ns')` (`next-intl/server`). Interpolation `{name}`. Add a `team` namespace + a `team` key under `platformNav` to **both** `locales/en.json` and `locales/fr.json`.
- **Tests** (`vitest.config.ts`): `globals:true`, `environment:'node'`, include `**/__tests__/**/*.test.ts`. Mock `@/db` with a `vi.hoisted()` chainable builder (FIFO `selectQueue`), `vi.mock('@/db/schema', …)`, `vi.mock('drizzle-orm', () => ({ eq, and, … }))`, `vi.mock('@/modules/auth/session', …)`, `vi.mock('next/navigation', …)`, `vi.mock('next/cache', …)`. Run: `pnpm test`, `pnpm typecheck`, `pnpm lint`.

## File structure

**Create:**
- `db/schema/organization-members.ts` — the table + types (`OrganizationMember`, `MemberRole`, `MemberStatus`).
- `db/migrations/0015_organization_members.sql` — table + indexes + owner backfill.
- `modules/team/authz.ts` — `getViewerMemberships`, `getActiveMembership`, `getCurrentOrg`, `requireOrgRole`, `canManageOrg`, `ACTIVE_ORG_COOKIE`.
- `modules/team/queries.ts` — `getOrgMembers` (staff + pending), `getOrgInterns` (from workspaces).
- `modules/team/service.ts` — pure write logic: `createInvite`, `acceptInvite`, `revokeInvite`, `resendInvite`, `removeMember`, `setMemberRole`, `setSupervisorProjects`.
- `modules/team/server-actions.ts` — thin `'use server'` wrappers returning `{ok,error}`.
- `modules/team/__tests__/authz.test.ts`, `modules/team/__tests__/service.test.ts`, `modules/team/__tests__/queries.test.ts`.
- `lib/email/templates/team-invite.ts` — invite email.
- `app/[locale]/invite/[token]/page.tsx` — accept page (works signed-out → sign-in CTA).
- `app/[locale]/invite/[token]/accept-button.tsx` — client accept button.
- `app/[locale]/(platform)/company/team/page.tsx` — Team page (server).
- `modules/team/components/team-client.tsx` — pills + search + list/grid + sections (client).
- `modules/team/components/add-member-modal.tsx` — Dialog form (client).
- `modules/team/components/member-row.tsx`, `intern-row.tsx`, `role-pill.tsx`.
- `modules/team/components/org-switcher.tsx` — sidebar switcher (client).
- `modules/projects/components/project-supervisors.tsx` — add/remove supervisors on a project.

**Modify:**
- `db/schema/index.ts` — export the new table.
- `components/platform-sidebar.tsx` — add Team link + mount org switcher.
- `app/[locale]/(platform)/company/team/` — new route.
- `app/[locale]/(platform)/company/projects/page.tsx`, `…/projects/new/page.tsx`, `…/company/dashboard/page.tsx`, `modules/projects/server-actions.ts` — swap inline `ownerId` org lookup → `getCurrentOrg`.
- `app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx` — honor `redirect_url` for invite accept.
- `locales/en.json`, `locales/fr.json` — `team` namespace + `platformNav.team`.

---

## Phase A — Schema + migration

### Task A1: `organization_members` schema

**Files:** Create `db/schema/organization-members.ts`. (First read `db/schema/projects.ts` to copy the exact index-callback style.)

- [ ] **Step 1: Write the schema**

```ts
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'supervisor'] }).notNull().default('supervisor'),
  status: text('status', { enum: ['invited', 'active', 'removed'] }).notNull().default('invited'),
  pendingProjectIds: jsonb('pending_project_ids').$type<string[]>().default([]),
  inviteToken: text('invite_token'),
  inviteExpiresAt: timestamp('invite_expires_at'),
  invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  joinedAt: timestamp('joined_at'),
  removedAt: timestamp('removed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('org_members_org_email_unique').on(table.organizationId, sql`lower(${table.email})`),
  uniqueIndex('org_members_org_user_unique').on(table.organizationId, table.userId).where(sql`${table.userId} IS NOT NULL`),
  uniqueIndex('org_members_invite_token_unique').on(table.inviteToken).where(sql`${table.inviteToken} IS NOT NULL`),
  index('org_members_user_idx').on(table.userId),
  index('org_members_org_idx').on(table.organizationId),
]);

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type MemberRole = NonNullable<OrganizationMember['role']>;
export type MemberStatus = NonNullable<OrganizationMember['status']>;
```

- [ ] **Step 2:** If the index-callback array form errors under this drizzle version, fall back to the object form used by the file you read in `db/schema/projects.ts`. Run `pnpm typecheck`; expected: 0 errors.

### Task A2: Export from barrel

**Files:** Modify `db/schema/index.ts`.

- [ ] **Step 1:** Append:
```ts
export {
  organizationMembers,
  type OrganizationMember,
  type NewOrganizationMember,
  type MemberRole,
  type MemberStatus,
} from './organization-members';
```
- [ ] **Step 2:** `pnpm typecheck` → 0 errors.

### Task A3: Migration SQL

**Files:** Create `db/migrations/0015_organization_members.sql`.

- [ ] **Step 1:** Write idempotent SQL (NOT EXISTS backfill so it's safe to re-run):
```sql
-- 0015: organization_members (staff team: owner/admin/supervisor) + invite state. Idempotent.
BEGIN;

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'supervisor',
  status text NOT NULL DEFAULT 'invited',
  pending_project_ids jsonb DEFAULT '[]'::jsonb,
  invite_token text,
  invite_expires_at timestamp,
  invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  invited_at timestamp NOT NULL DEFAULT now(),
  joined_at timestamp,
  removed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_members_org_email_unique ON organization_members (organization_id, lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS org_members_org_user_unique ON organization_members (organization_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS org_members_invite_token_unique ON organization_members (invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS org_members_user_idx ON organization_members (user_id);
CREATE INDEX IF NOT EXISTS org_members_org_idx ON organization_members (organization_id);

-- Backfill: each existing org's owner becomes an active 'owner' member.
INSERT INTO organization_members (organization_id, user_id, email, role, status, joined_at)
SELECT o.id, o.owner_id, u.email, 'owner', 'active', o.created_at
FROM organizations o
JOIN users u ON u.id = o.owner_id
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members m
  WHERE m.organization_id = o.id AND m.user_id = o.owner_id
);

COMMIT;
```

### Task A4: Run migration + verify

- [ ] **Step 1:** Run: `./node_modules/.bin/tsx --env-file=.env.local scripts/migrate.ts` (check the exact invocation in `package.json` `db:migrate`; match it).
- [ ] **Step 2:** Verify: a throwaway `tsx --env-file=.env.local` snippet selecting `count(*)` from `organization_members` returns ≥ the org count, and the seeded owner (`dazzsemi@gmail.com`) has one `owner/active` row. Expected: backfill present.
- [ ] **Step 3: Commit** `git add db/schema/organization-members.ts db/schema/index.ts db/migrations/0015_organization_members.sql && git commit -m "feat(team): organization_members table + owner backfill"`

---

## Phase B — Authz + queries (TDD)

### Task B1: Authz helpers + tests

**Files:** Create `modules/team/authz.ts`, `modules/team/__tests__/authz.test.ts`.

- [ ] **Step 1: Failing test** (`authz.test.ts`) — mirror the repo db-mock idiom:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  function chain() {
    const c: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) c[m] = vi.fn(() => c);
    c.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    // when awaited without .limit (join lists), make the chain thenable:
    (c as { then?: unknown }).then = (res: (v: unknown) => void) => res(selectQueue.shift() ?? []);
    return c;
  }
  const db = { select: vi.fn(() => chain()) };
  return { db, selectQueue };
});
vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({ organizationMembers: {}, organizations: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and') }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));

import { canManageOrg, getActiveMembership, requireOrgRole } from '../authz';

beforeEach(() => { vi.clearAllMocks(); mocks.selectQueue.length = 0; });

describe('canManageOrg', () => {
  it('owner and admin manage; supervisor cannot', () => {
    expect(canManageOrg('owner')).toBe(true);
    expect(canManageOrg('admin')).toBe(true);
    expect(canManageOrg('supervisor')).toBe(false);
    expect(canManageOrg(null)).toBe(false);
  });
});

describe('requireOrgRole', () => {
  it('throws Forbidden when no active membership', async () => {
    mocks.selectQueue.push([]);
    await expect(requireOrgRole('u1', 'o1', ['owner', 'admin'])).rejects.toThrow('Forbidden');
  });
  it('returns the membership when role allowed', async () => {
    mocks.selectQueue.push([{ id: 'm1', userId: 'u1', organizationId: 'o1', role: 'admin', status: 'active' }]);
    const m = await requireOrgRole('u1', 'o1', ['owner', 'admin']);
    expect(m.role).toBe('admin');
  });
});
```
- [ ] **Step 2:** Run `pnpm test modules/team/__tests__/authz.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `modules/team/authz.ts`:
```ts
import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizationMembers, organizations } from '@/db/schema';
import type { MemberRole, OrganizationMember } from '@/db/schema';
import type { Organization } from '@/db/schema';

export const ACTIVE_ORG_COOKIE = 'inturn-active-org';

export type ViewerMembership = OrganizationMember & { org: Organization };

export async function getViewerMemberships(userId: string): Promise<ViewerMembership[]> {
  const rows = await db.select().from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')));
  return (rows as Array<{ organization_members: OrganizationMember; organizations: Organization }>)
    .map((r) => ({ ...r.organization_members, org: r.organizations }));
}

export async function getActiveMembership(userId: string, orgId: string): Promise<OrganizationMember | null> {
  const [m] = await db.select().from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, orgId),
      eq(organizationMembers.status, 'active'),
    )).limit(1);
  return (m as OrganizationMember) ?? null;
}

export function canManageOrg(role: MemberRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export async function getCurrentOrg(userId: string): Promise<{ org: Organization; role: MemberRole; memberships: ViewerMembership[] } | null> {
  const memberships = await getViewerMemberships(userId);
  if (memberships.length === 0) return null;
  const cookieVal = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const chosen =
    (cookieVal ? memberships.find((m) => m.organizationId === cookieVal) : undefined) ??
    memberships.find((m) => m.role === 'owner') ??
    memberships[0];
  return { org: chosen.org, role: chosen.role as MemberRole, memberships };
}

export async function requireOrgRole(userId: string, orgId: string, roles: MemberRole[]): Promise<OrganizationMember> {
  const m = await getActiveMembership(userId, orgId);
  if (!m || !roles.includes(m.role as MemberRole)) throw new Error('Forbidden');
  return m;
}
```
- [ ] **Step 4:** `pnpm test modules/team/__tests__/authz.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(team): membership authz + current-org resolution`.

### Task B2: `getOrgMembers` + `getOrgInterns` + tests

**Files:** Create `modules/team/queries.ts`, `modules/team/__tests__/queries.test.ts`.

- [ ] **Step 1: Failing test** — assert `getOrgInterns` filters by org + active and maps fields; `getOrgMembers` returns active + invited (not removed). Use the same hoisted db-mock; push rows into `selectQueue` and assert the mapped output shape (e.g. `interns[0].internshipTitle === 'X'`, `members.length === 2`).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** `modules/team/queries.ts`:
```ts
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { organizationMembers, organizations, internships, projects, users, workspaces } from '@/db/schema';
import type { OrganizationMember } from '@/db/schema';

export async function getOrgMembers(orgId: string): Promise<OrganizationMember[]> {
  return db.select().from(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, orgId),
      inArray(organizationMembers.status, ['invited', 'active']),
    ))
    .orderBy(desc(organizationMembers.invitedAt)) as Promise<OrganizationMember[]>;
}

export type OrgIntern = {
  workspaceId: string; status: string | null; startDate: Date | null; endDate: Date | null;
  internId: string; firstName: string | null; lastName: string | null; email: string; imageUrl: string | null;
  internshipId: string; internshipTitle: string;
  projectId: string | null; projectName: string | null; supervisorIds: string[] | null;
};

export async function getOrgInterns(orgId: string): Promise<OrgIntern[]> {
  const rows = await db.select({
    workspaceId: workspaces.id, status: workspaces.status, startDate: workspaces.startDate, endDate: workspaces.endDate,
    internId: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, imageUrl: users.imageUrl,
    internshipId: internships.id, internshipTitle: internships.title,
    projectId: projects.id, projectName: projects.name, supervisorIds: projects.supervisorIds,
  })
    .from(workspaces)
    .innerJoin(users, eq(workspaces.internId, users.id))
    .innerJoin(internships, eq(workspaces.internshipId, internships.id))
    .leftJoin(projects, eq(internships.projectId, projects.id))
    .where(and(eq(workspaces.organizationId, orgId), eq(workspaces.status, 'active')));
  return rows as OrgIntern[];
}
```
(Confirm `internships.title`, `projects.name`, `workspaces.startDate/endDate/internId` column names against schema before finalizing.)
- [ ] **Step 4:** `pnpm test` → PASS. **Commit** `feat(team): org members + interns roster queries`.

---

## Phase C — Service + server actions (TDD)

### Task C1: `service.ts` write logic + tests

**Files:** Create `modules/team/service.ts`, `modules/team/__tests__/service.test.ts`.

Functions (all pure, take explicit args, do db writes, return data — no auth here; auth lives in actions):
```ts
createInvite({ orgId, email, role, projectIds, invitedByUserId }): Promise<{ member: OrganizationMember; token: string }>
acceptInvite({ token, userId, userEmail }): Promise<{ ok: true; orgId: string } | { ok: false; reason: 'not_found'|'expired'|'email_mismatch'|'already_member' }>
revokeInvite({ memberId }): Promise<void>
resendInvite({ memberId }): Promise<{ token: string }>
removeMember({ memberId }): Promise<void>            // soft: status='removed', removedAt=now, pull from supervisorIds
setMemberRole({ memberId, role }): Promise<void>     // admin<->supervisor only; never owner; never demote owner
setSupervisorProjects({ orgId, userId, projectIds }): Promise<void>  // reconcile supervisorIds across org projects
```

- [ ] **Step 1: Failing tests** covering: `createInvite` inserts an `invited` row with a token + 7-day expiry and links `userId` if email matches an existing user; `acceptInvite` returns `expired` when `inviteExpiresAt < now`, `email_mismatch` when emails differ, and flips to `active` + applies `pendingProjectIds` on success; `removeMember` sets `status='removed'`; `setMemberRole` throws when target is `owner`. Push rows via `selectQueue`; assert via the `callOrder`/update-spy idiom from `modules/applications/__tests__/service.test.ts`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** `service.ts`. Token: `import { randomBytes } from 'crypto'; const token = randomBytes(24).toString('base64url');`. Expiry: `new Date(Date.now() + 7*24*60*60*1000)`. For `createInvite`, look up existing user by `lower(email)` to pre-link `userId`. For `acceptInvite`, load by `inviteToken`, branch the failure reasons, then `db.update(organizationMembers).set({ status:'active', userId, joinedAt:new Date(), inviteToken:null, inviteExpiresAt:null })`, then for each `pendingProjectIds` push the user into that project's `supervisorIds` (read array, dedupe, write). For `removeMember`/`setSupervisorProjects`, reconcile `projects.supervisorIds` (read, filter/add, write) — neon-http has no transactions, so order writes safely and keep them idempotent (mirror `acceptApplication`).
- [ ] **Step 4:** `pnpm test` → PASS. **Commit** `feat(team): invite/accept/remove/role service logic`.

### Task C2: `server-actions.ts` wrappers

**Files:** Create `modules/team/server-actions.ts`.

- [ ] **Step 1:** Implement `'use server'` wrappers. Each: `const { user } = await requireActiveSession();` then `await requireOrgRole(user.id, orgId, ['owner','admin'])` (except `acceptInviteAction`, which is self-serve), call the service fn, `revalidatePath('/company/team')` (+ project paths for supervisor changes), return `{ ok: true }` / `{ ok: false, error }`. Wrap `inviteMemberAction` in `ratelimit('team-invite').limit(user.id)`. Example:
```ts
'use server';
import { revalidatePath } from 'next/cache';
import { requireActiveSession } from '@/modules/auth/session';
import { requireOrgRole } from './authz';
import * as svc from './service';
import { sendEmail } from '@/lib/email';
import { teamInviteTemplate } from '@/lib/email/templates/team-invite';
import { db } from '@/db'; import { organizations } from '@/db/schema'; import { eq } from 'drizzle-orm';

export async function inviteMemberAction(input: { orgId: string; email: string; role: 'admin'|'supervisor'; projectIds?: string[] }) {
  try {
    const { user } = await requireActiveSession();
    await requireOrgRole(user.id, input.orgId, ['owner', 'admin']);
    const { member, token } = await svc.createInvite({ ...input, invitedByUserId: user.id });
    const [org] = await db.select().from(organizations).where(eq(organizations.id, input.orgId)).limit(1);
    const tpl = teamInviteTemplate({ orgName: org?.name ?? 'Inturn', inviterName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email, role: input.role, token, locale: (user.localePref ?? 'fr') as 'fr'|'en' });
    await sendEmail({ to: member.email, subject: tpl.subject, text: tpl.text, html: tpl.html, tags: [{ name: 'type', value: 'team.invite' }] });
    revalidatePath('/company/team');
    return { ok: true as const };
  } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : 'failed' }; }
}
// acceptInviteAction({ token }) → requireActiveSession, svc.acceptInvite({ token, userId, userEmail }), set ACTIVE_ORG_COOKIE, return { ok, orgSlug?/reason? }
// revokeInviteAction, resendInviteAction, removeMemberAction, setMemberRoleAction, setSupervisorProjectsAction — same guard+try/catch shape.
```
- [ ] **Step 2:** `pnpm typecheck` → 0. **Commit** `feat(team): team server actions`.

---

## Phase D — Invite email + accept route

### Task D1: Invite email template
**Files:** Create `lib/email/templates/team-invite.ts` (copy `welcome.ts` shape).
- [ ] Build FR/EN subject + body + CTA `${baseUrl()}/invite/${token}`; export `teamInviteTemplate({ orgName, inviterName, role, token, locale })` returning `{ html, text, subject }`. Escape all interpolated strings with `escapeHtml`. **Commit** `feat(team): invite email template`.

### Task D2: Accept page + button + sign-in redirect
**Files:** Create `app/[locale]/invite/[token]/page.tsx`, `app/[locale]/invite/[token]/accept-button.tsx`; modify `app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx`.
- [ ] **page.tsx** (server): `const { token } = await params;` load the member by `inviteToken`. Branches: not found/revoked → friendly message; expired → "ask for a new invite"; `getSession()` null → "Sign in to accept" linking `/sign-in?redirect_url=/invite/${token}`; signed-in but `session.user.email` ≠ invite email → explain mismatch; signed-in + match → render org/role/inviter + `<AcceptButton token={token} />`.
- [ ] **accept-button.tsx** (client): `useTransition`; on click `await acceptInviteAction({ token })`; on `ok` → `router.push('/company/dashboard')`; else show reason.
- [ ] **sign-in page**: read `searchParams.redirect_url` and pass `forceRedirectUrl={redirectUrl}` to `<SignIn>` (guard against open-redirect: only allow paths starting with `/invite/`). Note: under `DEV_AUTH_BYPASS` the dev session already satisfies `getSession()`, so the signed-in accept path is testable locally without Clerk.
- [ ] `pnpm typecheck` → 0. **Commit** `feat(team): invite accept route + sign-in return url`.

---

## Phase E — Team page UI

### Task E1: Team page (server)
**Files:** Create `app/[locale]/(platform)/company/team/page.tsx`.
- [ ] Guard like `projects/page.tsx` (`getSession`, company/admin only). Resolve org via `getCurrentOrg(session.user.id)`; if none → `redirect('/onboarding/company')`. Gate: only `canManageOrg(current.role)` may view; supervisors → `redirect('/company/dashboard')`. `Promise.all([getOrgMembers(org.id), getOrgInterns(org.id), getTranslations('team')])`. Render `<TeamClient members={…} interns={…} currentUserId={…} role={…} projects={…} />` (also fetch the org's projects for the Add-Member project multiselect + supervisor reassignment).

### Task E2: Presentational pieces
**Files:** Create `modules/team/components/role-pill.tsx` (owner=crown, colored pill via Tailwind), `member-row.tsx` (Avatar + name/email + RolePill + Popover ⋯ menu: change role / remove / manage projects — Owner row has no actions), `intern-row.tsx` (Avatar + name + internship/project + supervisor names + status pill + links "Open workspace" `/company/workspaces/{workspaceId}` and "End internship" via existing action if present).

### Task E3: `team-client.tsx`
**Files:** Create `modules/team/components/team-client.tsx` (client). Filter pills **All / Admin / Supervisor / Intern** (`useTranslations('team')`), search box (filters both populations by name/email), List/Grid toggle (reuse the pattern from the marketplace/`.ex-*` or simple state). "All" shows staff (incl. pending invites) + interns; "Admin"/"Supervisor" filter staff; "Intern" shows the roster (empty-state hint → marketplace). `+ Add Member` button (only if `canManageOrg`) → `<AddMemberModal/>`.

### Task E4: `add-member-modal.tsx`
**Files:** Create `modules/team/components/add-member-modal.tsx` (client, Base UI `Dialog` via `render` prop). Fields: email (`Input`), role (`Select` Admin/Supervisor), and when role=supervisor a project multiselect (checkbox list of `projects`). Submit → `useTransition` → `inviteMemberAction({ orgId, email, role, projectIds })`; on `ok` close + `router.refresh()`, else show `error`.
- [ ] `pnpm typecheck && pnpm lint` → 0. **Commit** `feat(team): Team page (staff + interns) + add-member modal`.

---

## Phase F — Sidebar link + org switcher

### Task F1: Team nav link
**Files:** Modify `components/platform-sidebar.tsx`. In the `role === 'company'` array (the recon located it), add `{ href: '/company/team', label: tNav('team'), icon: Users }` (`Users` already imported). Verify it renders only for company/admin.

### Task F2: Org switcher
**Files:** Create `modules/team/components/org-switcher.tsx` (client, Base UI `Select` or `Popover`); add a `setActiveOrgAction` to `modules/team/server-actions.ts` that validates membership then `(await cookies()).set(ACTIVE_ORG_COOKIE, orgId, { path:'/', sameSite:'lax', maxAge: 60*60*24*30 })` and `redirect('/company/dashboard')`. Mount in the sidebar above the user row **only when `memberships.length > 1`** (pass memberships from the layout that renders the sidebar — thread `getCurrentOrg().memberships`). If wiring the memberships prop into the existing sidebar layout is more than a small change, ship F1 now and leave the switcher behind a clearly-marked follow-up (single-org users — the common case — don't need it).
- [ ] `pnpm typecheck && pnpm lint` → 0. **Commit** `feat(team): sidebar Team link + org switcher`.

---

## Phase G — Project Supervisors section

### Task G1: Supervisors on a project
**Files:** Create `modules/projects/components/project-supervisors.tsx`; mount on the project hub/settings page (find where project edit lives). List current supervisors (resolve `supervisorIds` → org members of role supervisor/admin/owner); add/remove via `setSupervisorProjectsAction`. Owner/Admin only.
- [ ] `pnpm typecheck` → 0. **Commit** `feat(team): manage project supervisors`.

---

## Phase H — Strangler cutover (bounded)

### Task H1: Swap company surfaces to `getCurrentOrg`
**Files:** Modify `app/[locale]/(platform)/company/projects/page.tsx`, `…/company/projects/new/page.tsx`, `…/company/dashboard/page.tsx`, `modules/projects/server-actions.ts` (the `createProjectAction` org lookup).
- [ ] Replace the inline `db.select().from(organizations).where(eq(organizations.ownerId, session.user.id)).limit(1)` with `const current = await getCurrentOrg(session.user.id); if (!current) redirect('/onboarding/company'); const org = current.org;`. This lets an **Admin** (not just the Owner) load these surfaces. Keep behavior identical for owners.
- [ ] **Per-project page guards** (`app/[locale]/(platform)/company/projects/[projectId]/**`): where the guard is `role !== 'admin' && !project.supervisorIds?.includes(user.id)`, add org-management access: compute `const m = await getActiveMembership(user.id, project.organizationId)` and allow if `canManageOrg(m?.role) || project.supervisorIds?.includes(user.id) || role === 'admin'`. Apply to the project subpages (hub, applications, edit). Run tests after each file.
- [ ] **Explicitly NOT migrated this sprint** (documented follow-up): `account/page.tsx`, `modules/records/*`, `app/api/records/[recordId]/pdf/route.ts`, `modules/admin/*` (platform staff), `modules/profiles/company-service.ts`, `modules/account/service.ts`, onboarding. These stay on `ownerId` and keep working for owners.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` → green. **Commit** `feat(team): resolve company org via membership (admin access)`.

---

## Phase I — i18n

### Task I1: `team` namespace + `platformNav.team`
**Files:** Modify `locales/en.json`, `locales/fr.json`.
- [ ] Add `"team": "Team"` / `"team": "Équipe"` under `platformNav`.
- [ ] Add a `team` namespace (both files, identical keys): page title/subtitle, pills (`all/admin/supervisor/intern`), `search`, `list/grid`, role names + `pendingInvite`, `addMember`, modal labels (`emailLabel/roleLabel/projectsLabel/send/cancel`), row actions (`changeRole/remove/manageProjects/openWorkspace/endInternship`), confirmations, intern status labels, and empty-state hints (`noStaff`, `noInterns` → "Interns appear here once they're accepted from the marketplace."). Accept-page strings (`invite.*`) for both locales.
- [ ] **Commit** `feat(team): i18n FR/EN for team + invites`.

---

## Phase J — Verify + self-review

### Task J1: Full gate
- [ ] `pnpm typecheck` → 0 errors. `pnpm lint` → 0 errors. `pnpm test` → existing 276+ still pass + new team tests pass; 0 new failures.

### Task J2: Browser check (dev cookie, both locales)
- [ ] With the dev server (`pnpm dev`) + dev session cookie, load `/en/company/team` and `/company/team` (FR). Confirm: pills render localized, owner crown shows for `dazzsemi@gmail.com`, interns roster renders (seed an accepted application/workspace if none), Add-Member modal opens. `curl` the served HTML and grep for FR strings to confirm i18n (Turbopack staleness: edit+nav or restart dev if CSS/labels look stale).
- [ ] Exercise invite→accept locally: create an invite, copy the token, visit `/invite/<token>` as the dev session, accept, confirm membership flips to `active` and (if supervisor) `supervisorIds` updated.

### Task J3: Self-review the diff
- [ ] `git diff main...HEAD --stat` and read the full diff. Check: no secret/`.env.local` committed, no deleted legacy CSS, every new string in both locales, no `ownerId` site broken for owners, all new server actions guarded by `requireOrgRole`, PII not logged. Write an honest review note (done vs. deferred: full Admin parity on records/account, supervisor-scoped intern roster, org switcher if deferred).

---

## Self-review (plan vs. spec) — completed inline

- **Spec §Data model (memberships)** → Tasks A1–A4. **Interns-not-memberships** → `getOrgInterns` reads `workspaces` (B2). ✓
- **Spec §Authz (requireOrgRole/canAccessProject/current-org)** → B1 + H1 (per-project guard = `canManageOrg || supervisorIds`). ✓
- **Spec §Invite→accept (+ edge states)** → C1 (`acceptInvite` reasons) + D2 (accept page branches). ✓
- **Spec §UI surfaces (Team page pills incl. Intern, staff + intern cards, Add-Member staff-only, project Supervisors, sidebar + switcher)** → E1–E4, F1–F2, G1. ✓
- **Spec §Server actions + `getOrgInterns`** → C2 + B2. ✓
- **Spec §Defaults (7-day expiry, soft remove + supervisorIds cleanup, last-owner guard, owner+admin invite, no seats)** → C1/C2. ✓
- **Spec §i18n (team + invite, FR/EN)** → I1. **Spec §Testing** → B/C tests + J1. ✓
- **Type consistency:** `MemberRole` ('owner'|'admin'|'supervisor'), `getCurrentOrg` returns `{org, role, memberships}`, `acceptInvite` reason union, `OrgIntern` shape — all defined once and reused. ✓
- **Deferred (documented, not gaps):** full Admin parity on records/account/admin/onboarding surfaces; supervisor-scoped interns roster; org switcher may ship as follow-up if sidebar threading is non-trivial.
