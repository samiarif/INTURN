# inturn — Documentation Index

> The map for everything under `docs/`. Start here, then follow the path for your role.
> **Structure last organized:** 2026-05-31.

inturn is a Next.js 16 internship platform for Tunisia serving three audiences (interns/students,
companies, universities). The docs split into **authoritative references** (kept current),
**planning & status**, **historical archive**, and **raw design/process source**.

---

## Start here — reading paths by role

**New developer**
0. [`../README.md`](../README.md) — repo root: how to install, run, and the env/branch/deploy state
1. [`inturn-project-brief.md`](./inturn-project-brief.md) — what we're building & why
2. [`technical/TECHNICAL_OVERVIEW.md`](./technical/TECHNICAL_OVERVIEW.md) — how it's built (as-built) *(read its 2026-06-11 update block at the top for the marketing-site + Atelier design layer)*
3. [`technical/DIAGRAMS.md`](./technical/DIAGRAMS.md) — visual maps (ER, architecture, auth, flows)
4. [`planning/HANDOFF.md`](./planning/HANDOFF.md) — where we are now *(pair with `git log`)*

**Sam / business**
1. [`product/PRODUCT_OVERVIEW.md`](./product/PRODUCT_OVERVIEW.md) — what's built, what's shipped vs deployed, the backlog
2. [`product/PRODUCT_STRATEGY.md`](./product/PRODUCT_STRATEGY.md) — go-to-market, gaps, near-term plan
3. [`planning/DEV_ROADMAP.md`](./planning/DEV_ROADMAP.md) — the full E1–E70 roadmap

**AI session resuming cold**
1. [`planning/HANDOFF.md`](./planning/HANDOFF.md) — the resume point *(+ `git log` + `superpowers/specs/` for work after 2026-05-30)*
2. [`inturn-project-brief.md`](./inturn-project-brief.md) — the source of truth
3. [`technical/TECHNICAL_OVERVIEW.md`](./technical/TECHNICAL_OVERVIEW.md) — architecture

---

## The map

| Path | What | For | State |
|---|---|---|---|
| [`inturn-project-brief.md`](./inturn-project-brief.md) | Founding product brief — the source of truth for what we're building | everyone | ✅ current (2026-05-23) |
| [`product/PLATFORM_INVENTORY_AND_AXES.md`](./product/PLATFORM_INVENTORY_AND_AXES.md) | **The one-pager:** every module + feature as-built, what's missing, and the ranked build axes | Sam + developers | ✅ current (2026-06-11) |
| [`product/PRODUCT_OVERVIEW.md`](./product/PRODUCT_OVERVIEW.md) | What the platform does, built-vs-deployed status, full backlog, known gaps | Sam / business | ✅ current (2026-05-31 + 2026-06-11 update block) |
| [`product/PRODUCT_STRATEGY.md`](./product/PRODUCT_STRATEGY.md) | GTM strategy, gaps, 6-week plan, success metrics | Sam / business | ✅ current (2026-05-27) |
| [`technical/TECHNICAL_OVERVIEW.md`](./technical/TECHNICAL_OVERVIEW.md) | Authoritative as-built architecture: stack, data model, auth, deploy | developers | ✅ current (2026-05-31 + 2026-06-11 update block covering the in-repo marketing site & Atelier design layer) |
| [`technical/DIAGRAMS.md`](./technical/DIAGRAMS.md) | Visual maps: ER (22 tables), layered architecture, module anatomy, auth + university firewall, sequence flows | developers | ✅ current (2026-05-31) |
| [`planning/DEV_ROADMAP.md`](./planning/DEV_ROADMAP.md) | The 12-week E1–E70 build roadmap | dev + product | ✅ current |
| [`planning/HANDOFF.md`](./planning/HANDOFF.md) | Cold-resume session narrative + as-built record | resuming work | ✅ current (top TL;DR through 2026-06-11: audit fixes, Atelier, marketing site) |
| [`archive/SPRINT_PLAN_COMPLETENESS.md`](./archive/SPRINT_PLAN_COMPLETENESS.md) | Original completeness-sprint plan (S1–S4) | reference | 🗄️ superseded — shipped; see HANDOFF |
| [`superpowers/`](./superpowers/) | Dated brainstorm **plans** (18) + design **specs** (9) per milestone | deep design detail | 🗄️ append-only history |
| [`design-bundle/`](./design-bundle/) | Claude-Design handoff: chat transcripts + HTML/CSS prototypes + brand foundations | implementing UI | 📥 raw input (has its own README) |
| `app/[locale]/(site)/` + `components/landing/` + `app/landing.css` | The **marketing site**, now the platform's public front door (home + 6 pages), localized FR/EN | developers | ✅ current (ported in-repo 2026-06-10/11) |
| `superpowers/plans/2026-06-10-*` | The audit-fixes plan + the Atelier design-direction/phase-1 plan | developers | 🗄️ append-only — the design rationale of record |

**Legend:** ✅ authoritative & current · 🟡 current with a caveat · 🗄️ historical/superseded · 📥 raw input.

---

## superpowers/ — design specs & plans (append-only)

These follow the brainstorming-skill convention: one dated `specs/<date>-<name>-design.md` (the
design decision record) and a matching `plans/<date>-<name>.md` (the implementation checklist) per
milestone. They are **historical snapshots** — accurate as of their date, not maintained. The
**specs** are the more reference-worthy "why we built it this way" docs, grouped by theme:

- **Setup & completeness sprints** (2026-05-23 → 05-25) — `sprint1-finish-sprint2-overview-design`, `sprint3-design` (+ plans for sprints A–E, workspace streaming & canvas polish)
- **Platform & UX** (2026-05-27 → 05-30) — `sidebar-shell-and-task-fixes-design`, `user-management-design`, `application-close-the-loop-design`
- **University product** (2026-05-30 → 05-31) — `university-product-foundation-design`, `university-at-scale-design`, `academic-deliverables-design` (+ plans: foundation-provisioning, supervision-structure, academic-supervision, cohort-onboarding)
- **AI co-supervisor (Pulse)** (2026-05-30) — `pulse-ai-cosupervisor`

> Some superpowers docs reference doc paths as they were *before* the 2026-05-31 reorg (e.g.
> `docs/HANDOFF.md`, now `docs/planning/HANDOFF.md`). Those mentions are left as-authored — they're
> dated records. Use this index for current locations.

---

## Conventions

- **Authoritative vs historical.** The ✅ docs above are kept current and are the source of truth.
  The 🗄️ folders (`archive/`, `superpowers/`) are append-only history — don't "update" them, add new dated entries.
- **The brief is duplicated on purpose.** [`inturn-project-brief.md`](./inturn-project-brief.md) (root)
  is the canonical working brief; `design-bundle/project/uploads/inturn-project-brief.md` is the
  original upload, frozen inside the immutable design bundle. Edit the root copy only.
- **`README.md` at the repo root** is the engineering entry point (install / run / env / branch &
  deploy state). This index is the *documentation* map; the root README + `planning/HANDOFF.md` are
  the practical starting points for a new developer.
- **The code is the ultimate source of truth.** When a doc and the code in `db/schema/` or `modules/`
  disagree, trust the code and update the doc.
