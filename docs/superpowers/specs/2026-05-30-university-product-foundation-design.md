# University Product — Foundation + Academic Supervision — Design

**Status:** Draft, pending Sam review
**Date:** 2026-05-30
**Author:** Claude (paired with Sam)
**Ships in:** One milestone, staged (schema → role/authz → provisioning/invite → report loop → dashboard/projection → i18n/tests)
**Build strategy:** *Extend, don't duplicate* — a university is an `organizations` row with a new `kind` discriminator; the coordinator↔student relationship reuses `organization_members` + the existing invite/accept machinery; the rapport-review loop reuses the deliverables versioning + review pattern.

## Problem

Inturn has no university side. Two facts about today's state:

- A student "belongs to" a university only via `profiles.university` — a **plain, unverified `text` slug** picked from a hardcoded `UNIVERSITIES` constant at onboarding. No entity, no FK, no trust, no managed relationship.
- There is no `university` role, no coordinator, no university dashboard, and no admin path to create any organization at all (orgs are born only from company self-onboarding or the seed).

The roadmap's Phase 4 (E24–E30) imagined universities as an **anonymized B2B analytics dashboard** (E27: *"all anonymized — individual student data hidden, aggregates only"*; E30: coordinators *"cannot see individual student profiles without consent"*). **Sam has reframed this** to **per-student academic supervision**: the coordinator is an *encadrant académique* who invites specific students, manages the ones who accept, sees which phase each is in, and reviews their *rapport académique* version-by-version. This supersedes the anonymized-aggregates vision for the core experience (the roadmap doc should be realigned — see Open questions).

The university↔student report loop must stay **strictly isolated** from the company's private workspace: a coordinator must never see a student's tasks, deliverables, comments, briefs, or check-ins.

## Goals

- **Admin-provisioned, invite-only universities.** An admin creates a university and invites its coordinator; nobody self-signs-up as a university in v1.
- **Coordinator manages only invited + accepted students.** The coordinator (*encadrant académique*) invites students by email; only those who **accept** become managed. Students who merely typed the university name at signup are invisible to the coordinator.
- **Rapport académique review loop.** A managed student submits a **versioned** academic report; the coordinator **comments + approves/requests revision**, mirroring the deliverables flow.
- **Phase visibility without leakage.** The coordinator sees which phase a student is in via a **firewalled, sanitized projection** of the student's internship (company name, title, dates, time-derived "Phase 2 of 4") — never the workspace internals.
- **FR + EN from day one** (FR is the unprefixed default), on the existing platform shell + design system.

## Non-goals (deferred)

- **CSV bulk student invite** (roadmap E26) — single email invites only in v1.
- **Convention de stage PDF** (E28).
- **`/for-universities` landing page** (E29).
- **Billing / seats / pricing** (universities are free in v1).
- **Per-student *encadrant* assignment** — v1: any active university staff (owner/admin) reviews any managed student's rapport. Assigning a specific supervisor per student is a later refinement.
- **Heavy anonymized analytics** (placement-rate-by-sector, top hiring companies, time-to-placement) — superseded by the per-student model; may return later as an optional "Insights" tab.
- **University self-service settings** — the entity is admin-provisioned and admin-edited in v1.
- **`profiles.university_id` FK** (floated in roadmap E24) — the managed relationship is membership-based; the free-text slug stays a soft self-declared label with zero authority over supervision.
- **Backfilling the pre-existing `deliverable.*` dispatcher gap** — the notification dispatcher fires for no `deliverable.*` event today; we wire `academicReport.*` cleanly and flag the deliverable gap as an adjacent bug to fix separately (folded in only if Sam wants).
- **Public share-token view for rapports** — deliverables have one for company sharing; the university↔student loop doesn't need it.

## Locked decisions (from brainstorming)

| # | Decision | Choice |
|---|---|---|
| Scope | Milestone surface | **Foundation (E24) + onboarding (E25) + dashboard (E27) + auth/permissions (E30) + the rapport-review loop** |
| Provisioning | How a university + coordinator come to exist | **Admin-provisioned, invite-only** |
| Visibility | Who a coordinator manages | **Only students they invite *and* who accept** (not slug self-identifiers) |
| Spine | University + coordinator↔student schema model | **Extend `organizations` (`kind`) + `organization_members` (`student` role)** |
| Phase | How the coordinator sees a student's phase | **Live sanitized projection** (firewalled from the workspace) |
| Review | The rapport lifecycle engine | **Extract the pure deliverables state-machine into a shared module**, reused by both |

