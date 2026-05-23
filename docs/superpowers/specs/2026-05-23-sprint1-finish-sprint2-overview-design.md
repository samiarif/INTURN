# Sprint 1 finishing + Sprint 2 Overview — Design Spec

**Status:** Approved · 2026-05-23
**Owner:** Sam
**Design source:** Claude Design bundle, v0.4 (chats + `mocks/workspace.jsx` + `wireframes/wireframes.jsx` + `01-brand-foundations.html`, Direction B · Workshop locked)
**Project brief reference:** `docs/inturn-project-brief.md` (Sprints 1 + 2)

---

## Goal

Close out the unfinished Sprint 1 items (auth skin, profile creation, landing polish) and ship the Sprint 2 anchor screen (Workspace · Overview) in Workshop direction with pixel fidelity to the bundle's mocks. Workspace ships read-only for tasks/deliverables; full Tasks board, Deliverables versioning, Comments, Timeline, and Activity tab defer to Sprint 3 / a Sprint 2 stretch.

## Non-goals

- Tasks board (drag-to-status, kanban interactions)
- Deliverables versioning UI, file upload from inside workspace
- Comments thread, Timeline tab, full Activity tab
- Project Hub UI (schema in, screen out)
- Acceptance flow / workspace auto-creation from accepted application (Sprint 3 — replaced by admin endpoint + seed in Sprint 2)
- AI features (Sprint 6)
- GitHub Actions CI (separate quick follow-up)
- UploadThing (we use Vercel Blob; brief's UploadThing recommendation predates Vercel commit)

---

## Decisions locked

| Decision | Choice | Rationale |
|---|---|---|
| Design direction | B · Workshop | Locked in bundle's chat1. Token block in `01-brand-foundations.html#dir-b-tokens`. |
| Projects layer | Add now | Workspace mock's sidebar + breadcrumbs assume Project → Internship → Workspace. Migration is cheap pre-data. |
| File storage | Vercel Blob | Native to our platform, no extra account. Brief's UploadThing line predates Vercel commit. |
| Workspace routes | Two: `/intern/workspaces/[id]` and `/company/workspaces/[id]` | Matches existing `(intern)/` / `(company)/` route group pattern; simpler middleware. |
| Profile wizard | Server-side multi-step with DB-persisted drafts | Design notes "Save as draft is a real action" for company org form. Same pattern for intern. |
| Tasks/Deliverables in Overview | Read-only | Sprint 2 tight scope. Mock shows static cards; full interaction deferred. |
| Seeding | Idempotent `pnpm db:seed` script + admin-only `POST /api/admin/seed` endpoint | Lets us re-seed in prod without redeploy during demo-partner onboarding. |
| AI features | Schema lock now, UI Sprint 6 | Per bundle chat: data model is locked so AI layer doesn't require a migration later. Sprint 2 doesn't need any AI fields. |

---

## Architecture

### Brand tokens — `app/globals.css`

Paste the canonical block from `01-brand-foundations.html#dir-b-tokens` verbatim into a `:root { ... }` declaration. Add a `@theme inline` block that bridges to Tailwind v4 by referencing the variables (`--color-brand-500: var(--brand-500);`). shadcn/ui keeps its own `--background`, `--foreground`, `--border` variables alongside ours.

Load Geist + Geist Mono via `next/font/google` in `app/layout.tsx`. Apply both to `<body>` via CSS variables `--font-sans` and `--font-mono`.

### Schema migration — Projects layer

Add `db/schema/projects.ts`:

```ts
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  brief: text('brief'),
  status: text('status', { enum: ['draft', 'active', 'archived'] }).default('draft').notNull(),
  supervisorIds: jsonb('supervisor_ids').$type<string[]>().default([]),
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('projects_org_slug_idx').on(table.organizationId, table.slug),
]);
```

Add to `db/schema/internships.ts`:

```ts
projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
```

Nullable for now (no data exists). Sprint 3 makes it non-null when acceptance flow lands.

Modify `db/schema/profiles.ts` — existing fields cover `headline`, `bio`, `university`, `fieldOfStudy`, `graduationYear`, `skills`, `languages`, `location`, `phone`, `linkedinUrl`, `portfolioUrl`, `resumeUrl`. Add the missing pieces the Sprint 1 wireframes spec:

- `yearOfStudy text` — `"L1"|"L2"|"L3"|"M1"|"M2"|"Eng1"|"Eng2"|"Eng3"|...` (free text with helper enum on the form, keeps schema flexible for non-standard programs)
- `city text` — distinct from `location` (broader). Keep `location` as fallback / future country field.
- `roles jsonb` — `string[]` of up to 3 from the 9 fixed categories (Design, Product, Engineering, Marketing, Data, Operations, Content, Finance, Sales)
- `portfolioLinks jsonb` — `Array<{ platform: string; url: string }>`. Replaces the single `portfolioUrl` going forward; keep `portfolioUrl` column for now to avoid data loss, migrate later.
- `preferredLanguage text` — `'fr'|'en'`. Distinct from `languages` (spoken languages, deferred to Sprint 5+).
- `profileStep text` — `'none'|'basics-done'|'complete'`. Drives wizard routing.
- `firstName`, `lastName` already on `users` table — no change needed.

Confirm `db/schema/organizations.ts` covers company onboarding fields (`name`, `slug`, `industry`, `size`, `description`, `website`, `location`, `logoUrl`, `verified`). Sprint 1 wireframes also want `country` and `city` separately, plus `rneUrl` for the registry document. Add those two fields.

Run `pnpm db:generate` to produce a migration, then `pnpm db:push` for dev. The generated SQL goes in `db/migrations/`.

### Module structure

```
modules/
├── auth/                  ← existing
├── profiles/
│   ├── service.ts         ← createOrUpdateBasics, createOrUpdateSkills, getProfileWithCompletion
│   ├── queries.ts
│   ├── validators.ts      ← Zod-ish hand-rolled validators (3–8 skills, 3 roles, 280 char desc)
│   ├── universities.ts    ← static seed list of 300+ Tunisian institutions
│   ├── server-actions.ts  ← saveProfileBasics, saveProfileSkills, uploadCv
│   └── __tests__/
├── projects/
│   ├── service.ts         ← createDraftProject, transitionToActive, archive
│   ├── queries.ts
│   └── __tests__/
├── workspace/
│   ├── service.ts         ← createWorkspace(applicationId), updateStatus
│   ├── queries.ts         ← getWorkspaceOverview(workspaceId, role)
│   ├── components/
│   │   ├── topbar.tsx
│   │   ├── sidebar.tsx
│   │   ├── tab-bar.tsx
│   │   ├── brief-card.tsx
│   │   ├── stat-tiles.tsx
│   │   ├── task-list.tsx
│   │   ├── deliverables-mini.tsx
│   │   ├── activity-feed.tsx
│   │   ├── rail-intern.tsx
│   │   ├── rail-supervisor.tsx
│   │   └── stuck-pill.tsx
│   └── __tests__/
└── events/                ← existing
```

Shared shadcn primitives live in `components/ui/`. shadcn additions needed for Sprint 1: `Button`, `Input`, `Label`, `Select`, `Combobox` (custom on top of `Popover` + `Command`), `Form` (react-hook-form + zod), `Avatar`, `Separator`.

### Routes

```
app/[locale]/
├── (auth)/                        ← existing
│   ├── sign-in/                   ← existing
│   ├── sign-up/                   ← skin Clerk component, add gradient star + role chip
│   ├── role-selection/            ← existing
│   └── onboarding/
│       ├── intern/
│       │   ├── basics/page.tsx    ← Profile wizard step 1
│       │   ├── skills/page.tsx    ← Profile wizard step 2
│       │   └── done/page.tsx
│       └── company/
│           └── page.tsx           ← Org profile (single step)
├── (platform)/                    ← existing
│   ├── intern/
│   │   ├── dashboard/             ← existing placeholder
│   │   └── workspaces/
│   │       └── [workspaceId]/page.tsx     ← intern workspace overview
│   ├── company/
│   │   ├── dashboard/             ← existing placeholder
│   │   └── workspaces/
│   │       └── [workspaceId]/page.tsx     ← supervisor workspace overview
│   └── admin/
│       ├── dashboard/             ← existing placeholder
│       └── seed/                  ← admin-only re-seed UI button (calls POST /api/admin/seed)
└── page.tsx                       ← landing (apply polish notes inline)

app/api/
├── webhooks/clerk/route.ts        ← existing
├── auth/select-role/route.ts      ← existing
├── admin/seed/route.ts            ← new
└── upload/route.ts                ← Vercel Blob upload action endpoint
```

### Data flow — Workspace Overview

```
GET /<locale>/intern/workspaces/[id]
  ↓ Clerk middleware → authed intern
  ↓ Server component
  ↓ const role = await getRole(userId)         (from publicMetadata)
  ↓ if role !== 'intern' → 403
  ↓ const data = await getWorkspaceOverview(id, userId, role)
  ↓     ├─ workspace + project + internship + organization
  ↓     ├─ intern user, supervisor user
  ↓     ├─ tasks (read-only summary: 6 most recent)
  ↓     ├─ deliverables (5 — title, version, status, due)
  ↓     └─ events (last 5 of types: task.moved, deliv.submitted, comment.added, system.checkin, stuck)
  ↓ <WorkspaceOverview data={data} role="intern" />
```

`getWorkspaceOverview` does a single query with `with: { ... }` (Drizzle relations) plus a separate events query. Authz checked at boundary: intern can only see their own workspace; supervisor must be in `project.supervisorIds`.

### Role-aware rendering

`WorkspaceOverview` takes `data` (typed result of `getWorkspaceOverview`) and `role` (`'intern'|'supervisor'`). It composes:

- `<TopBar />` — branches breadcrumb format on role
- `<Sidebar role={role} data={sidebarData}>` — completely different content per role (intern: My workspaces, Marketplace, Saved, Feed, My record; supervisor: Inbox, Listings, Team, Active projects tree, Candidates, Records issued)
- `<MHead role={role} workspace={data.workspace} />` — branches title, CTAs, tab counts
- Main column: `<BriefCard />`, `<StatTiles />`, `<TaskList />`, `<DeliverablesMini />`, `<ActivityFeed />` — small inline forks for label/copy differences
- Right rail: `{role === 'intern' ? <RailIntern /> : <RailSupervisor />}` — completely different components
- `{role === 'intern' && <StuckPill />}` — intern-only floating button

### Profile wizard data flow

Forms submit via Next 16 **Server Actions** (not API route handlers — server actions are idiomatic for forms in App Router and remove the need for client fetch + JSON wiring). File upload goes through a route handler because the multipart contract is simpler over HTTP.

```
saveProfileBasics(formData)        ← 'use server' action in modules/profiles/server-actions.ts
  args: { firstName, lastName, university, yearOfStudy, fieldOfStudy, city, preferredLanguage }
  → auth() → userId
  → validate
  → upsert profiles row, set profile_step = 'basics-done'
  → redirect('/onboarding/intern/skills')

saveProfileSkills(formData)
  args: { skills[], roles[], cvUrl?, portfolioLinks[] }
  → validate (3-8 skills, 1-3 roles, valid URLs)
  → upsert profiles row, set profile_step = 'complete'
  → redirect('/intern/dashboard')

saveCompanyProfile(formData)       ← also a server action
  args: org fields + optional rneUrl
  → upsert organizations row tied to userId
  → redirect('/company/dashboard')

POST /api/upload (multipart)        ← route handler, accepts query param `?kind=cv|logo|deliverable|registry`
  → auth() → userId
  → @vercel/blob put(`${kind}/${userId}/${randomName}`, file, { access: 'public' })
  → return { url, fileName, contentType, size }
```

Server actions use Clerk's `auth()` for `userId`. Validation lives in `modules/profiles/validators.ts` and runs both server-side (authoritative) and inline on the client for UX (optimistic field errors before submit).

### File upload — Vercel Blob

Single `POST /api/upload` accepts multipart form data and a `kind` query param (`'cv' | 'logo' | 'deliverable' | 'registry'`). Server action validates kind → calls `put(<kind>/<userId>/<filename>, blob, { access: 'public', addRandomSuffix: true })` → returns the URL.

All public-read in Sprint 1–2 (CV URL is in profile; logo is on org card; registry is admin-only and lives in Sam's queue). Signed/private URLs in Sprint 3 when application docs become sensitive.

Defer image optimization and resizing.

### Seeding

`scripts/seed.ts`:

1. Create demo users with synthetic clerk IDs (`seed_yasmine`, `seed_mehdi`) — these don't correspond to real Clerk accounts; they exist purely as `users` rows to satisfy FK constraints in the demo
2. Create Acme Studio organization, owned by demo Mehdi
3. Create "Brand audit & system refresh" project, active, supervisor=Mehdi
4. Create "Visual designer · Brand audit" internship under the project, status=published
5. Create Yasmine's accepted application
6. Create workspace: internId=demo Yasmine, organizationId=Acme, active, week 3 of 12
7. Create 6 tasks matching mock data (BA-001…BA-007 with BA-004 reserved)
8. Create 5 deliverables (one in review with v2)
9. Create ~10 events (task moves, comment, deliv submitted, weekly check-in scheduled)
10. Print the workspace IDs and URLs to console

Idempotent: re-running upserts by `clerk_id` / `(org_id, slug)` / synthetic external keys.

**How Sam views the demo:** he logs in with his real Clerk account (admin role). The workspace overview pages bypass the ownership check when `role === 'admin'`, so Sam can open `/intern/workspaces/<seed-id>` or `/company/workspaces/<seed-id>` and see what an intern or supervisor would see. This admin-bypass is intentional: same code path everyone else uses, but admins can inspect any workspace for support/debug.

`POST /api/admin/seed`: route handler that imports and runs the same seed function. Gated to `role === 'admin'` via Clerk publicMetadata. Returns the workspace IDs in JSON.

### Landing polish

Surgical edits to existing `app/[locale]/page.tsx` (or wherever the landing lives — confirm path during implementation):

1. Hero CTAs: replace with "Browse internships" (primary) + "I'm hiring →" (ghost)
2. Top nav: "Browse internships · For companies · Pricing · Log in · Sign up"
3. FR/EN switch → segmented control (component reused in onboarding)
4. Footer: add "Tunisia 🇹🇳" placement indicator + "For universities" placeholder link
5. Sign-up handoff: gradient star + violet primary on both landing and signup screen for visual bridge

No re-skin. Do NOT touch: gradient star illustration, three-pillar section, comparison table, SDG section, Sami's quote, FAQ, brand colors, serif type system.

---

## Dependencies to install

```
pnpm add zod react-hook-form @hookform/resolvers @vercel/blob
pnpm dlx shadcn@latest add button input label select form separator avatar popover command textarea
```

`zod` + `react-hook-form` + `@hookform/resolvers` are required by shadcn `Form` and used for validation in `modules/profiles/validators.ts`. `@vercel/blob` for file upload. Brief rule: "Don't add packages without explaining the alternative we're choosing against" — alternatives considered: hand-rolled validators (more boilerplate, no schema reuse), formdata-only without RHF (worse field-level error UX), UploadThing instead of Blob (extra account, brief-recommended but Vercel-native won).

## Components — Sprint 1

Custom components in `components/` (shared across the app):
- `language-switch.tsx` — FR/EN segmented control
- `wizard-steps.tsx` — step indicator used in intern + company onboarding
- `combobox.tsx` — university picker built on shadcn `Popover` + `Command`
- `chip-input.tsx` — skill chip input (3-8 cap)
- `role-chip-grid.tsx` — 9 fixed role chips (max 3 selected)
- `link-repeater.tsx` — portfolio link rows (platform select + URL + remove)
- `file-drop.tsx` — drag-or-click file input (CV, logo, registry)

## Components — Sprint 2

All under `modules/workspace/components/`. List in module structure section above.

Brand pieces in `components/brand/`:
- `gradient-star.tsx` — the 22px gradient square used in topbar and signup

## Testing

- **Vitest unit tests:**
  - `modules/profiles/validators.test.ts` — 3-8 skills cap, 1-3 roles cap, URL validation, 280 char description, RNE optional, required fields per step
  - `modules/profiles/service.test.ts` — upsert behavior on partial submit (drafts)
  - `modules/projects/service.test.ts` — state transitions (draft → active → archived), uniqueness on `(orgId, slug)`
  - `modules/workspace/service.test.ts` — createWorkspace from application happy path + authz failures
  - `modules/workspace/queries.test.ts` — getWorkspaceOverview returns expected shape for both roles
- **No Playwright / e2e in Sprint 2.** Visual fidelity is verified manually against the bundle mocks.

## Verification checklist (manual)

Before declaring Sprint 2 complete:

- [ ] Landing page: 5 polish changes applied, all "do not change" items untouched, FR + EN parity
- [ ] Signup: Clerk-driven, gradient star in header, role chip pre-fillable from `?role=` query param, magic link primary, Google OAuth, password fallback link
- [ ] Intern onboarding: 2-step wizard (Basics → Skills+CV), persists between sessions, completion gate enforces 3 skills + 1 role + university + year
- [ ] Company onboarding: single-step org form, save-as-draft works across logout, RNE optional with banner
- [ ] CV upload (Vercel Blob): file uploads successfully, URL persisted in profile, FR + EN labels
- [ ] Workspace Overview intern view: matches `mocks/workspace.jsx` (intern artboard) side-by-side — top bar, sidebar (no project tree), brief card, 4 stat tiles, task list (read-only), deliverables mini, activity feed, intern rail (CTA + quick list + record), floating I'm-stuck pill
- [ ] Workspace Overview supervisor view: matches the supervisor artboard — top bar with supervisor breadcrumb, sidebar with Project tree (Brand audit expanded, Yasmine + Lina children, Project hub link, Q3 draft), supervisor rail (perf signal card with sparkline, sync CTA, this week, quiet flag note)
- [ ] `pnpm db:seed` produces working demo data; opening `/company/workspaces/<id>` as Mehdi renders the supervisor view; opening `/intern/workspaces/<id>` as Yasmine renders the intern view
- [ ] All Sprint 1 + Sprint 2 paths work in FR (default) and EN
- [ ] `pnpm typecheck && pnpm lint && pnpm test` clean
- [ ] No regressions in already-shipped routes

## Open follow-ups (next sprints)

- Acceptance flow (Sprint 3) → replaces the admin-seed manual workspace creation
- Project Hub UI (Sprint 3) → schema is ready
- Tasks board with drag-to-status (Sprint 2 stretch or Sprint 3)
- Deliverables versioning UI (Sprint 2 stretch or Sprint 3)
- Comments, Timeline, full Activity tab
- AI flow (Sprint 6)
- 30-day auto-archive cron for draft projects (Sprint 6)
- GitHub Actions CI (immediate follow-up, separate PR)
