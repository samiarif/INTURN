# Academic Deliverables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let a student submit **multiple typed deliverables** (livrables: rapport / présentation / diagramme / autre) per university, each independently reviewed/validated, instead of a single rapport.

**Architecture:** Generalize the existing `academic_reports` table in place — each row is one typed deliverable (`kind` + `title`). Reuse the review state-machine, comment threads, upload zone, and notifications (all already per-row). No new table; the workspace-scoped company `deliverables` table is NOT touched (firewall).

**Tech Stack:** Next.js 16 (RSC + `'use server'`), Drizzle on Neon-http (no transactions), next-intl 4, Vitest (mocked `db`), Tailwind v4 tokens, pnpm.

**Spec:** `docs/superpowers/specs/2026-05-31-academic-deliverables-design.md`.

**Local-DB note:** apply migrations with `pnpm tsx --env-file=.env.local scripts/migrate.ts` (the `db:migrate` script omits `--env-file`). Run all commands from `inturn/`. If a bare `git` errors "not a git repository", use `git -C /Users/mac/code/inturn-hub/inturn …`.

---

## File Structure

**Create:**
- `db/migrations/0020_academic_report_kind.sql`
- `modules/academic-reports/kinds.ts` — the `kind` enum + helpers (pure, shared by server + client).
- `modules/academic-reports/components/add-deliverable.tsx` — client "Ajouter un livrable" picker.

**Modify:**
- `db/schema/academic-reports.ts` — add `kind`.
- `modules/academic-reports/service.ts` — `createReportDraft` accepts `kind`, ≥20 cap.
- `modules/academic-reports/queries.ts` — `getReportsForStudent`, `getAwaitingReviewCountByStudent`.
- `modules/academic-reports/server-actions.ts` — `createReportDraftAction` accepts `kind`.
- `app/[locale]/(platform)/intern/university/page.tsx` — list of deliverables + add picker.
- `app/[locale]/(platform)/university/students/[studentId]/page.tsx` — per-deliverable review list.
- `app/[locale]/(platform)/university/dashboard/page.tsx` — roster pill → "{count} à relire".
- `locales/fr.json`, `locales/en.json` — kind labels + new strings.
- `scripts/seed.ts` — a 2nd deliverable on the demo student.

**Test (extend existing):**
- `modules/academic-reports/__tests__/{service,queries,server-actions}.test.ts`.

---

## Task 1: Migration 0020 + `kind` column

**Files:** Create `db/migrations/0020_academic_report_kind.sql`; Modify `db/schema/academic-reports.ts`.

- [ ] **Step 1 — migration** (idempotent, match `0019` style):

```sql
-- 0020: academic_report_kind — each academic_reports row is a typed deliverable
-- (livrable): rapport | presentation | diagram | other. Existing rows = rapport.
-- Additive, idempotent. TS-enum only (no DB CHECK, per project convention).
BEGIN;

ALTER TABLE academic_reports
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'rapport';

COMMIT;
```

- [ ] **Step 2 — schema.** In `db/schema/academic-reports.ts`, add the column right after `id` / before `studentUserId` (or grouped with the metadata fields — place after `description`):

```ts
    kind: text('kind', { enum: ['rapport', 'presentation', 'diagram', 'other'] })
      .notNull()
      .default('rapport'),
```

- [ ] **Step 3 — apply + verify:** `pnpm tsx --env-file=.env.local scripts/migrate.ts` (runs clean), then run it again (idempotent — 0 new). Then `pnpm typecheck` → PASS.

- [ ] **Step 4 — commit:**
```bash
git add db/migrations/0020_academic_report_kind.sql db/schema/academic-reports.ts
git commit -m "feat(db): add kind to academic_reports (typed deliverables)"
```

---

## Task 2: `kinds.ts` helper + `createReportDraft` accepts kind (+ cap)

**Files:** Create `modules/academic-reports/kinds.ts`; Modify `modules/academic-reports/service.ts`; Test `modules/academic-reports/__tests__/service.test.ts`.

