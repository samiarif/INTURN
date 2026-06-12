# inturn — Platform Inventory & Build Axes

> **For:** Sam + the incoming developer. One document answering three questions:
> **(1)** what exists today, module by module · **(2)** what's missing or incomplete ·
> **(3)** which axes are worth building next, and why.
> Companion docs: [`PRODUCT_OVERVIEW.md`](./PRODUCT_OVERVIEW.md) (business view, backlog detail),
> [`../technical/TECHNICAL_OVERVIEW.md`](../technical/TECHNICAL_OVERVIEW.md) (architecture).
>
> **Updated:** 2026-06-11 against `main@4b8c07a` — 27 domain modules, 63 pages, 13 API routes,
> 635 tests pass, full gate + production build green.

---

## 1 · Module inventory (what the code actually contains)

Every domain module under `modules/` follows `queries.ts` (reads) · `service.ts` (rules) ·
`server-actions.ts` (auth gate → service). Status: ✅ live in prod · 🟡 built & verified, **not deployed**.

| Module | What it does | Status |
|---|---|---|
| `auth` | Session resolution (Clerk JWT-first + DB fallback), role guards, dev-bypass | ✅ |
| `onboarding` | Intern wizard routing (basics → skills → done), company onboarding | ✅ |
| `profiles` | Intern profile CRUD, completeness scoring, CV-parse application | ✅ |
| `internships` | Listings CRUD, publish lifecycle, marketplace queries (FTS + facets + city/location search) | ✅ (location search 🟡) |
| `bookmarks` | Save/unsave listings | ✅ |
| `applications` | Apply (cover note + custom answers), status pipeline, accept→workspace, decision notes | ✅ |
| `workspace` | The core: shell, page-data, access chokepoint, sprint seeding — powers intern AND supervisor views | ✅ (sprint-aware 🟡) |
| `tasks` | Task CRUD + drag-status board, state machine, sprint linkage | ✅ (sprint link 🟡) |
| `sprints` | **Company-side sprint planning** (manual + AI plan), workspace sprint queries, active-sprint resolver | 🟡 |
| `deliverables` | Versioned deliverables, review state machine, public share links, dependencies | ✅ |
| `checkins` | Weekly check-in scheduling + AI-drafted starter | ✅ |
| `comments` | Cursor-paginated workspace thread | ✅ |
| `notes` | Author-private workspace notes | ✅ |
| `events` | Append-only event log (the data moat) + notification fan-out | ✅ |
| `notifications` | In-app bell, dispatcher, per-user prefs, nudges | ✅ |
| `records` | End-of-internship PDF credential: snapshot, star rating, share token, revoke/reissue | ✅ (share-401 fix 🟡) |
| `community` | Intern feed v1: posts, comments, report, moderation | ✅ |
| `team` | Multi-seat orgs: invites, roles (owner/admin/supervisor), per-project supervisors | ✅ |
| `projects` | Projects (goals + phases), hub rollups, supervisor mgmt | ✅ |
| `university` | University orgs, coordinators (head + encadrants), CSV bulk invite, firewalled student snapshot | 🟡 |
| `academic-reports` | Typed livrables (rapport/présentation/diagramme/autre), versioned, review loop | 🟡 |
| `review` | Shared pure review state machine (deliverables + livrables can't drift) | 🟡 |
| `ai` | Project-assist endpoints: reformulate, goals, phases, deliverables, questions, sprint plan/tasks | ✅ (sprint AI 🟡) |
| `pulse` | Weekly digest sweep (cron skeleton, env-gated) — the "AI co-supervisor" seed | 🟡 (minimal) |
| `admin` (+`admin/users`) | KPIs, org verification, user suspend, reports moderation, audit log + CSV | ✅ |
| `account` | GDPR export, account deletion cascade, notification prefs | ✅ |
| `audit` / `reports` | Append-only admin audit log · content reports | ✅ |

**Cross-cutting (lib/):** rate limiting (9 buckets, in-memory v1) · upload allowlist
(MIME + magic bytes) · email templates FR/EN (Resend) · blob host pinning · analytics taxonomy
(PostHog, env-gated) · `after-response` serverless-safe dispatch · public-route allowlist (tested).

**Surfaces:** the **marketing site** is in-repo (`app/[locale]/(site)/` — home, how-it-works,
for-companies, for-interns, for-universities, virtual-internships, **verify** wired to real record
lookup) 🟡 · the **Atelier design system** (ink chrome, violet at value moments, one
radius/elevation scale, mono eyebrows, FR/EN everywhere — 2,622 aligned keys) 🟡.

---

## 2 · Features by audience (one line each)

**Public / SEO:** marketing site (7 pages, FR/EN) · marketplace browsable logged-out · internship
detail pages · record share pages (`/records/[token]`) · certificate verify page · legal pages.

**Intern:** onboarding + CV import → marketplace (filters, match score, "why these") → apply/track/
withdraw → workspace (sprint-aware tasks board, versioned deliverables, check-ins, comments, AI
unblocker) → community → verified PDF record → academic livrables to their university 🟡.

**Company:** org verification → multi-seat team → projects (goals/phases) → **sprint planning
(manual + AI)** 🟡 → publish internships (templates + AI assists) → inbox/compare/notes → accept →
supervise (nudge, review deliverables, issue record) → dashboards.

**University coordinator 🟡:** provisioned by admin → head + encadrants, per-student assignment →
CSV bulk student invites → firewalled phase snapshot (never the company workspace) → review typed
livrables (approve / request revision / comment).

**Admin:** KPI dashboard → verification queue → user management → reports moderation → university
provisioning → append-only audit + CSV export.

---

## 3 · What's missing / incomplete (honest list)

**Blocking nothing, but visible:**
1. **Deploy gap** — production still runs the 2026-05-30 build; *everything* marked 🟡 above
   (university product, livrables, sprints, design system, marketing site) is one `vercel --prod` away.
2. **`/contact` + `/about` pages** — university "Talk to us" CTAs are coming-soon spans until then.
3. **French search gap** — listings are written in English, so « développeur », « stage » return
   nothing. Options: bilingual listing fields · FR→EN synonym map in the query · a `french`-config
   tsvector. (Also: search doesn't cover org names yet.)
4. **French marketing copy** is AI-written, pending native review (Sam).
5. **Cold-start supply** — ~13 seeded internships; a real visitor sees a thin marketplace.
6. **Manual verification bottleneck** — every company is verified by hand.

**Product gaps (by design, not yet built):**
7. No retention loop — no digest emails, no WhatsApp channel, no alumni/career-arc surface.
8. Match score is heuristic skill-overlap, not semantic.
9. No Arabic / RTL (FR/EN only).
10. No public intern profiles or company pages (growth/SEO loop missing).
11. No monetization rail (no Stripe, no plans/limits).
12. Community v1 has no reply notifications/likes/editorial.
13. No mobile install story (no PWA manifest/push).

**Engineering debt (documented, scoped):**
14. In-memory rate limiter (per-instance on Vercel) → needs Upstash/KV.
15. Sensitive uploads (CVs, RNE docs) are public-but-unguessable blobs → needs private blob access.
16. Admin/university read-paths rely on layout-level guards alone (queries are no-auth by convention).
17. CSS long tail: ~1,950 arbitrary-value wrappers, per-screen CSS families (`.ph-/.db-/…`) to
    dissolve into primitives, `.ws` radius fork, ~40 minor violet patches, `mk-*` pruning.
18. Locale-blind `revalidatePath` (misses `/en/*` variants) · migration numbering collided twice
    (two `0019`s, two `0020`s) — needs a renumbering convention decision.
19. Parked branches (`feat/i18n-exhaustive`, `fix/i18n-sweep`, `fix/ux-polish`) need
    rebase-or-drop decisions — they predate the design pass.

---

## 4 · Build axes — what's worth doing next

Ranked by leverage. Effort: S = days · M = 1–2 weeks · L = month+.

| # | Axis | What it is | Why it matters | Effort |
|---|---|---|---|---|
| A1 | **Ship what's built** | Deploy `main`; onboard ENIT/ESPRIT on the university product; hand-curate ~30 launch internships | The university moat + 6 weeks of work are invisible until deployed. Zero build cost | **S (a decision)** |
| A2 | **Acquisition completeness** | `/contact` + `/about`, fix FR search, native-review FR copy, wire org-name search | Closes every dead end a prospect can currently hit | **S** |
| A3 | **Trust at scale** (Phase 5) | Tiered/self-serve verification, auto-suspend thresholds, public `/trust` page, QR verify on records | Removes the founder bottleneck — the #1 scaling constraint once GTM starts | **M** |
| A4 | **Retention loops** (Phase 3) | Digest emails, **WhatsApp notifications** (Tunisia-critical), community reply notifications, alumni mode + career-arc nudges | The platform currently has no reason to come back after one internship | **M** |
| A5 | **AI moat, phase 2** | Semantic match scoring, AI candidate summaries, deliverable-feedback drafter — and grow `pulse` into the **AI co-supervisor** (weekly synthesis for supervisors/coordinators; the cron + brainstorm already exist) | Differentiation competitors can't copy without the workspace data; pulse is uniquely yours | **M** |
| A6 | **Arabic + RTL + PWA** (Phase 6) | Third locale, RTL layout audit, installable PWA + web push | The broad-market unlock; PWA closes the no-mobile-app gap cheaply | **L** |
| A7 | **Public growth surfaces** | Public intern profiles (opt-in) + company pages, both SEO-indexed; share-to-LinkedIn record cards | Turns every record and profile into inbound marketing; near-zero CAC loop | **M** |
| A8 | **Hire-your-intern rail** | Post-internship conversion flow: company marks "would hire", alumni talent pool search, intro requests | Closes the loop interns care about most; the natural **monetization wedge** (success fee / talent-pool subscription) before generic Stripe plans | **M** |
| A9 | **Tunisia compliance rail** | Convention-de-stage *workflow* (upload/track/sign status — not PDF generation, which stays descoped), stipend/CNSS guidance content | Universities asked for it; cheap differentiation vs. job boards | **S–M** |
| A10 | **Hardening sprint** | Upstash rate limiting, private blobs, query-level read guards, locale-aware revalidation, migration renumbering | Pre-scale insurance; do before any marketing push | **S–M** |

**Suggested sequence:** A1 → A2 → A10 (one hardening week) → A3 + A4 in parallel → A5 → A7/A8 →
A6. Rationale: ship and close dead-ends first (days, not weeks), harden before traffic, then trust
+ retention build the road for the moat features.

**Explicitly not recommended** (unchanged from the strategy doc): generic DM/chat, code sandboxes,
full-time job board, freelance marketplace, building auth/analytics/payments in-house.

---

## 5 · Keeping this document honest

When a feature ships or an axis starts, update the table here AND the dated update block in
[`PRODUCT_OVERVIEW.md`](./PRODUCT_OVERVIEW.md). The code is the source of truth — when in doubt,
`ls modules/` and read `docs/planning/HANDOFF.md`.
