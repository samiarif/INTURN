# Sprint 3 — Design Spec

**Status:** Approved · 2026-05-24
**Owner:** Sam
**Scope:** Full first-experience loop for all three actors (intern, company, admin) + critical fixes surfaced by the post-Sprint-2 code review.
**Brief reference:** `docs/inturn-project-brief.md` (Sprints 3 + parts of 4 + Admin from Sprint 6)
**Prior work:** `docs/superpowers/specs/2026-05-23-sprint1-finish-sprint2-overview-design.md`
**Design bundle:** `docs/design-bundle/` (Workshop direction locked)

---

## Goal

Ship the end-to-end loop that takes a real design-partner company from "we just signed up" to "we have an intern working in a real workspace" — and a real intern from "I see an internship on the marketplace" to "I'm doing the first task". Plus the admin's first workflow (verifying companies), plus the critical security/authz fixes blocking us from letting real users in.

End-state: Sam can onboard a real Tunisian design partner over a 15-minute call. They post their first internship. A real student applies via the marketplace. Sam (admin) verifies the company. The company accepts the student. The workspace opens automatically with no synthetic seeding. Both sides start using the workspace UI that already exists.

## Non-goals (still deferred)

- AI Project flow (Sprint 6 — schema is locked already, no migration needed when it lands)
- Email + WhatsApp notifications (Sprint 6)
- Virtual internship layer — weekly check-ins, async task templates (Sprint 5)
- End-of-internship Intern Record PDF (Sprint 6)
- Community feed + announcements (Sprint 6)
- Advanced marketplace filters (sector, duration, location, skills, language) — Sprint 4 stretch
- Deliverables versioning UI from inside workspace (Sprint 5)
- Tasks board drag-to-status (Sprint 5 — explicit decision)
- University portal (Phase 2)
- Reusable custom-question libraries per org (premature)

---

## Decisions locked

| Decision | Choice | Rationale |
|---|---|---|
| Sprint 3 scope | Full first-time loop (Company + Marketplace + Apply + Accept + Admin verify) | Sam approved. Gets us shippable end-to-end. |
| Apply flow | Logged-in only, completed-profile required | Brief: "one profile, apply once". Profile data is the moat. |
| Custom questions | Per-internship free-form, schema already supports | Matches brief. `internships.customQuestions` jsonb exists. |
| Marketplace filters | Minimal: free-text + role + paid/unpaid | Ship fast. Sprint 4 owns the brief-complete filter set. |
| Workspace authz | Switch to `project.supervisorIds` (project-scoped) | Review finding #3/#4. Org-wide is too broad. |
| Upload trust | Role-gated `/api/upload` + blob-URL allowlist on server actions | Review finding #2. First hostile signup must not be able to host arbitrary content. |
| Role enums | Unify on `'intern' \| 'company' \| 'admin'` everywhere — drop `WorkspaceViewerRole` | Review finding #15. Two enums for the same concept is a smell. |
| Workspace UI i18n | All workspace strings move to next-intl keys (FR + EN) | Review finding #11. Half-i18n is worse than none. |
| Acceptance flow | Atomic: `acceptApplication(applicationId)` server action transitions status + creates workspace in one transaction | Avoids partial state where status moved but workspace missing. |
| Marketplace public-readability | Listings + internship detail pages are public (no Clerk middleware), but POST endpoints are gated | Brief: "Public listing page (no login required for SEO)". |

---

## Architecture overview

```
modules/
├── auth/                  ← existing
├── profiles/              ← existing (Sprint 1)
├── projects/              ← existing schema + service (Sprint 2); UI added in Sprint 3
├── internships/           ← NEW: posting, listing, detail
├── applications/          ← NEW: apply, inbox, comparison, status pipeline, internal notes
├── workspace/             ← existing (Sprint 2); add atomic createFromApplication
├── admin/                 ← NEW: verification queue + org status transitions
└── events/                ← existing — add new event types
```

