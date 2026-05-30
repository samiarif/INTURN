# University at Scale — Supervision Structure & Cohort Onboarding (Design)

**Date:** 2026-05-30
**Status:** Approved (architecture locked)
**Builds on:** `2026-05-30-university-product-foundation-design.md` (foundation + academic-supervision loop, shipped)

---

## 1. Context & motivation

The University product shipped in two milestones: foundation/provisioning and the academic-supervision rapport-review loop. To onboard **real** university partners, four gaps remain:

1. **Multiple coordinators per university** — today a university has one coordinator (the provisioned owner).
2. **Per-student encadrant assignment** — today every coordinator sees every student; there is no student↔coordinator link.
3. **CSV bulk student invite** — today students are invited one email at a time.
4. **Pending-invite management** — today pending student invites render as a flat, unmanageable email list.

### Explicitly out of scope: the convention de stage (E28)

Roadmap item E28 (generate a signed tripartite convention de stage PDF) is **descoped permanently**. Tunisian universities each bring their own convention template and process; inturn does not generate one. This supersedes the roadmap's E28 framing.

---

## 2. Locked decisions

- **Gated visibility.** An encadrant sees only the students assigned to them; the head coordinator sees every student and manages assignments.
- **Head = org `owner`; encadrant = org `admin`.** No new role. This reuses machinery that already exists — `acceptInviteAction` already promotes both owner and admin university members to the global `university` role, and only the owner takes org ownership.
- **One nullable `assigned_coordinator_id` FK** on the student's `organization_members` row. One encadrant per student; no join table.
- **Inviting a student auto-assigns the inviter.** The head reassigns from the roster. Removing an encadrant reassigns their students to the head, so no student is orphaned.
- **Two plans, built in order:** (1) supervision structure & gating, then (2) cohort onboarding at scale. Plan 1 first so onboarding is assignment-aware from day one.

---

## 3. Architecture

### 3.1 Roles & hierarchy (no schema change)

| Org role | Product meaning | Capabilities |
|----------|-----------------|--------------|
| `owner`  | **Head coordinator** (chef de département) | Sees every student. Invites/removes encadrants. Assigns & reassigns students. Invites students. |
| `admin`  | **Encadrant** (académique supervisor) | Sees only students assigned to them. Invites students (auto-assigned to self). Reviews their students' rapports. |
| `student`| Supervised student | Unchanged (Plan 2). |

A university provisioned by a platform admin gets exactly **one** head (the owner, via the existing admin-side `inviteCoordinatorAction` which invites as `owner`). The head adds further coordinators **self-service**, as `admin` (encadrant).

Single-coordinator universities (one owner, no encadrants) behave exactly as today — gating never bites.

### 3.2 Data model — migration `0019_student_coordinator_assignment.sql`

Add one column to `organization_members`, idempotent, matching the `0017`/`0018` `BEGIN; … COMMIT;` + `IF NOT EXISTS` style:

```sql
BEGIN;

ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS assigned_coordinator_id uuid
  REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS org_members_assigned_coordinator_idx
  ON organization_members(assigned_coordinator_id)
  WHERE assigned_coordinator_id IS NOT NULL;

-- Backfill: existing student members inherit the org's head (owner) so no
-- student is invisible after the gate turns on. Universities only.
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

Drizzle schema (`db/schema/organization-members.ts`):

```ts
assignedCoordinatorId: uuid('assigned_coordinator_id').references(() => users.id, {
  onDelete: 'set null',
}),
```

Semantics of `assigned_coordinator_id`:
- **Set** → the encadrant who supervises this student.
- **`null`** → "belongs to the head" — only the owner sees the student. Arises from backfill where `owner_id` was null, or after an encadrant is removed and (defensively) before reassignment lands. The normal invite paths always set it, so `null` is an edge state, not the common one.

### 3.3 Authorization & gating

Three read paths become viewer-aware. The viewer's role in the org comes from `getCurrentOrg(userId).role` (already available).

**a) Roster — `getManagedStudents(orgId, opts?: { forCoordinatorId?: string })`**
- `forCoordinatorId` **undefined** (head/owner) → all student members (current behaviour), plus each row's `assignedCoordinatorId` and the encadrant's display name (extra `leftJoin` on `users` via `assigned_coordinator_id`).
- `forCoordinatorId` **set** (encadrant/admin) → `WHERE assigned_coordinator_id = forCoordinatorId`.
- The dashboard passes `current.role === 'owner' ? undefined : { forCoordinatorId: session.user.id }`.

**b) Review surface — `/university/students/[studentId]`**
After the existing IDOR membership gate (target is an active `student` member of this org), add:
```
if viewer.role === 'admin' && studentMembership.assignedCoordinatorId !== viewer.userId
  → notFound()   // same opaque outcome as a foreign student
