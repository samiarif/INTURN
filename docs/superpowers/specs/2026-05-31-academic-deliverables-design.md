# Academic Deliverables — Design (multi-deliverable academic submission)

**Date:** 2026-05-31
**Status:** Approved (Sam authorized build + autonomous execution; review-after-merge gate)
**Builds on:** the University product + University-at-Scale milestones.

---

## 1. Motivation

Today a student submits **one** versioned rapport to their university. Real academic supervision needs multiple distinct artifacts — rapport de stage, présentation, diagrammes, annexes — each reviewed/validated independently. (Sam: "I want to be able to add section, rapport, diagramme, pour validation.")

## 2. Locked decision

**Separate deliverables, each independently validated**, reusing the existing review state-machine, comment threads, upload zone, and notifications. **Generalize the `academic_reports` table in place** — each row becomes one typed deliverable. Rejected: reusing the company `deliverables` table (workspace-scoped — breaches the firewall) and adding a parallel table (needless — `academic_reports` already has versions/status/file/comments/revisionHistory).

## 3. Model

A student has **N** `academic_reports` rows per university, each a **livrable** with:
- `kind` ∈ {`rapport`, `presentation`, `diagram`, `other`} — new column, default `rapport`;
- `title` — display name; defaults to the kind's localized label, editable; effectively required for `other`;
- its own version chain + status (draft → submitted → approved / revision-requested) via `modules/review/state-machine`;
- its own `academic_report_comments` thread (already keyed by `reportId`, isolated, no `workspaceId`).

No singular constraint exists today, so multiple rows are already DB-legal — the app simply stops assuming one. The firewall, the IDOR gates (`requireOrgRole` on the university org), and the per-student encadrant view-gate (`canCoordinatorViewStudent`) are all unchanged.

## 4. Data change — migration `0020`

Additive, idempotent (matches `0017`–`0019` style):
```sql
ALTER TABLE academic_reports
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'rapport';
```
TS enum only (no DB CHECK, per project convention). The existing demo rapport inherits `rapport`. Drizzle schema: add `kind: text('kind', { enum: ['rapport','presentation','diagram','other'] }).notNull().default('rapport')`.

## 5. Queries (`modules/academic-reports/queries.ts`)

- **`getReportsForStudent(studentUserId, universityOrgId)`** → all deliverables for the pair, ordered (rapport first, then `createdAt`). Replaces the singular `getReportForStudent` on both surfaces.
- **`getAwaitingReviewCountByStudent(universityOrgId)`** → `Map<studentUserId, number>` of `submitted` deliverables, for the dashboard roster pill.
- `countReportsAwaitingReview` (top dashboard stat) already counts `submitted` rows across all deliverables — unchanged.
- `getReportComments(reportId)` — unchanged (per-deliverable).
- `getReportForStudent` (singular) — remove once both callers move to the plural version (keep only if still referenced).

## 6. Service (`modules/academic-reports/service.ts`)

- `createReportDraft` accepts `kind` + `title`. Anti-spam cap: refuse if the student already has **≥ 20** deliverables for that university (`too_many_deliverables`).
- `submitReport` / `approveReport` / `requestReportRevision` / `addReportComment` — unchanged (per-`reportId`).

## 7. Surfaces

- **Student — `/intern/university` → "Mes livrables":** a list of deliverable cards (kind + title, status pill + version, upload-new-version when draft/revision, version stack, comments) plus **"Ajouter un livrable"** (pick a kind → title pre-filled & editable → `createReportDraftAction`). Empty state when none. Reuses the existing `ReportUploadZone` / `ReportVersionStack` / `ReportCommentsThread` per card.
- **Coordinator — `/university/students/[studentId]`:** lists each livrable with its own `ReportReviewBar` (Approve / Request changes, when submitted) + version stack + comments, under the firewalled internship snapshot.
- **Dashboard roster:** the per-student pill shows **"{count} à relire"** (from `getAwaitingReviewCountByStudent`) instead of a single status; `—` when none awaiting.

## 8. Notifications

Already per-deliverable (the submit/review events carry the row's `title`). Because `title` is always set at creation, the existing emails + in-app notifications name the deliverable correctly. **No dispatcher change required.**

## 9. i18n (FR source + EN)

Kind labels (`rapport`/`presentation`/`diagram`/`other`), `"Mes livrables"`, `"Ajouter un livrable"`, the add-dialog strings, and the roster `"{count} à relire"` plural.

## 10. Seed

Give the demo student (Yasmine) a **second** deliverable (e.g., a `diagram` draft) alongside the existing submitted rapport, so the demo shows the list + mixed statuses.

## 11. v1 non-goals (deferred)

- Coordinator-defined **required checklist** (the university mandates specific deliverables per student) — the natural next step.
- Per-deliverable **due dates** (`due_date` column already exists, unused) — surface later.
- Per-**section** structure within a single deliverable.

## 12. Testing

- **service:** `createReportDraft` persists `kind`; the ≥20 cap throws.
- **queries:** `getReportsForStudent` returns multiple; `getAwaitingReviewCountByStudent` tallies submitted.
- **action:** `createReportDraftAction` validates `kind` + the student gate.
- Existing academic-reports tests adjusted for the new signature.
- **UI:** verified via build + preview (student list + add; coordinator per-item review bars).
