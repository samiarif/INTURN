# inturn — Product Overview & Backlog (business)

> **For:** Sam (CEO/COO). The non-engineering view of where the platform
> stands — what it does, what's built, what's shipped to real users vs.
> sitting verified-but-undeployed, the full feature backlog, and the
> nice-to-haves. For the engineering view, see
> [`TECHNICAL_OVERVIEW.md`](../technical/TECHNICAL_OVERVIEW.md).
>
> **Updated:** 2026-05-31, **plus the 2026-06-11 update block below** (read it first — the body
> predates two weeks of work). For the by-module inventory + build axes, see
> [`PLATFORM_INVENTORY_AND_AXES.md`](./PLATFORM_INVENTORY_AND_AXES.md).

---

## ⓪ 2026-06-11 update — what changed since this doc's snapshot

Everything below landed on `main` (now pushed to GitHub) and is **built & verified, awaiting one
deploy** unless marked otherwise. Health re-verified: **635 tests pass** · typecheck + lint +
i18n-parity + production build clean.

1. **Academic deliverables (livrables) are merged** — no longer "in review". Students submit typed
   livrables (rapport/présentation/diagramme/autre); coordinators review each independently.
2. **Project Sprints** *(new since this doc)* — companies plan sprints on a project (manually or
   AI-generated), new workspaces auto-seed from the sprint blueprint, and the intern's tasks board
   becomes sprint-aware (sprint switcher, per-sprint progress, move-task-between-sprints).
3. **A full-repo audit + fix sprint** — 10 correctness/security fixes, the visible ones: sprint
   management now updates instantly (it looked broken), legal pages are reachable logged-out,
   workspace **dark mode works**, check-ins default to the right Tunisian hour, notifications can
   no longer be silently dropped by the serverless platform, branded 404.
4. **The "Atelier" design system** — the answer to "it looks generic": ink-colored chrome with
   violet reserved for value moments (apply, publish, accept, approve), one radius + shadow system,
   violet focus rings, mono section labels, entrance motion — applied platform-wide plus dedicated
   passes on the previously-unstyled team, university, admin, hiring-flow, and form screens.
5. **The marketing website now lives inside the platform** as its public front door: home,
   how-it-works, for-companies, **for-universities** (E29 ✅), for-interns, virtual-internships,
   and **verify** (wired to the real record lookup). Fully bilingual — the FR copy is AI-written and
   needs Sam's native review. The standalone `inturn-web` app is superseded.
6. **The P0 record-PDF bug fix is merged and pushed** — it stops being live the moment production
   is redeployed (§7.1 below is otherwise stale).
7. **Repo handed to a new developer** — real root README, complete `.env.example`, refreshed docs;
   `origin/main` is in sync with local; production still runs the 2026-05-30 build (deploy = manual
   decision).

**Still true from the body:** the strategic read (§8 — supply, trust, distribution are the
bottleneck), the Phase 3/5/6 backlog status, and the cold-start/verification gaps (§7.3–7.5).

---

## 1. What inturn is

**inturn** is the early-talent operating system for Tunisia and beyond. One
platform, three audiences:

- **Students** discover internships, apply with one profile, do real work inside a dedicated **project workspace**, and walk away with a verified track record.
- **Companies** post internships, recruit, and run structured programs *inside* inturn (not in WhatsApp), with performance data from real work.
- **Universities** supervise their students' internships in real time and review their academic deliverables.

**Three pillars:** Marketplace · Virtual Internships · Community — all sitting on one core, **the Project Workspace**, where the data moat is built.

**The moat:** performance data from real work. After 12 months of operation, inturn knows things about Tunisian early-talent that no competitor (Hi Interns, Tanitjobs, iAgora) can back-fill.

---

## 2. Status at a glance

The platform is **functionally launch-ready** and has been for weeks. The bottleneck is no longer features — it's go-to-market (supply, trust, distribution). See [§8](#8-strategic-context).

**Health (verified 2026-05-31):** 482 automated tests pass · typecheck + lint + build clean.

### ⚠️ The deploy gap — read this
There's a **large gap between what's built and what real users see today.**