```
app/[locale]/
├── (marketing)/                ← NEW route group, public-readable
│   ├── marketplace/
│   │   └── page.tsx            ← /marketplace
│   └── internships/[slug]/
│       └── page.tsx            ← /internships/<id-or-slug>
├── (platform)/
│   ├── intern/
│   │   ├── dashboard/          ← existing placeholder, rewritten as "my workspaces + my applications"
│   │   ├── applications/       ← NEW: application tracker
│   │   │   ├── page.tsx
│   │   │   └── [applicationId]/page.tsx
│   │   └── workspaces/[id]/    ← existing
│   ├── company/
│   │   ├── dashboard/          ← existing placeholder, rewritten as "my projects" rollup
│   │   ├── projects/
│   │   │   ├── new/page.tsx    ← create project (multi-step)
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx    ← Project Hub (placeholder for Sprint 4 — link to internships only)
│   │   │       ├── internships/
│   │   │       │   └── new/page.tsx   ← post internship
│   │   │       └── applications/
│   │   │           ├── page.tsx        ← inbox
│   │   │           ├── compare/page.tsx ← comparison view (max 4)
│   │   │           └── [applicationId]/page.tsx  ← candidate detail
│   │   └── workspaces/[id]/    ← existing
│   └── admin/
│       ├── dashboard/          ← existing placeholder, rewritten as queue counts
│       └── verifications/      ← NEW: company verification queue
│           ├── page.tsx
│           └── [orgId]/page.tsx
```

---

## Critical fixes (must land Sprint 3)

### F1. Upload trust boundary

`/api/upload`:
- Gate by Clerk role. `kind=cv` requires intern. `kind=logo`/`registry` require company. `kind=deliverable` requires intern OR supervisor of the workspace (TBD pass workspace id).
- Reject if user's `profileStep !== 'complete'` and `kind=cv` (avoid pre-signup spam).
- Add a `BLOB_PUBLIC_HOST` env var (e.g. `<store>.public.blob.vercel-storage.com`); server actions that accept blob URLs validate `new URL(url).host === requireEnv('BLOB_PUBLIC_HOST')` before persisting.

Affected files: `app/api/upload/route.ts`, `lib/env.ts`, `modules/profiles/server-actions.ts`, `modules/profiles/company-server-actions.ts`.

### F2. Workspace authz — switch to project supervisors

`canViewWorkspace(workspace, viewer)`:
- Admin: always allowed.
- Intern: `workspace.internId === viewer.userId`.
- Company role: viewer.userId must be in `project.supervisorIds` for the project this workspace belongs to. (Falls back to `organization.ownerId` only when `project.supervisorIds` is empty — temporary back-compat with Sprint 2 seeds.)

`getWorkspaceOverview` must return the project so this check works; today it already does. The view-time check happens at the page boundary.

Affected files: `modules/workspace/service.ts`, both workspace page routes, both sidebar helpers.

### F3. Supervisor sidebar uses `project.supervisorIds`

`getSupervisorSidebarData(viewerUserId)`:
1. Find all projects where `supervisorIds @> [viewerUserId]` (Drizzle JSONB `@>` operator, NOT JS-filter).
2. For each project, fetch its internships + workspaces.
3. Fall back to `organizations.ownerId === viewerUserId` if zero project matches (back-compat).

Affected files: `modules/workspace/queries.ts`.

### F4. Admin sidebar branching on /intern/workspaces

In `app/[locale]/(platform)/intern/workspaces/[id]/page.tsx`, the sidebar data is computed from `getInternSidebarData(workspace.internId)` regardless of viewer role (since the route renders the intern view). The current code branches on `role === 'intern'` which sends admins down the supervisor path — wrong shape.

Affected files: `app/[locale]/(platform)/intern/workspaces/[workspaceId]/page.tsx`.

### F5. Seed events have correct `targetId`s

`scripts/seed.ts`:
- `deliverable.submitted` → `targetId = deliverable.id`
- `deliverable.revision.requested` → `targetId = deliverable.id`
- `task.moved` → `targetId = task.id`
- `comment.added` → `targetId = task.id` (or workspace.id if not task-scoped)
- `system.checkin.scheduled` → `targetId = workspace.id`

Once correct, `getWorkspaceOverview` activity query is unchanged (still does `inArray(events.targetId, [workspaceId, ...taskIds, ...deliverableIds])`).

Affected files: `scripts/seed.ts`.