```
The owner bypasses (sees any student in the org).

**c) Notification routing — `onAcademicReportSubmitted` (dispatcher.ts)**
Replace "notify all owner/admin coordinators" with: look up the student member's `assigned_coordinator_id` in this org.
- Assigned and active → notify **that one** coordinator.
- `null` or inactive → notify the **head (owner)**.

This keeps the "rapport submitted" notification from reaching a coordinator who cannot see the student. The `onAcademicReportReviewed` notification (to the student) is unaffected.

**d) Assignment mutation**
- `assignStudentCoordinatorAction({ studentMemberId, coordinatorUserId | null })` — **head-only** (`requireOrgRole(user.id, orgId, ['owner'])`).
- IDOR: `studentMemberId` must be a `student` member of the head's active org; `coordinatorUserId` (when non-null) must be an **active `owner`/`admin` member of the same org**. Either failing → opaque `member_not_found`. (Prevents assigning to a foreigner or to a student.)
- Encadrants cannot reassign — they neither give away nor claim students. Hand-offs go through the head.

### 3.4 Coordinator management (multi-coordinator)

- **Self-service invite** — new `inviteCoordinatorAction({ email })` in `modules/university/server-actions.ts` (distinct from the platform-admin one in `admin-actions.ts`). Head-only. Invites as role **`admin`** (encadrant). Uses `universityInviteTemplate` variant `coordinator`. Shares the `team-invite` rate-limit bucket.
- **Acceptance** — the existing `acceptInviteAction` already handles a university `admin` accept: promotes global role → `university`, no ownership transfer, redirect `/university/dashboard`. No change needed there beyond one cleanup (§3.6).
- **Removal** — `removeMember` (team service) gains a university-aware step: when removing a member, reassign every student whose `assigned_coordinator_id` equals the removed user's id → the org `owner_id`. Company orgs have no such rows, so this is a no-op there. (Owner cannot be removed — existing guard.)
- **Roster of coordinators** — the head sees the list of coordinators (owner + admins) with each one's assigned-student count, plus invite/remove controls. Encadrants do not see coordinator management.

### 3.5 Assignment UX (head only)

On the head's roster, each student row gains an **Encadrant** column with a reassign control: a dropdown of the university's coordinators (owner + active admins) → `assignStudentCoordinatorAction`. Selecting "—" sets `null` (head-owned). Encadrants' rosters show no encadrant column (every row is implicitly theirs).

### 3.6 Small carry-forward fix

`acceptInviteAction` (team/server-actions.ts) still has `result.role === 'student' ? '/intern/dashboard' // TODO(plan2): /intern/university`. Plan 2 shipped `/intern/university`; update the redirect target.

---

## 4. Plan 1 — Supervision structure & gating

**Goal:** multiple coordinators, per-student encadrant assignment, and gated reads.

Scope:
- Migration `0019` + Drizzle schema column (§3.2).
- Widen `createInvite` to accept optional `assignedCoordinatorId` (default `null`); company invites pass nothing.
- `inviteStudentAction` sets `assignedCoordinatorId = user.id` (the inviter — head or encadrant).
- `getManagedStudents` viewer-aware (§3.3a), returning encadrant id + name for the head view.
- New self-service `inviteCoordinatorAction` (role `admin`), head-only (§3.4).
- New `assignStudentCoordinatorAction` + IDOR rules (§3.3d).
- `removeMember` reassign-on-removal step (§3.4).
- Review-surface assignment gate (§3.3b).
- Notification routing change (§3.3c).
- Dashboard: roster gains the Encadrant column + reassign control (head); coordinator roster panel (head); encadrant view filtered.
- `acceptInviteAction` redirect fix (§3.6).
- i18n FR/EN for all new strings.
- Seed: assign the demo student (Yasmine) to the head (prof.saidi) — covered by the backfill if prof.saidi is the active owner; add an explicit assignment in the seed for determinism.

