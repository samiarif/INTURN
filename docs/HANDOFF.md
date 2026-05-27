# inturn — Session Handoff (2026-05-27, Sprint D + Legal + GDPR + 7-round UX sweep)

> Pick this up cold in a future session. Read top to bottom; everything you need is here or linked from here.

## TL;DR — Where we are

- **Live in prod** at https://inturn.vercel.app. Custom domain inturn-hub.com **not yet wired**.
- **Full first-time loop works end-to-end**: intern signs up → completes profile → browses marketplace (filtered + bookmarkable + match-scored) → applies → company reviews + accepts → workspace auto-created with Overview/Tasks/Deliverables/Comments/Activity/Timeline tabs + weekly check-in with AI draft → end of internship → supervisor issues PDF record with shareable link.
- **Stack**: Next.js 16 (App Router) + TypeScript strict + Drizzle + Neon Postgres + Clerk auth + Tailwind v4 + shadcn/ui (new-york) + next-intl 4 (FR default / EN with `as-needed` prefix) + Vitest 4 + Vercel hosting + @react-pdf/renderer + Resend (transactional email) + Anthropic SDK (Claude Sonnet 4.5).
- **Branch**: `sprint-b-phase-1-closure` carries Sprint A + B + C + 3 design implementations + **Sprint D complete (D1-D8)** + Legal pages + Cookie banner + Account/GDPR. 133/133 tests green, typecheck + lint + build all clean as of `1f7d475`.
- **Sprint D fully shipped**. Sprint E remaining: Sentry observability, Stripe scaffolding (flag-gated), Twilio WhatsApp, bundle analyzer. Plans at `docs/superpowers/plans/2026-05-{24,25}-*.md`.

## Sprint D shipped (2026-05-26 to 2026-05-27)

10 commits on `sprint-b-phase-1-closure`, all pushed. The engagement layer + GDPR + legal:

```
de84290 feat(email): Resend integration + 5 transactional templates (FR + EN)         D1
72ed552 feat(notifications): in-app bell + dispatcher + email triggers                D2
2cc01b1 feat(ai): task-clarity + intern-unblocker endpoints (rate-limited)            D3
8acfc6b feat(stuck-pill): AI-assisted blocker → workspace comment                     D4 wiring
7abe627 feat(security): in-memory rate limit on /api/upload + clerk webhook           D5
665e590 feat(records): end-of-internship PDF records + share link                     D6
cf94c89 feat(admin): moderation queue + audit log + reports                           D8
eb9d5c4 feat(tasks): add-task modal with AI clarity assist                            D3 UI
cc921e3 feat(community): intern feed v1 — posts + comments + moderation               D7
342e109 feat(legal): Terms / Privacy / Cookie policy + cookie banner + site footer
66fef2a feat(account): GDPR data export + delete account + settings page
1f7d475 feat(seed): community posts + sample record + sample report
```

### Sprint D feature coverage

| # | Feature | Surface | Notes |
|---|---------|---------|-------|
| D1 | Transactional email | `lib/email.ts` + 5 templates | Resend, test-mode short-circuit, XSS-escaped, FR+EN |
| D2 | Notifications | `notifications` table + `NotificationBell` + `dispatchNotificationsFor` | in-app bell + email, per-user `preferredLanguage` |
| D3 | AI task clarity | `/api/ai/task-clarity` + Add Task modal | Claude Sonnet, rate-limited 10/min/user |
| D4 | AI intern unblocker | `/api/ai/intern-unblocker` + StuckPill | Posts `[STUCK]` workspace comment |
| D5 | Rate limiting | `lib/ratelimit.ts` | Sliding window, 5 named buckets |
| D6 | Internship records | `/[locale]/records/[token]` + `/api/records/[id]/pdf` + `IssueRecordButton` | React-PDF, 32-char share token, soft revoke |
| D7 | Community v1 | `/intern/community` | Posts + comments + Report + author/admin delete |
| D8 | Admin moderation | `/admin/reports` + `/admin/audit` | Reports queue + append-only audit log |

### GDPR / Legal (post-Sprint-D)

| Surface | What | Notes |
|---------|------|-------|
| `/[locale]/terms` | Terms of Service | 10 sections, FR + EN, Tunisian law clause |
| `/[locale]/privacy` | Privacy Policy | 9 sections, sub-processors enumerated, INPDP cited |
| `/[locale]/cookies` | Cookie Policy | 3 sections covering essential/optional/third-party |
| `<CookieBanner>` | Bottom banner on every page | `useSyncExternalStore`, versioned consent |
| `<SiteFooter>` | Marketing footer | Product + legal + contact columns |
| `/account` | Settings page | Identity + profile preview + Edit link + Data export + Delete |
| `/api/account/export` | GDPR right of access | Streams JSON of everything we hold about the user |
| `deleteAccountAction` | GDPR right of erasure | Email re-confirmation + DB cascade + Clerk delete + audit |

## 05 Workspace Canvas — full polish landed (2026-05-25)

6 commits on `sprint-b-phase-1-closure`, all pushed. The eight sections of the design at `docs/inturn-project-brief.md`-adjacent `Inturn — 05 Workspace canvas · print.pdf` are now reflected in the UI:

```
b75dd2b feat(project-hub): full design polish — brief card, phases, stats, roster, side rail
84af4d4 feat(workspace/overview): component polish to match design 05 §04 fidelity
3aba42e feat(dashboard/company): KPI tiles + recent projects + today's tasks + calendar + syncs (§01)
2a55980 feat(marketplace/explore): filter rail + match band + match score pill + have-skill chips (§07)
df4fd11 feat(projects/index): new /company/projects page with stat cards + project grid (§02)
688bb45 feat(tasks-board): visual polish to match design 05 §05 (columns tint, card density, toolbar)
```