*(2026-06-11: this table is superseded by the update block at the top — there are now only TWO
states: **production** (the 2026-05-30 build) and **`main` on GitHub** (everything: University
product + livrables + sprints + audit fixes + Atelier design + the marketing site).)*

| Where | What's there | In front of users? |
|---|---|---|
| **Production** (`inturn.vercel.app`) | Full core platform + Phase-1 polish (Sentry, analytics, CV import, templates, first-time checklists) + team management. | ✅ **Yes — this is live.** |
| **`main`** (pushed, not deployed) | All of the above **+ University product + livrables + sprints + audit fixes + Atelier design + marketing site**. | ❌ **No — built & verified, one `vercel --prod` away.** |

**Translation:** the University product — arguably the biggest strategic feature — is **fully built and tested but not yet live**. Shipping it is a deploy decision, not a build effort. (Deploys are manual: someone runs `vercel --prod`.)

**Status legend used below:**
✅ Live in production · 🟡 Built & verified, not deployed (local `main`) · 🔵 Built, in review (branch) · ⬜ Not started · ⛔ Descoped

---

## 3. What each user can do (end-to-end)

**Intern:** sign up → onboard (profile, skills, optional CV import) → browse marketplace (filter by sector/location/duration/skills/language/paid, match score, bookmark) → apply with cover note + custom questions → track application status → on acceptance, work inside the **workspace** (tasks, deliverables with versions, comments, weekly check-ins, AI unblocker) → receive a verified **PDF record** with a shareable link → withdraw applications / export or delete account (GDPR). *(University students additionally submit academic livrables for coordinator review — 🟡 not yet live.)*

**Company:** sign up → get org verified (admin reviews) → invite teammates (multi-seat: owner/admin/supervisor) → create projects with goals + phases → publish internships (with template scaffolds + AI drafting assists) → review applications in an inbox, compare candidates side-by-side, leave internal notes → accept (auto-creates the workspace) → supervise the work → issue an end-of-internship **record** with a star rating.

**University coordinator** *(🟡 built, not live):* get provisioned by admin → invite students (one-by-one or **CSV bulk import**) → manage a multi-coordinator team (head + encadrants), assign students to encadrants → see each student's internship **phase** via a privacy-firewalled snapshot (never the company's workspace) → review their academic **livrables** (approve / request changes / comment).

**Admin:** dashboard with KPIs + queue health → verify organizations → moderate reports with an audit trail → suspend/reactivate users → provision universities → export audit log as CSV.

---

## 4. Features built (inventory)

### A · Accounts, onboarding & profiles
- ✅ Clerk auth (3 self-serve roles + assigned admin/university), webhook user sync
- ✅ Intern onboarding wizard (basics → skills → done) with progress + resume
- ✅ Company onboarding + org verification flow
- ✅ Profile edit, profile-completeness widget with missing-field chips
- ✅ CV import — drop a PDF, Claude extracts profile fields *(roadmap E3)*

### B · Marketplace & discovery
- ✅ Public marketplace (SEO-indexable, no login to browse)
- ✅ Filters: sector, location type, duration buckets, skills, language, paid/unpaid
- ✅ Full-text search + match score + "Why these" explainer + city facet
- ✅ Bookmarks / saved tab
- ✅ Internship detail page + one-click apply + custom questions

### C · Applications & hiring pipeline
- ✅ Status pipeline (New → Reviewed → Shortlisted → Interview → Accepted → Rejected)
- ✅ Company inbox + candidate compare (side-by-side) + internal notes
- ✅ Accept → auto-creates workspace
- ✅ "Close the loop": status-change notifications, optional decision note to applicant, status timeline with aging
- ✅ Intern application tracker + withdraw

### D · The Project Workspace (the core)
- ✅ Auto-created on acceptance; role-aware (intern vs supervisor views of the same data)
- ✅ Tabs: Overview · Tasks · Deliverables · Timeline · Comments · Check-in
- ✅ Tasks board (drag-and-drop, touch + keyboard accessible) + AI task-clarity assist
- ✅ Versioned deliverables (version stack, role-aware actions, public share link)
- ✅ Cursor-paginated comments thread
- ✅ Weekly check-in with a Claude-drafted starter
- ✅ Author-private workspace notes · Nudge (supervisor → intern) · AI "stuck" unblocker
- ✅ Append-only event log behind everything (the performance-data moat)