## Data model

One new additive, idempotent migration (`0017_*`), applied by the existing `prebuild` migrate runner (`scripts/migrate.ts`). All enums follow the codebase convention — `text` columns typed as TS unions in Drizzle (as `verificationStatus`, member `role`/`status` already are). No existing migration is edited.

### 1 · `organizations.kind` (new column)

| Column | Type | Notes |
|---|---|---|
| `kind` | text NOT NULL DEFAULT `'company'` | union `'company' \| 'university'`. Existing rows backfill to `company` via the default. |

- Company-specific fields (`industry`, `rneUrl`, `size`) are already nullable, so a university row simply leaves them null.
- **Touch-point:** the company-profile upsert (`createOrUpdateCompanyProfile`) keys off `ownerId` alone — scope its lookup/insert by `kind='company'` so a coordinator who also owns a company isn't conflated.

### 2 · `organization_members.role` (extend enum)

- Add `'student'` → role union becomes `owner | admin | supervisor | student`. `status` (`invited | active | removed`) unchanged.
- **A managed student** = a row `{ organizationId: universityOrg, userId: student, role: 'student', status: 'active' }`.
- **Documented semantic:** the schema comment today asserts "interns are NOT members." That remains true for the **company** side (interns are derived from accepted applications). A **student member of a *university* org** is a different, additive concept — academic supervision, not company staff. Staff-only reads (`canManageOrg`, `getOrgInterns`) must continue to exclude `role='student'`.

### 3 · Global role `university` (extend `ROLES`)

- `modules/auth/types.ts`: `ROLES` becomes `['intern','company','admin','university']`. Signup-selectable roles are unchanged (`intern | company`) — `university` is **only** set by provisioning.
- Read path unchanged: `getSession` prefers Clerk JWT `publicMetadata.role`, DB `users.role` fallback. The coordinator's role is set DB-first + best-effort Clerk sync (identical to today's admin `setUserRole`).
- **Students keep global role `intern`.** Being supervised adds a university *membership*, not a new global identity.

### 4 · New table `academic_reports`

File: `db/schema/academic-reports.ts` (module `modules/academic-reports/`). Name avoids the **already-taken** `db/schema/reports.ts` (abuse-report/reclamations).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK (defaultRandom) | |
| `studentUserId` | uuid → `users.id` | the managed student |
| `universityOrgId` | uuid → `organizations.id` ON DELETE CASCADE | the supervising university |
| `internshipId` | uuid → `internships.id`, **nullable** | context only; a **plain reference, never workspace-scoped** (no `workspaceId`, so it never rides the workspace cascade) |
| `title` | text | |
| `description` | text | student's notes |
| `fileUrl` / `fileName` / `fileType` | text, nullable | rapport PDF; uploaded via the existing `/api/upload` allowlist + size cap |
| `status` | text union `draft \| submitted \| approved \| revision-requested`, default `draft` | |
| `version` | int, default 1 | |
| `revisionHistory` | jsonb, default `[]` | same revision shape as deliverables (newest-first) |
| `feedback` | text, nullable | coordinator's latest decision note |
| `dueDate` | timestamptz, nullable | |
| `submittedAt` | timestamptz, nullable | |
| `createdAt` / `updatedAt` | timestamptz | |

- **Indexes:** `(universityOrgId, status)`, `(studentUserId)`.
- **v1 cardinality:** one logical rapport per `(studentUserId, universityOrgId)`, versioned. No hard unique constraint (keeps room for future per-internship rapports); the UI surfaces the latest.

### 5 · `comments.reportId` (extend polymorphic comments)

- Add nullable `reportId` uuid → `academic_reports.id` ON DELETE CASCADE, mirroring the existing nullable `taskId` / `deliverableId` columns.
- Add `getReportComments(reportId)`. This backs the coordinator↔student discussion thread on a rapport.