### Per-section coverage

| § | Section | Route | Status |
|---|---|---|---|
| §01 | Workspace · Dashboard (supervisor home) | `/company/dashboard` | Welcome band + 4 KPI tiles + Recent projects (progress bars) + Today's tasks + Calendar widget + Upcoming syncs |
| §02 | Projects · Index | `/company/projects` (NEW) | Stat cards + List/Grid toggle + status filter + project cards with code/progress/avatars + Continue setup vs View → states |
| §03 | Project · Detail (Hub) | `/company/projects/[id]` | Brief card (eyebrow chips + 3-goal bullets + project team aside) + Phase strip + 4 stat tiles + Internships roster + Project signal/sync/team/this-week right rail |
| §04 | Workspace · Overview | `/(intern\|company)/workspaces/[id]` | BriefCard / StatTiles / TaskList / DeliverablesMini / ActivityFeed / RailIntern / RailSupervisor polished to design density |
| §05 | Workspace · Tasks | `/.../workspaces/[id]/tasks` | Board polish (tinted columns + count badges + tag chips + review banner on supervisor); Calendar view deferred |
| §06 | Workspace · Deliverables | `/.../workspaces/[id]/deliverables` | Already shipped pre-polish: master/detail + version stack + role-aware actions |
| §07 | Explore · Marketplace | `/marketplace` | Left filter rail with facet counts + match band + match score pill (intern only) + skill chip "have" state |
| §08 | Certificate · Internship complete | not implemented | Deferred to Sprint D/E — needs PDF + share-token infra |

### What this polish needed (new/changed)

- `lib/match.ts` — pure helpers: `matchScore(internSkills, listingSkills)`, `intersectingSkills(...)`
- `components/marketplace/marketplace-filters.tsx` — server component filter rail (link-based facet toggles, no client JS)
- `components/dashboard/calendar-widget.tsx` — dynamic month grid with today highlight + event-day dots
- `modules/internships/queries.ts` — added `computeFacetCounts()` + `MarketplaceFacetCounts` type, cached under `MARKETPLACE_TAG`
- `app/[locale]/(platform)/company/projects/page.tsx` — NEW Projects Index page (was 404)
- `app/[locale]/(platform)/company/projects/[projectId]/page.tsx` — rewrite (~720 lines)
- `app/[locale]/(platform)/company/dashboard/page.tsx` — full rewrite as 2-col `.db-shell`
- `app/[locale]/(marketing)/marketplace/page.tsx` — restructured to filter rail + cards grid
- `components/platform-header.tsx` — company nav gains `Projects` link
- `app/globals.css` — appended ~1500 lines of design-spec CSS (`.ph-*`, `.pi-*`, `.db-*`, `.ex-*`)
- `modules/workspace/workspace.css` — task-board fidelity additions; deliverables already in
- `locales/{en,fr}.json` — new namespaces: `projects.index`, `dash.company`, `marketplace.filters`, `tasksBoard.filterChips`, `platformNav.projects`

### Known data gaps surfaced by the polish (defer to product)
- **Hours-tracking**: §04's 4th stat tile design shows "Hours this week" — we use "Events this week" until per-session/heartbeat data lands.
- **Cohort benchmarks**: §04 supervisor's "Better than 78% of interns" benchmark needs a cohort-comparison query — currently shows simple delta. Sprint 5 product concern.
- **AI match score is heuristic**: intern.skills ∩ listing.skills overlap %. No semantic match. Acceptable for v1.
- **Profile completeness %**: design's "profile 87% complete" omitted — we don't compute this yet.
- **Joint-sync scheduling**: Project Hub "Schedule project sync" button is decorative — joint sync backend is per-workspace check-in flow today.
- **Phases & goals**: schema columns exist (Sprint 3 migration); projects.phases/goals editor is in the project-new form but Project Hub doesn't yet have edit-in-place.
- **Tasks: link-to-deliverable, comment count, attachment count** — schema doesn't yet support; CSS rules in tasks-board are ready when these land.
- **Tasks: Calendar week view (§05 artboard 3)** — not implemented; visual chip disabled.

## Sprint B landed (2026-05-24) + perf hotfix

13 commits on branch `sprint-b-phase-1-closure` (after Sprint A). 11 plan tasks + 2 perf hotfix commits responding to a user-reported "tab nav reloads + slow" issue:

- `4cf92ee` — **perf(workspace): hoist shell to layout so tabs don't re-mount**. Added `app/[locale]/(platform)/{intern,company}/workspaces/[workspaceId]/layout.tsx` + new shared `WorkspaceShellLayout` component. Layout owns topbar + sidebar + StuckPill + ws wrapper divs. Each tab page renders only its MHead + body content. On tab nav, Next preserves the layout — no flash, no sidebar re-fetch.
- `689101c` — **perf(workspace): React.cache sidebar loaders**. `getInternSidebarData` + `getSupervisorSidebarData` wrapped with `cache()` so when both the layout and the page call them within a single render, only one DB hit happens.

UX trade-off documented: per-tab breadcrumb labels in the topbar (e.g. "Comments", "Tasks") moved out — they're now redundant with the MHead's tab-bar active state. Sprint C can reintroduce dynamic crumbs via a client-side `useSelectedLayoutSegment()` wrapper if needed.

