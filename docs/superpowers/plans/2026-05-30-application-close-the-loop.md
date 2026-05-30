# Application "Close the Loop" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the silently-broken status-change notification dispatch, give companies an optional applicant-visible decision note on reject/accept, and surface an events-derived status history + aging indicator — so candidates stop getting ghosted.

**Architecture:** Three independent pieces layered on existing infra. (1) The notification dispatcher matches the canonical `application.status.changed` event and partitions accept ownership to avoid a double-notify. (2) One nullable `decision_note` column threads through service → actions → company UI → intern UI → email, read by the dispatcher straight off the freshly-updated row. (3) A pure `getApplicationTimeline` query derives history from the existing `events` table (already indexed) with no migration.

**Tech Stack:** Next.js 16 (App Router, async params), React 19, TypeScript strict, Drizzle ORM on Neon-http (no transactions — write-ordering instead), next-intl (fr default / en prefixed), Vitest, Tailwind v4 + CSS-variable tokens.

---

## Source spec

`docs/superpowers/specs/2026-05-30-application-close-the-loop-design.md` (approved). Read it once before starting.

## Critical execution guardrails (read before Task 1)

- **Run all commands from `/Users/mac/code/inturn-hub/inturn`** (the shell cwd persists as the PARENT — always `cd inturn/` first). Package manager is **pnpm**, NOT npm.
- Tests/typecheck/lint: `pnpm test` (vitest run), `pnpm typecheck` (tsc --noEmit), `pnpm lint`. If a Neon/network step hangs, prefix `NODE_OPTIONS="--dns-result-order=ipv4first"`.
- **ADDITIVE ONLY.** Never delete legacy scoped CSS or rewrite working behavior. Preserve every existing route, i18n key, form schema, and passing test. The one mis-asserting dispatcher test is **corrected, not deleted**.
- **Migrations are hand-rolled** (see `scripts/migrate.ts` + `db/migrations/README.md`): the drizzle journal only tracks 0000–0001; 0002+ are idempotent `.sql` files applied by the prebuild runner. **Do NOT run `drizzle-kit generate`.** Hand-write the next-numbered `.sql` with `BEGIN; … COMMIT;` and `IF NOT EXISTS`.
- **Staging hazard:** the working tree carries **uncommitted prior work (D12 smart-create)**, and `locales/en.json` / `locales/fr.json` in particular may hold unrelated uncommitted hunks. When committing, **stage only this feature's hunks** — use `git add <explicit file>` for files this plan owns exclusively, and `git add -p locales/en.json locales/fr.json` to stage ONLY the close-the-loop keys. **Never `git add -A` or `git add .`.** If a locale file's diff is tangled, stop and ask Sam.
- Commit per task (Conventional Commits), trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Follow Sam's stacked-feat-branch + FF-merge workflow. Do not push unless asked.
- Read `node_modules/next/dist/docs/` before any framework-shaped change (this is not stock Next.js).

## File map

**Create**
- `db/migrations/0016_applications_decision_note.sql`
- `lib/email/templates/__tests__/application-status.test.ts`
- `modules/applications/__tests__/queries.test.ts`

**Modify**
- `db/schema/applications.ts` — add `decisionNote` column
- `lib/email/templates/application-status.ts` — optional `note` block
- `modules/notifications/dispatcher.ts` — canonical event + accept de-dupe + `notifyApplicant`
- `modules/notifications/__tests__/dispatcher.test.ts` — corrected strings + regression + de-dupe
- `modules/applications/service.ts` — thread `decisionNote` (transition + accept)
- `modules/applications/server-actions.ts` — optional `decisionNote` on both actions
- `modules/applications/__tests__/service.test.ts` — enhanced mock + persistence tests
- `modules/applications/queries.ts` — `getApplicationTimeline`
- `locales/en.json`, `locales/fr.json` — new keys (`applications.detail`, `applications.review`)
- `app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/_status-pipeline.tsx` — feedback UI
- `app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/page.tsx` — labels + aging line
- `app/[locale]/(platform)/intern/applications/[applicationId]/page.tsx` — feedback block + timestamped history

---

## Task 1: Add the `decision_note` schema column + migration

**Files:**
- Modify: `db/schema/applications.ts:18`
- Create: `db/migrations/0016_applications_decision_note.sql`

Foundation for Piece 2. Nullable, additive, no backfill. Everything downstream reads/writes this column, so it lands first.

- [ ] **Step 1: Add the column to the Drizzle schema**

In `db/schema/applications.ts`, add `decisionNote` immediately after `internalNotes` (line 20):

```ts
    internalNotes: text('internal_notes'),
    // Optional company→candidate feedback attached to a decision (reject/accept).
    // DISTINCT from internal_notes (which is company-private). Nullable: a decision
    // with no note is the default and works unchanged.
    decisionNote: text('decision_note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
```

- [ ] **Step 2: Hand-write the idempotent migration**

Create `db/migrations/0016_applications_decision_note.sql` (mirrors the 0014/0015 idempotent style):

```sql
-- 0016: applicant-visible decision feedback on applications.
-- Distinct from internal_notes (company-private). Additive, nullable, no backfill.
-- Hand-rolled idempotent (the drizzle journal is out of sync — see scripts/migrate.ts).

BEGIN;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS decision_note text;

COMMIT;
```

- [ ] **Step 3: Verify the schema typechecks**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm typecheck`
Expected: PASS (0 errors). `Application['decisionNote']` is now `string | null` and flows through `getApplicationById`'s `application: applications` selection automatically.

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add db/schema/applications.ts db/migrations/0016_applications_decision_note.sql
git commit -m "$(cat <<'EOF'
feat(applications): add nullable decision_note column

Applicant-visible decision feedback, distinct from company-private
internal_notes. Additive + nullable, hand-rolled idempotent migration.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Email template — optional feedback block

**Files:**
- Modify: `lib/email/templates/application-status.ts`
- Create: `lib/email/templates/__tests__/application-status.test.ts`

Lands before the dispatcher (Task 3) because `notifyApplicant` will pass `note` into this template — the param must exist first. TDD: tests first.

- [ ] **Step 1: Write the failing template tests**

Create `lib/email/templates/__tests__/application-status.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applicationStatusTemplate } from '../application-status';

