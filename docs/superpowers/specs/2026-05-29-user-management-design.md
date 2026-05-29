# User & Team Management — Design

**Status:** Draft, pending Sam review
**Date:** 2026-05-29
**Author:** Claude (paired with Sam)
**Ships in:** One sprint, staged (schema → authz → invite/accept → UI → i18n/tests)
**Build strategy:** Approach 1 — *strangler* (additive table, migrate only this sprint's surfaces, leave `ownerId` as a working pointer)

## Problem

Today a company on Inturn is literally **one user**. There is no concept
of a team:

- `organizations` has a single `ownerId` → `users.id` (the only user↔org
  link). There is no membership/join table.
- `users.role` is a flat enum `['intern','company','admin']` — there is
  **no "supervisor" role**. "Supervisor" exists only as
  `projects.supervisorIds: jsonb<string[]>`, auto-set to `[creator.id]`
  with no UI to manage it.
- There is no way to invite a teammate, no Team page, no per-project
  mentorship scoping for anyone but the owner.

The company side needs real multi-user teams: invite colleagues, give
them Owner/Admin/Supervisor roles, and scope supervisors to the specific
projects they mentor.

## Goals

- A company org can have **many members**, each with a per-org role.
- **Invite a teammate by email**; they self-onboard via Clerk (we never
  create accounts or set passwords on anyone's behalf).
- Three roles: **Owner** (billing + everything, can't be removed),
  **Admin** (full co-manager), **Supervisor** (scoped *only* to assigned
  projects).
- **Assign supervisors to projects** — optionally at invite time, and
  adjustable anytime afterward.
- A **Team page** matching the provided mockup (filter pills, search,
  list/grid, member cards, pending invites, + Add Member).
- **See & manage interns from the same page** — a read-mostly roster of
  who's currently interning with the org, sourced from accepted
  applications (not from staff memberships).
- **Multi-team:** one Inturn account can belong to several orgs.

## Non-goals (deferred)

- Granular per-permission tuning (custom permission sets).
- Billing / seat limits / paid seats.
- **Ownership transfer** (Owner is fixed for MVP).
- Bulk CSV invite (roadmap E26) and university auth/permissions (E30).
- Supervisor-initiated invites (only Owner/Admin invite).
- **New intern-ops flows** (per-intern messaging, new offboarding/lifecycle
  surfaces). The interns roster is read + jump-off to *existing* actions
  (open workspace, end internship, supervisor assignment via the project
  section); it does not build a new intern-management subsystem.
- A dedicated team-events audit log (reuse the existing audit pattern
  later if needed).
- Full org-wide authz cutover — every legacy `ownerId` read keeps
  working; we migrate only the surfaces this sprint touches and finish
  the cutover as a follow-up.

## Locked decisions (from brainstorming)

| # | Decision | Choice |
|---|---|---|
| Q1 | Sprint MVP scope | **Team + invites + Supervisor** |
| Q2 | Roles | **Owner + Admin + Supervisor** |
| Q3 | Supervisor → project assignment | **Both** — optional at invite, adjustable after |
| Q4 | Membership cardinality | **Multi-team** (many-to-many; real memberships table) |
| Q5 | Interns on the Team page | **Folded in** as a read-mostly roster from accepted applications — *not* staff memberships |
| Strategy | Build approach | **Approach 1 — strangler** |

## Data model

### New table `organization_members`

File: `db/schema/organization-members.ts` (table `organization_members`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK (defaultRandom) | |
| `organizationId` | uuid → `organizations.id` ON DELETE CASCADE | |
| `userId` | uuid → `users.id`, **nullable** | null until invite accepted; pre-linked at invite if the email already belongs to an Inturn user |
| `email` | text NOT NULL | invited address; source of truth while pending |
| `role` | enum `member_role` = `owner` / `admin` / `supervisor` | **per-org role lives here**, not on `users` |
| `status` | enum `member_status` = `invited` / `active` / `removed` | soft removal preserves history |
| `pendingProjectIds` | jsonb `string[]`, nullable | "assign at invite" payload; applied to `supervisorIds` on accept |
| `inviteToken` | text, unique, nullable | random, URL-safe; cleared on accept |
| `inviteExpiresAt` | timestamptz, nullable | |
| `invitedByUserId` | uuid → `users.id`, nullable | |
| `invitedAt` | timestamptz, default now | |
| `joinedAt` | timestamptz, nullable | set on accept |
| `removedAt` | timestamptz, nullable | set on soft-remove |
| `createdAt` / `updatedAt` | timestamptz | |

**Constraints / indexes**

- Unique `(organizationId, email)` — one invite/membership per address per org.
- Partial-unique `(organizationId, userId)` where `userId IS NOT NULL` —
  one membership row per real user per org.
- Index on `userId` (for `getViewerMemberships`).
- Unique on `inviteToken`.

**Why role moves here:** org capability must be per-org (the same person
can be a Supervisor in one org and Admin in another). `users.role` stays
as a coarse *account-type* hint so existing flat-role reads keep working;
all **org-scoped** capability comes from `organization_members.role`.

### Migration (additive)

1. Create enums `member_role`, `member_status` and table
   `organization_members` with the constraints above.
2. **Backfill:** for every existing `organizations` row, insert one
   member row `{ organizationId, userId: ownerId, email: owner.email,
   role: 'owner', status: 'active', joinedAt: org.createdAt }`.
3. **Keep `organizations.ownerId`** as a denormalized pointer. Nothing
   that reads it today changes. New code reads memberships; the two stay
   consistent because Owner is never removed/transferred in MVP.

No existing migration is edited; this is a new numbered migration
(`0015_*`).

### Interns are not memberships

The Team page shows **two populations from two sources** — keep them
separate:

- **Staff** (Owner / Admin / Supervisor) → `organization_members` rows
  (invite + role, as above).
- **Interns** → **derived**, not stored as members. An intern's link to a
  company is an **accepted application** to one of the org's internships
  (which places them in a project workspace). A new read query
  `getOrgInterns(orgId)` joins accepted `applications` → `internships`/
  `projects` to list them. **No schema change, no membership rows for
  interns** — that would duplicate the applications source of truth and
  pollute the role/invite model.
- Scope: the roster shows **active** interns (accepted, not yet ended).
  "Completed/alumni" is a future filter, not MVP.

## Authz layer

New helpers in `modules/auth/` (alongside `session.ts`):

- `getMembership(userId, orgId): Membership | null`
- `getViewerMemberships(userId): Membership[]` — active rows for the
  signed-in user (augments, does not replace, `getViewerOrganizations`).
- `requireOrgRole(userId, orgId, roles: MemberRole[])` — throws/redirects
  if the viewer's active membership role isn't in `roles`.
- `canAccessProject(membership, project): boolean` =
  `role ∈ {owner, admin}` **OR** (`role === 'supervisor'` **AND**
  `userId ∈ project.supervisorIds`).

### Capability matrix

| Capability | Owner | Admin | Supervisor |
|---|:--:|:--:|:--:|
| Billing | ✓ | — | — |
| Manage team (invite / remove / set role) | ✓ | ✓ | — |
| Create / edit projects · post / edit internships | ✓ | ✓ | — |
| Review applications · manage intern workspaces | all | all | **assigned projects only** |
| Can be removed or demoted | **never** | ✓ | ✓ |

Supervisors operate *inside* assigned projects at the mentorship level
(tasks, deliverables, workspace, that project's applications). They
cannot create projects, post internships, manage the team, or touch
billing.

**Interns** hold no org role (they're not members). The interns roster on
the Team page is visible to **Owner/Admin** (full org view). Supervisors
continue to see *their* interns through assigned-project workspaces as
today — an MVP simplification; a supervisor-scoped roster view is a future
enhancement.

### Current-org resolution + switching

This is the load-bearing strangler change: today the session resolves a
company's org via `getViewerOrganizations` = `orgs WHERE ownerId = userId`.
An invited Admin/Supervisor **doesn't own** the org, so that query
returns empty and they'd log in to nothing. So:

- Org context resolves from **active memberships** (`getViewerMemberships`),
  not `ownerId`. An owner still matches (the backfill gave them an `owner`
  membership), so existing single-owner behavior is unchanged.
- If a user has **one** active membership → that's the current org
  (the common case in MVP).
- If a user has **>1** active membership (multi-team) → default to a
  persisted "last active org" (fallback: owned org first, else
  most-recently-joined) and show a **minimal org switcher** in the
  sidebar header. The switcher just sets the persisted active org; no
  cross-org data mixing.
- This is the one place we *must* migrate off `ownerId` this sprint;
  everything else that reads `ownerId` keeps working untouched.

## Invite → accept flow

1. **Create invite.** Owner/Admin opens **+ Add Member** → enters email +
   role (Admin or Supervisor). If Supervisor, an optional project
   multi-select sets `pendingProjectIds`. Server action validates the
   caller's role, dedupes against `(organizationId, email)`, generates
   `inviteToken` + `inviteExpiresAt` (now + 7 days), and inserts an
   `invited` row. If the email already maps to an Inturn user, `userId`
   is linked immediately (status still `invited`).
2. **Email.** Resend sends a new localized `invite` template → link to
   `/[locale]/invite/[token]`. (Sending email = an action; it happens as
   part of the explicit "Send invite" the Owner/Admin performs in the UI.)
3. **Accept.** The accept page resolves the token and shows org name,
   role, and inviter. "Accept invite" requires **Clerk sign-in/up** — we
   never create the account. On successful auth, match by
   clerkId/email → flip `status = active`, set `userId` + `joinedAt`,
   clear `inviteToken`/`inviteExpiresAt`, and push the user's id into each
   `pendingProjectIds` project's `supervisorIds`. Redirect into that org's
   workspace.
4. **Multi-team.** An existing user (even an intern) simply gains a new
   membership and switches org context — no second account needed.

### Accept-flow edge states (each gets a clear, localized screen)

- **Expired** token → offer "ask for a new invite" (no self-resend).
- **Already accepted** → send them to the org.
- **Already a member** of that org → no-op, send them to the org.
- **Email mismatch** (signed-in Clerk email ≠ invite email) → explain;
  don't claim the invite.
- **Revoked / not found** → friendly "this invite is no longer valid".

## UI surfaces

All built on the Phase-0 design-system primitives (Card / Menu / Button /
Table) and Lucide icons, so the new screens match the polish work.

1. **Sidebar.** Add `MANAGEMENT › Team` link in `platform-sidebar.tsx`,
   visible to Owner/Admin only. When the viewer has >1 active membership,
   show a **minimal org switcher** in the sidebar header (sets the
   persisted active org).
2. **Team page** `/[locale]/(platform)/company/team` — one page, two
   populations (staff + interns):
   - Filter pills: **All / Admin / Supervisor / Intern**. All/Admin/
     Supervisor read from `organization_members`; **Intern** reads from
     `getOrgInterns(orgId)`.
   - Search by name/email (across both populations).
   - **List / Grid** toggle.
   - **Staff cards:** avatar, name, email, role badge, **Owner crown**.
   - **Pending invites inline** — "Invited · pending" state with
     **Resend** and **Revoke** actions (one source of truth: the same
     table).
   - **Intern cards:** avatar, name, internship/project, supervisor,
     status badge. Actions are **jump-offs to existing surfaces** —
     "Open workspace", "End internship" (existing lifecycle action) — not
     new flows. No invite/role controls on intern cards.
   - **+ Add Member** button (Owner/Admin only) → Add-Member modal.
     **Staff-only** — interns aren't "added" here; they arrive via
     applications (the Intern pill shows an empty-state hint pointing to
     the marketplace/applications when there are none).
3. **Add-Member modal:** email field, role select (Admin / Supervisor),
   and — when Supervisor — an optional project multi-select. "Send invite".
4. **Row / card actions** (Owner/Admin): change role, remove member,
   and (for supervisors) manage project assignments.
5. **Project settings → "Supervisors" section:** add/remove assigned
   supervisors from the org's supervisor pool — the "adjust anytime" half
   of Q3, reusing `projects.supervisorIds`.

## Server actions

In `modules/` (e.g. `modules/team/server-actions.ts`), each guarded by
`requireOrgRole`:

- `inviteMember({ orgId, email, role, projectIds? })`
- `acceptInvite({ token })` (runs in the authed accept route)
- `resendInvite({ memberId })` / `revokeInvite({ memberId })`
- `removeMember({ memberId })`
- `setMemberRole({ memberId, role })` — toggles `admin` ⇄ `supervisor`
  only; `owner` is not assignable in MVP (no ownership transfer), and the
  Owner row can't be demoted
- `setSupervisorProjects({ memberId, projectIds })` (mutates the relevant
  `supervisorIds` arrays + reflects on the member row if we cache it)

**Read query (no new mutations for interns):**

- `getOrgInterns(orgId)` — joins accepted `applications` → `internships`/
  `projects` to list active interns (name, internship/project, supervisor,
  status). Intern actions on the Team page reuse **existing** mutations
  (end-internship lifecycle, supervisor assignment); this sprint adds no
  intern-specific write paths.

## Defaults chosen (approved 2026-05-29)

- **Invite expiry:** 7 days; re-invite/resend refreshes the token + clock.
- **Seat limits:** none for MVP.
- **Remove member:** soft (`status = removed`, `removedAt` set), pull the
  user from **all** `supervisorIds`, revoke any pending invite. The user's
  account is never deleted.
- **Last-owner protection:** the Owner can't be removed or demoted;
  ownership transfer is deferred.
- **Who can invite / manage team:** Owner + Admin only.

## Error handling & degradation

- All server actions validate the caller's membership role first; reject
  with a localized error otherwise.
- Invite creation is idempotent on `(orgId, email)` — re-inviting an
  existing pending address refreshes rather than duplicates.
- Email send failure (Resend down) surfaces a soft notice and leaves the
  invite row intact so it can be resent — the invite is valid regardless
  of email delivery.
- Accept is transactional: membership flip + `supervisorIds` updates
  succeed or roll back together.

## i18n

- New `team` namespace (page title, filter pills incl. **Intern**, search
  placeholder, list/grid labels, member statuses, role names + badges,
  modal labels, row actions, confirmation copy, **intern-card labels +
  status + empty-state hint**).
- New `invite` namespace (email subject/body, accept-page copy, all edge
  states).
- Full **FR + EN** parity; FR is the unprefixed default route.

## Testing

Unit/integration (Vitest), mocking Clerk + DB per existing patterns:

- `requireOrgRole` and `canAccessProject` (owner/admin pass-through;
  supervisor scoped to `supervisorIds`; non-member denied).
- Current-org resolution: single-membership → that org; owner still
  resolves post-backfill; multi-membership → persisted active org with
  sane fallback.
- `inviteMember`: role guard, dedupe, expiry set, existing-user linking.
- `acceptInvite`: active flip, `pendingProjectIds` → `supervisorIds`,
  expired/mismatch/already-member branches, transaction rollback.
- `removeMember`: soft-remove, `supervisorIds` cleanup, last-owner guard.
- `setMemberRole`: last-owner/demote guard, multi-team isolation.
- `getOrgInterns`: returns active interns for the org only (accepted apps),
  excludes other orgs' interns and ended internships.
- Migration backfill sanity (one owner row per org).

Target: keep the existing **276+ tests green**, 0 new failures; add the
above as net-new coverage.

## Rollout / sequencing

1. Schema + migration + backfill.
2. Authz helpers + **current-org resolution off memberships** (+ tests) —
   the one strangler cutover this sprint requires.
3. Server actions: invite / accept / resend / revoke / remove / set-role
   / set-supervisor-projects, plus the `getOrgInterns` read query (+ tests).
4. Resend `invite` email template + `/invite/[token]` accept route.
5. UI: sidebar link + org switcher, Team page (staff + **interns
   roster**), Add-Member modal, project Supervisors section.
6. i18n (FR/EN) + full verify (typecheck / lint / test) + browser check
   in both locales.

## Open questions

None blocking. Ownership transfer, seats, and bulk invite are explicitly
deferred (see Non-goals).
