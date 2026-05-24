# inturn — Session Handoff (2026-05-24)

> Pick this up cold in a future session. Read top to bottom; everything you need is here or linked from here.

## TL;DR — Where we are

- **Live in prod** at https://inturn.vercel.app. Custom domain inturn-hub.com **not yet wired**.
- **Full first-time loop works end-to-end**: intern signs up → completes profile → browses marketplace → applies → company reviews + accepts → workspace auto-created → intern + supervisor collaborate (tasks board, deliverables, comments, weekly check-in with AI draft).
- **Stack**: Next.js 16 (App Router) + TypeScript strict + Drizzle + Neon Postgres + Clerk auth + Tailwind v4 + shadcn/ui (new-york) + next-intl 4 (FR default / EN with `as-needed` prefix) + Vitest 4 + Vercel hosting.
- **Branch**: `main`. 92/92 tests green. typecheck + lint + build all clean as of last commit `16fffcf`.

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
4. **GitHub Actions CI** — no automated typecheck/lint/test on push. Should be a 30-min PR adding `.github/workflows/ci.yml` (pnpm install → typecheck + lint + test in parallel).
5. **Suspense per-card streaming** — the current Suspense boundary wraps the *whole* body. The activity feed is the slowest single query — could go in its own nested Suspense so cards appear earlier. Diminishing returns; the COUNT-based MHead already removes the slowest tab-render shift.
6. **Test coverage for queries layer** — module services are tested but the queries.ts files (the SQL boundary) aren't. Worth at least a smoke test per critical query.

### Product gaps
7. **Tasks board: drag-to-status** — landed but mobile drag is awkward on touch (HTML5 DnD). Pointer Events polyfill or library like `@dnd-kit` would fix it. Sprint-sized.
8. **Deliverables versioning UI** — schema has `version` + `revisionHistory` columns. UI to browse past versions doesn't exist.
9. **Notifications** — events table is the data moat but no in-app notification surface yet. The intern-side bell icon is a static element.
10. **Search across marketplace** — current `ilike(title, %q%)` is fine for hundreds; needs proper FTS (Postgres `tsvector`) before low thousands.

### Production readiness
11. **Error monitoring** — no Sentry / equivalent wired up. Vercel's built-in errors panel exists but no alerting.
12. **Rate limiting on `/api/upload` and `/api/webhooks/clerk`** — neither is rate-limited. Vercel BotID or Upstash Ratelimit would do it.
13. **Image optimization for blob URLs** — uploaded logos/CVs served as-is. Wire `next/image` `remotePatterns` for Vercel Blob hostnames.

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