## Auth & isolation

### `requireUniversityRole`

New guard in `modules/auth/session.ts`, beside `requireAdmin`. Passes for global role `university` (or `admin`); otherwise redirect/403. Gates every `/university/*` route + server action.

### Coordinator scope is membership-gated (IDOR-safe by inheritance)

Every coordinator action resolves *"is this student an `active` `student` member of a university org I own/admin?"* via the existing `requireOrgRole(userId, orgId, ['owner','admin'])` + a member lookup. This **inherits the cross-tenant IDOR guard for free**: passing another university's `studentId`/`reportId` returns the same opaque `member_not_found` (per `modules/team/service.ts`'s `member.organizationId !== input.orgId` checks).

### The sanitized-projection firewall (privacy core)

The coordinator **never passes `canViewWorkspace`** (deny-by-default; no coordinator branch exists). Instead, a dedicated read `getStudentInternshipSnapshot(studentUserId)` (university module) returns **only** the safe fields below, gated on the caller managing that student. It is a **separate read path that physically cannot return private columns** — structural isolation, not post-fetch filtering.

| Safe to surface to coordinator | Must stay private (company workspace) |
|---|---|
| Internship title (`internships.title`) | Tasks / task board (`tasks.*`) |
| Company / org name (`organizations.name`) | Deliverables + files + revision history + feedback |
| Workspace start / end dates | Check-ins (stored as deliverables) |
| Duration in weeks | Comments (`comments.body`) |
| Current phase **name + index** ("Phase 2 of 4") | Supervisor-private notes (`workspaceNotes.body`) |
| Phase count / arc (names only) | Project brief (`projects.brief`) |
| Coarse time-based progress (weeks elapsed) | Project goals (`projects.goals`) |
| Workspace status (active/completed/cancelled) | Phase `description`s + exact `fromWeek/toWeek` |
| Student identity + their own rapport artifacts | Activity event feed, `supervisorIds`, internal IDs |

**Phase math:** lift today's local `computeCurrentPhase(phases, startDate, now)` (currently inline in the company project page) into a shared util (`modules/workspace/phase.ts`) so the company page and this projection use one formula. The projection passes only phase **names + index** — never descriptions or raw week boundaries.

**Consent model:** a student accepting the coordinator's invite *is* the consent to academic supervision (which includes the coordinator seeing the sanitized snapshot — the rapport de stage legally names the company anyway). No separate per-internship consent toggle in v1.

## Provisioning + invite/accept flow

All invite-only, reusing `modules/team`.

1. **Admin creates the university.** New admin surface `/admin/universities` + a "Create university" server action (net-new — there is no admin org-create today). Writes `organizations(kind='university', name, slug, city, country, verified=true)`. Admin-provisioned ⇒ trusted on creation; **no** RNE/verification quiz (company-side only).
2. **Admin invites the coordinator.** Reuses `createInvite` (tokenized, email-matched, 7-day expiry) with member role `owner` on the university org + a university-flavored invite email. Two **touch-points** extend the otherwise-reused accept flow:
   - (a) on accept, promote the coordinator to global role `university` (DB + best-effort Clerk sync) because they own a `kind='university'` org;
   - (b) skip the `pendingProjectIds → supervisorIds` fan-out (company-only behavior; coordinator/student invites carry none).
3. **Coordinator invites students.** Same `createInvite`, member role `student`. Student receives "Your university invited you to Inturn" → `/invite/[token]` → accepts → `organization_members(role='student', status='active')`. **Student keeps global role `intern`.**
4. **Only accepted students are managed.** Invited-not-accepted show as `pending`; slug-only self-identifiers are not members and stay invisible.

### Accept-flow edge states

Reuse the existing localized accept-page edge screens (expired / already-accepted / already-member / email-mismatch / revoked-or-not-found). The only additions are the role-aware post-accept routing (coordinator → `/university/dashboard`; student → `/intern/university`).

## The rapport académique review loop

The deliverables pattern, re-pointed at the university↔student axis.

### Lifecycle (shared state-machine)

