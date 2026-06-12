# Curated Talent Pool — design & build brief

> **What this is:** the design and product brief for inturn's flagship new motion — a **concierge
> recruiter service** where inturn itself qualifies the best interns and offers them to companies.
> Written 2026-06-11 from a brainstorm with Sam. **Decision locked:** this becomes the *main
> business* (the free marketplace is demoted to the top-of-funnel + data factory).
>
> **For Claude Design:** the screen specs in §6 are the brief. Build them in the existing
> **Atelier** design language (see §9). It's an **admin/internal** surface.
> **For the developer:** §7 (data model) + §8 (how it plugs into the existing code) + §10 (rollout).
> Related: the build-axes doc lists this as axis A8 — [`../../product/PLATFORM_INVENTORY_AND_AXES.md`](../../product/PLATFORM_INVENTORY_AND_AXES.md).

---

## 1. The idea in one paragraph

Today inturn is a job board: companies post internships, interns apply, companies choose. The new
motion: **inturn acts as a recruiter.** Our team keeps a **"bench"** — a ready list of qualified
interns — and proactively offers hand-picked **shortlists** to companies ("here are 3 great interns
for this role"). We can do this because we own a signal nobody else has: **proof of who actually did
good work**, captured from real project workspaces on the platform. Companies pay a fee when a
placement succeeds.

**Why it's the main business:** it's where the trust, the money, and our data moat converge — and,
unlike a marketplace, it doesn't need both sides to show up at once (we build the bench, then go
sell it). The free marketplace keeps running underneath: it brings people in for free and quietly
collects the work-performance data that powers the bench.

## 2. How it fits the platform we already have

| Layer | Role in the new model |
|---|---|
| **Marketplace** (existing) | Top-of-funnel + **data factory**. Free. Brings interns + companies in; the work they do generates the performance proof. |
| **The Pool / recruiter service** (NEW) | The product. inturn qualifies interns and brokers curated shortlists to companies. Monetized. |
| **University product** (existing) | A **supply channel** — ENIT/ESPRIT students are vetted-tier candidates; a coordinator's endorsement is a qualification signal we don't have to generate. |
| **Records + events** (existing) | The moat. They auto-compute the "Proven" tier score — no new data collection. |

## 3. The model — two pipelines bridged by the bench

Two separate pipelines that meet at the bench:

- **Supply pipeline (qualify):** raw talent → qualified, offerable bench. *(The "how to qualify"
  pipeline — see §4.)*
- **Demand pipeline (offer):** a company request → matched shortlist → pitch → placement.
- **The bench** sits between them: the ready pool of qualified interns the demand side pulls from.

Keeping them **separate** (vs. one unified pipeline) is deliberate: it lets us build a ready bench
*ahead* of demand and proactively pitch — the whole advantage during cold-start. A unified pipeline
would couple "is this intern good?" to "is there an opening right now?", which kills the ability to
sell proactively.

## 4. Qualification — the two-lane pipeline & the scorecard

**The pipeline has five stages, with two lanes into it:**

```
Vetted lane (fresh opt-ins):   Intake → Screen → Assess → Interview → Qualified
Proven lane (platform alumni):  Intake ─────────── (auto) ──────────→ Qualified
                                                                         ↓
                                                                  on the bench
                                              (a Hold / re-apply off-ramp at the decision)
```

- **Vetted lane** — interns we check by hand. `Intake` (they opt in / we source them) → `Screen`
  (complete profile, verified identity, basic eligibility) → `Assess` (a short skills test *or* a
  portfolio / work-sample review) → `Interview` (a ~15-min human screen: communication, drive,
  FR/EN level) → `Qualified`.
- **Proven lane** — platform alumni. They **skip the middle entirely** — auto-qualified from data we
  already have. This is the moat: we're the only ones who know they shipped real deliverables, on
  time, and earned a strong supervisor rating in a real workspace.