Goal of the 8 Sprint B plan tasks: close Phase 1 product gaps — discoverable marketplace, bookmarks, Timeline tab, paginated comments, loading + error scaffolding, expanded landing.

```
cc4df35 docs: add Sprint B implementation plan
36ba247 feat(comments): cursor pagination with 50-row default, 100 cap
7e400ec feat(db): full-text search on internships via tsvector + GIN
6b4b368 feat(marketplace): filters (sector/location/duration/language/skill) + FTS search
41f078d feat: bookmark/save internships with intern saved tab
11418ec fix(bookmarks): revalidate /marketplace so heart updates on toggle
2e92455 feat(workspace): Timeline tab with day-grouped events + milestones
e87794c fix(workspace): Timeline expands targetId to include tasks + deliverables
4f87b78 feat(ui): loading skeletons + error boundaries scaffolding
53e3501 feat(landing): value props + how-it-works sections (FR + EN)
dd0169f fix(marketplace): restore substring search via ilike fallback alongside FTS
```

### Highlights
- **Comments pagination** — `(id, options?)` signature with 50-default / 100-cap, cursor via `before: Date`. Back-compat: existing callers pass just `id`.
- **Marketplace FTS** — `0003_marketplace_fts.sql` adds `search_vector` tsvector column + trigger updating on `title|sector|description` changes + GIN index. Backfilled existing rows.
- **Marketplace filters** — 6 facets total: search (FTS+ilike hybrid), skill (jsonb `@>`), sector (dropdown from distinct), locationType, duration buckets (<8w/8-12w/>12w), language, paid pills. `listMarketplaceSectors` cached under `MARKETPLACE_TAG`.
- **Bookmarks** — new `internship_bookmarks` table (composite PK `(intern_id, internship_id)`), `modules/bookmarks/` (queries + server action), heart toggle on cards (only for signed-in interns), `/intern/saved` tab.
- **Timeline tab** — `getWorkspaceTimeline(workspaceId)` expands to include task + deliverable IDs (mirrors `getWorkspaceOverview` pattern), day-grouped, milestones injected from `workspaces.startDate` + `workspaces.endDate`. Wired to both intern + company workspace routes.
- **Loading + error scaffolding** — 5 loading.tsx + 3 error.tsx (root + platform + marketplace). Server-rendered skeletons, `'use client'` error boundaries with reset button + Home link + digest reference.
- **Landing sections** — hero (existing) + For Students (3 value props) + For Companies (2 value props) + How It Works (3-step). i18n keys in `locales/{fr,en}.json` `landing.*`. Sticky header, sticky in-page anchors.

## Merge + deploy procedure (Sprints A + B together)

> **Order matters — Sprint B depends on Sprint A. Migrations must land on prod before each deploy.**

Migrations to apply to prod (cumulative):
- `0002_applications_unique_dedupe.sql` (Sprint A) — applications UNIQUE + compound indexes
- `0003_marketplace_fts.sql` (Sprint B) — tsvector column + trigger + GIN index
- `0004_internship_bookmarks.sql` (Sprint B) — bookmarks table

All three are idempotent. Pre-flight check before applying 0002: confirm no duplicate `(internship_id, applicant_id)` pairs exist in prod, or the UNIQUE add will fail.

**Recommended merge sequence (when Sam is at the keyboard with prod DATABASE_URL access):**

```bash
# 1) Confirm prod has no duplicate applications
DATABASE_URL=<prod-url> pnpm tsx --env-file=/dev/null -e "
  import { db } from './db';
  import { sql } from 'drizzle-orm';
  const r = await db.execute(sql\`
    SELECT internship_id, applicant_id, COUNT(*) c
    FROM applications GROUP BY 1,2 HAVING COUNT(*) > 1\`);
  console.log('duplicate pairs:', r.rows.length);
"

# 2) Apply Sprint A migration (0002) to prod
DATABASE_URL=<prod-url> pnpm tsx -e "
  import { Client } from '@neondatabase/serverless';
  import { readFile } from 'fs/promises';
  const f = await readFile('db/migrations/0002_applications_unique_dedupe.sql','utf8');
  const c = new Client(process.env.DATABASE_URL); await c.connect();
  await c.query(f); await c.end();
"

# 3) Merge Sprint A PR via GitHub UI (or fast-forward locally)
# https://github.com/samiarif/INTURN/pull/new/sprint-a-ship-credibility
# Vercel auto-deploys Sprint A → smoke test on https://inturn.vercel.app

# 4) Apply Sprint B migrations (0003 FTS + 0004 bookmarks)
DATABASE_URL=<prod-url> pnpm tsx -e "
  import { Client } from '@neondatabase/serverless';
  import { readFile } from 'fs/promises';
  for (const f of ['db/migrations/0003_marketplace_fts.sql','db/migrations/0004_internship_bookmarks.sql']) {
    const sql = await readFile(f,'utf8');
    const c = new Client(process.env.DATABASE_URL); await c.connect();
    await c.query(sql); await c.end();
    console.log('applied', f);
  }
"

# 5) Merge Sprint B PR
# https://github.com/samiarif/INTURN/pull/new/sprint-b-phase-1-closure
# Vercel auto-deploys Sprint B → smoke test on https://inturn.vercel.app
```

