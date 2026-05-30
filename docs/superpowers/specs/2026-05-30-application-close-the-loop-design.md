# Application "Close the Loop" — Design Spec

**Date:** 2026-05-30
**Status:** Approved (design) — pending implementation plan
**Area:** Application / hiring flow (`modules/applications`, `modules/notifications`, intern + company application screens)

---

## Problem

The application flow is feature-rich but the **candidate-facing loop is silently broken**, and the parts that work leave the candidate without closure or transparency.

1. **Status-change notifications are dead for every transition except accept.** The service records transitions as the event type `application.status.changed` (`modules/applications/service.ts:91,182`), which is also the canonical name in the event registry (`modules/events/types.ts:34`). But the notification dispatcher only matches `application.statusChanged` and `application.status_changed` (`modules/notifications/dispatcher.ts:40-41`). Neither equals the dotted canonical string, so the event falls through the `switch` with no handler. Result: when a company moves an applicant to **reviewed / shortlisted / interview / rejected**, the intern gets **no email and no in-app notification**. Only **accept** notifies, because `acceptApplication` emits a *second*, separately-handled event (`application.accepted`). The dispatcher test (`modules/notifications/__tests__/dispatcher.test.ts:233`) asserts the *wrong* strings, so CI is green while the real path is dead.

2. **Rejection is a dead end.** On reject the intern sees only a generic "closed" label (`app/[locale]/(platform)/intern/applications/[applicationId]/page.tsx:75-78`). There is no applicant-visible feedback field; `internalNotes` is explicitly company-private ("never shown to the applicant", `_notes.tsx:42`). Candidates are ghosted.

3. **Status history exists but is never surfaced.** Every transition is timestamped in `events` (with `from`/`to` in metadata), yet neither side sees *when* each step happened or how long an application has been waiting. The intern's stepper shows only the current position; the company sees no aging.

## Goals

- Fix the notification dispatch so all status changes reach the candidate (in-app + email), without double-notifying on accept.
- Give the company an **optional** way to attach applicant-visible feedback to a decision (reject *or* accept), shown to the intern and included in the status email.
- Surface a real, timestamped **status history** to the intern and a light **aging** indicator to the company — derived from existing `events`, no new table.

## Non-goals (explicitly out of scope)

- Two-way / threaded messaging between company and applicant.
- Interview scheduling or calendar coordination (the "interview" stage stays a status only).
- Inbox bulk actions, SLA columns, or saved views (company-efficiency track — not selected).
- Any change to withdraw semantics (`withdrawApplicationAction` keeps its hard-delete).
- Any change to the marketplace, apply form, or accept→workspace mechanics.

## Current state (do NOT rebuild)

Already shipped and working, confirmed by reading the code:
- 6-stage state machine with enforced transitions (`modules/applications/state-machine.ts`).
- Company inbox with status filter + select-2-to-4 → compare (`_inbox-client.tsx`, `applications/compare/page.tsx`).
- Rich review detail: applicant profile, CV, portfolio, answers-mapped-to-questions, internal notes editor, status pipeline control (`applications/[applicationId]/page.tsx`, `_status-pipeline.tsx`, `_notes.tsx`).
- Intern status stepper + withdraw + cover-note/answers display (`intern/applications/[applicationId]/page.tsx`).
- Crash-safe accept→workspace (`service.ts:acceptApplication`).
- Events recorded on every transition; `events` already indexed for `WHERE target_id ORDER BY created_at DESC` (`db/schema/events.ts:21`).
- In-app + email dispatch infra with per-user channel prefs (`modules/notifications/dispatcher.ts`).

## Design

### Piece 1 — Fix the notification dispatch (foundation, ships first)

**Core fix:** make the dispatcher handle the canonical event type.

- In `modules/notifications/dispatcher.ts`, replace the two dead cases (`'application.statusChanged'`, `'application.status_changed'`) with the canonical **`'application.status.changed'`**. Nothing emits the camel/snake forms (grep-confirmed), so they are removed, not kept.

