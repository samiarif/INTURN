# inturn

The early-talent operating system for Tunisia — a bilingual (FR default / EN) three-sided
platform where **students** discover internships and do real project work, **companies** post
internships and supervise that work, and **universities** supervise their students through a
privacy firewall. Interns finish with a verifiable PDF record of what they shipped.

> **New here? Start with [`docs/README.md`](docs/README.md)** — it's the documentation index with
> a role-by-role reading path. This file is just how to get the app running.

---

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** (strict)
- **Drizzle ORM** + **Neon** Postgres (HTTP driver — no transactions; see `db/`)
- **Clerk** auth · **next-intl** i18n (`locales/{fr,en}.json`)
- **Tailwind v4** (CSS-first — tokens live in `@theme` in `app/globals.css`, there is **no**
  `tailwind.config`) + **shadcn/ui** (base-nova) + the "Atelier" design layer
- **Vitest** · **Vercel** (deploy) · **Resend** (email) · **Anthropic SDK** (AI assists)

> ⚠️ This is **Next.js 16** — it has breaking changes vs. older versions (middleware is `proxy.ts`,
> the root layout lives under `app/[locale]/`, etc.). When an API looks unfamiliar, read the bundled
> guide in `node_modules/next/dist/docs/` before assuming. (This note also lives in `AGENTS.md`.)

## Run it

```bash
pnpm install
cp .env.example .env.local        # then fill in the values (see below)
pnpm db:push                      # apply schema to your dev DB
pnpm db:seed                      # demo orgs, users, a project + workspace
pnpm dev                          # → http://localhost:3000
```

**Local auth without Clerk:** set `DEV_AUTH_BYPASS=1` in `.env.local` and visit
[`/dev/login`](http://localhost:3000/fr/dev/login) — it sets a signed cookie for any seeded persona
(admin / company / university / intern). This is the fastest way in; it is **dev-only** and can never
activate in production (gated at every layer — see `lib/dev-auth.ts`, `proxy.ts`).

**Network note:** the `dev`/`migrate` scripts force `--dns-result-order=ipv4first` and the Neon
client has a 10s per-attempt timeout, because some networks (the original author's) block
IPv6/Cloudflare and hang on Clerk/Neon. Harmless elsewhere. If Neon is unreachable you can run fully
offline on local Postgres — set `DATABASE_URL=postgresql://<you>@localhost:5432/inturn` and the
driver auto-switches to node-postgres (`db/index.ts`); details in `docs/planning/HANDOFF.md`.

## Checks (run before pushing)

```bash
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint (incl. i18next no-literal-string)
pnpm test           # vitest (635 pass / 2 skipped as of this handoff)
pnpm check:i18n     # FR/EN locale-key parity — must stay aligned
pnpm build          # production build (prebuild runs migrations on Vercel)
```

## Layout

```
app/[locale]/            # next-intl localized routes (fr unprefixed, en under /en)
  (site)/                # public MARKETING SITE — the front door (home, how-it-works,
                         #   for-companies/interns/universities, virtual-internships, verify)
  (marketing)/           # public app pages (marketplace, internship detail, legal)
  (auth)/                # sign-in/up, onboarding wizards, /dev/login
  (platform)/            # the authenticated app: intern/ company/ university/ admin/
  api/                   # route handlers (upload, webhooks, ai/*, cron, records pdf…)
components/landing/      # the marketing-site components (ported in-repo from the old inturn-web)
components/ui/           # shadcn primitives (brand-rebound)
modules/<domain>/        # business logic: queries.ts (reads) · service.ts (rules) · server-actions.ts (auth→service)
db/schema/               # Drizzle tables   db/migrations/  # hand-rolled idempotent SQL
lib/                     # auth, env, ratelimit, email, blob, analytics, format helpers
i18n/ + locales/         # next-intl config + FR/EN catalogs
app/globals.css          # design tokens (@theme) + the per-screen CSS families
app/landing.css          # marketing-site styles, scoped under .mk-root (loaded only by (site))
docs/                    # see docs/README.md
```

## State at handoff (2026-06-11)

- **`main` is the source of truth.** It carries the audit bug-fixes + the "Atelier" design system +
  the marketing site as the in-repo front door. The work was developed on `fix/audit-quick-wins` →
  `feat/atelier-tokens` and fast-forward-merged into `main`.
- **`origin/main` is behind local `main`,** and **production runs an older commit** — deploys are
  manual (`vercel --prod`), not git-triggered. Deploying is a decision, not a build step.
- **Other branches** (`feat/i18n-exhaustive`, `fix/i18n-sweep`, `fix/ux-polish`, …) hold older,
  **unmerged** i18n/UX work that predates the design pass and needs a rebase/reconcile before use —
  treat them as parked, not current.
- See [`docs/planning/HANDOFF.md`](docs/planning/HANDOFF.md) for the full narrative.