### E · Records (the credential / moat)
- ✅ End-of-internship PDF record with star rating + structured snapshot
- ✅ Public shareable link (token-based), soft-revocable
- ⚠️ **Known bug (live):** logged-out recipients can view the record page but get a 401 downloading the PDF. Fix is built but unmerged — see [§7](#7-known-gaps--limitations).

### F · Community
- ✅ Intern feed v1: posts, comments, report, author/admin delete, moderation
- ⬜ Reply notifications, likes, nested replies, editorial/pinned posts (deferred)

### G · Notifications & email
- ✅ In-app notification bell + dispatcher
- ✅ Transactional email (Resend), FR + EN templates, per-recipient language
- ✅ Per-user notification preferences (honored by the dispatcher)
- ⬜ Digest emails (daily/weekly), WhatsApp channel

### H · AI assists (all human-in-the-loop, rate-limited, degrade gracefully)
- ✅ Task-clarity assist (flags vague tasks) · Intern unblocker
- ✅ Weekly check-in drafter
- ✅ Smart project-creation assists: reformulate description, suggest goals, draft phases, suggest deliverables, suggest application questions *(covers roadmap E13)*
- ✅ CV parser
- ⬜ Semantic match scoring, AI candidate summary, mock interview, deliverable-feedback drafter, smart task suggestions *(roadmap E8–E11, E14)*

### I · University product 🟡 *(built & verified, not yet deployed)*
- 🟡 University = an organization of `kind='university'`; coordinator role + guard
- 🟡 Admin provisions a university + invites the coordinator
- 🟡 Firewalled student snapshot — coordinator sees internship **phase**, never the company workspace
- 🟡 Coordinator roster dashboard + per-student review surface
- 🟡 **Multi-coordinator structure** — head + encadrants, per-student assignment, head-only reassignment
- 🟡 **CSV bulk student invite** (dedupe, validation, 100-row cap) + pending-invite resend/revoke
- 🟡 Academic rapport review loop (submit → approve / request-revision / comment)
- 🔵 **Typed academic deliverables (livrables)** — rapport / présentation / diagramme / autre, each reviewed independently *(in review on `feat/academic-deliverables`)*
- ⛔ Convention de stage PDF — **descoped permanently** (Tunisian universities bring their own template)
- ⬜ Self-serve `/onboarding/university` wizard + `/for-universities` landing page

### J · Team / multi-seat
- ✅ Multi-seat companies: invite / accept / remove / role-change; per-project supervisor management; cross-tenant IDOR closed

### K · Admin, trust & moderation
- ✅ Admin dashboard with KPIs + verification queue health (oldest-first)
- ✅ Org verification, user management (suspend/reactivate, suspended-user write-block)
- ✅ Reports moderation queue + append-only audit log + CSV export
- ✅ Verification SLA banner for companies *(roadmap E6)*

### L · Legal & GDPR
- ✅ Terms / Privacy / Cookie policy (FR + EN, Tunisian-law framing) + cookie banner
- ✅ GDPR data export + account deletion (with re-confirmation + cascade)
- ✅ Site footer (product + legal + contact)

### M · Platform-wide
- ✅ Bilingual FR/EN · ✅ Dark mode (no flash) · ✅ Mobile responsive (drawer nav)
- ✅ Accessibility pass (skip-to-content, focus rings, labels) · ✅ SEO (sitemap, robots, OG images, per-page metadata)
- ✅ Security: upload MIME/magic-byte allowlist, rate limiting (9 buckets), health endpoint
- ✅ Observability: Sentry (errors) + PostHog (analytics) — both env-gated *(roadmap E1, E2)*
- ✅ Performance: cached marketplace, streamed workspace, DB indexes, CI gating

---

## 5. Roadmap / backlog — honest status (E1–E70)

The roadmap is 70 numbered items across 12 phases ([`DEV_ROADMAP.md`](../planning/DEV_ROADMAP.md)). Status as built:

### Phase 1 — Production essentials → **DONE** ✅
E1 Sentry · E2 PostHog analytics · E3 CV parser · E4 internship templates · E5 first-time checklists (+ confetti) · E6 verification SLA banner · E7 admin queue health — **all live.**

### Phase 2 — AI moat → **partial**
| | Item | Status |
|---|---|---|
| E8 | Semantic AI match score | ⬜ (still heuristic skill-overlap) |
| E9 | AI candidate summary (company) | ⬜ |
| E10 | AI mock interview (intern) | ⬜ |
| E11 | AI deliverable-feedback drafter | ⬜ |
| E12 | AI check-in synthesizer | 🟡 partial (Claude-drafted starter exists) |
| E13 | AI project brief expander | ✅ (shipped as inline create-assists) |
| E14 | AI smart task suggestions | ⬜ |

### Phase 3 — Engagement loops → **mostly not started**
E16 notification preferences ✅. Not started: E15 digest emails · E17 WhatsApp/Twilio · E18 community reply notifications · E19 public intern profiles · E20 public company pages · E21 multi-internship career arc · E22 community editorial · E23 alumni mode.

### Phase 4 — University product → **DONE (reframed) + extended**
| | Item | Status |
|---|---|---|
| E24 | University schema + role | ✅ built (as `kind`+member role, not a separate table) |
| E25 | University onboarding | 🟡 admin-provisioned (no self-serve wizard yet) |
| E26 | CSV bulk student invite | 🟡 built |
| E27 | Coordinator dashboard | 🟡 built — **reframed** to per-student supervision (not anonymized aggregates) |
| E28 | Convention de stage PDF | ⛔ descoped permanently |
| E29 | `/for-universities` landing | ✅ *(2026-06-11 — shipped with the in-repo marketing site)* |
| E30 | University auth + permissions | 🟡 built (firewall + per-student model) |
| — | **Beyond roadmap:** multi-coordinator structure, encadrant assignment, pending-invite mgmt, typed livrables | 🟡/🔵 built |

> All Phase-4 work is **built & verified but not deployed** — shipping it is a `vercel --prod` away.

### Phase 5 — Trust at scale → **not started**
E31 tiered/auto verification · E32 verification quiz · E33 auto-suspend on report threshold · E34 public `/trust` page · E35 record QR verify · E36 2FA encouragement · E37 rate-limited report submission. *(Note: manual verification, suspend, and moderation already exist — these items are the self-serve/automated versions.)*

### Phase 6 — Arabic + PWA → **not started**
E38 Arabic locale · E39 RTL · E40 PWA install · E41 web push · E42 mobile-first deliverable upload. *(Arabic + RTL is a big Tunisian-market unlock.)*

### Phases 7–12 → **not started**
Records ecosystem & alumni network (E43–E48) · power features (E49–E56: drafts autosave, CSV export, bulk actions, saved-search alerts, publish scheduling, multi-org, custom questions polish, internal company chat) · trust differentiation (E57–E60: public reviews, insurance/legal helper, SIS import, ID verification) · monetization / Stripe (E61–E65) · React Native app (E66) · AI-native (E67–E70: career advisor chat, HR copilot, project scoper, compliance checker).

---

## 6. Nice-to-haves (deferred, not lost)

Smaller polish + "yes-but-later" items that are worth doing but were deliberately deferred:

**University (natural next steps):**
- Coordinator-defined **required-deliverable checklist** (university mandates which livrables each student must submit)
- **Per-deliverable due dates** (the `due_date` column already exists, just unused)
- Per-**section** structure inside a single deliverable
- Self-serve university onboarding + `/for-universities` landing (E25/E29)
- Soften the same-university-coordinator hard-404 on the review surface (show "supervised by X" instead)

**Engagement / retention (high strategic value when GTM is ready):**
- Daily/weekly digest emails · WhatsApp notifications (Tunisians prefer WhatsApp)
- Alumni mode + "your next internship" career-arc nudges
- Community editorial calendar + reply notifications + likes

**Polish / product gaps surfaced during design work:**
- Hours-tracking, cohort benchmarks, profile-completeness % on more surfaces
- Joint-sync scheduling (currently per-workspace check-in only)
- Deliverable-linked tasks, comment/attachment counts on task cards
- Tasks calendar week view
- Drafts auto-save on long forms (E49) · CSV export of applications (E50) · bulk application actions (E51)

**Engineering nice-to-haves:**
- Exhaustive bilingual i18n (specced, branch in progress, lint-enforced)
- Integration tests in CI · `'use cache'`/PPR adoption · per-card Suspense streaming
- Swap in-memory rate limiter for Upstash (multi-instance safety)
- Custom domain `inturn-hub.com`

---

## 7. Known gaps & limitations (be honest with partners)

1. **🔴 Live PDF-download bug.** Logged-out people opening a shared **record** link can read the page but get an error downloading the PDF. *(2026-06-11: the fix is **merged and pushed** — it remains live in production only until the next deploy.)*
2. **University product isn't live yet.** It's fully built and tested but undeployed — don't demo it from production until it's shipped.
3. **Cold-start / empty marketplace.** ~9 seeded internships. A real first visitor sees a near-empty marketplace. Needs hand-curated launch supply.
4. **Verification bottleneck.** Every company is verified manually by you — caps onboarding at roughly your personal capacity. Self-serve verification (Phase 5) isn't built.
5. **No retention loop after the first internship.** No digests, alumni surface, or career-arc nudges yet.
6. **Acquisition pages.** *(2026-06-11: mostly closed — the in-repo marketing site now has `/for-universities`, `/for-companies`, `/for-interns`, `/how-it-works`, `/virtual-internships`, `/verify`. Still missing: `/about` and `/contact` — university "Talk to us" CTAs are coming-soon until then.)*
7. **Match score is heuristic** (skill overlap %), not semantic AI yet.
8. **No Arabic** (FR/EN only) — limits the broad Tunisian-market reach.

---

## 8. Strategic context & near-term priorities

From the strategy review ([`PRODUCT_STRATEGY.md`](./PRODUCT_STRATEGY.md)): *"We have a beautiful Ferrari and an empty road. The next weeks are about building the road, not adding turbo."* The feature set is no longer the bottleneck — **supply, trust, and distribution are.**

**The three things that matter most:**
1. **Solve the two-sided cold-start** — hand-curate ~30 quality internships across 4 sectors before broad acquisition (your outreach, not engineering).
2. **Remove the trust bottleneck** — self-serve verification with optional manual review (Phase 5).
3. **Land the university product** — it's the moat and a B2B revenue line. **It's already built — the move is to deploy it and onboard ENIT/ESPRIT.**

**Concrete near-term sequence (low effort, high leverage):**
- **Ship what's already built:** deploy local `main` (University + University-at-Scale) to production, after merging the P0 record-PDF fix and reviewing `feat/academic-deliverables`.
- Add the missing acquisition pages (`/about`, `/for-universities`, `/contact`).
- Then: digest emails + community editorial (retention) and self-serve verification (trust at scale).

**Explicitly NOT recommended** (avoid scope creep): DMs/chat, code sandbox, full-time job board, freelance marketplace, building our own auth/analytics/payments.

---

## 9. Where the detail lives

| Doc | What |
|---|---|
| [`TECHNICAL_OVERVIEW.md`](../technical/TECHNICAL_OVERVIEW.md) | Architecture, stack, data model, deploy — for developers |
| [`HANDOFF.md`](../planning/HANDOFF.md) | Session-by-session narrative *(current through the 2026-05-30 university snapshot; later milestones are in `git log` + specs)* |
| [`DEV_ROADMAP.md`](../planning/DEV_ROADMAP.md) | The full E1–E70 roadmap |
| [`PRODUCT_STRATEGY.md`](./PRODUCT_STRATEGY.md) | Go-to-market strategy, gaps, 6-week plan, success metrics |
| [`inturn-project-brief.md`](../inturn-project-brief.md) | The founding product brief |
| `docs/superpowers/{specs,plans}/` | Design specs + implementation plans per milestone |
| `docs/design-bundle/` | Brand foundations, journeys, component specs, mocks |