**Critical correctness constraint — do not double-notify on accept.** `acceptApplication` emits *both* `application.status.changed` (with `to: 'accepted'`) *and* `application.accepted`. Once the dispatcher handles `application.status.changed`, accept would fire the applicant notification twice. To prevent this, partition ownership:

- `onApplicationStatusChanged` (triggered by `application.status.changed`) handles **only** `reviewed | shortlisted | interview | rejected`. It returns early when `to === 'accepted'`.
- `onApplicationAccepted` (triggered by `application.accepted`) **owns** the accept notification.
- Extract the shared body into a `notifyApplicant(applicationId, status, note)` helper so both paths build the same in-app row + email without the `allowed`-list filter fighting them.

**Regression guard:** add a dispatcher test that feeds the *exact* string the service emits (`'application.status.changed'`) and asserts an `application.status` notification row is written; and a test asserting accept produces **exactly one** applicant notification (not two). Correct the existing `it.each` to the canonical string.

**Files:** `modules/notifications/dispatcher.ts`, `modules/notifications/__tests__/dispatcher.test.ts`.

### Piece 2 — Applicant-facing decision feedback

**Schema (1 additive, nullable column):** add `decision_note text` to `applications` (`db/schema/applications.ts`), distinct from `internal_notes`. New additive migration; nullable, no backfill.

**Service:** `transitionApplicationStatus` and `acceptApplication` accept an optional `decisionNote`. Persist it in the **same `UPDATE` that sets status**, *before* `recordEvent` fires. Because the dispatcher re-selects the application row, it can read `applications.decisionNote` straight off the freshly-updated row — no need to thread the note through event metadata.

**Server action:** `transitionApplicationStatusAction` (and the accept action) gain an optional `decisionNote`. Authz unchanged (`assertProjectSupervisor`).

**Company UI (`_status-pipeline.tsx`):** the "Reject application" control expands inline to a small optional textarea — *"Feedback to the candidate (optional — they'll see this)"* — plus a Confirm button; the note is passed to the transition action. The same optional note is offered on the accept action. Lightweight inline disclosure (no modal). The internal-notes editor (`_notes.tsx`) is untouched and stays clearly labeled private.

**Intern UI (`intern/applications/[applicationId]/page.tsx`):** when `decisionNote` is present, render a *"Feedback from {org}"* block. In the `rejected` branch this replaces the bare "closed" label; for accepted/other it appears under the status section.

**Email (`lib/email/templates/application-status.ts`):** add an optional `note` param; when present, append a quoted "Feedback from the company" block to the body (FR/EN). The dispatcher's `notifyApplicant` passes `application.decisionNote` into both the in-app body context and the email template.

**Behavior:** feedback is **optional** everywhere; a decision with no note works exactly as today (graceful).

### Piece 3 — Status history + timing

**Query (no migration):** add `getApplicationTimeline(applicationId)` to `modules/applications/queries.ts`. Reads `events` where `targetType = 'application' AND targetId = $1` (already indexed), ordered ascending, and maps to `{ status: ApplicationStatus | 'applied'; at: Date }[]` from `application.created` (→ applied), `application.status.changed` (→ `metadata.to`), and `application.accepted` (→ accepted). Tolerates sparse/legacy rows: if no events, fall back to `[{ status: 'applied', at: application.createdAt }]` plus current status.

**Intern UI:** upgrade the stepper to show a **timestamp** under each reached step ("Applied 3 May · Reviewed 5 May · Shortlisted 6 May") and a "under review since {date} ({n} days)" line on the current pending step. Rejected branch shows the decision time alongside the feedback block.

**Company UI:** a single light "in {status} for {n} days" aging line on the review detail header (derived from the latest timeline entry). No inbox columns.

**i18n:** all new strings added to `locales/en.json` + `locales/fr.json`.

## Data model

