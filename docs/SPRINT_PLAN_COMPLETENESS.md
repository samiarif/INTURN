# Inturn — Path to Production-Ready (Completeness Sprints)

**Date:** 2026-05-28
**Author:** Claude (paired with Sam)
**Premise:** A functional-completeness audit (read every interactive element's
code, not HTTP status) found the platform is ~70% wired. The core happy path
mostly works, but there's one critical silent failure (companies can't publish),
several missing lifecycle actions, and a ring of dead secondary buttons. This
plan closes the gap to a genuinely shippable product.

**How this differs from past "done" claims:** Previous smoke tests checked HTTP
200 (page renders). They did NOT check whether buttons do anything. These
sprints are scoped by *functional completeness*, verified by actually exercising
each interaction — and ultimately by an end-to-end test suite (S4) so this gap
can't reopen silently.

---

## Audit summary — what's wired vs not

### ✅ Works (don't touch)
Auth (Clerk + dev bypass), sidebar/nav/notifications/theme/language, marketplace
search + facet filters + bookmark + pagination, internship detail + apply flow
(with profile-complete gate), applicant review pipeline + accept→workspace,
deliverable upload/submit/approve/request-revision, task board (drag, add, edit,
delete, menus, filters, sort, group, list, calendar), comments post/delete,
records issue/share/PDF/copy-link, account export + delete (GDPR), admin
verifications queue, admin reports triage, admin user suspend, all onboarding
steps, landing page.

