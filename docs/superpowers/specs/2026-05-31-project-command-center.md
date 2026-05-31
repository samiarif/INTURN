# Project Command Center + Deliverable Dependencies — Design / Spec

**Date:** 2026-05-31
**Branch:** `feat/project-command-center` (stacked on `feat/pulse` — it rolls up per-intern Pulse)
**Status:** Draft

---

## 1. Problem

A company project (e.g. "Brand audit") has N interns, each sealed in their own
workspace. A project is a **team** doing one thing, but the product treats the
interns as unrelated individuals. Two gaps:
1. **Supervisor has no cross-intern view** — "where is *the project*?" requires
   bouncing between N workspaces and aggregating in your head.
2. **Interns have no liaison** — they can't see each other's work, hand off, or
   know what depends on them.

## 2. The one new primitive

A **deliverable dependency**: an edge "upstream deliverable *feeds* downstream
deliverable," across interns, within a project.

```
deliverable_dependencies
  id                  uuid pk
  upstream_id         uuid → deliverables(id) on delete cascade
  downstream_id       uuid → deliverables(id) on delete cascade
  project_id          uuid → projects(id)         -- both deliverables' project; guard same-project
  created_by          uuid → users(id)
  created_at          timestamptz
  unique(upstream_id, downstream_id)
```

Everything else is **views on data that already exists** (deliverables/tasks/
workspaces all reach the project via `workspace → internship → project`).

## 3. Three surfaces

### A. Supervisor — the Project Command Center (upgrades the project hub)
On `company/projects/[projectId]` (which already loads the project's workspaces +
interns). Adds:
- **Project Pulse roll-up:** `getPulse` per active workspace → one line: *"phase 2
  of 4 · 🟢 Sami · 🟡 Imen · 🟢 Karim."*
- **The flow / lanes:** all interns' deliverables, grouped (by intern lane, ordered
  along the dependency chain in P2). Status per deliverable. *One pipeline, not N
  silos.*
- **Filter:** "All interns ▾" → one intern collapses the view to their lane.
- **Stuck signal (P2):** a downstream waiting on a late/unreviewed upstream is
  flagged — this is Pulse's open-loop at project scale.

### B. Intern — dependency awareness (P2; on their deliverable, in their workspace)
- **Depends on:** 🔗 upstream deliverable · owner · status.
- **Feeds into:** 🔗 downstream deliverable · owner — "finishing this unblocks X."
- **Awareness, not a gate** — never block on the dependency; reality jumps plans.

### C. Supervisor — the dependency editor (P2)
On the project hub: wire "this deliverable feeds → that one." A handful of edges,
created by the supervisor (they designed the project). Guard: same project; no
cycles.

## 4. Phasing

- **Phase 1 — Command Center (view-only, NO new schema).** Aggregate every
  project workspace's deliverables + tasks + per-workspace Pulse into the project
  hub, with the all-interns ↔ one-intern filter and the project Pulse roll-up.
  Ships the "I can see the project" value immediately.
- **Phase 2 — Dependency layer.** The `deliverable_dependencies` table +
  migration, the editor, the upstream/downstream awareness chips (intern side),
  and the stuck-flow detection feeding into the command center + Pulse.

## 5. Reused vs new

**Reused:** the project hub (home + already loads workspaces/interns), deliverables/
tasks/workspaces (data), Pulse (`getPulse` roll-up + stuck detection), the existing
phase logic (`computeCurrentPhase`).
**New:** the command-center aggregation + UI (P1); the dependency table + editor +
awareness chips + stuck detection (P2).

## 6. Non-goals
- Hard dependency gating / blocking (awareness only).
- Task-level dependencies (deliverable/milestone grain only — fewer, meaningful edges).
- Cross-*project* dependencies (in-project only).
- Reworking the per-intern workspace (it stays; the command center sits above it).

## 7. Verification
Drive the project hub as a supervisor (real seed data): the command center shows
all the project's interns' deliverables + per-intern Pulse, the filter narrows to
one lane, no errors. P2: create an edge, confirm both interns see the chip + the
stuck signal fires when the upstream is late.