**Manual UI steps (one-time):**
- Add GitHub repo secrets for CI: `DATABASE_URL_CI`, `CLERK_SECRET_KEY_CI`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_CI`, `CLERK_WEBHOOK_SECRET_CI`, `BLOB_READ_WRITE_TOKEN_CI`
- Add branch protection on `main` requiring the `verify` check
- (Optional) `brew install gh && gh auth login` so future PRs can be created via CLI

## Sprint C landed (2026-05-24) — i18n + a11y + mobile

15 commits on branch `sprint-c-i18n-a11y-mobile` (worktree at `../inturn-sprint-c`, off Sprint B). All 8 plan tasks shipped. 107/107 tests, typecheck + lint + build clean. Branch pushed.

```
3f9f270 feat(onboarding): progress indicator + resume from last completed step
b3d29fd feat(seo): sitemap + robots + OG image + per-page generateMetadata
3a7e048 feat: dark mode (palette + cookie-persisted toggle, no FOUC)
e11ac59 feat(a11y): label htmlFor + aria-label coverage on inputs/buttons
69e1fb4 feat(a11y): focus-visible rings on interactive elements
60378d6 feat(a11y): skip-to-content link + html lang + a11y i18n namespace
21046e8 feat(tasks): @dnd-kit for touch + keyboard drag-and-drop
94317b7 chore: add @dnd-kit for touch + keyboard accessible DnD
958867b fix(workspace): align mobile drawer rules + JS query to real class names
93354ea feat(workspace): mobile responsive (drawer sidebar + stacked layouts)
802f3c3 i18n: extract marketplace + bookmarks + applications + errors strings
285d444 i18n(workspace): check-in + schedule + comments + activity + timeline
fa27401 i18n(workspace): tasks board + task list + deliverables
a6fd96d i18n(workspace): topbar + stuck-pill + m-head + tab-bar + shell-layout
12d751e i18n(workspace): add workspace namespace to FR + EN locales
```

### Highlights
- **i18n workspace** (~40 strings, 12 components) + marketplace/bookmarks/applications/errors namespaces. FR + EN.
- **Mobile responsive workspace** with drawer-style sidebar (data-mobile-open toggle), 2-col tasks board at 768px / 1-col at 480px.
- **`@dnd-kit`** replaces HTML5 DnD on tasks board. PointerSensor 8px activation + KeyboardSensor + screen-reader announcements.
- **A11y pass**: skip-to-content, server-rendered `<html lang>`, `:focus-visible` rings, form labels (visible or sr-only) across forms.
- **Dark mode** with cookie-persisted toggle + server-side className injection (no FOUC). Uses `useSyncExternalStore`.
- **SEO**: sitemap.ts (DB-driven), robots.ts, opengraph-image.tsx (edge), generateMetadata on landing + marketplace + internship detail with FR/EN canonical alternates.
- **Onboarding resume**: WizardProgress bar + nextInternStep router (5 unit tests). Refresh/sign-out resumes at first incomplete step.

### Sprint C architectural changes worth knowing
- **`app/layout.tsx` was deleted** (commit `60378d6`) — Next 16 supports root layout at `app/[lang]/layout.tsx`, which is required to set `<html lang={locale}>` server-side.
- **Real CSS class names**: workspace sidebar is `.ws-side` (not `.ws-sidebar`), tasks board is `.tb-board` (not `.ws-tasks-board`), stat tiles are `.ws-stat` (not `.ws-stat-tile`). The Sprint C plan had imaginary names; commit `958867b` aligned everything.

### Sprint C follow-ups (deferred to D or polish)
- Activity feed event verbs hardcoded English (needs ICU/rich-text restructuring)
- Toolbar chips (Board/List/Calendar, filter chips) not in plan namespace
- Marketplace location enums (`on-site`/`virtual`/`hybrid`) still raw
- shadcn `<Select>` `htmlFor` audit (Radix handles via aria-labelledby; worth confirming)
- Dark mode visual QA on colored chips (success/warning/danger)
- `metadataBase` should be set in `app/[locale]/layout.tsx` for OG image absolute URLs

### Required env var before deploy
**`NEXT_PUBLIC_BASE_URL`** must be set in Vercel project env vars (all 3 environments) before deploy or sitemap.xml / robots.txt will hard-code `https://inturn-hub.com` everywhere.

## Remaining sprint plans (D / E)

All written. Each follows the same subagent-driven-execution format.

| Sprint | Plan file | Tasks | Effort | Adds |
|---|---|---|---|---|
| C | `docs/superpowers/plans/2026-05-24-sprint-c-i18n-a11y-mobile.md` | 8 | 5–7 days | Full workspace i18n FR/EN, mobile responsive workspace.css, `@dnd-kit` for tasks board, a11y pass (skip-to-content, focus rings, labels), dark mode, SEO scaffolding (sitemap/robots/OG/generateMetadata), onboarding progress + resume |
| D | `docs/superpowers/plans/2026-05-24-sprint-d-engagement-layer.md` | 8 | 7–10 days | Resend + 5 email templates, notification dispatcher + in-app bell, 2 AI assistants (task clarity, intern unblocker), Upstash rate limiting, end-of-internship PDF + share link, community v1 (intern feed + listing discussions, no DMs per brief), admin audit log + moderation + reclamations |
| E | `docs/superpowers/plans/2026-05-24-sprint-e-trust-polish.md` | 10 | 3–5 days | Sentry, Privacy + Terms (FR/EN scaffolding text), cookie banner, GDPR delete + export, Vercel Analytics consent-gated, `@next/bundle-analyzer`, optional Twilio WhatsApp, per-card Suspense on activity feed, Stripe scaffolding (flag-gated off), N+1 cleanup |