`draft → submitted → approved | revision-requested → submitted …`, `approved` terminal. **Extract** the pure machine from `modules/deliverables/state-machine.ts` into a domain-neutral `modules/review/state-machine.ts` (`nextReviewState` / `isValidReviewTransition`), re-point deliverables at it, and move its tests along. One lifecycle, one source of truth. (The machine is already pure — no DB, no deliverable coupling.)

### Authz (mirrors deliverables' server-actions, roles swapped)

- **Submit / resubmit** (`draft→submitted`, `revision-requested→submitted`): the **student** who owns the report (`report.studentUserId === user.id`). Resubmit bumps `version`, snapshots the prior row into `revisionHistory` (newest-first), clears stale feedback.
- **Approve** / **Request revision** (+ feedback): the **coordinator** — active owner/admin staff of the managing university org (membership-gated). The student role is rejected.
- **Comment:** both sides, via the polymorphic comments + `getReportComments`.
- **Upload:** rapport PDF through the existing `/api/upload` allowlist + size cap.

### Events + notifications

The dispatcher fires for **no** `deliverable.*` event today; we wire `academicReport.*` cleanly:

- Add `academicReport.submitted`, `academicReport.approved`, `academicReport.revision.requested` to `EVENT_TYPES`.
- `recordEvent({ type, actorId, targetType: 'academicReport', targetId })` at each transition.
- Add dispatcher cases in `modules/notifications/dispatcher.ts`:
  - `submitted` → notify the **coordinator** ("{student} submitted their rapport, v{n}"), in-app + email, deep-link to the review page.
  - `approved` / `revision.requested` → notify the **student**, in-app + email, deep-link to their report page.
- New FR/EN email templates under `lib/email/templates/` via `emailLayout`.

## UI surfaces

All on the existing 240px platform shell + design-system primitives (Card / Menu / Button / Table) + Lucide; FR/EN parity. Actual layout mockups happen at implementation.

1. **Admin** `/admin/universities` — list + "Create university" + "Invite coordinator". Owner/admin-of-platform only (`requireAdmin`).
2. **Coordinator** `/university/dashboard` — managed-students roster (name + field/year, the **sanitized internship snapshot**, a **rapport status pill**); an **"Awaiting your review"** group/count up top (rapports at `submitted`); an inline **Invite student** action + **pending-invites** list (resend/revoke, reusing team actions); **minimal counts only** (managed / placed / awaiting-review — free from the roster query).
3. **Coordinator** `/university/students/[studentId]` — header (student identity + membership) → sanitized internship snapshot → the rapport (version stack + comments + role-gated Approve/Request-revision bar mirroring `deliv-review-bar`).
4. **Student** `/intern/university` — academic-supervision home: which university + coordinator manages them, rapport status, version stack, comment thread, submit/resubmit (upload) when `draft`/`revision-requested`.
5. **Nav:** `/university/*` gets a university sidebar (Dashboard · Students), mobile drawer. The **intern** sidebar conditionally gains a "University" link (→ `/intern/university`) when the student holds an active university membership.

### Component reuse map

- **As-is:** the extracted review state-machine, `recordEvent` + events infra, `CommentsThread`, the `/api/upload` allowlist, the invite/membership machinery.
- **Copy-adapt:** service bookkeeping (version/snapshot/feedback), server-actions (intern→student, supervisor→coordinator), the master/detail + version-stack + review-bar components — **minus** the deliverable-specific "internship-spec brief" panel (replaced by the sanitized snapshot); **no** public-token view.
- **Net-new:** the admin university-create/invite surface, `academic_reports` queries, `getStudentInternshipSnapshot`, the dispatcher cases + email templates, the four surfaces above, the shared `phase.ts` util.

## Server actions & queries

Guarded by `requireUniversityRole` and/or `requireOrgRole` as noted:

- **Admin:** `createUniversity({ name, slug, city, country })`, `inviteCoordinator({ universityOrgId, email })` (reuses `createInvite`, role=owner).
- **Coordinator:** `inviteStudent({ universityOrgId, email })` (reuses `createInvite`, role=student), `resendInvite`/`revokeInvite` (reuse team actions), and the rapport review actions `approveReport`/`requestReportRevision`.
- **Student:** `submitReport({ reportId, fileUrl, ... })` / resubmit, `createReportDraft(...)`.
- **Reads:** `getManagedStudents(universityOrgId)`, `getStudentInternshipSnapshot(studentUserId)` (firewalled), `getReportForStudent(...)`, `getReportComments(reportId)`.
- **Accept extension:** `acceptInvite` gains the two touch-points (promote owner/admin of a university org to global `university`; skip supervisor fan-out for non-company invites).