- [ ] **Step 1 — create the shared kinds helper** `modules/academic-reports/kinds.ts`:

```ts
export const DELIVERABLE_KINDS = ['rapport', 'presentation', 'diagram', 'other'] as const;
export type DeliverableKind = (typeof DELIVERABLE_KINDS)[number];

export function isDeliverableKind(v: unknown): v is DeliverableKind {
  return typeof v === 'string' && (DELIVERABLE_KINDS as readonly string[]).includes(v);
}
```

- [ ] **Step 2 — failing service tests.** Read `modules/academic-reports/__tests__/service.test.ts` first to match its db-mock pattern, then add:

```ts
it('createReportDraft persists kind and defaults version/status', async () => {
  mocks.selectQueue.push([]); // existing-count query → none
  // insert().returning() → mock a created row (match the file's insert mock)
  await createReportDraft({ studentUserId: 's1', universityOrgId: 'u1', kind: 'diagram', title: 'Schéma' });
  // assert the captured insert values include kind:'diagram', status:'draft', version:1
});

it('createReportDraft rejects when the student already has 20 deliverables', async () => {
  mocks.selectQueue.push(Array.from({ length: 20 }, (_, i) => ({ id: String(i) }))); // count query
  await expect(createReportDraft({ studentUserId: 's1', universityOrgId: 'u1', kind: 'rapport' }))
    .rejects.toThrow('too_many_deliverables');
});
```

- [ ] **Step 3 — run, confirm FAIL:** `pnpm vitest run modules/academic-reports/__tests__/service.test.ts -t "kind"` → FAIL.

- [ ] **Step 4 — implement.** In `modules/academic-reports/service.ts`, import the kind type and update `createReportDraft`:

```ts
import { and, eq } from 'drizzle-orm';
import type { DeliverableKind } from './kinds';
// ...

export async function createReportDraft(input: {
  studentUserId: string;
  universityOrgId: string;
  internshipId?: string | null;
  title?: string | null;
  description?: string | null;
  kind?: DeliverableKind;
}) {
  // Anti-spam cap: a student can hold at most 20 deliverables per university.
  const existing = await db
    .select({ id: academicReports.id })
    .from(academicReports)
    .where(
      and(
        eq(academicReports.studentUserId, input.studentUserId),
        eq(academicReports.universityOrgId, input.universityOrgId),
      ),
    );
  if (existing.length >= 20) throw new Error('too_many_deliverables');

  const [created] = await db
    .insert(academicReports)
    .values({
      studentUserId: input.studentUserId,
      universityOrgId: input.universityOrgId,
      internshipId: input.internshipId ?? null,
      title: input.title ?? null,
      description: input.description ?? null,
      kind: input.kind ?? 'rapport',
      status: 'draft',
      version: 1,
    })
    .returning();
  return created;
}
```

(Ensure `and`/`eq` are imported — `eq` already is; add `and`.)

- [ ] **Step 5 — run:** `pnpm vitest run modules/academic-reports/__tests__/service.test.ts` → PASS. `pnpm typecheck` → PASS.

- [ ] **Step 6 — commit:**
```bash
git add modules/academic-reports/kinds.ts modules/academic-reports/service.ts modules/academic-reports/__tests__/service.test.ts
git commit -m "feat(academic-reports): createReportDraft accepts kind + caps per-student count"
```

---

## Task 3: Plural queries — `getReportsForStudent` + `getAwaitingReviewCountByStudent`

**Files:** Modify `modules/academic-reports/queries.ts`; Test `modules/academic-reports/__tests__/queries.test.ts`.