### F6. Webhook idempotency

`app/api/webhooks/clerk/route.ts`:
- `user.created`: use `ON CONFLICT (clerk_id) DO NOTHING` or upsert. Returns 200 on duplicates so Clerk stops retrying.
- `user.updated`: idempotent already (UPDATE WHERE clerk_id).
- `user.deleted`: idempotent (DELETE WHERE clerk_id; no error if nothing matches).

Affected files: `app/api/webhooks/clerk/route.ts`.

### F7. Parallelize `getWorkspaceOverview`

Replace the 8 sequential `await db.select()` calls with a single `Promise.all([...])`. Internship/organization/intern/profile/project/supervisors can all be loaded in parallel after we have the workspace row. Tasks + deliverables in parallel after that. Events after taskIds/deliverableIds are known.

Affected files: `modules/workspace/queries.ts`.

### F8. Unify role enums

Drop `WorkspaceViewerRole`. Use `'intern' | 'company' | 'admin'` everywhere. `WorkspaceOverview` takes `viewerRole: 'intern' | 'company' | 'admin'` and derives "supervisor" internally (`viewerRole !== 'intern'` for sidebar variant). Both intern and company workspace page routes pass the viewer's actual role; the page does the right thing for admins (admin viewing /intern/workspaces gets intern view; admin viewing /company/workspaces gets supervisor view).

Affected files: `modules/workspace/types.ts`, `modules/workspace/components/*.tsx`, both workspace page routes.

### F9. Workspace UI i18n

Move every hardcoded string in `modules/workspace/components/*` to `locales/{fr,en}.json` under `workspace.*`. The right-rail and brief-card placeholder copy ("Submit audit v2", "Reply to Mehdi" etc.) becomes data-driven from the workspace, not literal strings.

Affected files: `modules/workspace/components/*.tsx`, `locales/{fr,en}.json`.

### F10. Migration baseline (documentation only)

Add a `db/migrations/README.md` explaining the first-run `--baseline` flag for fresh production environments. No code change.

### F11. Activity feed actor resolution

`ActivityFeed` accepts the supervisors + intern arrays already on the page and looks up actor names from `event.actorId` instead of hardcoding "Yasmine"/"Mehdi".

Affected files: `modules/workspace/components/activity-feed.tsx`, `modules/workspace/components/workspace-overview.tsx`.

### F12. Tasks `tag` schema

Add `tasks.tag text` column. Migrate existing tasks (regex-extract from description for the seed data, drop the extraction code in `task-list.tsx`).

Affected files: `db/schema/tasks.ts`, `scripts/seed.ts`, `modules/workspace/components/task-list.tsx`.

---

## Component 1 — Company side: project + posting

### C1. Create project (multi-step)

`/company/projects/new`:
- **Step 1 — Brief**: name, slug (auto from name, editable), one-paragraph brief, start date, end date (default = +12 weeks).
- **Step 2 — Supervisors**: pick from org members. For Sprint 3, default to "just me" (the org owner). UI shows an `+ Invite supervisor by email` button but invitations defer to Sprint 5; for now, supervisorIds = [creator].
- **Step 3 — Save**: posts → creates `projects` row with `status='draft'`, redirects to `/company/projects/[id]`.

Module: `modules/projects/server-actions.ts` exports `createProjectAction(formData)`.

### C2. Project page (Sprint 3 placeholder)

`/company/projects/[projectId]`:
- Project header (name + status badge + brief)
- "Internships" section with [+ Post internship] CTA
- List of existing internships (if any) — title, status, application count
- No KPI tiles / activity rollup yet (Sprint 4 — Project Hub).

### C3. Post internship form

`/company/projects/[projectId]/internships/new`:
- Form fields per `internships` schema: title, description (textarea), sector (select), skills (ChipInput, reuse from Sprint 1), duration (weeks, int), locationType (select: on-site/virtual/hybrid), location (text, if on-site/hybrid), isPaid (toggle), compensation (text, if paid), internCount (int, default 1), language (select: fr/en), deadline (date), customQuestions (repeater: question text + required toggle).
- Validation via Zod schema in `modules/internships/validators.ts`.
- Server action `createInternshipAction(formData, projectId)`. Sets status to `'draft'`. Returns to project page.
- "Publish" button on project page transitions internship `draft → published`. Side effect: project transitions `draft → active` if not already.

