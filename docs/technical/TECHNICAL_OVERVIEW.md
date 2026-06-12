# inturn — Technical Overview (as-built)

> **Audience:** developers (WMIG team + future contributors + AI sessions).
> **Scope:** the authoritative architectural snapshot of how the platform is
> built *right now*. This is the "how it works" reference; for the
> session-by-session narrative of what changed when, read
> [`HANDOFF.md`](../planning/HANDOFF.md). For the product/feature view, read
> [`PRODUCT_OVERVIEW.md`](../product/PRODUCT_OVERVIEW.md). For visual maps (ER + architecture
> diagrams), see [`DIAGRAMS.md`](./DIAGRAMS.md).
>
> **Generated:** 2026-05-31 against branch `feat/academic-deliverables`
> (the most advanced branch — superset of everything described below).
> Verified at write time: **482 tests pass / 2 skipped**, typecheck + lint + build clean.

---

## ⓪.5 — 2026-06-11 update (read this first; the body below predates it)

The body of this doc is the 2026-05-31 snapshot and is still accurate for the data model, auth,
module convention, and deploy pipeline. Three things landed since that a new developer must know;
they are additive and don't change anything described below.

**1. The marketing site is now the platform's public front door (in-repo).**
A new `(site)` route group — `app/[locale]/(site)/` — holds the home page plus `how-it-works`,
`for-companies`, `for-interns`, `for-universities`, `virtual-internships`, and `verify`. Its
components live in `components/landing/` (nav, hero, footer, marketing-effects, the section blocks,
and six SVG explainer diagrams under `components/landing/diagrams/`). It is fully localized
(`home.*` + `site.*` keys in `locales/{fr,en}.json`) and its CTAs link into the real product
(sign-up, marketplace) — the `verify` page routes a pasted record link straight to
`/records/[token]`. It was ported from a previously-standalone `inturn-web` app, which is now
**superseded** (kept only as a source archive, outside this repo). Public routes are allow-listed in
`lib/public-routes.ts` (extracted from `proxy.ts` and unit-tested).

**2. `app/landing.css` — scoped marketing styles.** The site uses its own `.mk-*` class family and a
token set that **reuses platform token names** (`--ink`, `--brand`, `--radius`…) with *different
values*. To stop that clobbering the app, every rule is scoped under **`.mk-root`** (the wrapper in
`app/[locale]/(site)/layout.tsx`) and tokens are declared on `.mk-root`, never `:root`. Don't add
bare `html`/`body`/`a` rules to this file; keep the scope. (Reconciling these two token systems into
one is a documented future step — see `docs/superpowers/plans/2026-06-10-atelier-phase-1-tokens.md`.)

**3. The "Atelier" design layer.** The shadcn semantic tokens were rebound to the brand in
`app/globals.css`: `--primary` = **ink** (near-black, inverts in dark), `--ring` = brand violet,
`--input` = slate. The rule platform-wide is **violet only at value moments** (apply / publish /
accept / approve / submit-a-deliverable / match signals); everything else is ink. There's a `brand`
Button variant for those moments, one radius scale (4/6/8/12) and one elevation system
(`--elev-*` → `shadow-card*` utilities), a `.ui-rise`/`@starting-style` entrance, and mono
"eyebrow" section labels. The audit-driven correctness fixes that shipped alongside it (raw-body
Clerk webhook verification, `lib/after-response.ts` for serverless-safe notification dispatch,
SprintsSection state resync, kanban `useOptimistic`, local-time check-in default, branded localized
404) are in `lib/`, `modules/`, and the relevant route folders. Rationale of record:
`docs/superpowers/plans/2026-06-10-{audit-quick-wins,atelier-phase-1-tokens}.md`.

> **Current "three states" (supersedes §0 below):** `main` now carries everything — the University
> product, academic deliverables, project sprints, the audit fixes, the Atelier design layer, and
> the in-repo marketing site (the `fix/audit-quick-wins` → `feat/atelier-tokens` stack was
> fast-forward-merged in). `origin/main` is **behind** local `main` and **production runs an older
> commit** — deploy is still manual `vercel --prod`. Verified at this update:
> **635 tests pass / 2 skipped**, typecheck + lint + check:i18n + build all clean.

