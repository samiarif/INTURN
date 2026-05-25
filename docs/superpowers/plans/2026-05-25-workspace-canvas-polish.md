# Workspace Canvas Full Polish (Design 05) — Execution Plan

> **For agentic workers:** Sam handed off 4 hours of autonomous time to bring all 8 sections of the 05 Workspace Canvas design to fidelity. Deliverables (§06) is shipped. This plan covers the remaining 7 sections.

**Reference design:**
- PDF: `/Users/mac/Downloads/Inturn — 05 Workspace canvas · print.pdf` (rendered pages at `/tmp/pdf-pages/page-*.jpg`)
- JSX + CSS mocks at `/tmp/inturn-design-3/inturn/project/mocks/`

**Goal:** "Respect the UI" — bring our existing pages to design fidelity without inventing new product features.

---

## Status by section

| § | Design page | Mock file | Our route | Status |
|---|---|---|---|---|
| §01 | Workspace · Dashboard (supervisor home) | `workspace-dashboard.jsx` | `/company/dashboard` | Polished basic; needs 4-KPI grid, recent projects with progress bars, today's tasks list, calendar widget, upcoming syncs |
| §02 | Projects · Index | `projects-index.jsx` | `/company/projects` | **NOT BUILT** — need new page |
| §03 | Project · Detail (Hub) | `project-hub.jsx` | `/company/projects/[projectId]` | Very basic title + table → needs full hub redesign |
| §04 | Workspace · Overview | `workspace.jsx` | `/(intern\|company)/workspaces/[workspaceId]` | Structure matches; component-level visual polish needed |
| §05 | Workspace · Tasks (Board + Calendar) | `tasks-board.jsx` + `calendar-week.jsx` | `/.../workspaces/[id]/tasks` | Board exists with @dnd-kit; polish + add Calendar view |
| §06 | Workspace · Deliverables | `deliverables.jsx` | `/.../workspaces/[id]/deliverables` | **DONE** (Sprint just shipped) |
| §07 | Explore · Intern marketplace | `explore-internships.jsx` | `/marketplace` | Cards good; needs filter rail + AI match band + skill "have" state |
| §08 | Certificate · Internship complete | `certificate.jsx` | not implemented | Out of scope — defer (needs PDF generator + share token) |

## Execution order

1. **Project Hub** (§03) — biggest visual delta, single page, no schema needed → ~45 min
2. **Workspace Overview** (§04) — most-visited page; component-level polish → ~45 min
3. **Company Dashboard** (§01) — supervisor first paint → ~30 min
4. **Marketplace polish** (§07) — filter rail style + match band + skill chips → ~30 min
5. **Projects Index** (§02) — new page → ~30 min
6. **Tasks polish** (§05) — board polish only; calendar view deferred → ~20 min
7. **Audit + push** → ~15 min

Skipping (with justification):
- §05 calendar week view: requires more product thought (date pickers, slot CRUD) — TODO note
- §08 certificate: needs PDF generator + share-token infra — Sprint D/E

## Constraints

- Single branch `sprint-b-phase-1-closure` (already at sprint-c+ tip)
- Server-side renders preferred for top-level pages
- All token-based colors; dark-mode safe
- i18n: extend existing namespaces; if scope balloons, ship as English with TODO and follow up later
- No schema changes unless absolutely required (e.g. project goals already in schema from Sprint 3)
- Tests stay green; build stays clean

## Acceptance

After all phases:
- Each surface listed above visually matches the design at desktop ≥1280px
- No regressions on tests / build / lint
- Push to origin; brief audit summary in `docs/HANDOFF.md`