describe('applicationStatusTemplate — optional feedback block', () => {
  const base = {
    applicantName: 'Lina',
    internshipTitle: 'Brand audit',
    applicationId: 'app1',
  } as const;

  it('omits the feedback block when no note is provided', () => {
    const en = applicationStatusTemplate({ ...base, status: 'rejected', locale: 'en' });
    expect(en.html).not.toContain('Feedback from the company');
    const fr = applicationStatusTemplate({ ...base, status: 'rejected', locale: 'fr' });
    expect(fr.html).not.toContain("Retour de l'entreprise");
  });

  it('omits the feedback block when the note is whitespace-only', () => {
    const en = applicationStatusTemplate({ ...base, status: 'rejected', locale: 'en', note: '   ' });
    expect(en.html).not.toContain('Feedback from the company');
  });

  it('renders an HTML-escaped EN feedback block when a note is present', () => {
    const tpl = applicationStatusTemplate({
      ...base,
      status: 'rejected',
      locale: 'en',
      note: 'Strong portfolio, <not> a fit this round',
    });
    expect(tpl.html).toContain('Feedback from the company');
    expect(tpl.html).toContain('Strong portfolio, &lt;not&gt; a fit this round');
    // The note also reaches the plaintext alternative (stripHtml keeps text nodes).
    expect(tpl.text).toContain('Strong portfolio');
  });

  it('renders the FR feedback heading when locale is fr', () => {
    const tpl = applicationStatusTemplate({
      ...base,
      status: 'accepted',
      locale: 'fr',
      note: 'Bravo et bienvenue',
    });
    expect(tpl.html).toContain("Retour de l'entreprise");
    expect(tpl.html).toContain('Bravo et bienvenue');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm test lib/email/templates/__tests__/application-status.test.ts`
Expected: FAIL — the current template has no `note` param, so the feedback blocks never render (the "renders…" cases fail).

- [ ] **Step 3: Add the optional `note` param + feedback block**

Replace the whole body of `lib/email/templates/application-status.ts` with (adds `note` to the param type, builds an escaped quoted block, appends it to `bodyHtml`):

```ts
import { baseUrl, emailLayout, escapeHtml } from './_layout';

const STATUS_FR: Record<string, string> = {
  reviewed: 'examinée',
  shortlisted: 'présélectionnée',
  interview: 'invitée à un entretien',
  accepted: 'acceptée',
  rejected: 'non retenue',
};
const STATUS_EN: Record<string, string> = {
  reviewed: 'reviewed',
  shortlisted: 'shortlisted',
  interview: 'invited to interview',
  accepted: 'accepted',
  rejected: 'declined',
};

export type ApplicationStatusForEmail =
  | 'reviewed'
  | 'shortlisted'
  | 'interview'
  | 'accepted'
  | 'rejected';

export function applicationStatusTemplate({
  applicantName,
  internshipTitle,
  status,
  applicationId,
  locale,
  note,
}: {
  applicantName: string;
  internshipTitle: string;
  status: ApplicationStatusForEmail;
  applicationId: string;
  locale: 'fr' | 'en';
  note?: string;
}) {
  const fr = locale === 'fr';
  const statusLabel = (fr ? STATUS_FR : STATUS_EN)[status];
  const title = fr
    ? `Votre candidature à ${internshipTitle} a été ${statusLabel}`
    : `Your application to ${internshipTitle} was ${statusLabel}`;
  const intro = fr
    ? `<p>Bonjour ${escapeHtml(applicantName)},</p><p>L'entreprise a mis à jour votre candidature à <strong>${escapeHtml(internshipTitle)}</strong>. Statut : <strong>${statusLabel}</strong>.</p>`
    : `<p>Hi ${escapeHtml(applicantName)},</p><p>The company updated your application to <strong>${escapeHtml(internshipTitle)}</strong>. Status: <strong>${statusLabel}</strong>.</p>`;

  // Optional company→candidate feedback. Quoted block, rendered ONLY when the
  // company attached a non-empty note; absent otherwise (graceful, unchanged).
  const trimmed = note?.trim();
  const heading = fr ? "Retour de l'entreprise" : 'Feedback from the company';
  const feedback = trimmed
    ? `<p style="margin-top:16px;font-weight:600;">${heading}</p><blockquote style="margin:8px 0;padding:12px 16px;border-left:3px solid #7C3AED;background:#F9FAFB;color:#374151;white-space:pre-line;">${escapeHtml(trimmed)}</blockquote>`
    : '';

  return {
    ...emailLayout({
      title,
      bodyHtml: `${intro}${feedback}`,
      ctaLabel: fr ? 'Voir la candidature' : 'View application',
      ctaHref: `${baseUrl()}/intern/applications/${applicationId}`,
    }),
    subject: title,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm test lib/email/templates/__tests__/application-status.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add lib/email/templates/application-status.ts lib/email/templates/__tests__/application-status.test.ts
git commit -m "$(cat <<'EOF'
feat(email): optional feedback block in application-status template

Renders an escaped, quoted company→candidate note (FR/EN) only when
present; status emails without a note are byte-for-byte unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Fix the dispatcher — canonical event + accept de-dupe + `notifyApplicant`

**Files:**
- Modify: `modules/notifications/dispatcher.ts:36-51` (switch) and `:147-218` (handlers)
- Modify: `modules/notifications/__tests__/dispatcher.test.ts:232-318`

This is Piece 1, the headline bug fix. The service emits the dotted canonical `application.status.changed`; the dispatcher matched only `application.statusChanged` / `application.status_changed`, so every non-accept transition fired **zero** notifications. Fix the match AND partition accept ownership so the fix doesn't introduce a double-notify (accept emits both `application.status.changed(to:accepted)` and `application.accepted`).

TDD: correct the test to the canonical string first (turns it red against the live bug), add the de-dupe regression guard, then fix the dispatcher.

- [ ] **Step 1: Correct + extend the dispatcher tests**

In `modules/notifications/__tests__/dispatcher.test.ts`, replace the entire `describe('application.statusChanged', …)` block AND the `describe('application.accepted', …)` block (lines 232–318) with:

```ts
describe('application.status.changed (canonical event)', () => {
  // Regression guard for the silent-notification bug: the service emits the dotted
  // canonical 'application.status.changed' (modules/events/types.ts). The dispatcher
  // previously matched only camel/snake forms, so every non-accept transition fired
  // ZERO notifications. Feed the EXACT string the service emits.
  it('in-app + email to the applicant for a notifiable status (canonical string)', async () => {
    queueStatusChanged();

    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { from: 'reviewed', to: 'shortlisted' },
    });

    const notifs = notifInserts();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].values).toMatchObject({ recipientId: 'intern1', type: 'application.status' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'lina@x.com' });
  });

  it('ignores a status that is not in the notifiable allow-list (e.g. "new")', async () => {
    // No rows need queueing — it bails before the row fetch.
    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { to: 'new' },
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does NOT notify on to=accepted here (accept is owned by application.accepted)', async () => {
    // Critical de-dupe half: the accepted status-change must early-return so the
    // separate application.accepted event is the single source of the notification.
    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { from: 'shortlisted', to: 'accepted' },
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('notifyEmail=false suppresses only the email', async () => {
    queueStatusChanged({ notifyEmail: false });

    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { to: 'shortlisted' },
    });

    expect(notifInserts()).toHaveLength(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('notifyInApp=false suppresses only the in-app notification', async () => {
    queueStatusChanged({ notifyInApp: false });

    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { to: 'rejected' },
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('application.accepted (owns the accept notification)', () => {
  it('writes one in-app row with to=accepted', async () => {
    queueStatusChanged();

    await dispatchNotificationsFor({
      type: 'application.accepted',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { workspaceId: 'ws1' },
    });

    const notifs = notifInserts();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].values).toMatchObject({
      recipientId: 'intern1',
      type: 'application.status',
      metadata: expect.objectContaining({ to: 'accepted' }),
    });
  });

  it('de-dupes: the TWO events accept emits produce EXACTLY ONE notification', async () => {
    // acceptApplication records BOTH application.status.changed(to:accepted) AND
    // application.accepted. The first early-returns (accept owned here); only the
    // second writes. Net = one notification, one email — not two.
    queueStatusChanged(); // consumed by the application.accepted path only

    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { from: 'shortlisted', to: 'accepted' },
    });
    await dispatchNotificationsFor({
      type: 'application.accepted',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { workspaceId: 'ws1' },
    });

    expect(notifInserts()).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify the bug-exposing tests fail**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm test modules/notifications/__tests__/dispatcher.test.ts`
Expected: FAIL — `'in-app + email … (canonical string)'`, both `notify*=false` cases, and the `application.accepted` cases fail because the live dispatcher does not handle `application.status.changed` (the canonical string falls through the switch). This is the silent bug, now caught.

- [ ] **Step 3: Fix the dispatcher switch**

In `modules/notifications/dispatcher.ts`, replace the two dead cases (lines 40–41) so the switch reads:

```ts
    switch (event.type) {
      case 'application.created':
        await onApplicationCreated(event);
        break;
      case 'application.status.changed':
        await onApplicationStatusChanged(event);
        break;
      case 'application.accepted':
        await onApplicationAccepted(event);
        break;
      case 'checkin.due':
        await onCheckinDue(event);
        break;
      // additional event types extend here
    }
```

- [ ] **Step 4: Extract `notifyApplicant` + partition accept ownership**

Replace `onApplicationStatusChanged` and `onApplicationAccepted` (lines 147–218) with the helper + two thin handlers:

```ts
// Applicant-facing statuses that notify on a plain status change, EXCLUDING
// 'accepted'. Accept is owned by onApplicationAccepted (it fires a separate
// application.accepted event); handling it here too would double-notify.
const NOTIFIABLE_STATUSES: ApplicationStatusForEmail[] = [
  'reviewed',
  'shortlisted',
  'interview',
  'rejected',
];

/**
 * Shared applicant-notification body. Re-selects the freshly-updated application
 * row (the status UPDATE has already committed by the time recordEvent fires), so
 * applications.decisionNote — the optional company→candidate feedback — is read
 * straight off the row (no event-metadata threading). Writes the in-app row and/or
 * the status email, each gated by the recipient's channel preference.
 */
async function notifyApplicant(
  applicationId: string,
  status: ApplicationStatusForEmail,
): Promise<void> {
  const [row] = await db
    .select({
      app: applications,
      internship: internships,
      applicant: users,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) return;

  const note = row.app.decisionNote ?? null;
  const applicantName =
    `${row.applicant.firstName ?? ''} ${row.applicant.lastName ?? ''}`.trim() || 'there';
  const prefs = prefsFor(row.applicant);

  if (prefs.notifyInApp) {
    await db.insert(notifications).values({
      recipientId: row.applicant.id,
      type: 'application.status',
      body: `Your application to ${row.internship.title} was ${status}`,
      href: `/intern/applications/${row.app.id}`,
      metadata: {
        applicationId: row.app.id,
        internshipId: row.internship.id,
        to: status,
      },
    });
  }

  if (prefs.notifyEmail) {
    const locale = await localeFor(row.applicant.id);
    const tpl = applicationStatusTemplate({
      applicantName,
      internshipTitle: row.internship.title,
      status,
      applicationId: row.app.id,
      locale,
      note: note ?? undefined,
    });
    await sendEmail({
      to: row.applicant.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      tags: [{ name: 'type', value: 'application.status' }],
    });
  }
}

async function onApplicationStatusChanged(event: DispatchInput): Promise<void> {
  if (!event.targetId) return;
  const newStatus = event.metadata?.to as string | undefined;
  if (!newStatus) return;
  // Accept is owned by onApplicationAccepted — early-return to avoid a double-notify
  // (acceptApplication emits BOTH application.status.changed(to:accepted) AND
  // application.accepted).
  if (newStatus === 'accepted') return;
  if (!(NOTIFIABLE_STATUSES as readonly string[]).includes(newStatus)) return;
  await notifyApplicant(event.targetId, newStatus as ApplicationStatusForEmail);
}

async function onApplicationAccepted(event: DispatchInput): Promise<void> {
  if (!event.targetId) return;
  await notifyApplicant(event.targetId, 'accepted');
}
```

(No import changes needed: `applications`, `eq`, `users`, `internships`, `notifications`, `sendEmail`, `applicationStatusTemplate`, `ApplicationStatusForEmail` are all already imported in this file.)

- [ ] **Step 5: Run to verify the dispatcher tests pass**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm test modules/notifications/__tests__/dispatcher.test.ts`
Expected: PASS (all cases, including the de-dupe guard). The `application.created` and `checkin.due` blocks are untouched and still green.

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/notifications/dispatcher.ts modules/notifications/__tests__/dispatcher.test.ts
git commit -m "$(cat <<'EOF'
fix(notifications): dispatch on canonical application.status.changed

The dispatcher matched only camel/snake event names, so reviewed/
shortlisted/interview/rejected fired no candidate notification. Match the
dotted canonical string the service actually emits, and partition accept
ownership (status.changed early-returns on accepted; application.accepted
owns it) to avoid a double-notify. Shared notifyApplicant reads the
optional decision_note straight off the updated row. Corrects the test
that previously asserted the dead strings.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Thread `decisionNote` through the service + server actions

**Files:**
- Modify: `modules/applications/service.ts:68-99` (transition) and `:120-204` (accept)
- Modify: `modules/applications/server-actions.ts:82-100` (transition action) and `:116-133` (accept action)
- Modify: `modules/applications/__tests__/service.test.ts`

Persist the optional note in the **same UPDATE that sets status, before `recordEvent` fires** — so the dispatcher's re-select reads it. TDD: enhance the existing mock to capture `.set()` payloads, add persistence tests (red), then thread the param (green).

- [ ] **Step 1: Enhance the service-test mock + add persistence tests**

In `modules/applications/__tests__/service.test.ts`:

(a) Replace the `// ---- update chain ----` section and the `db` object inside `vi.hoisted` (lines 79–96) with a version that captures `.set()` payloads and supports `.returning()`:

```ts
  // ---- update chain -------------------------------------------------------
  // Captures every .set() payload so tests can assert decisionNote is persisted in
  // the SAME update that flips status. .where() returns a thenable that ALSO exposes
  // .returning() — transitionApplicationStatus awaits .returning(); acceptApplication
  // awaits .where() directly. Both resolve to the same updated-row stub.
  const updateSets: Array<Record<string, unknown>> = [];
  const updatedRows = [{ id: 'app1', status: 'updated', decisionNote: null }];
  function makeUpdateWhereResult() {
    return {
      then: (f: (v: unknown) => unknown, r?: (e: unknown) => unknown) =>
        Promise.resolve(updatedRows).then(f, r),
      returning: vi.fn(() => Promise.resolve(updatedRows)),
    };
  }
  const updateWhere = vi.fn(() => {
    callOrder.push('update:applications');
    return makeUpdateWhereResult();
  });

  const db = {
    select: vi.fn(() => makeSelectChain()),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: insertReturning })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        updateSets.push(payload);
        return { where: updateWhere };
      }),
    })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  };

  return { db, callOrder, selectQueue, insertReturning, updateWhere, updateSets };
```

(b) Change the `recordEvent` mock (line 109) to log its order, so the "before the event" invariant is testable:

```ts
vi.mock('@/modules/events/service', () => ({
  recordEvent: vi.fn(async () => {
    mocks.callOrder.push('recordEvent');
    return {};
  }),
}));
```

(c) Add `transitionApplicationStatus` to the import (line 111):

```ts
import { acceptApplication, transitionApplicationStatus } from '../service';
```

(d) Reset `updateSets` in `beforeEach` (after the `selectQueue` reset, line 128):

```ts
  mocks.updateSets.length = 0;
```

(e) Append a new describe block at the end of the file:

```ts
describe('decisionNote persistence (applicant-facing feedback)', () => {
  it('transitionApplicationStatus writes decisionNote in the same UPDATE as status, before the event', async () => {
    mocks.selectQueue.push([{ ...fakeApplication, status: 'shortlisted' }]);

    await transitionApplicationStatus({
      applicationId: 'app1',
      to: 'rejected',
      actorId: 'actor1',
      decisionNote: 'Strong portfolio — not a fit this round.',
    });

    expect(mocks.updateSets).toHaveLength(1);
    expect(mocks.updateSets[0]).toMatchObject({
      status: 'rejected',
      decisionNote: 'Strong portfolio — not a fit this round.',
    });
    // Ordering invariant: the note-bearing UPDATE lands BEFORE recordEvent fires.
    expect(mocks.callOrder.indexOf('update:applications')).toBeLessThan(
      mocks.callOrder.indexOf('recordEvent'),
    );
  });

  it('transitionApplicationStatus omits decisionNote from the UPDATE when none is given', async () => {
    mocks.selectQueue.push([{ ...fakeApplication, status: 'reviewed' }]);

    await transitionApplicationStatus({
      applicationId: 'app1',
      to: 'shortlisted',
      actorId: 'actor1',
    });

    expect(mocks.updateSets).toHaveLength(1);
    expect(mocks.updateSets[0]).not.toHaveProperty('decisionNote');
    expect(mocks.updateSets[0]).toMatchObject({ status: 'shortlisted' });
  });

  it('acceptApplication persists decisionNote in the status UPDATE', async () => {
    mocks.selectQueue.push([fakeApplication], [fakeInternship], []);

    await acceptApplication({
      applicationId: 'app1',
      actorId: 'actor1',
      decisionNote: 'Welcome aboard!',
    });

    const acceptedSet = mocks.updateSets.find((s) => s.status === 'accepted');
    expect(acceptedSet).toBeDefined();
    expect(acceptedSet).toMatchObject({ status: 'accepted', decisionNote: 'Welcome aboard!' });
  });

  it('acceptApplication trims a whitespace-only note to undefined (stored NULL)', async () => {
    mocks.selectQueue.push([fakeApplication], [fakeInternship], []);

    await acceptApplication({
      applicationId: 'app1',
      actorId: 'actor1',
      decisionNote: '   ',
    });

    const acceptedSet = mocks.updateSets.find((s) => s.status === 'accepted');
    expect(acceptedSet).toBeDefined();
    expect(acceptedSet).not.toHaveProperty('decisionNote');
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm test modules/applications/__tests__/service.test.ts`
Expected: FAIL — `transitionApplicationStatus` doesn't accept `decisionNote` and neither UPDATE includes it, so `updateSets[0]` lacks `decisionNote`. The four existing write-order/state-machine tests still pass.

- [ ] **Step 3: Thread `decisionNote` through the service**

In `modules/applications/service.ts`, replace `transitionApplicationStatus` (lines 68–99) with:

```ts
export async function transitionApplicationStatus(input: {
  applicationId: string;
  to: ApplicationStatus;
  actorId: string;
  decisionNote?: string;
}) {
  const [current] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, input.applicationId))
    .limit(1);
  if (!current) throw new Error('Application not found');
  const from = current.status as ApplicationStatus;
  if (!isValidApplicationTransition(from, input.to)) {
    throw new Error(`Invalid transition: ${from} → ${input.to}`);
  }

  // Persist optional applicant-visible feedback in the SAME update that flips
  // status, BEFORE recordEvent fires — so the dispatcher's re-select reads it off
  // the freshly-updated row. Empty/whitespace → undefined: leave the column as-is.
  const decisionNote = input.decisionNote?.trim() || undefined;

  const [updated] = await db
    .update(applications)
    .set({
      status: input.to,
      ...(decisionNote !== undefined ? { decisionNote } : {}),
      updatedAt: new Date(),
    })
    .where(eq(applications.id, input.applicationId))
    .returning();

  await recordEvent({
    type: 'application.status.changed',
    actorId: input.actorId,
    targetType: 'application',
    targetId: input.applicationId,
    metadata: { from, to: input.to },
  });

  return updated;
}
```

Then update `acceptApplication`'s signature (line 120) and its status UPDATE (lines 176–179):

```ts
export async function acceptApplication(input: {
  applicationId: string;
  actorId: string;
  decisionNote?: string;
}) {
```

```ts
  // Write 2: only after the workspace exists, mark the application accepted. The
  // optional decision note rides on this same UPDATE, before recordEvent fires.
  const decisionNote = input.decisionNote?.trim() || undefined;
  await db
    .update(applications)
    .set({
      status: 'accepted',
      ...(decisionNote !== undefined ? { decisionNote } : {}),
      updatedAt: new Date(),
    })
    .where(eq(applications.id, input.applicationId));
```

- [ ] **Step 4: Thread `decisionNote` through the server actions**

In `modules/applications/server-actions.ts`, update `transitionApplicationStatusAction` (lines 82–100) — add the optional field to the input type and pass it through:

```ts
export async function transitionApplicationStatusAction(input: {
  applicationId: string;
  projectId: string;
  to: ApplicationStatus;
  decisionNote?: string;
}) {
  const user = await requireUser();
  await assertProjectSupervisor(input.projectId, user.id);
  await transitionApplicationStatus({
    applicationId: input.applicationId,
    to: input.to,
    actorId: user.id,
    decisionNote: input.decisionNote,
  });
  // Company inbox + applicant intern's dashboard/list all change.
  revalidatePath(`/company/projects/${input.projectId}/applications`);
  revalidatePath(`/company/projects/${input.projectId}/applications/${input.applicationId}`);
  revalidatePath('/intern/dashboard');
  revalidatePath('/intern/applications');
  revalidatePath(`/intern/applications/${input.applicationId}`);
}
```

And `acceptApplicationAction` (lines 116–133):

```ts
export async function acceptApplicationAction(input: {
  applicationId: string;
  projectId: string;
  decisionNote?: string;
}) {
  const user = await requireUser();
  await assertProjectSupervisor(input.projectId, user.id);
  const result = await acceptApplication({
    applicationId: input.applicationId,
    actorId: user.id,
    decisionNote: input.decisionNote,
  });
  // Workspace was just created; dashboards on both sides need refresh.
  revalidatePath('/intern/dashboard');
  revalidatePath('/intern/applications');
  revalidatePath('/company/dashboard');
  revalidatePath(`/company/projects/${input.projectId}`);
  revalidatePath(`/company/projects/${input.projectId}/applications`);
  redirect(`/company/workspaces/${result.workspace.id}`);
}
```

- [ ] **Step 5: Run to verify the service tests pass**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm test modules/applications/__tests__/service.test.ts`
Expected: PASS (existing write-order + state-machine cases AND the 4 new persistence cases).

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/applications/service.ts modules/applications/server-actions.ts modules/applications/__tests__/service.test.ts
git commit -m "$(cat <<'EOF'
feat(applications): thread optional decisionNote through transition + accept

Persisted in the same UPDATE that sets status, before the event records,
so the dispatcher reads it off the row. Empty notes stay NULL.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `getApplicationTimeline` query (events-derived history, no migration)

**Files:**
- Modify: `modules/applications/queries.ts:1-3` (imports) + append the function
- Create: `modules/applications/__tests__/queries.test.ts`

Piece 3 data layer. Derives history from the existing `events` table (the `events_target_created_idx` compound index already covers `WHERE target_id ORDER BY created_at`). Collapses the duplicate `accepted` (accept emits both `status.changed(accepted)` and `application.accepted`). Falls back for legacy rows with no events. TDD: tests first.

- [ ] **Step 1: Write the failing query tests**

Create `modules/applications/__tests__/queries.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Thenable FIFO select-chain mock: awaiting the chain at any point resolves the
// next queued row-set (so both `await …orderBy()` and `await …limit()` work).
const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  function makeSelectChain() {
    const result = () => Promise.resolve(selectQueue.shift() ?? []);
    const chain: Record<string, unknown> = {
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        result().then(onF, onR),
    };
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit']) {
      chain[m] = vi.fn(() => chain);
    }
    return chain;
  }
  const db = { select: vi.fn(() => makeSelectChain()) };
  return { db, selectQueue };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  applications: {},
  events: {},
  internships: {},
  organizations: {},
  profiles: {},
  users: {},
}));
vi.mock('drizzle-orm', () => ({
  and: vi.fn(() => 'and'),
  asc: vi.fn(() => 'asc'),
  desc: vi.fn(() => 'desc'),
  eq: vi.fn(() => 'eq'),
  inArray: vi.fn(() => 'inArray'),
}));

import { getApplicationTimeline } from '../queries';

const d = (iso: string) => new Date(iso);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

describe('getApplicationTimeline', () => {
  it('maps a created→reviewed→shortlisted event stream to ordered steps', async () => {
    mocks.selectQueue.push([
      { type: 'application.created', metadata: null, createdAt: d('2026-05-01T09:00:00Z') },
      { type: 'application.status.changed', metadata: { to: 'reviewed' }, createdAt: d('2026-05-03T09:00:00Z') },
      { type: 'application.status.changed', metadata: { to: 'shortlisted' }, createdAt: d('2026-05-06T09:00:00Z') },
    ]);

    const timeline = await getApplicationTimeline('app1');

    expect(timeline.map((e) => e.status)).toEqual(['applied', 'reviewed', 'shortlisted']);
    expect(timeline[0].at).toEqual(d('2026-05-01T09:00:00Z'));
    expect(timeline[2].at).toEqual(d('2026-05-06T09:00:00Z'));
  });

  it('collapses the duplicate accepted (status.changed + application.accepted) into one entry', async () => {
    mocks.selectQueue.push([
      { type: 'application.created', metadata: null, createdAt: d('2026-05-01T09:00:00Z') },
      { type: 'application.status.changed', metadata: { to: 'shortlisted' }, createdAt: d('2026-05-04T09:00:00Z') },
      { type: 'application.status.changed', metadata: { to: 'accepted' }, createdAt: d('2026-05-07T09:00:00Z') },
      { type: 'application.accepted', metadata: { workspaceId: 'ws1' }, createdAt: d('2026-05-07T09:00:01Z') },
    ]);

    const timeline = await getApplicationTimeline('app1');

    expect(timeline.map((e) => e.status)).toEqual(['applied', 'shortlisted', 'accepted']);
    // The retained accepted is the earliest of the two (the status.changed row).
    expect(timeline[2].at).toEqual(d('2026-05-07T09:00:00Z'));
  });

  it('falls back to applied + current status when there are no events (legacy row)', async () => {
    mocks.selectQueue.push([]); // no events
    mocks.selectQueue.push([{ createdAt: d('2026-04-20T08:00:00Z'), status: 'reviewed' }]); // app fetch

    const timeline = await getApplicationTimeline('legacy1');

    expect(timeline).toEqual([
      { status: 'applied', at: d('2026-04-20T08:00:00Z') },
      { status: 'reviewed', at: d('2026-04-20T08:00:00Z') },
    ]);
  });

  it('returns just applied for a brand-new legacy row still in "new"', async () => {
    mocks.selectQueue.push([]); // no events
    mocks.selectQueue.push([{ createdAt: d('2026-04-20T08:00:00Z'), status: 'new' }]);

    const timeline = await getApplicationTimeline('legacy2');

    expect(timeline).toEqual([{ status: 'applied', at: d('2026-04-20T08:00:00Z') }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm test modules/applications/__tests__/queries.test.ts`
Expected: FAIL — `getApplicationTimeline` is not exported yet (import error).

- [ ] **Step 3: Implement `getApplicationTimeline`**

In `modules/applications/queries.ts`, update the imports (lines 1–3) to add `events`, `and`, `asc`, and the `ApplicationStatus` type:

```ts
import { db } from '@/db';
import { applications, events, internships, organizations, profiles, users } from '@/db/schema';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { ApplicationStatus } from './state-machine';
```

Then append the function at the end of the file:

```ts
export type TimelineEntry = { status: ApplicationStatus | 'applied'; at: Date };

/**
 * Derive an application's status history from the immutable `events` log — no
 * dedicated history table. Reads every application-scoped event (covered by
 * events_target_created_idx) and maps:
 *   application.created        → 'applied'
 *   application.status.changed → metadata.to
 *   application.accepted       → 'accepted'
 * Collapses repeated statuses (accept emits status.changed(accepted) AND
 * application.accepted), keeping the earliest, ascending by time. For legacy
 * applications with no events, falls back to [applied @ createdAt] (+ current
 * status if past 'new').
 */
export async function getApplicationTimeline(applicationId: string): Promise<TimelineEntry[]> {
  const rows = await db
    .select({ type: events.type, metadata: events.metadata, createdAt: events.createdAt })
    .from(events)
    .where(and(eq(events.targetType, 'application'), eq(events.targetId, applicationId)))
    .orderBy(asc(events.createdAt));

  const entries: TimelineEntry[] = [];
  for (const r of rows) {
    if (r.type === 'application.created') {
      entries.push({ status: 'applied', at: r.createdAt });
    } else if (r.type === 'application.status.changed') {
      const to = (r.metadata as { to?: string } | null)?.to;
      if (to) entries.push({ status: to as ApplicationStatus, at: r.createdAt });
    } else if (r.type === 'application.accepted') {
      entries.push({ status: 'accepted', at: r.createdAt });
    }
  }

  // Collapse repeated statuses (keep the earliest), ascending by time.
  const seen = new Set<string>();
  const deduped = entries
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .filter((e) => (seen.has(e.status) ? false : (seen.add(e.status), true)));

  if (deduped.length > 0) return deduped;

  // Legacy/sparse fallback: no events recorded for this application.
  const [app] = await db
    .select({ createdAt: applications.createdAt, status: applications.status })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return [];
  const fallback: TimelineEntry[] = [{ status: 'applied', at: app.createdAt }];
  if (app.status && app.status !== 'new') {
    fallback.push({ status: app.status as ApplicationStatus, at: app.createdAt });
  }
  return fallback;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm test modules/applications/__tests__/queries.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add modules/applications/queries.ts modules/applications/__tests__/queries.test.ts
git commit -m "$(cat <<'EOF'
feat(applications): getApplicationTimeline derived from events log

Maps application events to an ordered status history, collapses the
duplicate accepted, and falls back for legacy rows. No migration — reuses
the existing events_target_created_idx index.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: i18n keys (FR + EN) for all new strings

**Files:**
- Modify: `locales/en.json` — `applications.detail` + `applications.review`
- Modify: `locales/fr.json` — `applications.detail` + `applications.review`

Keys land before the UI tasks (7–9) that consume them, so next-intl never sees a missing key. **STAGING WARNING:** these two files may carry uncommitted D12 work — use `git add -p` and stage only these hunks.

- [ ] **Step 1: Add EN keys**

In `locales/en.json`, extend `applications.detail` (after `withdrawConfirm`) with:

```json
    "feedbackHeading": "Feedback from the company",
    "reviewingSince": "Under review since {date} · {days, plural, =0 {today} one {# day} other {# days}}",
    "decidedOn": "Decision made {date}"
```

And extend `applications.review` (after `pipeline`) with:

```json
    "reject": "Reject application",
    "feedbackHint": "Feedback to the candidate (optional — they'll see this)",
    "feedbackPlaceholder": "Optional message to the candidate…",
    "confirmReject": "Confirm rejection",
    "confirmAccept": "Confirm & accept",
    "cancel": "Cancel",
    "agingLine": "In {status} for {days, plural, =0 {less than a day} one {# day} other {# days}}"
```

(Remember to add a comma after the prior last key in each object — `withdrawConfirm` and `pipeline` — so the JSON stays valid.)

- [ ] **Step 2: Add FR keys**

In `locales/fr.json`, extend `applications.detail` with:

```json
    "feedbackHeading": "Retour de l'entreprise",
    "reviewingSince": "En cours d'examen depuis le {date} · {days, plural, =0 {aujourd'hui} one {# jour} other {# jours}}",
    "decidedOn": "Décision rendue le {date}"
```

And extend `applications.review` with:

```json
    "reject": "Refuser la candidature",
    "feedbackHint": "Retour au candidat (facultatif — il le verra)",
    "feedbackPlaceholder": "Message facultatif au candidat…",
    "confirmReject": "Confirmer le refus",
    "confirmAccept": "Confirmer et accepter",
    "cancel": "Annuler",
    "agingLine": "En {status} depuis {days, plural, =0 {moins d'un jour} one {# jour} other {# jours}}"
```

- [ ] **Step 3: Verify both locale files are valid JSON**

Run: `cd /Users/mac/code/inturn-hub/inturn && node -e "JSON.parse(require('fs').readFileSync('locales/en.json','utf8')); JSON.parse(require('fs').readFileSync('locales/fr.json','utf8')); console.log('both locale files parse OK')"`
Expected: `both locale files parse OK`

- [ ] **Step 4: Commit (stage only these hunks)**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add -p locales/en.json locales/fr.json   # stage ONLY the close-the-loop keys
git commit -m "$(cat <<'EOF'
i18n(applications): keys for decision feedback + status timing (fr/en)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Company UI — optional feedback on reject/accept

**Files:**
- Modify: `app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/_status-pipeline.tsx`
- Modify: `app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/page.tsx:31` + `:184-188`

The "Reject application" control and the "Accepted" step expand inline to a small optional textarea + Confirm/Cancel; the note is passed to the action. Other transitions stay one-click. `_notes.tsx` (company-private internal notes) is untouched. No unit test (client component) — verified by typecheck + the Task 10 render check.

- [ ] **Step 1: Rewrite `_status-pipeline.tsx` with the inline feedback panel**

Replace the entire file with:

```tsx
'use client';

import { useState, useTransition } from 'react';
import {
  acceptApplicationAction,
  transitionApplicationStatusAction,
} from '@/modules/applications/server-actions';
import {
  isValidApplicationTransition,
  type ApplicationStatus,
} from '@/modules/applications/state-machine';

const STEPS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'accepted', label: 'Accepted' },
];

export type StatusPipelineLabels = {
  reject: string;
  feedbackHint: string;
  feedbackPlaceholder: string;
  confirmReject: string;
  confirmAccept: string;
  cancel: string;
};

export function StatusPipeline({
  applicationId,
  projectId,
  currentStatus,
  labels,
}: {
  applicationId: string;
  projectId: string;
  currentStatus: ApplicationStatus;
  labels: StatusPipelineLabels;
}) {
  const [pending, startTransition] = useTransition();
  // Which decision (if any) is awaiting an optional feedback note + confirm.
  const [feedbackFor, setFeedbackFor] = useState<'rejected' | 'accepted' | null>(null);
  const [note, setNote] = useState('');

  function transitionTo(to: ApplicationStatus, decisionNote?: string) {
    startTransition(async () => {
      if (to === 'accepted') {
        await acceptApplicationAction({ applicationId, projectId, decisionNote });
      } else {
        await transitionApplicationStatusAction({ applicationId, projectId, to, decisionNote });
      }
      setFeedbackFor(null);
      setNote('');
    });
  }

  function openFeedback(target: 'rejected' | 'accepted') {
    setNote('');
    setFeedbackFor(target);
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {STEPS.map((step) => {
          const isCurrent = step.value === currentStatus;
          const isPast =
            STEPS.findIndex((s) => s.value === step.value) <
            STEPS.findIndex((s) => s.value === currentStatus);
          const canTransition = isValidApplicationTransition(currentStatus, step.value);
          return (
            <button
              key={step.value}
              type="button"
              disabled={!canTransition || pending}
              onClick={() =>
                step.value === 'accepted' ? openFeedback('accepted') : transitionTo(step.value)
              }
              className={
                isCurrent
                  ? 'px-3 py-1.5 rounded-full text-label bg-[var(--ink)] text-white'
                  : isPast
                    ? 'px-3 py-1.5 rounded-full text-label bg-[var(--surface-muted)] text-[var(--ink-3)]'
                    : canTransition
                      ? 'px-3 py-1.5 rounded-full text-label bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]'
                      : 'px-3 py-1.5 rounded-full text-label bg-[var(--surface)] text-[var(--ink-4)] border border-[var(--border-color)] opacity-50 cursor-not-allowed'
              }
            >
              {step.label}
            </button>
          );
        })}
      </div>

      {currentStatus !== 'rejected' && currentStatus !== 'accepted' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => openFeedback('rejected')}
          className="text-label text-[var(--danger)] hover:underline"
        >
          {labels.reject}
        </button>
      )}

      {feedbackFor && (
        <div className="mt-3 border border-[var(--border-color)] rounded-md p-3 bg-[var(--surface)]">
          <label htmlFor="decision-note" className="block text-caption text-[var(--ink-3)] mb-1">
            {labels.feedbackHint}
          </label>
          <textarea
            id="decision-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={labels.feedbackPlaceholder}
            className="w-full rounded-md border border-[var(--border-color)] bg-[var(--surface)] p-2 text-body text-[var(--ink)] focus:border-[var(--border-strong)] focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => transitionTo(feedbackFor, note)}
              className={
                feedbackFor === 'rejected'
                  ? 'px-3 py-1.5 rounded-md text-label bg-[var(--danger)] text-white disabled:opacity-50'
                  : 'px-3 py-1.5 rounded-md text-label bg-[var(--brand-500)] text-white disabled:opacity-50'
              }
            >
              {feedbackFor === 'rejected' ? labels.confirmReject : labels.confirmAccept}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setFeedbackFor(null);
                setNote('');
              }}
              className="px-3 py-1.5 rounded-md text-label text-[var(--ink-3)] hover:text-[var(--ink)]"
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Pass the labels from the company detail page**

In `app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/page.tsx`, replace the `<StatusPipeline … />` usage (lines 184–188) with:

```tsx
        <StatusPipeline
          applicationId={applicationId}
          projectId={projectId}
          currentStatus={(application.status ?? 'new') as ApplicationStatus}
          labels={{
            reject: t('reject'),
            feedbackHint: t('feedbackHint'),
            feedbackPlaceholder: t('feedbackPlaceholder'),
            confirmReject: t('confirmReject'),
            confirmAccept: t('confirmAccept'),
            cancel: t('cancel'),
          }}
        />
```

(`t` is the existing `applications.review` translator on line 31 — no new import needed; `StatusPipeline` is already imported.)

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm typecheck`
Expected: PASS. The action calls now carry `decisionNote` (typed optional from Task 4).

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add "app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/_status-pipeline.tsx" "app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(applications): inline optional feedback on reject/accept (company)

Reject control and Accept step expand to an optional textarea + confirm;
the note is passed to the transition/accept action. Internal notes editor
untouched.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Intern UI — feedback block + timestamped status history

**Files:**
- Modify: `app/[locale]/(platform)/intern/applications/[applicationId]/page.tsx`

Surface the company's decision note and timestamp each reached step; show "under review since {date}" on the current pending step and the decision date on the rejected branch. Server component — verified by typecheck + Task 10 render check.

- [ ] **Step 1: Import the timeline query**

In `app/[locale]/(platform)/intern/applications/[applicationId]/page.tsx`, extend the queries import (line 9):

```ts
import { getApplicationById, getApplicationTimeline } from '@/modules/applications/queries';
```

- [ ] **Step 2: Fetch the timeline and derive the per-step date map**

After the `getTranslations` Promise.all (around line 33) and the `const { application, internship } = data;` line, add:

```tsx
  const timeline = await getApplicationTimeline(applicationId);
  // step key → date reached. The 'applied' entry maps onto the first ('new') pill.
  const reachedAt = new Map<string, Date>();
  for (const e of timeline) {
    reachedAt.set(e.status === 'applied' ? 'new' : e.status, e.at);
  }
  const latest = timeline[timeline.length - 1];
  const daysSinceLatest = latest
    ? Math.floor((Date.now() - latest.at.getTime()) / 86_400_000)
    : 0;
  const fmtDate = (dt: Date) =>
    dt.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
```

- [ ] **Step 3: Add the decision date to the rejected box**

Replace the rejected branch (lines 75–78) with:

```tsx
        {status === 'rejected' ? (
          <div className="border border-[color-mix(in_srgb,var(--status-danger-ink)_22%,transparent)] bg-[var(--status-danger-bg)] text-[var(--status-danger-ink)] rounded-md p-3 text-label">
            <div>{t('closedLabel')}</div>
            {latest && (
              <div className="text-caption text-[var(--status-danger-ink)] opacity-80 mt-1">
                {t('decidedOn', { date: fmtDate(latest.at) })}
              </div>
            )}
          </div>
        ) : (
```

- [ ] **Step 4: Add timestamps under each reached step**

Replace the step-map body (lines 81–102, the `TIMELINE_STEPS.map(...)` callback) with a version that stacks the pill over its date:

```tsx
            {TIMELINE_STEPS.map((step, i) => {
              const isCurrent = i === currentIdx;
              const isPast = i < currentIdx;
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={
                        isCurrent
                          ? 'px-3 py-1.5 rounded-full text-caption font-medium bg-[var(--brand-500)] text-white whitespace-nowrap'
                          : isPast
                            ? 'px-3 py-1.5 rounded-full text-caption font-medium bg-[var(--brand-50)] text-[var(--brand-600)] whitespace-nowrap'
                            : 'px-3 py-1.5 rounded-full text-caption font-medium bg-[var(--surface)] text-[var(--ink-4)] border border-[var(--border-color)] whitespace-nowrap'
                      }
                    >
                      {tStatus(step)}
                    </div>
                    {reachedAt.has(step) && (
                      <span className="text-[10px] font-mono text-[var(--ink-4)] whitespace-nowrap">
                        {fmtDate(reachedAt.get(step)!)}
                      </span>
                    )}
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <span className="hidden sm:inline h-px w-3 bg-[var(--border-color)]" />
                  )}
                </div>
              );
            })}
```

- [ ] **Step 5: Add the "under review since" line under the stepper**

Immediately after the closing `</div>` of the stepper's `flex flex-wrap` container and before the `{status === 'accepted' && workspaceId && (...)}` block (around line 104), add:

```tsx
        {status !== 'accepted' && status !== 'rejected' && latest && (
          <p className="text-caption text-[var(--ink-3)] mt-3">
            {t('reviewingSince', { date: fmtDate(latest.at), days: daysSinceLatest })}
          </p>
        )}
```

- [ ] **Step 6: Render the feedback block under the status section**

Immediately after the status `</section>` (line 115) and before the cover-note section, add:

```tsx
      {application.decisionNote && (
        <section className="mb-8">
          <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-2">
            {t('feedbackHeading')}
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] text-body text-[var(--ink-2)] whitespace-pre-line">
            {application.decisionNote}
          </div>
        </section>
      )}
```

- [ ] **Step 7: Verify typecheck**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm typecheck`
Expected: PASS. `application.decisionNote` is `string | null` (Task 1); `tStatus` and `t` already exist on this page.

- [ ] **Step 8: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add "app/[locale]/(platform)/intern/applications/[applicationId]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(applications): intern decision feedback + timestamped history

Renders the company's optional feedback note, stamps each reached step
with its date, shows "under review since" on the pending step, and the
decision date on the rejected branch.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Company UI — light aging line on the review detail

**Files:**
- Modify: `app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/page.tsx`

A single "In {status} for {n} days" line on the detail header, derived from the latest timeline entry. No inbox columns. Server component — verified by typecheck + Task 10.

- [ ] **Step 1: Import the timeline query**

In the company `page.tsx`, extend the queries import (line 8):

```ts
import { getApplicationById, getApplicationTimeline } from '@/modules/applications/queries';
```

- [ ] **Step 2: Add a status translator alongside the existing review translator**

Replace line 31 (`const t = await getTranslations({ locale, namespace: 'applications.review' });`) with:

```tsx
  const [t, tStatus] = await Promise.all([
    getTranslations({ locale, namespace: 'applications.review' }),
    getTranslations({ locale, namespace: 'applications.status' }),
  ]);
```

- [ ] **Step 3: Compute days-in-status**

After the `const { application, internship, applicant, profile } = data;` line (line 33), add:

```tsx
  const timeline = await getApplicationTimeline(applicationId);
  const latestEntry = timeline[timeline.length - 1];
  const daysInStatus = latestEntry
    ? Math.floor((Date.now() - latestEntry.at.getTime()) / 86_400_000)
    : 0;
```

- [ ] **Step 4: Render the aging line under the candidate name**

Change the header flex div's bottom margin (line 50) from `mb-8` to `mb-2`:

```tsx
      <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
```

Then, immediately after that header flex `</div>` (line 61), insert the aging line (its own `mb-8` restores the spacing below; absent for terminal states):

```tsx
      {latestEntry && application.status !== 'rejected' && application.status !== 'accepted' ? (
        <p className="text-caption text-[var(--ink-3)] mb-8">
          {t('agingLine', { status: tStatus(application.status ?? 'new'), days: daysInStatus })}
        </p>
      ) : (
        <div className="mb-6" />
      )}
```

- [ ] **Step 5: Verify typecheck**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/code/inturn-hub/inturn
git add "app/[locale]/(platform)/company/projects/[projectId]/applications/[applicationId]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(applications): light aging line on company review detail

"In {status} for {n} days" derived from the events timeline. No inbox
columns.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Full verification + manual render check

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm typecheck`
Expected: PASS, 0 errors.

- [ ] **Step 2: Lint**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm lint`
Expected: PASS (no new errors/warnings in touched files).

- [ ] **Step 3: Full test suite**

Run: `cd /Users/mac/code/inturn-hub/inturn && pnpm test`
Expected: PASS. Test count ≥ the prior baseline (276+) **plus** the new tests (4 email + 4 service persistence + 4 timeline + the corrected/added dispatcher cases). Zero failures. Confirm the previously-mis-asserting dispatcher test is gone (corrected to the canonical string), not merely skipped.

- [ ] **Step 4: Render smoke check (optional but recommended)**

If a dev server + `DEV_AUTH_BYPASS=1` cookie are available, render the two detail pages and grep the served HTML for the new strings to confirm they wire up (per Sam's "honest verification" preference):

```bash
cd /Users/mac/code/inturn-hub/inturn
# intern detail — expect the timestamped stepper / "under review since" copy
curl -s "http://localhost:3000/en/intern/applications/<seeded-app-id>" | grep -iE "under review since|Feedback from the company" || echo "intern strings not found (check seed id / auth cookie)"
# company detail — expect the aging line + reject control copy
curl -s "http://localhost:3000/en/company/projects/<seeded-project-id>/applications/<seeded-app-id>" | grep -iE "In .* for .* day|Reject application" || echo "company strings not found (check ids / auth cookie)"
```

Expected: the greps match (or, if the dev server/seed isn't available, note that and rely on typecheck + tests).

- [ ] **Step 5: Self-review the diff**

```bash
cd /Users/mac/code/inturn-hub/inturn
git log --oneline -10
git diff --stat HEAD~9..HEAD
```

Confirm: only the 14 files in the File map changed; no stray `git add -A` sweep pulled in unrelated D12/working-tree changes; both locale files contain the new keys and nothing else from this feature.

- [ ] **Step 6: Finish the branch**

Use the **superpowers:finishing-a-development-branch** skill to present merge/PR options to Sam.

---

## Self-Review (plan author — completed before handoff)

**1. Spec coverage:**
- Piece 1 (notification dispatch fix + accept de-dupe + `notifyApplicant`) → Task 3. ✓
- Piece 2 (decision_note: schema/migration → service → actions → company UI → intern UI → email) → Tasks 1, 2, 4, 7, 8. ✓
- Piece 3 (events-derived timeline + intern timestamps + company aging) → Tasks 5, 8, 9. ✓
- i18n FR/EN for every new string → Task 6. ✓
- Testing strategy (dispatcher regression + single-notify; service persistence + ordering; timeline mapping + fallback; email block FR/EN) → Tasks 2, 3, 4, 5. ✓
- Non-goals (no messaging, no interview scheduling, no inbox columns, withdraw untouched) → respected; `_notes.tsx` and `withdrawApplicationAction` are not modified. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step contains complete code; every run step states the exact command + expected result. ✓

**3. Type consistency:**
- `notifyApplicant(applicationId, status)` — 2-arg; reads `decisionNote` off the re-selected row (the spec's `note` arg is satisfied by the row read, which the spec explicitly endorses). Both callers (`onApplicationStatusChanged`, `onApplicationAccepted`) match. ✓
- `applicationStatusTemplate({…, note?})` — `note` added in Task 2, consumed in Task 3. Ordered correctly. ✓
- `decisionNote?: string` — identical optional on `transitionApplicationStatus`, `acceptApplication`, and both actions. ✓
- `TimelineEntry = { status: ApplicationStatus | 'applied'; at: Date }` — produced by Task 5, consumed by Tasks 8 & 9 via `timeline[…].at` / `.status`. ✓
- `StatusPipelineLabels` keys ↔ `applications.review` JSON keys (`reject`, `feedbackHint`, `feedbackPlaceholder`, `confirmReject`, `confirmAccept`, `cancel`) — names match across Task 6 (JSON) and Task 7 (props). ✓
- `agingLine`/`reviewingSince`/`decidedOn`/`feedbackHeading` consumed with the exact `{status}`/`{date}`/`{days}` args declared in the ICU strings. ✓

**Dependency order verified:** 1 (column) → 2 (template) → 3 (dispatcher reads column + uses template) → 4 (service writes column) → 5 (timeline) → 6 (keys) → 7/8/9 (UI consume keys + actions + timeline) → 10 (verify). Each task compiles on top of the prior.

**Decisions locked in this plan (reconciling spec intent with code):**
- `feedbackHeading` is generic ("Feedback from the company" / "Retour de l'entreprise") rather than "Feedback from {org}" — the intern page doesn't load the organization, and adding a join is out of scope for this loop. Same closure, no extra query.
- Rejected branch keeps the "closed" box (now with a decision date) AND shows the feedback block below it — satisfies "candidates aren't ghosted" without a structural rewrite of the branch.
- `notifyApplicant` re-selects the row and reads `decisionNote` rather than threading a `note` param through events — exactly as the spec's "read off the freshly-updated row" guidance prescribes.