```
applications
  + decision_note   text   NULL        -- applicant-visible decision feedback (distinct from internal_notes)
```
No other schema changes. Timeline derives entirely from the existing `events` table and its existing compound index.

## Notification flow (after fix)

```
company sets status (reviewed|shortlisted|interview|rejected)
  → transitionApplicationStatus: UPDATE status (+decision_note) → recordEvent('application.status.changed')
    → dispatchNotificationsFor → onApplicationStatusChanged (to !== accepted)
      → notifyApplicant: in-app row + status email (with optional feedback)

company accepts
  → acceptApplication: create workspace → UPDATE status='accepted' (+decision_note)
    → recordEvent('application.status.changed' to=accepted)  → onApplicationStatusChanged → early-return (accepted owned elsewhere)
    → recordEvent('application.accepted')                    → onApplicationAccepted → notifyApplicant('accepted', note)   [exactly once]
```

## Error handling / edge cases

- `decisionNote` optional + null-safe in every UI and the email template.
- Notifications remain best-effort: `dispatchNotificationsFor` already swallows and logs errors so the originating action never fails.
- Accept double-notification is prevented by the ownership partition above (covered by a test).
- Timeline tolerates applications with missing events (legacy rows) via the documented fallback.
- Withdraw (hard-delete) is unchanged and untested-against here.

## Testing strategy

- **Dispatcher (Piece 1):** canonical `application.status.changed` → notification fires (regression guard); accept → exactly one applicant notification; corrected `it.each` strings.
- **Service (Piece 2):** `transitionApplicationStatus`/`acceptApplication` persist `decisionNote`; status `UPDATE` writes the note before the event is recorded.
- **Query (Piece 3):** `getApplicationTimeline` maps a representative event stream to ordered steps; empty-events fallback.
- **Email:** template renders the feedback block only when `note` is provided (FR + EN).
- Existing 276+ tests stay green; the one mis-asserting dispatcher test is *corrected*, not deleted.

## File map

**Modify**
- `db/schema/applications.ts` — add `decision_note` column
- `modules/applications/service.ts` — thread `decisionNote`; persist before event
- `modules/applications/server-actions.ts` — optional `decisionNote` on transition + accept actions
- `modules/applications/queries.ts` — `getApplicationTimeline`
- `modules/notifications/dispatcher.ts` — canonical event match + accept de-dupe + `notifyApplicant` + pass note
- `modules/notifications/__tests__/dispatcher.test.ts` — corrected strings + regression + single-notify-on-accept
- `lib/email/templates/application-status.ts` — optional `note` block
- `app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/_status-pipeline.tsx` — optional feedback on reject/accept
- `app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/page.tsx` — light aging line
- `app/[locale]/(platform)/intern/applications/[applicationId]/page.tsx` — feedback block + timestamped history
- `locales/en.json`, `locales/fr.json` — new keys

**Create**
- New Drizzle migration for `applications.decision_note` (additive, nullable)
- Test(s) for `getApplicationTimeline` and `decisionNote` service persistence

## Decisions (locked, with rationale)

1. **Feedback is optional, not required** — forcing a note adds friction and produces filler; encourage, don't gate.
2. **Feedback allowed on reject *and* accept** — closure both ways, one reused field, no per-stage messaging (that would be the declined "full comms" option).
3. **Company aging = light line on the detail page**, not inbox SLA columns — inbox-scale tooling is the declined "efficiency" option.

## Out of scope / future

- Threaded messaging + interview scheduling (the "full two-way comms" option) — would build on `decision_note` and a new `application_messages` table; revisit if beta shows demand.
- Inbox bulk actions + aging columns (the "efficiency" option) — revisit at applicant volume.

## Risks

- **Accept double-notify** if the dispatcher fix lands without the ownership partition — mitigated by the explicit early-return + a dedicated test.
- **i18n drift** — every new string must land in both locale files (enforced by self-review + existing lint patterns).
- Touches files carrying uncommitted working-tree changes from prior work; implementation must stage only its own files by name.
