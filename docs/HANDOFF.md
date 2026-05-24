# inturn — Session Handoff (2026-05-24, updated post Sprint A + Sprint B)

> Pick this up cold in a future session. Read top to bottom; everything you need is here or linked from here.

## TL;DR — Where we are

- **Live in prod** at https://inturn.vercel.app. Custom domain inturn-hub.com **not yet wired**.
- **Full first-time loop works end-to-end**: intern signs up → completes profile → browses marketplace (filtered + bookmarkable) → applies → company reviews + accepts → workspace auto-created with Overview/Tasks/Deliverables/Comments/Activity/Timeline tabs + weekly check-in with AI draft.
- **Stack**: Next.js 16 (App Router) + TypeScript strict + Drizzle + Neon Postgres + Clerk auth + Tailwind v4 + shadcn/ui (new-york) + next-intl 4 (FR default / EN with `as-needed` prefix) + Vitest 4 + Vercel hosting.
- **Branches**: `sprint-a-ship-credibility` (Sprint A PR open) and `sprint-b-phase-1-closure` (Sprint B + perf hotfix, PR ready). 102/102 tests green. typecheck + lint + build all clean as of last commit `689101c`.
- **Full audit + 5-sprint ship plan** at `docs/superpowers/plans/2026-05-24-sprint-{a,b}-*.md` and memory file `audit_2026-05-24.md`. Order: A (credibility) → **B (Phase 1 feature closure) [DONE]** → C (i18n + a11y + mobile) → D (engagement: notifications + community + AI) → E (trust: monitoring + legal + billing).

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

## Recent commits worth knowing

```
16fffcf perf(workspace): stream overview body behind Suspense
4d72a35 perf: hot-path indexes, marketplace cache tag, workspace CSS split
7f69fc1 perf: cache session + DRY workspace pages and server actions
4717038 fix: AI model id + 3 event metadata routing bugs
cf40d18 fix: load .env.local in drizzle config
68ebf75 fix: resolve lint errors in role-selection tests
ee86c62 chore: add deployment config and cleanup
60ce8b8 feat: add role-gated layouts and dashboard placeholders
ce0740b feat: add role selection flow
```

Full history: `git log --oneline | head -50`.

## Memory files (for AI-augmented sessions)

Located at `~/.claude/projects/-Users-mac-code-inturn-hub-inturn/memory/`. Index in `MEMORY.md`. The perf audit details are in `perf_audit_2026-05-24.md`.