New deps introduced across C/D/E:
- C: `@dnd-kit/{core,sortable,utilities}`
- D: `resend`, `@upstash/{ratelimit,redis}`, `@react-pdf/renderer`, `twilio` (optional)
- E: `@sentry/nextjs`, `@vercel/analytics`, `@next/bundle-analyzer`, `stripe`, `@stripe/stripe-js`

New env vars to provision before each sprint:
- D: `RESEND_API_KEY`, `EMAIL_FROM`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- E: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `TWILIO_*` (optional), `STRIPE_*` (3 keys)

New DB migrations across C/D/E:
- D: `0005_notifications.sql`, `0006_internship_records.sql`, `0007_community.sql`, `0008_reclamations.sql`
- E: `0009_subscriptions.sql`

### Sprint B follow-ups for Sprint C
- 5 byte-identical loading.tsx files — extract `<PageSkeleton>` component
- Landing page copy is scaffolding — Sam to iterate (especially CTAs and the "For Companies" value props)
- Workspace UI strings still hardcoded English (next-intl extraction = big surface)
- Mobile responsiveness pass on workspace.css (no `@media` queries currently)
- Heart-button affordance could be more obviously interactive (hover/scale)
- Real DB-touching tests for `modules/bookmarks` and `getWorkspaceTimeline` (current `__tests__` are placeholders)
- Marketplace search: `simple` text-search config doesn't stem; the ilike fallback covers most cases but a `to_tsquery` with `:*` prefix would also be worth trying
- Day-grouping on Timeline uses UTC — locale-aware bucketing later

## Sprint A landed (2026-05-24)

12 commits on branch `sprint-a-ship-credibility`. Goal: ship the credibility-blocker fixes from the full audit so the platform is safe and CI-gated before design-partner onboarding.

```
24d78c9 docs: add Sprint A plan + previously-untracked project brief
e3ad97d ci: add typecheck + lint + test + build workflow
737129e ci: pin Node via .nvmrc and pnpm via packageManager field
45a9d53 feat(security): MIME + magic-byte allowlist on /api/upload
c01afa0 fix(security): drop SVG from logo allowlist (XSS), add boundary test
02fa3ba chore: allow next/image to load Vercel Blob + Clerk avatars
069fbd7 chore: pin remotePatterns search to '' to block cache-bust query strings
89ff5dd chore(security): document svix tolerance, narrow replay window
5d6a25b feat(db): unique apps per (internship,intern) + inbox/comments compound indexes
d3c8804 fix(db): align comments compound index ASC/DESC with migration
4a296a1 feat: add /api/health endpoint with DB ping
2ab2178 fix(security): don't leak DB error message from /api/health; log server-side
```