## Error handling & degradation

- All actions validate the caller's global role + membership first; reject with a localized error otherwise.
- The sanitized snapshot degrades gracefully: a managed student with **no internship yet** → empty snapshot, shown as "managed, not yet placed."
- Invite creation stays idempotent on `(organizationId, email)` (existing behavior).
- Email-send failure surfaces a soft notice and leaves the invite/report row intact (events recorded regardless of email delivery).
- Drizzle/neon-http has no transactions — submit/approve follow the deliverables pattern (write the row, then `recordEvent` fire-and-forget; the event log is the recovery story).

## i18n

- New `university` namespace (dashboard, roster, snapshot labels, status pills, invite-student modal, pending invites).
- New `academicReport` namespace (student report home, version stack, review bar, submit/resubmit copy).
- Extend the `invite` namespace with the university-coordinator + student-invite email variants and role-aware accept copy.
- Full **FR + EN** parity; FR is the unprefixed default route.

## Testing

Unit/integration (Vitest), mocking Clerk + DB per existing patterns:

- **Shared state-machine** (`modules/review/state-machine.ts`): full transition matrix + version-bump + invalid-throw + no-mutation (the moved deliverables tests, now domain-neutral) — and deliverables still green against the re-pointed import.
- **`requireUniversityRole`**: university/admin pass; intern/company denied.
- **Coordinator scope / IDOR**: managing-coordinator passes; foreign-university coordinator gets `member_not_found` for another university's student/report.
- **`getStudentInternshipSnapshot` firewall**: returns only safe fields; asserts it never includes tasks/deliverables/comments/brief/goals; "not yet placed" branch.
- **Phase util** (`computeCurrentPhase`): boundary weeks, clamp past end, single-phase, empty phases.
- **Provisioning/invite**: `createUniversity`; coordinator invite → accept promotes to global `university` + no supervisor fan-out; student invite → accept stays `intern` + creates `student` membership.
- **Report loop**: submit (first = no ghost history), resubmit (version bump + snapshot + feedback-as-review), approve/request-revision persistence + role guards, invalid transition never writes.
- **Dispatcher**: `academicReport.submitted` → coordinator notified; `approved`/`revision.requested` → student notified; honors notify prefs.

Target: keep the existing **344+ tests green**, 0 new failures; add the above as net-new coverage.

## Rollout / sequencing

1. **Schema + migration `0017`** (`organizations.kind`, member `student` role, global `university` role, `academic_reports`, `comments.reportId`) + the `createOrUpdateCompanyProfile` kind-scoping touch-point.
2. **Auth + isolation**: `requireUniversityRole`, the shared `phase.ts` util, `getStudentInternshipSnapshot` firewall (+ tests).
3. **Provisioning + invite/accept**: admin university-create + coordinator invite; `acceptInvite` touch-points; coordinator student-invite (+ tests).
4. **Report loop**: extract `modules/review/state-machine.ts` (re-point deliverables), `academic_reports` service/queries/actions, dispatcher cases + email templates (+ tests).
5. **UI**: admin `/admin/universities`; coordinator `/university/dashboard` + `/university/students/[id]`; student `/intern/university`; conditional intern nav link.
6. **i18n (FR/EN)** + full verify (typecheck / lint / test) + browser check in both locales.

## Open questions

- **Roadmap realignment.** This spec supersedes the anonymized-aggregates framing of E27/E30 with per-student supervision. Per the roadmap's own rule ("edit this doc first"), `docs/DEV_ROADMAP.md` Phase 4 should be updated to match — recommend doing so when this spec is approved.
- **`deliverable.*` dispatcher gap** (pre-existing): notifications never fire on deliverable review today. Out of scope here; fold in only if Sam wants it fixed in the same pass.

No blocking questions.