Module: `modules/internships/{validators,service,queries,server-actions}.ts`.

### C4. Applications inbox

`/company/projects/[projectId]/applications`:
- Lists all applications for all internships under this project.
- Columns: applicant avatar+name, internship, applied date, status pill, [open] button.
- Filter chips: status (all/new/reviewed/shortlisted/interview/accepted/rejected), internship (multi-select if >1 internship).
- Sort: most recent first.
- "Compare selected" CTA appears when 2-4 applications are checkbox-selected → links to comparison view with `?ids=...`.

### C5. Candidate detail

`/company/projects/[projectId]/applications/[applicationId]`:
- Header: applicant name + photo + profile completion + apply date.
- Profile card: university, year, field, city, language, skills chips, role chips.
- Cover note (full text).
- Custom answers (rendered against the internship's `customQuestions`).
- CV link (opens blob URL).
- Portfolio links.
- Internal notes (textarea, autosaved to `applications.internalNotes`).
- Status pipeline buttons: [New] [Reviewed] [Shortlisted] [Interview] [Accepted] [Rejected]. Current state highlighted; clicking transitions and emits an event.
- "Accept" button on status=Shortlisted | Interview triggers the atomic accept action (see C8).

### C6. Candidate comparison

`/company/projects/[projectId]/applications/compare?ids=a,b,c,d`:
- 2 to 4 columns side-by-side (max 4).
- Each column: photo + name + university/year/field, skills (highlighted = match against internship.skills), role chips, custom answer summaries, status, "Open" link.
- "Accept this one" / "Reject" / "Shortlist" buttons per column.
- Designed to be scannable in 30s; don't repeat full cover notes here, just the first 240 chars + "Read more".

### C7. Status pipeline state machine

`modules/applications/service.ts`:

```
new ─► reviewed ─► shortlisted ─► interview ─► accepted
   │       │             │           │            │
   └───────┴─────────────┴───────────┴────────► rejected
```

`isValidApplicationTransition(from, to)`:
- `new` can go to: reviewed, rejected.
- `reviewed` can go to: shortlisted, rejected.
- `shortlisted` can go to: interview, accepted, rejected.
- `interview` can go to: accepted, rejected.
- `accepted` is terminal — can NOT go to rejected (use cancel/withdraw, not in scope).
- `rejected` is terminal.

Every transition emits `application.status.changed` event with `{from, to, applicantId, internshipId}`.

### C8. Atomic accept

`acceptApplicationAction(applicationId)`:
1. Verify viewer is supervisor of the project containing this internship.
2. Verify application.status is in {shortlisted, interview}.
3. In a single Drizzle transaction:
   - UPDATE application SET status = 'accepted'.
   - INSERT workspace (internshipId, internId=application.applicantId, organizationId, status='active', start_date=today, end_date=today + internship.duration weeks).
   - INSERT events for `application.status.changed`, `workspace.created`.
4. Redirect to `/company/workspaces/[newWorkspaceId]`.

If anything fails, rollback. No partial state.

Module: `modules/applications/service.ts` exports `acceptApplication(applicationId, actorUserId)`.

### C9. Internal notes (per candidate, never visible to applicant)

Stored on `applications.internalNotes` (text column already exists). Autosave debounced 800ms after typing stops. No edit history (Sprint 5+).

---

## Component 2 — Marketplace + apply flow

### M1. Public marketplace listing

`/marketplace` (UNDER `(marketing)` route group — public, no Clerk middleware):
- Filter rail: free-text search, role chip filter (9 categories), paid/unpaid toggle.
- Card grid of published internships. Each card: title, company logo + name, city, duration, paid badge, deadline countdown, [Apply] CTA.
- Empty state: "No internships match. Try removing filters."
- Pagination: 20 per page.
- Only `internships.status === 'published'` AND `organizations.verificationStatus === 'verified'` are visible.

`modules/internships/queries.ts` exports `listPublishedInternships({ search, role, paid, page })`.

### M2. Internship detail

`/internships/[slug]` (public; slug = internship.id for Sprint 3, slug column added Sprint 4):
- Hero: title, company logo + name (link to /companies/[slug] — page is Sprint 4 stub), city, duration, pay, language.
- Description (markdown-rendered, but no editor yet — companies write plain text).
- Skills chips.
- Custom questions preview.
- "About the company" snippet (organization.description, 280 chars).
- [Apply] button — if not logged in, redirects to `/sign-up?role=intern&next=/internships/[slug]`. If logged in but profile incomplete, redirects to `/onboarding/intern/basics`. If complete, shows the apply form.

### M3. Apply form

`/internships/[slug]/apply` (Clerk-protected, requires complete intern profile):
- Auto-shows the applicant's profile summary (read-only).
- Cover note textarea (max 1500 chars, optional).
- Custom answers (one input per `internship.customQuestions`).
- [Submit] → server action `applyToInternshipAction(internshipId, formData)`:
  - Validates inputs.
  - Checks no existing application from this applicant for this internship (one-shot per intern per internship; explicit error otherwise).
  - Inserts `applications` row with status='new'.
  - Emits `application.created` event.
  - Redirects to `/intern/applications/[id]`.

### M4. Intern application tracker

`/intern/applications`:
- List of intern's applications. Each row: internship title + company, applied date, status pill, [Open] button.
- Filter chips: status.

`/intern/applications/[applicationId]`:
- Status timeline (visual: New → Reviewed → Shortlisted → Interview → Accepted).
- Submitted answers (read-only).
- Submitted cover note.
- "Withdraw application" button (optional, sets status='rejected' with reason='withdrawn' in metadata — defer to Sprint 5 if tight on time).

### M5. Intern dashboard rewrite

`/intern/dashboard`:
- Real surface (replaces the Sprint 1 placeholder).
- 3 sections:
  - "My active workspaces" (1 card per workspace, links to /intern/workspaces/[id])
  - "My applications" (top 5 most recent, link to /intern/applications)
  - "Recommended internships" (3 cards based on intern.roles match)

---

## Component 3 — Admin first workflow

### A1. Verification queue

`/admin/verifications`:
- List of organizations where `verificationStatus IN ('draft', 'pending')`.
- Sortable by created_at.
- Per-row: org name + logo + city + owner email + RNE link if uploaded + [Open] button.
- Filter: status chip.

### A2. Verification detail

`/admin/verifications/[orgId]`:
- Full org profile.
- Owner user card.
- RNE document preview (PDF iframe if PDF, img if image).
- Actions:
  - [Mark verified] → `verificationStatus = 'verified'`. Internships from this org become marketplace-visible.
  - [Request changes] → `verificationStatus = 'pending'` with admin note. (Stretch; defer if tight.)
  - [Suspend] → `verificationStatus = 'suspended'`. Internships hidden from marketplace.
- Every transition emits `organization.verification.changed`.

### A3. Admin dashboard rewrite

`/admin/dashboard`:
- 3 stat tiles:
  - "Verifications pending" (count of draft+pending organizations) → link to /admin/verifications
  - "Companies verified" (count, last 30d delta)
  - "Active workspaces" (count, last 30d delta)
- "Recent organizations" table (last 10).

### A4. Internships marketplace gate

Add a query helper in `modules/internships/queries.ts`:
```ts
listPublishedInternships() // already filters by verificationStatus = 'verified'
```
Make this a hard rule. Unverified orgs see their own published internships in their dashboard but they do NOT appear in /marketplace.

---

## Data model additions

```ts
// db/schema/tasks.ts — add
tag: text('tag'),

// db/schema/applications.ts — already has internalNotes, customAnswers; no changes
// db/schema/organizations.ts — verificationStatus already exists
// db/schema/internships.ts — projectId already exists; no changes

// db/schema/events.ts — add new event types via modules/events/types.ts:
'project.created'             // already exists
'project.status.changed'      // already exists
'internship.created'
'internship.published'
'internship.closed'
'application.created'
'application.status.changed'
'application.accepted'        // emitted alongside status.changed for analytics convenience
'organization.verification.changed'
```

Migration: one `pnpm db:generate` after schema edits, then `pnpm db:push` to apply.

---

## i18n additions

`locales/{fr,en}.json` extends with:
- `marketplace.*` — filters, card labels, empty states
- `internship.detail.*` — apply CTA, sections
- `apply.*` — form labels, errors
- `applications.*` — tracker labels, status names
- `company.projects.*` — create + post internship form
- `company.applications.*` — inbox, candidate detail, comparison
- `admin.verifications.*` — queue, detail, action buttons
- `workspace.*` — F9 above (Sprint 2 strings move into i18n)
- `status.application.*` — pipeline state labels
- `status.org.*` — verification state labels

All new UI in French (default) and English at write time. The wizard already showed this is cheap to do upfront.

---

## Notifications policy (Sprint 3 scope)

Sprint 6 owns full email + WhatsApp. For Sprint 3 we add `event` rows for everything that *would* trigger a notification:
- `application.created` → company notification queue (no email sent)
- `application.status.changed` → applicant notification queue
- `organization.verification.changed` → company notification queue
- `workspace.created` → both sides

Recording the events now means Sprint 6 just adds the email-sender, not the data model.

---

## Verification checklist (manual, before declaring Sprint 3 complete)

Per actor:

**Intern**
- [ ] Browses `/marketplace` (signed out)
- [ ] Opens internship detail (signed out)
- [ ] Clicks Apply → bounces to sign-up
- [ ] Signs up, completes profile
- [ ] Returns to internship via the bounce-back, sees Apply form
- [ ] Submits application with cover note + custom answers
- [ ] Lands on `/intern/applications/[id]`
- [ ] Sees status timeline at "New"
- [ ] After supervisor accepts: status updates, workspace link appears, opens workspace

**Company**
- [ ] Signs up, completes org profile (verification_status=draft)
- [ ] Cannot post internship (org banner shown until verified)
- [ ] After admin verifies: creates project (draft)
- [ ] Posts internship under project (draft → published, project → active)
- [ ] Internship appears in /marketplace
- [ ] Sees applications inbox grow as interns apply
- [ ] Opens candidate detail, adds internal note
- [ ] Compares 2 candidates side-by-side
- [ ] Transitions candidate to Shortlisted, then Accepted
- [ ] Workspace auto-created, opens supervisor view, sees the design-bundle UI rendering real data

**Admin (Sam)**
- [ ] Opens `/admin/verifications`, sees draft companies
- [ ] Opens detail, reviews RNE doc
- [ ] Marks verified → company's internships go marketplace-live
- [ ] Sees stat tiles update on dashboard
- [ ] Can still inspect any workspace as admin (existing feature)

**Critical fixes**
- [ ] Upload route returns 403 for wrong role (e.g. intern uploading `kind=logo`)
- [ ] Profile/company server actions reject blob URLs from wrong host
- [ ] Supervisor sees only projects they're in `supervisorIds` of (test with 2 supervisors in 1 org)
- [ ] Webhook returns 200 on duplicate user.created event
- [ ] `getWorkspaceOverview` round-trip count is ≤4 (vs 8 today)
- [ ] All workspace screens render in FR and EN
- [ ] Activity feed shows correct actor names (not hardcoded)

**Build + tests**
- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test` — adds ~30 new unit tests (validators, state machines, authz)
- [ ] `pnpm build` clean
- [ ] Production deploy succeeds; smoke test all 3 actor flows on https://inturn.vercel.app

---

## Open follow-ups (Sprint 4+)

- Project Hub UI (currently a placeholder in Sprint 3, full hub in Sprint 4)
- Marketplace advanced filters (sector, duration, location, skills, language) — Sprint 4
- Slug columns on internships + organizations (use IDs in URLs for Sprint 3; slug Sprint 4)
- Pagination + server-side cursor on marketplace (in-memory page 1 in Sprint 3)
- Withdraw application (Sprint 5)
- Multi-supervisor invitations (Sprint 5)
- Tasks board drag-to-status (Sprint 5)
- Deliverables versioning UI (Sprint 5)
- Email + WhatsApp delivery on the notification events recorded now (Sprint 6)
- Admin "Request changes" verification state (Sprint 5)
- Reusable per-org question library (Phase 2)