### 🔴 Critical — blocks the core loop
| # | Element | File | Problem |
|---|---|---|---|
| C1 | "Publish to marketplace →" | `internships/new/form.tsx:677` | Stub — `createInternshipAction` always sets `status:draft`. Company thinks they published; nothing goes live. |
| C2 | "Assign task" header button | `workspace/components/m-head.tsx:69` | Dead — no onClick, server component, not in a form. |
| C3 | "Schedule check-in" header button | `m-head.tsx:68` | Dead. (Rail CTA works; this one doesn't.) |
| C4 | "Weekly check-in →" header button | `m-head.tsx:61` | Dead. |
| C5 | "Draft check-in →" rail link | `rail-intern.tsx:53` | Broken — links to `/workspaces/[id]/check-in` path segment that no longer exists; needs `?tab=check-in`. |

### 🟡 Missing lifecycle / management
| # | Element | Problem |
|---|---|---|
| M1 | Edit project (name/brief/dates) | No route, no action. Can't fix a project after creation. |
| M2 | Edit internship post-creation | No route, no `updateInternship` action. Typos permanent. |
| M3 | Unpublish / close internship | No action surfaced (note: `unpublishInternshipAction` exists, used by admin moderation, but companies have no button). |
| M4 | Company workspaces index | No `/company/workspaces` list page. Reachable only via project detail. |
| M5 | Admin: suspend user from report detail | No shortcut — must context-switch to /admin/users. |
| M6 | Admin: role change | No UI; requires Clerk dashboard. |
| M7 | Admin: user detail drill-down | Users table rows not clickable. |
| M8 | Audit log pagination + export | Hard-capped at 100 rows, no paging, no export. |

### 🟢 Dead secondary affordances / UX gaps
| # | Element | File |
|---|---|---|
| P1 | Deliverable detail sub-tabs (Brief/Comments/Activity) | `deliverables-detail.tsx:376` — decorative spans |
| P2 | "Share link" on deliverable | `deliverables-detail.tsx:342` — aria-disabled, no handler |
| P3 | "See all N →" task link (overview) | `task-list.tsx:72` — `<a>` no href |
| P4 | "All versions →" link (overview) | `deliverables-mini.tsx:51` — `<a>` no href |
| P5 | "+ Add note" button | `m-head.tsx:62` — dead |
| P6 | "Send a nudge" (supervisor rail) | `rail-supervisor.tsx:173` — `<a>` no href |
| P7 | "Why these →" match explainer | `marketplace/page.tsx:246` — dead text styled as link |
| P8 | City facet filter | `marketplace-filters.tsx:149` — degrades to text search, not a real facet |
| P9 | Notification preferences | Doesn't exist in /account |
| P10 | Theme/language persistence | Cookie-only, not saved to user row |
| P11 | Non-clickable stat tiles | intern + company + admin dashboards |
| P12 | Community likes + nested replies | Not implemented |
| P13 | Phase reorder | "coming soon" tooltip |

---

## The sprints

Each sprint produces a coherent, demoable improvement. Heavy = ~5 working days.

### Sprint S1 — Close the core loop (no dead-ends on the happy path)
**Goal:** A company posts a project → publishes an internship that actually goes
live → an intern applies → company accepts → supervisor assigns tasks and
schedules check-ins → intern submits deliverables and does check-ins → supervisor
reviews → record issued. Every step reachable, no dead primary button.

- **C1 — Real publish.** Add a `publish` discriminator to the new-internship form
  (`name="intent" value="publish|draft"`), branch `createInternshipAction` to
  call `publishInternship` when intent=publish. Honor the existing suspension +
  org-verification guards. Show a clear "published / saved as draft" confirmation.
- **C2 — Wire "Assign task".** Convert the m-head action buttons to a small client
  component; "Assign task" opens the existing `AddTaskModal` (supervisor view).
- **C3 — Wire "Schedule check-in" (header).** Reuse `ScheduleCheckInButton` logic
  from the rail; or make the header button navigate to `?tab=check-in`.
- **C4 — Wire "Weekly check-in →" (header).** Navigate to `?tab=check-in`.
- **C5 — Fix the rail check-in link** to `?tab=check-in`.
- **P3/P4 — Wire overview "See all →" / "All versions →"** to `?tab=tasks` /
  `?tab=deliverables` (cheap, same area).
- **P5/P6 — Remove or wire "+ Add note" and "Send a nudge"** (decide: build notes,
  or remove the affordance — recommend remove for now, no half-features).
- **Test:** add a Playwright (or equivalent) E2E that walks the entire core loop
  with the dev-bypass cookie. This is the safety net that prevents silent
  regressions like C1.

**Exit criteria:** the full loop demoable start-to-finish with zero dead clicks.

### Sprint S2 — Lifecycle & management (CRUD completeness)
**Goal:** Everything you can create, you can edit/close. Admins can manage users.

- **M1 — Edit project.** Add `/company/projects/[id]/edit` reusing the new-project
  form in edit mode + `updateProject` action.
- **M2 — Edit internship.** Add `/company/projects/[id]/internships/[iid]/edit`
  reusing the internship form + `updateInternship` action.
- **M3 — Unpublish/close internship** from the company project detail (action
  exists; add the button + confirm).
- **M4 — Company workspaces index** at `/company/workspaces` listing all active
  workspaces with status + quick links.
- **M5 — Suspend user from report detail** (add button calling existing
  `toggleSuspendAction` on the reported user).
- **M6 — Admin role change** (promote/demote) with audit log entry.
- **M7 — Admin user detail** page (`/admin/users/[id]`) with profile, apps, org.
- **M8 — Audit log pagination** (cursor) + CSV export.

**Exit criteria:** no "permanent typo" traps; admin can fully operate without
the Clerk dashboard.

### Sprint S3 — Deliverable depth + UX completeness
**Goal:** No dead affordances anywhere. The deliverable detail panel is a real
work surface.

- **P1 — Deliverable detail sub-tabs.** Wire Brief / Comments / Activity to real
  content (Brief = internship deliverable spec; Comments = scoped comment thread;
  Activity = deliverable event log).
- **P2 — "Share link"** on deliverable: generate a shareable token + public view,
  or remove if out of scope.
- **P7 — "Why these →" match explainer:** a popover showing the skill-overlap
  breakdown (data already computed in `lib/match.ts`).
- **P8 — Real city facet filter** (add `city` to the marketplace query state).
- **P11 — Clickable stat tiles** → drill into filtered lists (apps by status,
  workspaces, reports).
- **P9 — Notification preferences** page in /account (per-channel toggles, stored
  on the user row; dispatcher honors them).
- **P10 — Persist theme + language** to the user row; hydrate on load.
- **P13 — Phase drag-reorder** (dnd-kit, already a dependency).

**Exit criteria:** every clickable-looking thing does something; settings persist.

### Sprint S4 — Hardening & confidence
**Goal:** Production-grade quality and a test net so completeness can't silently
regress.

- **E2E suite** covering: apply→accept→deliverable→record (intern+company),
  publish→appears-in-marketplace, admin verify→moderate. Wire into the existing
  GitHub Actions CI (A1) so a dead "publish" button fails the build.
- **acceptApplication transaction** (data-loss risk: status flip + workspace
  insert must be atomic). Requires a pooled/session Neon connection.
- **Task action TOCTOU** — fold authz into the mutating query.
- **`'use cache'` adoption** on marketplace queries (needs `cacheComponents`
  config; verify it doesn't break Clerk pages — may need route-group scoping).
- **Community likes + nested replies** (P12) if engagement is a priority;
  otherwise defer to the engagement sprint.
- **Dead CSS cleanup** (`.ws-side*` in workspace.css), missing unit tests
  (deliverables + notifications state machines).

**Exit criteria:** green E2E in CI, no known data-loss path, perf wins locked in.

---

## Recommended order & rationale

**S1 first, non-negotiable.** C1 (publish) is a silent product-breaker — until
it's fixed, the supply side is non-functional in production. The rest of S1
removes the dead-ends that make the app feel broken.

**S2 second.** Lifecycle gaps ("can't edit what I made") are the next thing a
real user hits. Admin management gaps block operating the platform at all.

**S3 third.** Polish and depth — matters for the demo and for not looking
half-built, but doesn't block the core loop.

**S4 throughout / last.** The E2E suite ideally lands *during* S1 so it guards
the rest. The hardening items can interleave.

**Total: ~4 heavy sprints (~4 weeks)** to a genuinely production-ready platform,
assuming Claude-paced execution (subagent-driven, like the sidebar/task work).

---

## Open questions for Sam
1. **Notes feature (P5):** build real per-workspace notes, or remove the "+ Add
   note" button? (Recommend remove now.)
2. **Deliverable "Share link" (P2):** is sharing a deliverable externally in scope
   for launch, or remove the button?
3. **Community likes/replies (P12):** launch priority, or defer to an engagement
   sprint?
4. **Sprint sizing:** these are ~5-day sprints. Want them tighter (3-day) or is
   weekly cadence fine?