- **Hold / re-apply** — the decision can also park a candidate ("not yet — come back after one
  internship").

**The scorecard — what we qualify *on*** (this produces a 0–100 score + a tier):

| Proven tier — *auto-computed* from existing data | Vetted tier — *assessed by the team* |
|---|---|
| deliverables shipped + version history (`deliverables`) | profile completeness + verified ID |
| on-time vs. overdue rate (`tasks` due dates, `events`) | skills test score **or** portfolio review |
| supervisor star rating(s) (`records`) | screening-interview notes (comms / drive / language) |
| check-in reliability (`checkins`, `events`) | optional reference (prior supervisor / professor) |
| the verified record itself (`records`) | university-coordinator endorsement (if applicable) |

**Output = one "Qualification card":** a 0–100 **score**, a **tier** badge
(`Proven` / `Vetted` / `Rising`), **readiness badges** (`skills verified` · `available now` ·
`remote-ready` · sector tags), an **availability window**, and target roles/sectors. This card is
what lives on the bench and what goes into a pitch.

## 5. Open product questions (decide before / during build)

- **Score weights:** how much each signal counts toward the 0–100. Start simple (e.g. proven =
  ratings 40% + on-time 30% + deliverables 30%), tune later.
- **The Hold bar:** minimum score / signals to reach the bench. Set it *high* early — brand risk
  (§10). Better a small great bench than a big mediocre one.
- **Tier names:** `Proven / Vetted / Rising` are placeholders — pick names that read well in FR.
- **Placement fee:** flat amount vs. % of stipend; who's invoiced; when.

---

## 6. The screens (the design brief)

Build order: the **bold v1** screens first; the rest are v1.1. All are **admin/internal** except
6.8 (the company-facing pitch) and 6.9 (the intern-facing status), which are external.

### 6.1 Concierge console — the home dashboard *(v1)* — admin
The control tower. One screen the team opens every morning. Four zones, top to bottom:
1. **KPI row** (5 stat tiles, the admin KPI idiom): `On the bench` (split by tier) · `In
   qualification` (count across stages) · `Open requests` (+ how many unmatched, in warning tone) ·
   `Offers out` (awaiting reply) · `Placed this month` (+ fees due, in success tone).
2. **Offer pipeline** — a 4-column board: `Requested → Matching → Pitched → Placed`, each column
   with request cards ("Dazz Studio — UX intern ×1", "sent 2d ago").
3. **Needs you today** — the daily worklist: candidates to screen / assessments to review /
   interviews to book / requests needing a shortlist / pitches to follow up / benchers expiring
   soon. Each row = icon + label + count, clickable to the relevant queue.
4. **The bench (preview)** — top qualification cards with a filter hint; links to the full bench.

*(A faithful mockup of this screen exists from the brainstorm — match its structure.)*

### 6.2 The bench — full page *(v1)* — admin
The qualified pool. A filterable list/grid of **qualification cards**.
- **Filters:** tier · skill · sector · availability (`available now` / `in N weeks`) · score range.
- **Card:** avatar + name, tier badge, score, top skills (chips), availability, a `verified` mark
  for proven candidates. Click → candidate detail (6.3). Multi-select → "add to a shortlist".
- **Empty state:** "No one on the bench yet — qualify your first candidates."

### 6.3 Candidate qualification detail / scorecard *(v1)* — admin
Everything about one intern.
- **Header:** avatar, name, tier badge, big score, availability, target sectors/skills.
- **The proof (the centerpiece):** for **proven** candidates — links to their *real verified record*
  and the actual deliverables they shipped, with the supervisor rating, on-time rate, check-in
  reliability (use the **cyan / accent** treatment — in our system cyan = verification/proof). For
  **vetted** candidates — the skills-test result, portfolio link, and interview notes.
- **Score breakdown:** each signal and its contribution to the 0–100.
- **Stage controls:** advance stage / put on Hold / mark Qualified / set tier. (Advancing to the
  bench is a **value moment** → the only violet button here.)
- **Actions:** add to a shortlist, edit availability, add a note. History/timeline of stage changes.

### 6.4 Qualification pipeline board — kanban *(v1.1)* — admin
The supply pipeline as a board: columns `Intake · Screen · Assess · Interview · Qualified`, candidate
cards you drag to advance. Proven candidates appear pre-placed in `Qualified`. This is the visual way
to run the daily screening work (an alternative to the "Needs you today" list).

### 6.5 Company request intake *(v1)* — admin (company-facing form later)
Capture a company's ask: company (org) · role title · skills wanted · count · timeline · free-text
brief. Creates a **request** that enters the offer pipeline at `Requested`. v1: the team enters it
(often from a call). Later: a company-facing "request talent" form.

### 6.6 Match & build shortlist *(v1)* — admin
For one request: the system **suggests** candidates from the bench (ranked by skill/sector overlap +
availability + score — reuse the existing `lib/match.ts` logic), the team picks 3–5, and assembles a
shortlist. Shows why each was suggested ("3 of 4 skills · available now · 92").

### 6.7 The pitch / proof packet *(v1)* — **company-facing** (shareable link)
What the company receives. **This is the differentiator — lead with proof, not CVs.** A clean,
branded page: 3–5 candidates, each shown with their **verified record** front and centre ("here's
exactly what she shipped in a real 12-week project, rated 4.6 by her supervisor"), top skills, and
availability — *not* a résumé. Per candidate the company can mark `interested / pass / request
interview`. States: draft (admin editing) vs. sent (read-only, tracked). Uses the existing public
share-link pattern (like `/records/[token]`).

### 6.8 Placement → workspace handoff *(v1)* — admin
When a company accepts a candidate: convert the placement into a **real inturn internship +
workspace** (reuse the accept-application → workspace flow). This (a) generates more moat data and
(b) keeps inturn in the relationship. Track the **fee** (amount, status: due / invoiced / paid) and
the outcome. After the internship, the company rates it — and **that rating feeds back into the
candidate's score** (the loop that makes qualification smarter and protects our brand).

### 6.9 "Join the pool" + my status *(v1.1)* — **intern-facing**
Interns opt in and see their qualification status: which tier they're in (or how to get in), what's
needed, and — for proven candidates — that their real work earned them a spot. This makes the pool
**aspirational** ("do a great internship → get into the pool → get hand-offered to companies"), a
retention hook the platform doesn't have today.

---

## 7. Data model (light — sits on top of existing tables)

New tables (Drizzle, following the existing `db/schema/` convention):

- **`pool_candidates`** — `id, userId→users, tier (proven|vetted|rising), stage
  (intake|screen|assess|interview|qualified|hold), score int, scoreBreakdown jsonb, skills text[],
  sectors text[], availabilityFrom date?, availabilityStatus, sourcedFrom
  (opt_in|sourced|university|application), notes, createdAt, updatedAt`.
- **`talent_requests`** — `id, orgId→organizations, roleTitle, skillsWanted text[], count,
  timeline, brief, status (new|matching|pitched|placed|closed), createdBy→users (admin),
  timestamps`.
- **`shortlists`** — `id, requestId→talent_requests, status (draft|sent|responded|accepted|declined),
  shareToken, sentAt, timestamps`.
- **`shortlist_candidates`** — `shortlistId, candidateId→pool_candidates, position, companyResponse
  (interested|pass|interview)?`.
- **`placements`** — `id, requestId, candidateId, orgId, status
  (placed|started|completed|fell_through), workspaceId→workspaces? (set when the internship spins
  up), feeAmount?, feeStatus (due|invoiced|paid)?, placedAt, timestamps`.

Reused as-is: `users`/`profiles` (the intern), `organizations` (the company), `records` + `events` +
`deliverables` + `checkins` (the proven-tier signals), `applications` (an intake source),
`workspaces` (the placement handoff target), `lib/match.ts` (shortlist suggestions).

Follow the module convention: `modules/talent-pool/{queries,service,server-actions}.ts`, admin-gated.

## 8. How it plugs into the existing code

- **Proven score** = a pure function over `records` + `events` + `deliverables` + `checkins`. No new
  data capture — it reads what's already logged. Recompute on a schedule or on workspace events.
- **Intake source** — a strong applicant who didn't land a specific role → one-click "invite to the
  pool" from the existing applications inbox.
- **University supply** — coordinator endorsement becomes a scorecard signal; students are a
  vetted-tier source (respect the existing firewall — the coordinator vouches, the company workspace
  stays private).
- **New admin section** — a "Talent pool" area alongside the existing `admin/` console
  (verification, users, reports). Same auth gates.
- **Placement** reuses `acceptApplication` → workspace creation.
- **Pitch packet** reuses the public token-share pattern (`records/[token]`).

## 9. Design / brand rules (for Claude Design)

Build in the shipped **Atelier** design language so these screens match the rest of the admin area
(we just did an Atelier pass on admin — mirror it):

- **It's an admin surface:** mono uppercase "eyebrow" section labels, **KPI stat tiles**, cards with
  the resting elevation (`--elev-card`), `StatusPill` for every status/stage, the shared gradient
  **Avatar**, mono table/column headers.
- **Colour discipline (important):** chrome is **ink** (near-black) — buttons, nav, filters.
  **Violet (`--brand-500`) only at value moments:** `Approve to bench`, `Send shortlist`,
  `Mark placed`. **Cyan (`--accent-500`) = verification/proof** — use it for the verified-record
  proof elements on the candidate detail and the pitch packet (it reinforces "this is real,
  verified work"). Don't use violet for everyday actions.
- **Tier badges:** on the status-pill token pattern (e.g. proven = a confident tone, vetted =
  neutral-info, rising = warm) — mono, uppercase, small.
- **Type:** Bricolage Grotesque display headings, Geist body, Geist Mono for eyebrows/codes/scores.
- **Bilingual FR/EN** — every label is a translation key (the codebase enforces this).
- Reference: `app/[locale]/(platform)/admin/*` for the admin idioms, `components/status-pill.tsx`,
  `components/avatar.tsx`, and the brand foundations in `docs/design-bundle/`.

## 10. Rollout — how to start (don't build it all at once)

1. **One vertical first: design/brand interns.** We can actually judge a designer's portfolio; we
   can't yet credibly vet a backend engineer. "The place to find vetted junior designers in Tunis"
   is a sharp wedge. Our seed data + network are design-heavy already.
2. **Seed the bench by hand** — 20–30 strong candidates (best applicants + any alumni + ENIT/ESPRIT
   students). The console replaces a spreadsheet; that's the v1 job.
3. **Push first, don't wait for demand.** Pick ~10 target companies, pitch 3 standouts to each. The
   offer pipeline runs on *our* outbound at first; inbound requests come as reputation builds.
4. **Charge a placement fee** — paid only when a placement succeeds. No upfront price. Subscriptions
   /retainers come later, once companies hire repeatedly.
5. **Concierge now, automate later.** Build the console so the queues *can* be automated: proven
   scoring already is; profile-completeness screening can auto-advance; shortlist suggestions are
   AI-assisted off `lib/match.ts`. Don't architect a human-only tool.

## 11. Risks & mitigations

- **Our brand is now on the line.** The moment we vouch for someone, a bad placement burns a
  company's trust in inturn. → Keep the Hold bar high, start in one vertical we can judge, and use
  the post-placement rating feedback loop (§6.8) so quality compounds.
- **Concierge doesn't scale (human-time-bound).** → Fine to start (it builds trust + data); the
  automation path (§10.5) is the release valve. Watch the "Needs you today" queue depth as the
  signal to automate.
- **Supply/demand imbalance.** Over-qualifying a bench nobody wants, or requests we can't fill. →
  The console KPIs (bench vs. open vs. unmatched) are the instrument; qualify to *slightly ahead* of
  demand, not a giant speculative bench.
- **Two-tier perception among interns.** A "chosen" pool could demotivate everyone else. → Make the
  entry path transparent and merit-based (do a great internship → become Proven). Framed right, the
  pool is aspirational, not exclusionary — and it's a retention hook.
- **Channel question with the marketplace.** Decided: marketplace = free funnel + data factory; the
  pool is the product on top. They're complementary, not competing.

## 12. Explicitly NOT in v1 (YAGNI)

Company-facing self-serve request form (team enters requests at first) · subscriptions/retainers
(placement fee only) · multiple verticals (design only) · automated qualification (manual first) ·
the intern-facing "join the pool" surface (6.9 is v1.1) · the qualification kanban (6.4 is v1.1).

---

## 13. Summary

inturn becomes a **proof-backed recruiter** for early talent: it qualifies interns — instantly for
those who already proved themselves in real workspaces, by hand for promising newcomers — keeps a
ready bench, and pitches curated shortlists that lead with *real verified work, not CVs*. The admin
console runs both pipelines (qualify + offer) and the bench between them. Start narrow (design),
seed by hand, pitch proactively, charge per placement, and automate the busywork as it grows. The
free marketplace keeps feeding it the one thing no competitor can buy: proof of who's actually good.