- [ ] **Step 1 — failing tests** (match the file's existing mock pattern):

```ts
it('getReportsForStudent returns all deliverables for the pair', async () => {
  mocks.selectQueue.push([
    { id: 'r1', kind: 'rapport', status: 'submitted' },
    { id: 'r2', kind: 'diagram', status: 'draft' },
  ]);
  const rows = await getReportsForStudent('s1', 'u1');
  expect(rows).toHaveLength(2);
});

it('getAwaitingReviewCountByStudent tallies submitted per student', async () => {
  mocks.selectQueue.push([
    { studentUserId: 's1' }, { studentUserId: 's1' }, { studentUserId: 's2' },
  ]);
  const map = await getAwaitingReviewCountByStudent('u1');
  expect(map.get('s1')).toBe(2);
  expect(map.get('s2')).toBe(1);
});
```

Add both names to the `from '../queries'` import. Ensure the `drizzle-orm` mock exposes `asc` (add `asc: vi.fn(() => 'asc')` if missing).

- [ ] **Step 2 — run, confirm FAIL.**

- [ ] **Step 3 — implement.** In `modules/academic-reports/queries.ts`:

```ts
import { and, asc, desc, eq } from 'drizzle-orm';
// ...

/** All deliverables (livrables) for a (student, university) pair, oldest-first. */
export async function getReportsForStudent(
  studentUserId: string,
  universityOrgId: string,
): Promise<AcademicReport[]> {
  return db
    .select()
    .from(academicReports)
    .where(
      and(
        eq(academicReports.studentUserId, studentUserId),
        eq(academicReports.universityOrgId, universityOrgId),
      ),
    )
    .orderBy(asc(academicReports.createdAt));
}

/** Map of studentUserId → count of submitted deliverables (roster "à relire" pill). */
export async function getAwaitingReviewCountByStudent(
  universityOrgId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ studentUserId: academicReports.studentUserId })
    .from(academicReports)
    .where(
      and(
        eq(academicReports.universityOrgId, universityOrgId),
        eq(academicReports.status, 'submitted'),
      ),
    );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.studentUserId, (map.get(r.studentUserId) ?? 0) + 1);
  return map;
}
```

- [ ] **Step 4 — run tests + typecheck** → PASS.

- [ ] **Step 5 — commit:**
```bash
git add modules/academic-reports/queries.ts modules/academic-reports/__tests__/queries.test.ts
git commit -m "feat(academic-reports): plural getReportsForStudent + awaiting-review-by-student"
```

---

## Task 4: `createReportDraftAction` accepts `kind`

**Files:** Modify `modules/academic-reports/server-actions.ts`; Test `modules/academic-reports/__tests__/server-actions.test.ts`.

- [ ] **Step 1 — failing test** (match existing mock pattern; the action mocks `createReportDraft` from `./service`):

```ts
it('createReportDraftAction forwards a valid kind', async () => {
  // arrange: requireActiveSession → user; getActiveMembership → { role: 'student' }
  await createReportDraftAction({ universityOrgId: 'u1', kind: 'diagram', title: 'Schéma' });
  expect(createReportDraft).toHaveBeenCalledWith(expect.objectContaining({ kind: 'diagram', title: 'Schéma' }));
});

it('createReportDraftAction coerces an unknown kind to rapport', async () => {
  await createReportDraftAction({ universityOrgId: 'u1', kind: 'bogus' as never });
  expect(createReportDraft).toHaveBeenCalledWith(expect.objectContaining({ kind: 'rapport' }));
});
```

- [ ] **Step 2 — run, confirm FAIL.**

- [ ] **Step 3 — implement.** In `modules/academic-reports/server-actions.ts`, import the guard and extend the action input:

```ts
import { isDeliverableKind, type DeliverableKind } from './kinds';
// ...
export async function createReportDraftAction(input: {
  universityOrgId: string;
  internshipId?: string | null;
  title?: string | null;
  kind?: string;
}): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    const m = await getActiveMembership(user.id, input.universityOrgId);
    if (!m || m.role !== 'student') return { ok: false, error: 'Forbidden' };

    const kind: DeliverableKind = isDeliverableKind(input.kind) ? input.kind : 'rapport';

    await createReportDraft({
      studentUserId: user.id,
      universityOrgId: input.universityOrgId,
      internshipId: input.internshipId ?? null,
      title: input.title ?? null,
      kind,
    });
    revalidateReport(user.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
```

- [ ] **Step 4 — run tests + typecheck** → PASS.

- [ ] **Step 5 — commit:**
```bash
git add modules/academic-reports/server-actions.ts modules/academic-reports/__tests__/server-actions.test.ts
git commit -m "feat(academic-reports): createReportDraftAction accepts a validated kind"
```

---

## Task 5: Student surface — list of livrables + "Ajouter un livrable"

**Files:** Create `modules/academic-reports/components/add-deliverable.tsx`; Modify `app/[locale]/(platform)/intern/university/page.tsx`.

- [ ] **Step 1 — create the client picker** `modules/academic-reports/components/add-deliverable.tsx`:

```tsx
'use client';
import { useState, useTransition } from 'react';
import { createReportDraftAction } from '@/modules/academic-reports/server-actions';
import { useRouter } from 'next/navigation';

export function AddDeliverable({
  universityOrgId,
  kindOptions, // [{ value, label }] localized by the server
  labels, // { add, kindLabel, titleLabel, create, creating }
}: {
  universityOrgId: string;
  kindOptions: { value: string; label: string }[];
  labels: { add: string; kindLabel: string; titleLabel: string; create: string; creating: string };
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(kindOptions[0]?.value ?? 'rapport');
  const [title, setTitle] = useState(kindOptions[0]?.label ?? '');
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-[var(--brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-600)]"
      >
        {labels.add}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4">
      <label className="flex flex-col gap-1 text-caption text-[var(--ink-3)]">
        {labels.kindLabel}
        <select
          value={kind}
          onChange={(e) => {
            const next = e.target.value;
            setKind(next);
            // refresh the default title to the picked kind's label
            const opt = kindOptions.find((o) => o.value === next);
            if (opt) setTitle(opt.label);
          }}
          className="rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--ink-2)]"
        >
          {kindOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1 text-caption text-[var(--ink-3)]">
        {labels.titleLabel}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--ink)]"
        />
      </label>
      <button
        disabled={pending || !title.trim()}
        onClick={() =>
          start(async () => {
            await createReportDraftAction({ universityOrgId, kind, title: title.trim() });
            setOpen(false);
            router.refresh();
          })
        }
        className="inline-flex items-center rounded-md bg-[var(--brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-600)] disabled:opacity-50"
      >
        {pending ? labels.creating : labels.create}
      </button>
    </div>
  );
}
```

- [ ] **Step 2 — rewrite the page** `app/[locale]/(platform)/intern/university/page.tsx`. Keep the session gate, the `studentMembership` lookup, and the "supervisedBy" card. Replace the single-report block with:
  - Fetch `const reports = await getReportsForStudent(session.user.id, universityOrgId);` (import from queries).
  - Fetch comments per deliverable: `const commentsByReport = await Promise.all(reports.map((r) => getReportComments(r.id)));`
  - Build localized `kindOptions` from `DELIVERABLE_KINDS` (import from `../../../../../modules/academic-reports/kinds` or `@/modules/academic-reports/kinds`) mapping each to `t('kind.<value>')`.
  - Render `<AddDeliverable universityOrgId={universityOrgId} kindOptions={kindOptions} labels={{ add: t('home.addDeliverable'), kindLabel: t('home.kindLabel'), titleLabel: t('home.titleLabel'), create: t('home.create'), creating: t('home.creating') }} />` in the header actions.
  - When `reports.length === 0`: the empty state (text `t('home.noDeliverables')`) with the AddDeliverable button.
  - Else: map `reports.map((report, i) => (...))` rendering, per card: a heading line `{report.title || t('kind.' + report.kind)}` + a `kind` sub-label, then the SAME inner JSX the page already uses for one report — `StatusPill` + `v{report.version}` + `ReportUploadZone` (when `draft`/`revision-requested`) + `ReportVersionStack` + `ReportCommentsThread` with `comments={commentsByReport[i]}`. Wrap each card in a `border rounded-lg p-4` container.

  Reuse the existing `statusLabels`, `toneFor`, and component imports already in the file. Use `report.id` as the React key.

- [ ] **Step 3 — verify (build + preview).** `pnpm build` → PASS. Then with the dev server, log in via `/dev/login` as Yasmine (`yasmine@enit.utm.tn`) → `/intern/university`: confirm the existing rapport renders as a card, "Ajouter un livrable" opens the picker, and creating a `diagram` adds a second card (upload zone present on the new draft). Use `preview_snapshot`; check `preview_console_logs` for errors.

- [ ] **Step 4 — typecheck** → PASS.

- [ ] **Step 5 — commit:**
```bash
git add "modules/academic-reports/components/add-deliverable.tsx" "app/[locale]/(platform)/intern/university/page.tsx"
git commit -m "feat(academic-reports): student livrables list + add-deliverable picker"
```

---

## Task 6: Coordinator surface — per-deliverable review list

**Files:** Modify `app/[locale]/(platform)/university/students/[studentId]/page.tsx`.

- [ ] **Step 1 — switch to the plural query + list.** Replace `getReportForStudent` with `getReportsForStudent(studentId, current.org.id)`. Fetch comments per deliverable (`Promise.all(reports.map((r) => getReportComments(r.id)))`). Keep the session gate, the IDOR membership gate, `canCoordinatorViewStudent`, the student-identity lookup, and the firewalled internship snapshot section unchanged.

- [ ] **Step 2 — render each deliverable.** Where the page currently renders the single `report` block (status pill + `ReportReviewBar` when `submitted` + `ReportVersionStack` + `ReportCommentsThread`), wrap it in `reports.map((report, i) => (...))`, keyed by `report.id`, each in a `border rounded-lg p-4` card with a heading `{report.title || tUni? or t('kind.'+report.kind)}` + kind sub-label. Pass `comments={commentsByReport[i]}` to the thread, and the existing `labels`/`statusLabels` per card. When `reports.length === 0`, keep the existing "no report" empty state (`tUni('noReport')`).

- [ ] **Step 3 — verify (build + preview).** `pnpm build` → PASS. As prof.saidi (head) open `/university/students/<yasmine-id>`: confirm each livrable shows its own status + Approve/Request-changes (on submitted ones) + its own thread. `preview_snapshot` + console check.

- [ ] **Step 4 — typecheck** → PASS.

- [ ] **Step 5 — commit:**
```bash
git add "app/[locale]/(platform)/university/students/[studentId]/page.tsx"
git commit -m "feat(university): coordinator reviews each livrable independently"
```

---

## Task 7: Dashboard roster pill → "{count} à relire"

**Files:** Modify `app/[locale]/(platform)/university/dashboard/page.tsx`.

- [ ] **Step 1 — swap the per-student status source.** Replace the `getReportStatusByStudent` import/usage with `getAwaitingReviewCountByStudent(current.org.id)` (import from queries). Build `const awaitingByStudent = await getAwaitingReviewCountByStudent(current.org.id);` in the existing `Promise.all`.

- [ ] **Step 2 — render the count pill.** In the "RAPPORT" column cell, replace the single-status pill with: `const n = s.userId ? (awaitingByStudent.get(s.userId) ?? 0) : 0;` → when `n > 0` render `<StatusPill tone="warning">{t('reportStatus.awaiting', { count: n })}</StatusPill>` else `—`. Rename the column header to `t('colReport')` (keep) — the meaning is now "à relire". Drop the now-unused `toneFor`/`reportStatus.*` per-status mapping if nothing else uses it on this page (leave `getReportStatusByStudent` in queries only if still referenced elsewhere; otherwise remove it in this task).

- [ ] **Step 3 — verify + typecheck.** `pnpm build` → PASS. As prof.saidi, the roster shows "1 à relire" for Yasmine (she has a submitted rapport).

- [ ] **Step 4 — commit:**
```bash
git add "app/[locale]/(platform)/university/dashboard/page.tsx"
git commit -m "feat(university): roster shows count of livrables awaiting review"
```

---

## Task 8: i18n FR/EN

**Files:** Modify `locales/fr.json`, `locales/en.json`.

- [ ] **Step 1 — add keys.** Under `academicReport`: a `kind` group (`rapport`, `presentation`, `diagram`, `other`) and `home` additions (`addDeliverable`, `kindLabel`, `titleLabel`, `create`, `creating`, `noDeliverables`). Under `university.dashboard`: `reportStatus.awaiting` as an ICU plural.

FR:
```json
"kind": { "rapport": "Rapport de stage", "presentation": "Présentation", "diagram": "Diagramme", "other": "Autre" },
"home": { "addDeliverable": "Ajouter un livrable", "kindLabel": "Type", "titleLabel": "Titre", "create": "Créer", "creating": "Création…", "noDeliverables": "Aucun livrable pour le moment." }
```
and `university.dashboard.reportStatus.awaiting`: `"{count, plural, one {# à relire} other {# à relire}}"`.

EN:
```json
"kind": { "rapport": "Internship report", "presentation": "Presentation", "diagram": "Diagram", "other": "Other" },
"home": { "addDeliverable": "Add a deliverable", "kindLabel": "Type", "titleLabel": "Title", "create": "Create", "creating": "Creating…", "noDeliverables": "No deliverables yet." }
```
and awaiting: `"{count, plural, one {# to review} other {# to review}}"`.

Merge into the existing namespaces — do not duplicate keys.

- [ ] **Step 2 — verify:** `pnpm build` → no missing-key/type errors.

- [ ] **Step 3 — commit:**
```bash
git add locales/fr.json locales/en.json
git commit -m "i18n(academic-reports): deliverable kind labels + add-livrable strings"
```

---

## Task 9: Seed — a 2nd deliverable on the demo student

**Files:** Modify `scripts/seed.ts` (the `seedUniversity` section).

- [ ] **Step 1 — add a deliverable.** After the existing submitted rapport for Yasmine, insert a second `academic_reports` row: `kind: 'diagram'`, `title: 'Diagramme d\'architecture'`, `status: 'draft'`, `version: 1`, same `studentUserId`/`universityOrgId`. (Keep the existing rapport as `kind: 'rapport'` — either set it explicitly or rely on the column default.)

- [ ] **Step 2 — re-seed + verify:** `pnpm tsx --env-file=.env.local scripts/seed.ts`. Log in as Yasmine → `/intern/university` shows two livrables (the submitted rapport + the draft diagram).

- [ ] **Step 3 — commit:**
```bash
git add scripts/seed.ts
git commit -m "feat(seed): give the demo student a second livrable (diagram draft)"
```

---

## Task 10: Final verification

- [ ] **Step 1 — full suite:** `pnpm vitest run` → all PASS (expect ~+6 new tests).
- [ ] **Step 2 — typecheck + build:** `pnpm build` → PASS.
- [ ] **Step 3 — lint:** `pnpm lint` → clean.
- [ ] **Step 4 — manual walkthrough (preview):**
  - Student (Yasmine): `/intern/university` lists multiple livrables; "Ajouter un livrable" creates a new typed draft; uploading a file on a draft moves it to submitted.
  - Coordinator (prof.saidi): `/university/students/<yasmine>` shows each livrable with its own Approve / Request-changes + thread; approving one doesn't touch the others.
  - Dashboard: roster shows "{n} à relire" for Yasmine.
- [ ] **Step 5 — report** the test-count delta + any concerns. Do NOT merge — leave the branch for Sam's review (he authorized build, not merge).

---

## Self-Review (author)

- **Spec coverage:** kind column (T1), kind in draft + cap (T2), plural queries (T3), action validation (T4), student list+add (T5), coordinator per-item review (T6), roster count (T7), i18n (T8), seed (T9). All §4–§10 mapped. Coordinator-required checklist + due dates are explicit non-goals (deferred).
- **Type consistency:** `DeliverableKind` from `kinds.ts` used in service, action, and the `kind` column enum — same four values everywhere. `getReportsForStudent` returns `AcademicReport[]`; both pages map it. `getAwaitingReviewCountByStudent` returns `Map<string,number>`, consumed by the roster.
- **No placeholders:** logic tasks carry complete code; UI tasks give the new component in full + precise edits to existing pages, gated by build + preview.