---

## 5. Plan 2 — Cohort onboarding at scale

**Goal:** bulk student onboarding and manageable pending invites. Assignment-aware (depends on Plan 1).

### 5.1 CSV bulk student invite
- **Surface:** an "Import students (CSV)" action on the dashboard. Accept a pasted block or a `.csv` file; **parse server-side** (no new client dep).
- **Format:** one student per line; first token = email, optional remainder = name (`email` or `email,First Last`). A header row is auto-detected and skipped. Cap **100 rows per import**.
- **Batch encadrant:** the import form has an encadrant picker. The head may pick any coordinator (default: themselves); an encadrant import auto-assigns to themselves (no picker). All rows in the batch get that `assigned_coordinator_id`.
- **Per-row validation & partial success:** validate email shape; skip rows already an active/invited member (pre-check against the `org+lower(email)` unique index rather than letting `createInvite` throw). Process all valid rows; return a summary `{ invited, skippedDuplicate: string[], invalid: string[] }`. Never abort on the first bad row.
- **Emails:** one `universityInviteTemplate` (student variant) per invited row, sent sequentially (Neon HTTP, no transactions; emails best-effort). The 100-row cap bounds cost.
- **Rate limit:** a dedicated `university-bulk-invite` bucket (a few imports per window) so a bulk import does not exhaust — or get blocked by — the per-invite `team-invite` bucket.

### 5.2 Pending-invite management
- **Query:** `getPendingStudentInvites(orgId, opts?: { forCoordinatorId?: string })` — `student` members with `status='invited'`; head sees all, encadrant sees only those assigned to them. Returns email, `invitedAt`, `inviteExpiresAt`, assigned-encadrant name.
- **UI:** replace the flat email list on the dashboard with a managed panel — each pending invite shows email, invited date, expiry, and **Resend** / **Revoke** controls.
- **Actions (university-flavored, in `modules/university/server-actions.ts`):** `resendStudentInviteAction` / `revokeStudentInviteAction`. Gated `requireOrgRole(['owner','admin'])`; an encadrant may act only on invites assigned to them, the head on any. Reuse team-service `resendInvite`/`revokeInvite`, but resend uses `universityInviteTemplate` (student variant) and both revalidate `/university/dashboard`. (The existing company `resendInviteAction`/`revokeInviteAction` use the company template and revalidate `/company/team` — wrong for students.)

---

## 6. Edge cases & invariants

- **Single-coordinator university:** owner sees all; gating no-op; backward compatible.
- **Unassigned (`null`) student:** only the head sees them; the head assigns. Edge state only.
- **Encadrant removal:** their students reassign to the head (§3.4). The existing `removeMember` supervisorIds-strip for company projects is unchanged.
- **IDOR everywhere:** assignment, resend, revoke, and review all validate org membership and return opaque not-found on cross-org or wrong-type targets.
- **Self-assignment guard:** a student can never be an `assigned_coordinator_id` — the target must be an active owner/admin member.
- **Firewall preserved:** none of the new reads touch `canViewWorkspace` or workspace tables; the coordinator still reaches a student's internship only through `getStudentInternshipSnapshot`. Report comments stay in the isolated `academic_report_comments` table.

---

## 7. Testing strategy

- **Gating:** `getManagedStudents` head-vs-encadrant; review-surface assignment gate (encadrant blocked from a non-assigned student, owner allowed).
- **Assignment:** head-only authz; IDOR (foreign student, foreign coordinator, student-as-coordinator); reassign-on-removal.
- **Notifications:** submitted → assigned encadrant only; `null` → head; never broadcast to all coordinators.
- **CSV:** parse (header detection, name parsing), per-row outcomes (invited / duplicate / invalid), row cap, batch-encadrant assignment.
- **Pending invites:** query gating; resend/revoke authz (encadrant scoped to their invites).
- **Firewall invariants** from the prior milestone carry over unchanged.

---

## 8. Deferred / future (not this milestone)

- Many encadrants per student (join table) — YAGNI; one académique encadrant is the norm.
- Changing the head / ownership-transfer UI — separate concern.
- Per-row encadrant column in the CSV — v1 uses a single batch encadrant.
- Per-encadrant email digest; bulk reassignment UI.
- Pre-existing `deliverable.*` dispatcher notification gap (tracked in HANDOFF).