---

## 0. The single most important thing to understand first

There are **three different "current states"**, and confusing them causes real bugs:

| State | What it is | Contains |
|---|---|---|
| **Production** (`https://inturn.vercel.app`, commit `205ca4e`) | What real users see. Last manual `vercel --prod`. | Everything through "close-the-loop" + Phase-1 roadmap (Sentry, PostHog, CV parser, templates, FTE) + team management + design system. |
| **Local `main`** (~65 commits ahead of `origin/main`, **unpushed**) | Verified, merged, but not deployed. | Production **+ University product + University-at-Scale**. |
| **`feat/academic-deliverables`** (11 commits ahead of `main`, **unmerged**) | Built + verified, awaiting Sam's review. | Local `main` **+ typed academic deliverables (livrables)**. |

Check the live commit any time: `curl https://inturn.vercel.app/api/health` → `{commit, env}`.

**Deploy is manual and not git-triggered.** Pushing to `main` runs CI only. A human runs `vercel --prod` to ship. See [§12](#12-build-ci--deploy).

Other live worktrees (`git worktree list`): `../inturn-i18n` (`feat/i18n-exhaustive`, held), `../inturn-pulse` (`feat/pulse`, early brainstorm). The fix stack `fix/record-pdf-share` → `fix/i18n-sweep` → `fix/ux-polish` is **unmerged** and carries a live P0 fix — see [§14](#14-known-issues--sharp-edges).

---

## 1. Tech stack (exact versions)

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router, Turbopack) | `16.2.6` | **Not the Next.js you know** — read `node_modules/next/dist/docs/` before writing framework code (see `AGENTS.md`). |
| Runtime | React | `19.2.4` | RSC-first; `react-hooks/purity` lint is on. |
| Language | TypeScript strict | `^5` | |
| DB | Neon Postgres via `@neondatabase/serverless` | `^1.1.0` | **neon-http driver → no transactions.** |
| ORM | Drizzle | `^0.45.2` | Hand-rolled idempotent SQL migrations (not `drizzle-kit migrate`). |
| Auth | Clerk (`@clerk/nextjs`) | `^7.4.1` | Roles in JWT `publicMetadata`. |
| i18n | `next-intl` | `^4.12.0` | FR default (no prefix), EN at `/en`. |
| UI | Tailwind CSS v4 + shadcn (`base-nova`) + Lucide | `tailwind ^4`, `shadcn ^4.8` | `base-nova` registry has **no `asChild`** — wrap manually. |
| Forms | react-hook-form + zod | `^7.76`, `^4.4.3` | Same zod schemas validate AI assist output. |
| Files | Vercel Blob (`@vercel/blob`) | `^2.4.0` | MIME + magic-byte allowlist. |
| Email | Resend | `^6.12.4` | Test-mode short-circuit; FR/EN templates. |
| PDF | `@react-pdf/renderer` | `^4.5.1` | Records + (intern) academic report uploads. |
| AI | `@anthropic-ai/sdk` | `^0.98.0` | Claude Sonnet; all features degrade gracefully if key absent. |
| Drag/drop | `@dnd-kit/*` | core `^6.3` | Tasks board (touch + keyboard a11y). |
| Observability | `@sentry/nextjs` + `posthog-js`/`posthog-node` | `^10.54`, `^1.376`/`^5.35` | Both env-gated → no-op without DSN/key. |
| Tests | Vitest + Testing Library + jsdom | `^4.1.7` | 482 pass / 2 opt-in integration skipped. |
| Hosting | Vercel | — | Manual prod deploys. |
| Tooling | Node `24` (`.nvmrc`), pnpm `10.33.2` | — | |

---

## 2. Repo layout

> ⚠️ **The git repo is the nested `inturn/` dir** (`/Users/mac/code/inturn-hub/inturn`), **not** the parent `inturn-hub/`. Run all `pnpm` commands from `inturn/`.

```
inturn/
├── app/[locale]/              # all routes live under a [locale] segment
│   ├── (auth)/                # sign-in/up, dev/login, role-selection, onboarding
│   ├── (marketing)/           # public: marketplace, internship detail+apply, legal
│   ├── (platform)/            # protected: intern/ company/ admin/ university/ account/
│   ├── records/[token]/       # public record share (token = credential)
│   ├── deliverables/[token]/  # public deliverable share
│   ├── invite/[token]/        # team/student invite accept
│   └── page.tsx               # landing
├── app/api/                   # route handlers (webhooks, AI, uploads, health, export)
├── modules/                   # domain logic — the heart of the app (see §8)
├── components/                # shared UI primitives + feature components
├── db/
│   ├── schema/                # one Drizzle table per file (22 tables)
│   ├── migrations/            # 0000–0020 hand-rolled idempotent SQL
│   └── index.ts               # neon-http drizzle client (retry + 10s timeout)
├── lib/                       # cross-cutting utils (auth shim, ratelimit, email, match…)
├── i18n/                      # next-intl routing + request config
├── locales/{fr,en}.json       # message catalogs (~1630 lines each)
├── scripts/                   # migrate, seed, link-clerk-users, enrich/check-data
├── proxy.ts                   # middleware (Clerk + next-intl) — replaces middleware.ts
├── instrumentation*.ts        # Sentry server + client init
└── docs/                      # README (index) · technical/ · product/ · planning/ · archive/ · superpowers/ · design-bundle/
```

`README.md` (repo root) is **stale create-next-app boilerplate** — ignore it; the real entry points are `docs/README.md` (the index), this file, and `planning/HANDOFF.md`.

---

## 3. Architecture principles (non-negotiable, from the brief)

1. **Modular monolith.** One Next.js app organized by domain under `modules/`. Each module owns its `types.ts`, `queries.ts` (SQL boundary), `service.ts` (business logic), `server-actions.ts`, and components. No microservices.
2. **Data-first / event-sourced signal.** Every consequential action writes a row to `events`. This append-only log is the performance moat and the recovery story (since there are no DB transactions).
3. **Human-in-the-loop.** AI drafts; humans commit. Nothing auto-accepts/rejects; no score ships without an explanation.
4. **Role-aware UI, single data model.** Interns and companies see the *same* rows framed differently — not separate apps.
5. **Deny-by-default authz.** Access is explicitly granted (e.g. workspace requires membership in `project.supervisorIds`), never inferred.
6. **FR + EN from day one**, enforced increasingly by lint (see [§10.7](#107-i18n)).

---

## 4. Request flow & middleware (`proxy.ts`)

Next 16 uses `proxy.ts` (not `middleware.ts`). It composes Clerk auth with next-intl locale routing:

- **Public routes** (`isPublicRoute` matcher): `/`, sign-in/up, `/dev/login`, `/marketplace`, internship detail (`/internships/[slug]`), the token-credentialed share pages (`/records/[token]`, `/deliverables/[token]`), `/api/webhooks/*`, `/api/health`. Everything else calls `auth.protect()`.
- **Locale routing:** French has **no URL prefix**; English is `/en/...`. For server-side redirects use `redirect` from `next/navigation` (plain string), **not** the i18n `redirect` (which wants `{href, locale}`).
- **`DEV_AUTH_BYPASS=1`** swaps in an **i18n-only proxy** that never mounts `clerkMiddleware` at all — because Clerk does a JWKS handshake the instant it sees a cookie, which hangs ~10s on networks that block `api.clerk.com`. This flag **must never be `1` in production**.

---

## 5. Auth & authorization

> 🗺️ **Visual:** the two role axes, session/guard flow, the workspace-authz decision tree, and the
> university firewall are diagrammed in [DIAGRAMS.md §4](./DIAGRAMS.md#4-auth--the-university-firewall);
> the accept→workspace, coordinator-snapshot, and AI human-in-the-loop call sequences are in
> [DIAGRAMS.md §5](./DIAGRAMS.md#5-sequence-flows).

### 5.1 Identity (Clerk)
- Clerk owns sign-in/up. On webhook (`/api/webhooks/clerk`, svix-verified) users are synced into the `users` table.
- **Global role** lives in Clerk JWT `publicMetadata` and the `users.role` column. `roleFromClerkUser()` reconciles.

### 5.2 Global roles
`modules/auth/types.ts`:
```ts
ROLES = ['intern', 'company', 'admin', 'university']   // global role
SELECTABLE_ROLES = ['intern', 'company']               // user can self-pick only these
```
`admin` and `university` are assigned, not self-selected.

### 5.3 Session + guards (`modules/auth/session.ts`)
`getSession()` is wrapped in **`React.cache`** — reads role from JWT claims (no Clerk REST roundtrip), DB fallback. One DB hit, deduped across the render tree. Guards:

| Guard | Enforces |
|---|---|
| `requireSession()` | logged in |
| `requireActiveSession()` | logged in **and not suspended** (`users.suspendedAt`) — blocks all writes for suspended users |
| `requireAdmin()` | global `admin` |
| `requireUniversityRole()` | global `university` |
| `getViewerOrganizations(userId)` | (cached) orgs the user belongs to |

### 5.4 Organization membership (multi-seat)
`organization_members` decouples org access from a single owner:
```ts
role:   ['owner', 'admin', 'supervisor', 'student']
status: ['invited', 'active', 'removed']
```
- For **companies** (`organizations.kind='company'`): `owner` / `admin` / `supervisor`. Pending invites are rows with `status='invited'` + an `inviteToken`.
- For **universities** (`kind='university'`): the coordinator team — **head = `owner`, encadrant = `admin`** (no new role was added), and supervised students are `role='student'` rows. `assignedCoordinatorId` links a student to their encadrant.
- Current-org resolution and company-team authz go through membership, not `owner_id`. A cross-tenant IDOR (addressing members across orgs) was explicitly closed; the owner can't be removed.

### 5.5 Workspace authz
Deny-by-default. A company user can view a workspace only if they're in the project's `supervisorIds` (GIN-indexed `@>` lookup). The org-owner fallback was removed in Sprint 3. Helpers: `modules/workspace/access.ts` (`loadWorkspaceAccess`), `modules/workspace/service.ts` (`canViewWorkspace`).

### 5.6 The University firewall (crown-jewel design)
The hardest privacy guarantee in the product: **a university coordinator can see a student's internship *phase* but never the company workspace.**

- `getStudentInternshipSnapshot()` (`modules/university/queries.ts:40`) returns only: company name + internship title + a time-derived **"Phase n of m"**. It never touches workspace tables and never calls `canViewWorkspace`.
- `canCoordinatorViewStudent()` (`modules/university/queries.ts:235`) is a pure gate: an encadrant sees only their **assigned** students; the head sees all.
- `academic_report_comments` carries **no `workspaceId`** — the academic review thread is structurally isolated from the company comment thread.

When adding any university read path, route it through the snapshot. Never widen it to workspace data.

---

## 6. Data model (22 tables)

One Drizzle table per file in `db/schema/`, re-exported from `db/schema/index.ts`. Grouped by domain below; for the visual entity-relationship diagram see [`DIAGRAMS.md §1`](./DIAGRAMS.md#1-data-model-er--22-tables).

**Identity & org**
- `users` — Clerk-synced; `role`, `suspendedAt`, prefs (`themePref`, `localePref`, `notifyEmail`, `notifyInApp`).
- `profiles` — intern/company profile detail.
- `organizations` — `kind: ['company','university']`, `verificationStatus: ['draft','pending','verified','suspended']`, `size`.
- `organization_members` — multi-seat + university supervision (see §5.4).

**Hiring funnel**
- `internships` — listings; FTS `search_vector` (tsvector + GIN); `customQuestions` jsonb.
- `internship_bookmarks` — composite PK `(intern_id, internship_id)`.
- `applications` — status pipeline; `UNIQUE(internship_id, applicant_id)`; `decisionNote`.
- `projects` — company projects; `goals`, `phases`, `supervisorIds` (GIN).

**The workspace (work happens here)**
- `workspaces` — created on accept; `startDate`/`endDate` drive the phase clock.
- `tasks` — board; `(workspace_id, status)` + `(workspace_id, "order")` indexes.
- `deliverables` — versioned; `revisionHistory` jsonb; `shareToken` (public share).
- `comments` — workspace thread; cursor-paginated.
- `workspace_notes` — author-private notes.
- `events` — **append-only signal log** (the moat); `(target_id, created_at DESC)` index.

**Records (the credential)**
- `internship_records` — end-of-internship PDF; `snapshot` jsonb; 32-char `shareToken`; soft revoke.

**University / academic supervision**
- `academic_reports` — student **livrables**; `kind: ['rapport','presentation','diagram','other']` (default `rapport`); own version chain + status via the shared review state-machine. (Generalized in place from a single rapport — see [§7 / academic-deliverables spec](../superpowers/specs/2026-05-31-academic-deliverables-design.md).)
- `academic_report_comments` — per-report thread, **no `workspaceId`** (firewall).

**Engagement, trust, ops**
- `notifications` — in-app bell + dispatch source.
- `community_posts` / `community_comments` — intern feed.
- `reports` — moderation reports queue.
- `audit_logs` — append-only admin audit trail.

### 6.1 Migrations
21 files, `0000_*`→`0020_*`, **hand-rolled idempotent SQL** (`ADD COLUMN IF NOT EXISTS`, etc.) run by `scripts/migrate.ts` — **not** `drizzle-kit migrate`. Notable ones:

| Migration | Adds |
|---|---|
| `0001` | perf indexes (GIN on supervisors, events compound, btrees) |
| `0002` | applications UNIQUE + dedupe |
| `0003` | marketplace FTS (tsvector + trigger + GIN) |
| `0004` | bookmarks |
| `0007`/`0008`/`0009`/`0010`/`0011` | notifications / records / reports+audit / community / users.suspended |
| `0013`/`0014` | workspace notes + deliverable share token / user prefs |
| `0015`/`0016` | organization_members / application decision note |
| `0017` | **university foundation** (`organizations.kind`, member `student` role) |
| `0018` | `academic_report_comments` (isolated, no workspaceId) |
| `0019` | `organization_members.assigned_coordinator_id` (backfilled to org owner) |
| `0020` | `academic_reports.kind` (typed livrables) |

> **`db/migrations/meta/` (the Drizzle journal) is gitignored and NOT authoritative.** Prod was originally `db:push`'d before migrations were generated; the tracked SQL is idempotent so it's safe to run anywhere. See `db/migrations/README.md`.

### 6.2 DB driver constraints
- **No transactions** (neon-http). Sequential writes are best-effort; idempotency + the `events` log are the recovery story. Order writes so the critical one lands first (e.g. `acceptApplication` is workspace-first and crash-safe).
- `db/index.ts` wraps Neon's fetch with a retry + **10s per-attempt timeout** so a stale dev connection fails fast instead of hanging ~54s.

---

## 7. Module map (`modules/`, 27 domains)

For the layered architecture diagram + the canonical "anatomy of a module" see [`DIAGRAMS.md §2–3`](./DIAGRAMS.md#2-architecture-layered).

| Module | Responsibility |
|---|---|
| `auth` | session (React.cache), role types, guards |
| `profiles` | intern/company profile queries |
| `onboarding` | wizard step machine + resume |
| `internships` | marketplace queries (`unstable_cache` tagged `MARKETPLACE_TAG`), FTS, facet counts |
| `marketplace` | discovery surface helpers |
| `bookmarks` | save/unsave |
| `applications` | status state-machine + queries + actions + close-the-loop timeline |
| `projects` | projects, goals/phases, supervisor scoping |
| `workspace` | the core: `page-data.ts` (shell/data split for streaming), `access.ts`, `queries.ts`, `service.ts`, all workspace components, `workspace.css` |
| `tasks` | board + add-task (AI clarity assist) |
| `deliverables` | versioned deliverables + `state-machine.ts` + share links |
| `comments` | cursor-paginated workspace thread |
| `checkins` | weekly check-in + Claude-drafted starter |
| `events` | append-only event log + types |
| `notes` | author-private workspace notes |
| `records` | end-of-internship PDF + share token |
| `notifications` | dispatcher (`dispatchNotificationsFor`) + bell + per-user prefs |
| `community` | intern feed: posts/comments/report/delete |
| `reports` | moderation queue |
| `audit` | audit log + CSV export |
| `admin` | verification, users, dashboard, moderation |
| `team` | multi-seat invites/accept/remove/role-change, supervisor management |
| `university` | provisioning, firewalled snapshot, coordinator structure, CSV bulk invite, pending-invite mgmt |
| `academic-reports` | student livrables lifecycle + per-report comments |
| `review` | **shared review state-machine** (extracted; used by deliverables + academic reports) |
| `ai` | Claude features (see §10.1) |
| `account` | settings, GDPR export/delete |

---

## 8. Routes

**54 page routes** + **12 API routes** (all pages under `app/[locale]/`). Highlights:

**Public (marketing/auth):** `/` landing · `/marketplace` · `/internships/[slug]` (+ `/apply`) · `/terms` `/privacy` `/cookies` · sign-in/up · `/dev/login` · `/role-selection` · onboarding wizard · `/records/[token]` · `/deliverables/[token]` · `/invite/[token]`.

**Intern (`/intern/*`):** `dashboard` · `applications` (+ detail) · `saved` · `community` (+ post + new) · `records` · `university` (livrables) · `workspaces/[id]`.

**Company (`/company/*`):** `dashboard` · `projects` (+ new/edit/detail) · `projects/[id]/internships/new` (+ edit) · `projects/[id]/applications` (+ detail + `compare`) · `team` · `workspaces` (+ `[id]`).

**University (`/university/*`):** `dashboard` (roster) · `students/[id]` (per-student review surface).

**Admin (`/admin/*`):** `dashboard` · `verifications` (+ `[orgId]`) · `users` (+ `[userId]`) · `reports` (+ `[reportId]`) · `audit` · `universities`.

**API routes:** `webhooks/clerk` · `upload` · `health` · `auth/select-role` · `account/export` · `admin/seed` · `admin/audit/export` · `records/[recordId]/pdf` · `ai/{task-clarity,intern-unblocker,project-assist,cv-parse}`.

---

## 9. Page render strategy

- **Workspace shell/data split** (perf): `loadWorkspaceShell` (session + authz + sidebar + counts) renders synchronously; `loadWorkspaceData` (the heavy `getWorkspaceOverview`) streams in via `<Suspense>`. The shell is hoisted into a layout so tab navigation doesn't re-mount the sidebar.
- **Sidebar shell** on all platform routes (240px left rail; mobile = drawer). Marketing pages keep their own header.
- **Marketplace** is cached (`unstable_cache`, `MARKETPLACE_TAG`, 5-min) with read-your-own-writes via `updateTag()` after publish.

---

## 10. Subsystems

### 10.1 AI (`modules/ai/`)
Four prompt modules — `task-clarity`, `intern-unblocker`, `project-assist`, `cv-parser` — plus the check-in drafter in `modules/checkins`. All:
- use Claude Sonnet via the Anthropic SDK;
- are **rate-limited** (see §10.4);
- **validate output against the same zod schemas** the forms enforce;
- **degrade gracefully** if `ANTHROPIC_API_KEY` is absent (soft notice, input untouched, never block);
- are **human-in-the-loop** (draft → accept/edit, never auto-commit).

API surface: `/api/ai/{task-clarity,intern-unblocker,project-assist,cv-parse}`. CV parse uses Claude vision on an uploaded PDF.

### 10.2 Email (Resend, `lib/email.ts` + `lib/email/`)
Transactional templates in FR + EN, XSS-escaped, with a **test-mode short-circuit** (no send without a key). Per-recipient locale is driven by `users.localePref` via `getTranslations({locale})`.

### 10.3 Notifications
`dispatchNotificationsFor` fans out to in-app (`notifications` table → bell) + email, honoring per-user prefs. University rapport-submitted notifications are routed to the **assigned encadrant only** (no broadcast).

### 10.4 Rate limiting (`lib/ratelimit.ts`)
In-memory sliding-window (Upstash-shaped for a one-file swap). Nine buckets:

| Bucket | Limit | Key |
|---|---|---|
| `upload` | 20/min | user |
| `clerk-webhook` | 120/min | source IP |
| `ai-task-clarity` | 10/min | user |
| `ai-intern-unblocker` | 10/min | user |
| `ai-checkin-draft` | 5/hour | user |
| `ai-cv-parse` | 5/min | user (Claude vision = expensive) |
| `ai-project-assist` | 20/min | user |
| `team-invite` | 10/min | user |
| `university-bulk-invite` | 5/min | user (each up to 100 students) |

> ⚠️ In-memory = **per-instance**. Not shared across serverless instances; swap to Upstash before relying on it for hard security limits at scale.

### 10.5 Uploads (`/api/upload`, `lib/uploads/`)
Vercel Blob, role-gated. Per-kind **MIME + magic-byte allowlist** + size cap (cv/registry 8MB, logo 2MB, deliverable 25MB, report PDF). **SVG is dropped from logos** (stored-XSS bypass — Blob serves SVG `<script>` as `image/svg+xml`).

### 10.6 Records & PDF
`@react-pdf/renderer` renders end-of-internship records. Public access is via a 32-char `shareToken`. Soft revoke → `410 Gone`. ⚠️ See the P0 in [§14](#14-known-issues--sharp-edges).

### 10.7 i18n
`next-intl` 4; FR default (no prefix), EN `/en`. Catalogs `locales/{fr,en}.json` (~1630 lines each). An **exhaustive bilingual pass** is specced and in progress on `feat/i18n-exhaustive`, enforced by `eslint i18next/no-literal-string` so it can't regress — held until University work lands (see HANDOFF §B and the i18n spec).

### 10.8 Observability
Sentry (`instrumentation*.ts`, env-gated, PII-scrubbed) + PostHog (`lib/analytics.ts`). Both no-op without their env keys. `/api/health` does `SELECT 1` and returns `{status, commit, env, latencyMs}` (or 503 with a machine code, never leaking the DB error).

### 10.9 Search & caching
Marketplace FTS: `tsvector` `search_vector` + GIN + trigger, with an `ilike` substring fallback. Marketplace reads cached under `MARKETPLACE_TAG`; Next 16 `revalidateTag` needs a second arg, so server actions use `updateTag(tag)` for immediate RYOW.

---

## 11. Testing

- **Vitest** unit/component tests: **482 pass / 2 skipped** (58 files; verified 2026-05-31).
- **Integration tests** are opt-in (`pnpm test:integration`, gated on `DB_INTEGRATION=1`) — they self-clean against a real DB and are **not yet wired into CI** (needs an ephemeral Neon branch).
- Well-covered: state-machines (applications, deliverables, review), dispatcher pref logic, pure helpers (`match`, `format-time`, profile-completeness, CSV parse), authz gates, AI input/output shape.
- Thin: the `queries.ts` SQL boundary (mostly exercised via integration tests + manual browser verification, not unit tests).

**Verification ritual Sam expects:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, then **actually drive the running app** (real writes, not HTTP-200 smoke) before claiming a feature done.

---

## 12. Build, CI & deploy

- **CI** (`.github/workflows/ci.yml`): typecheck + lint + test + build on PRs/pushes. Node pinned via `.nvmrc` (24), pnpm via `packageManager`. (Branch protection + `*_CI` repo secrets are one-time manual UI tasks.)
- **`prebuild` runs `scripts/migrate.ts`** — applies tracked idempotent migrations against the DB before `next build`. Skips gracefully when `DATABASE_URL` is unset (CI lint jobs).
- **Deploy is manual:** the Vercel project is **not** connected to GitHub. A human runs **`vercel --prod`** from the linked CLI → builds in Vercel's cloud, the prebuild migrate applies to the **prod** DB, then aliases `https://inturn.vercel.app`. A failed build is non-destructive (prior Ready deploy stays live).
- **Env to keep in Vercel prod:** `DATABASE_URL`, `CLERK_*`, `CLERK_WEBHOOK_SECRET`, `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_BASE_URL` (sitemap/robots), Resend (`RESEND_API_KEY`, `EMAIL_FROM`), optional Sentry/PostHog keys. **Never set `DEV_AUTH_BYPASS` in prod.**

---

## 13. Local dev runbook

```bash
cd inturn
pnpm install
pnpm dev          # dev script sets --dns-result-order=ipv4first
# open http://localhost:3000/dev/login  (DEV_AUTH_BYPASS path)
```

**Seeded personas** (`/dev/login`): intern `sami.arif@thog.io` · company `dazzsemi@gmail.com` · admin `hellowemakeitgrow@gmail.com` · university coordinator `prof.saidi@enit.utm.tn`. `pnpm db:seed` is idempotent (also `POST /api/admin/seed`).

**Network quirk (by design, not a bug):** Sam's network blocks IPv6/Cloudflare → Neon + Clerk are unreachable normally. Mitigations are in code: `ipv4first` DNS, the Neon fetch timeout, and `DEV_AUTH_BYPASS`. A first page load after idle may take ~10s (cold-start retry) then stabilize. If a page 500s with `fetch failed`, it's almost certainly this — restart `pnpm dev`.

> **Migrate gotcha (cost a crash to find):** `prebuild`/`db:migrate` is `tsx scripts/migrate.ts` with **no `--env-file=.env.local`**, so a local `pnpm build` skips migrations (no `DATABASE_URL`) and the dev DB lags. Apply locally with `pnpm tsx --env-file=.env.local scripts/migrate.ts` (or `pnpm db:push`). On Vercel the env has `DATABASE_URL`, so it runs normally.

---

## 14. Known issues & sharp edges

**Live P0 in production (commit `205ca4e`):**
- **Public record-share PDF returns 401 to anonymous recipients.** `/api/records/[recordId]/pdf` still requires a session (`getSession()` → 401), so a logged-out person opening a shared record link can view the page but **can't download the PDF**. The fix (authorize via the record's `?token=`) is built on the **unmerged** `fix/record-pdf-share` branch and needs a rebase onto current `main` before it can ship. This is the highest-priority merge.

**Tech debt / sharp edges:**
- **No DB transactions** (neon-http) — see §6.2.
- **In-memory rate limiter is per-instance** — not robust across serverless instances (§10.4).
- **Integration tests not in CI** (opt-in/local only).
- **Drizzle journal drift** — `db/migrations/meta/` gitignored; migrations are hand-rolled (§6.1).
- **`README.md` is boilerplate** — not real docs.
- **Custom domain** `inturn-hub.com` not wired to Vercel.
- **Unmerged fix stack** (`fix/record-pdf-share` → `fix/i18n-sweep` → `fix/ux-polish`) off an older `main@061a8fc` needs rebasing; resolve `locales/{fr,en}.json` as a **union** of both sides.

---

## 15. Next.js 16 specifics (read before writing framework code)

- `AGENTS.md`: **"This is NOT the Next.js you know."** Check `node_modules/next/dist/docs/` for current APIs.
- Middleware is **`proxy.ts`**, not `middleware.ts`.
- Root layout lives at `app/[locale]/layout.tsx` (the old `app/layout.tsx` was deleted) so `<html lang>` is server-set.
- `revalidateTag` needs a second profile arg; use **`updateTag(tag)`** inside server actions for immediate RYOW.
- ESLint uses **flat config** (`defineConfig`), not `FlatCompat`; `eslint-config-prettier` is spread, not `compat.extends`.
- shadcn `base-nova` registry has **no `asChild`** — wrap manually.

---

## 16. Where to go next

- **Session narrative / what shipped when:** [`HANDOFF.md`](../planning/HANDOFF.md) *(note: not updated past the 2026-05-30 university Plan 1/2 snapshot — rely on `git log` + specs for University-at-Scale and Academic Deliverables).*
- **Visual maps (ER + architecture diagrams):** [`DIAGRAMS.md`](./DIAGRAMS.md)
- **Product/feature + backlog view:** [`PRODUCT_OVERVIEW.md`](../product/PRODUCT_OVERVIEW.md)
- **Roadmap (E1–E70):** [`DEV_ROADMAP.md`](../planning/DEV_ROADMAP.md)
- **Strategy:** [`PRODUCT_STRATEGY.md`](../product/PRODUCT_STRATEGY.md)
- **Design specs + implementation plans:** `docs/superpowers/{specs,plans}/`
- **Design system / mocks:** `docs/design-bundle/`