### Highlights
- **CI**: `.github/workflows/ci.yml` runs typecheck + lint + test + build on PRs and pushes to main. Node pinned via `.nvmrc` (24), pnpm via `packageManager` field (`pnpm@10.33.2`). GitHub repo secrets `*_CI` still need adding via UI (one-time); branch-protection on `main` requiring `verify` check also a UI step.
- **Upload hardening (`/api/upload`)**: `lib/uploads/allowlist.ts` validates per-kind MIME + magic bytes + size cap (cv/registry 8MB, logo 2MB, deliverable 25MB). SVG dropped from `logo` (XSS bypass — Vercel Blob serves SVG with `<script>` as `image/svg+xml`). 8 tests cover real PDF accepted, EXE-as-PDF rejected as `content_mismatch`, MIME-not-for-kind, oversize boundary, exact-size boundary.
- **Image optimization**: `next.config.ts` `images.remotePatterns` allows `**.public.blob.vercel-storage.com` + `img.clerk.com`, both `https` + `pathname: '/**'` + `search: ''` (blocks cache-bust query strings).
- **Webhook**: documented svix's built-in 5-min `svix-timestamp` tolerance and updated error message to mention stale timestamps. Svix 1.94 doesn't expose tolerance as a configurable option (it's hardcoded in standardwebhooks 1.0); full svix-id idempotency dedup remains a Sprint E task.
- **DB hygiene**: migration `0002_applications_unique_dedupe.sql` adds `UNIQUE(internship_id, applicant_id)` on applications (with idempotent oldest-wins dedupe — pre-flight confirmed 0 dupes in dev) + compound index `applications(internship_id, status)` for inbox + `comments(workspace_id, created_at DESC)` for thread scans. All idempotent, transactional.
- **Health probe**: `/api/health` does a `SELECT 1` and returns `{ status, commit, env, latencyMs }` or 503 + machine code `db_unreachable` (full error logged server-side, never leaked to caller). Public route (added to `proxy.ts` matcher).

### Known follow-ups out of Sprint A
- Logo upload cap dropped 5MB → 2MB. Coordinate with anyone whose flow previously uploaded 3-5MB logos.
- `/api/health` is unauthenticated and has no rate limit. Vercel Firewall or Upstash Ratelimit will be Sprint B/D work.
- API error shapes are inconsistent: `/api/upload` returns `{ error: code }`, `/api/health` returns `{ status, code, ... }`, webhook returns plain text. Sprint B should standardize.
- GitHub Actions branch protection + CI secrets are manual UI tasks (not in scope for the implementer).

## What just shipped (the perf audit pass — 2026-05-24)

Three commits on `main`, all pushed and deployed.

### `7f69fc1` — auth tax + DRY workspace pages (-513 LOC)

- **`modules/auth/session.ts`** — `getSession()` wrapped in `React.cache`, reads role from JWT `publicMetadata` claims (no Clerk REST roundtrip), DB fallback. Plus `requireSession()`, `requireAdmin()`.
- **`modules/workspace/access.ts`** — `loadWorkspaceAccess()` for server actions.
- **`modules/workspace/page-data.ts`** — `loadWorkspacePage()` collapsed 9 near-identical workspace pages into 12-line callers.
- All 5 workspace server-action loadContext blocks now use the shared loader.
- Platform layouts + dashboard + company project pages + upload API route all switched to `getSession`.

**Why this matters:** every protected page used to do 4 sequential roundtrips (Clerk auth → DB user lookup → Clerk REST `users.getUser` → role parse). Now it's one DB hit, React-cached across the render tree.

### `4d72a35` — DB indexes + cache + CSS split

- **Indexes** (`db/migrations/0001_modern_nehzno.sql`, idempotent with `IF NOT EXISTS`, applied via `db:push`):
  - `projects_supervisors_gin_idx` — GIN on `supervisor_ids` for `@>` workspace-authz lookups
  - `events_target_created_idx` — compound `(target_id, created_at DESC)` for activity feed (dropped the standalone `target_idx`)
  - btree indexes on `workspaces.{intern_id,organization_id,internship_id}`, `tasks(workspace_id, status)`, `tasks(workspace_id, "order")`, `deliverables(workspace_id, status)`, `deliverables.task_id`, `internships(status, created_at DESC)`, `internships.project_id`
- **Marketplace caching**: `listPublishedInternships` wrapped in `unstable_cache` tagged `MARKETPLACE_TAG` (5-min revalidate). `publishInternshipAction` calls `updateTag(MARKETPLACE_TAG)` for read-your-own-writes.
- **Next 16 cache API change**: `revalidateTag` now requires a second profile arg. Inside server actions, use `updateTag(tag)` (single arg, immediate, RYOW semantics).
- **Workspace CSS split**: ~1.3K lines moved from `app/globals.css` into `modules/workspace/workspace.css`, imported only by `WorkspaceTopBar`. Marketing/auth/marketplace pages no longer ship workspace styles.
- **`getActiveProjectsBySupervisor`** — was scanning all active projects in JS, now filters in SQL via `supervisor_ids @>` and the new GIN.
- **Role enums unified**: `modules/workspace/types.ts UserRole` re-exports `Role` from `modules/auth/types.ts`.

### `16fffcf` — workspace overview Suspense streaming

- **Split `loadWorkspacePage`** into `loadWorkspaceShell` (session + authz + sidebar + one workspace-row join + two `SELECT COUNT(*)` for tab badges) and `loadWorkspaceData` (the heavy `getWorkspaceOverview`).
- **`WorkspaceOverview`** is now the shell: topbar + sidebar + MHead with date range + tab counts render synchronously.
- **`WorkspaceOverviewBody`** is async server component wrapped in `<Suspense fallback={<WorkspaceBodySkeleton/>}>`. BriefCard / StatTiles / TaskList / DeliverablesMini / ActivityFeed / rail stream in.
- **`WorkspaceMHead`** refactored to take primitives instead of the full `data` object — all 4 callers (overview + 3 tab pages) updated.
- Tab pages (tasks, deliverables, comments, check-in) keep using `loadWorkspacePage` because their `loading.tsx` skeletons already give instant nav feedback.

Plan: `docs/superpowers/plans/2026-05-24-workspace-suspense-streaming.md`.

## What's still missing — the punch list

Ranked by impact × risk.

### Brand & polish (highest user-visible)
1. **Custom domain** — `inturn-hub.com` not wired to Vercel. DNS access required. ~10 min once you have the registrar.
2. **Real landing page** — current `app/[locale]/page.tsx` is the polished placeholder (nav + hero + footer per design spec, no body sections). The "real" Studio-designed landing isn't imported. Worth a focused session.
3. **i18n workspace UI** — task `POLISH-T11` / `S3-T10` still pending. The workspace UI is hardcoded English strings; needs `next-intl` extraction. Big surface area (~12 files).

### Engineering hygiene
4. **GitHub Actions CI** — ✅ DONE in Sprint A (`e3ad97d`, `737129e`). Branch protection + repo secrets still to add via UI.
5. **Suspense per-card streaming** — the current Suspense boundary wraps the *whole* body. The activity feed is the slowest single query — could go in its own nested Suspense so cards appear earlier. Diminishing returns; the COUNT-based MHead already removes the slowest tab-render shift.
6. **Test coverage for queries layer** — module services are tested but the queries.ts files (the SQL boundary) aren't. Worth at least a smoke test per critical query.

### Product gaps
7. **Tasks board: drag-to-status** — landed but mobile drag is awkward on touch (HTML5 DnD). Pointer Events polyfill or library like `@dnd-kit` would fix it. Sprint-sized.
8. **Deliverables versioning UI** — schema has `version` + `revisionHistory` columns. UI to browse past versions doesn't exist.
9. **Notifications** — events table is the data moat but no in-app notification surface yet. The intern-side bell icon is a static element.
10. **Search across marketplace** — current `ilike(title, %q%)` is fine for hundreds; needs proper FTS (Postgres `tsvector`) before low thousands.

### Production readiness
11. **Error monitoring** — no Sentry / equivalent wired up. Vercel's built-in errors panel exists but no alerting. Sprint E.
12. **Rate limiting on `/api/upload`, `/api/webhooks/clerk`, `/api/health`, AI endpoints** — none are rate-limited. Vercel BotID, `@vercel/firewall`, or Upstash Ratelimit. Sprint D includes the AI-endpoint rate limit at minimum.
13. **Image optimization for blob URLs** — ✅ DONE in Sprint A (`02fa3ba`, `069fbd7`). `next/image` can now load Vercel Blob + Clerk avatars; remaining work is to swap `<img>` → `next/image` where used (Sprint C).
14. **Upload safety** — ✅ DONE in Sprint A (`45a9d53`, `c01afa0`). MIME + magic-byte + per-kind size cap; SVG dropped from logos.
15. **DB hygiene** — ✅ Sprint A added unique constraint on applications + compound indexes (`5d6a25b`, `d3c8804`); `users.role` notNull-default deliberately deferred (would break role-selection flow without a refactor).
16. **Health endpoint** — ✅ DONE in Sprint A (`4a296a1`, `2ab2178`). `/api/health` for UptimeRobot / BetterStack hookup.

## What's next — recommended order

If you have **a half day**:
- Wire CI (PR #1)
- Wire inturn-hub.com to Vercel (PR #2, if DNS available)
- Import real landing (PR #3)

If you have **a sprint**:
- Above, then i18n workspace UI (touches every workspace component, structured but tedious)
- Add error monitoring (Sentry or similar) and basic rate-limiting

If you want to **go deeper on perf**:
- Per-card Suspense splits (activity feed in its own boundary)
- FTS for marketplace search
- Bundle analyzer pass — `@next/bundle-analyzer` to find any client component bloat

## Key files & locations

```
docs/
  HANDOFF.md                          ← this file
  superpowers/specs/                  ← design specs by sprint
  superpowers/plans/                  ← implementation plans by sprint
  design-bundle/                      ← Studio mocks + tokens

app/
  [locale]/(platform)/                ← protected routes (intern/company/admin)
  [locale]/marketplace/               ← public marketplace
  [locale]/internships/[slug]/        ← public internship detail + apply
  api/webhooks/clerk/                 ← Clerk → users table sync
  api/upload/                         ← Vercel Blob upload (role-gated)
  globals.css                         ← marketing/auth/marketplace styles only (211 lines)
  proxy.ts                            ← Clerk + next-intl composed (replaces middleware.ts in Next 16)

modules/
  auth/                               ← session.ts (React.cache), types.ts (Role enum)
  workspace/
    page-data.ts                      ← loadWorkspaceShell, loadWorkspaceData, loadWorkspacePage
    access.ts                         ← loadWorkspaceAccess for server actions
    workspace.css                     ← workspace + tasks-board styles (1377 lines, only loaded on workspace routes)
    queries.ts                        ← getWorkspaceOverview, sidebar queries
    service.ts                        ← canViewWorkspace authz
    components/                       ← all workspace UI
  internships/                        ← marketplace queries (unstable_cache tagged) + actions
  applications/                       ← state machine + queries + actions
  projects/                           ← supervisor scoping
  comments/                           ← workspace comments thread
  checkins/                           ← weekly check-in + AI draft (Anthropic SDK)
  events/                             ← append-only event log + types
  profiles/                           ← intern + company profile queries

db/
  schema/                             ← drizzle schemas, indexed properly as of 0001
  migrations/                         ← 0000 baseline + 0001 indexes (idempotent)
  index.ts                            ← neon-http drizzle client
```

## Gotchas / sharp edges

- **`.env.local`** can't be read directly by Read tool. Use `node --env-file=.env.local` or `tsx --env-file=.env.local` to load env in scripts.
- **Clerk webhook secret** rotates after sharing in chat — currently set in Vercel as `CLERK_WEBHOOK_SECRET`.
- **`db:push` vs migrations**: dev workflow is `db:push`. Migrations exist (`0000`, `0001`) but production state was pushed before migrations were generated. The `0001` file is idempotent (uses `IF NOT EXISTS`) so it's safe to run anywhere. See `db/migrations/README.md`.
- **`pnpm db:seed`** is idempotent. Admin can re-seed via `POST /api/admin/seed`.
- **Demo accounts** seeded: Yasmine (intern), Mehdi (Acme supervisor), Acme has Brand audit project + 2 published internships + 3 demo applications. Numentech is the unverified company for admin-side verify testing.
- **Admin email**: `hellowemakeitgrow@gmail.com` (set via Clerk publicMetadata role=admin).
- **Next 16 ESLint**: uses flat config (`defineConfig`), NOT FlatCompat. `eslint-config-prettier` applied as spread, not via `compat.extends`.
- **Next 16 `revalidateTag`**: now requires a second arg. Use `updateTag(tag)` inside server actions instead.
- **Drizzle + neon-http**: no transactions. Sequential writes are best-effort; idempotency via event-log is the recovery story.
- **Workspace authz**: deny by default. A company user must be in `project.supervisorIds`. Org-owner fallback was removed in Sprint 3.
- **shadcn registry**: `base-nova`, no `asChild` support — wrap manually.
- **i18n**: French URLs have no prefix; English uses `/en/...`. For server-side redirects use `redirect` from `next/navigation` (plain string), NOT `redirect` from `@/i18n/navigation` (which expects `{href, locale}`).

## Verification quick-start for a new session

```bash
# Set up
pnpm install
vercel env pull .env.local   # gets DATABASE_URL, CLERK_*, BLOB_READ_WRITE_TOKEN, ANTHROPIC_API_KEY

# Sanity check
pnpm typecheck && pnpm lint && pnpm test

# Run locally
pnpm dev

# Seed demo data (idempotent)
pnpm db:seed
```

Sign in at http://localhost:3000/sign-in. Admin account: `hellowemakeitgrow@gmail.com`. To test as intern, sign up fresh or use Yasmine.

## UX/UI sweep — 7 rounds (2026-05-27)

A general-purpose audit agent surveyed every route and identified ~55 findings
across critical / high-impact / polish / a11y / mobile buckets. Shipped in 7
batches on `sprint-b-phase-1-closure`:

| Round | Commit | Highlights |
|---|---|---|
| 1 | `b8c054e` | Mobile nav drawer, workspace sidebar (real links + i18n + no mock counts), footer fixed, status pill i18n, project hub dead UI removed, intern app detail i18n + Withdraw action, mobile grids |
| 2 | `5c127cf` | `<StatusPill>` shared component + dark-mode CSS tokens (`--status-{tone}-bg/-ink`), `/account/edit` page (no more onboarding wizard ricochet) |
| 3 | `a15213c` | Marketplace mobile filter collapse, compare candidates responsive grid, project hub + internship detail + apply + review page i18n |
| 4 | `d2db6c4` | All admin pages translated (dashboard, verifications, reports, audit), audit log action-type filter chips |
| 5 | `beed269` | `/admin/users` with role + status filters + suspend/reactivate action, `requireActiveSession` enforcement, `<SuspendedBanner>` |
| 6 | `27b97e2` | Project goals/phases inline edit dialog, `lib/format-time.ts`, `<Avatar>` component, verifications detail i18n |
| 7 | `133a26b` | Avatar adoption on community detail, 19 new tests (format-time + Avatar) |
| — | `cb2a449` | Empty-state CTAs on intern + company dashboards |

**Visible deltas a user will notice**

- Phones now have a working hamburger nav drawer (was: only logo + avatar on mobile)
- Workspace sidebar shows real workspace counts and clickable links (was: mock counts `2`, `14`, `3` + inert divs)
- French speakers see French everywhere — admin, application detail, project hub, internship detail, apply, compare candidates, verifications detail (was: large English islands)
- Status pills look right in dark mode (was: hex-literal white-on-white)
- Edit profile no longer kicks you back through onboarding wizard (was: /account → /onboarding/intern/basics → skills → done)
- Interns can withdraw applications
- Admins can suspend abusive users; suspended users see a red banner + are blocked from all writes (`requireActiveSession`)
- Project supervisors can edit goals + phases inline (was: only set at creation, no way to fix typos)
- First-time intern + company users see "Browse internships →" / "+ Create your first project" buttons on empty dashboards (was: paragraph-only empty states)

**Tally**: 8 commits, ~2,500 lines net added, 50+ audit findings resolved. **152/152 tests passing** (was 133 — added format-time + avatar coverage). Lint + typecheck + build clean throughout.

## Recent commits worth knowing

```
cb2a449 fix(ux): empty-state CTAs on dashboards
133a26b fix(ux): round 7 — Avatar adoption + format-time + avatar tests
27b97e2 fix(ux): round 6 — project goals/phases edit, time-ago, Avatar, verifications i18n
beed269 feat(admin): users page + suspend/unsuspend action (round 5)
d2db6c4 fix(ux): round 4 — admin i18n + audit filters
a15213c fix(ux): round 3 — marketplace mobile filter + compare mobile + i18n batch
5c127cf fix(ux): round 2 — StatusPill + /account/edit + dark-mode status tokens
b8c054e fix(ux): round 1 — mobile nav, sidebar, footer, i18n, dead UI cleanup
1f7d475 feat(seed): community posts + sample record + sample report (Sprint D)
66fef2a feat(account): GDPR data export + delete account + settings page
342e109 feat(legal): Terms / Privacy / Cookie policy + cookie banner + site footer
cc921e3 feat(community): intern feed v1 — posts + comments + moderation (D7)
eb9d5c4 feat(tasks): add-task modal with AI clarity assist
cf94c89 feat(admin): moderation queue + audit log + reports (D8)
665e590 feat(records): end-of-internship PDF records + share link (D6)
8acfc6b feat(stuck-pill): AI-assisted blocker → workspace comment (D4 wiring)
2cc01b1 feat(ai): task-clarity + intern-unblocker endpoints (rate-limited)
7abe627 feat(security): in-memory rate limit on /api/upload + clerk webhook (D5)
72ed552 feat(notifications): in-app bell + dispatcher + email triggers (D2)
de84290 feat(email): Resend integration + 5 transactional templates (FR + EN)
3bc141e fix(marketing): show Dashboard link + UserButton when signed in
75dada3 feat(seed): rich data bound to Sam's 3 sign-in emails
```

Full history: `git log --oneline | head -50`.

## Sprint E — remaining ("running product" polish, post-launch optional)

- **Sentry** for error/perf observability (TODO comment exists in `app/[locale]/error.tsx`)
- **Stripe scaffolding** (flag-gated; no monetisation yet)
- **Twilio WhatsApp** for SMS/WhatsApp delivery channel (optional, FR market often prefers WhatsApp over email)
- **Bundle analyzer** for production size audits

These are quality-of-life; the platform is launch-ready functionally.

## Memory files (for AI-augmented sessions)

Located at `~/.claude/projects/-Users-mac-code-inturn-hub-inturn/memory/`. Index in `MEMORY.md`. The perf audit details are in `perf_audit_2026-05-24.md`.
