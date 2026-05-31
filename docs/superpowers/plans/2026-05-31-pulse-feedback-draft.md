# Pulse Deliverable-Feedback Draft — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give supervisors an on-demand "Draft with Pulse" / "Reformulate" button in the deliverable review bar that fills the revision-feedback textarea with AI-generated or AI-polished prose, which they edit and send through the existing flow.

**Architecture:** A pure prompt module + a Pulse engine fn (`draftRevisionFeedback`, AI when enabled / heuristic scaffold otherwise / never throws) + a generate-only server action (reuses the deliverable auth gate, rate-limited, writes nothing) + ~20 lines in the existing `DelivReviewBar` client component. One smart button: empty box → draft from context; box with the supervisor's notes → reformulate them.

**Tech Stack:** Next.js 16 (App Router, server actions), `@anthropic-ai/sdk` (`claude-sonnet-4-5`), next-intl 4, Drizzle/Neon, vitest.

**Spec:** `docs/superpowers/specs/2026-05-31-pulse-feedback-draft-design.md`

**Conventions:**
- All commits: Conventional Commits + a `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` trailer (repo norm for feature commits).
- Per `AGENTS.md`, this is a modified Next.js — the server-action / `getLocale` code below mirrors the **existing** `modules/deliverables/server-actions.ts`; consult `node_modules/next/dist/docs/` only if a pattern is unclear. Do not assume training-data APIs.
- **Deviation from spec §4:** the spec proposed extracting `modules/pulse/anthropic.ts`. Exploration showed all six AI modules (`modules/ai/*`, `modules/checkins/ai-draft`, `modules/pulse/engine`) each instantiate their own lazy `client()` — that is the convention. So `feedback.ts` self-contains its `client()` and reuses the already-exported `pulseAiEnabled` from `engine.ts`. No extraction; `engine.ts` is untouched.

**Run from:** the `inturn-feedback` worktree (`feat/pulse-feedback-draft`, off `main`).
**Run all tests with:** `pnpm test` (alias for `vitest run`). Single file: `pnpm exec vitest run <path>`.

---

### Task 1: Rate-limit bucket

**Files:**
- Modify: `lib/ratelimit.ts` (the `LimitName` union ~L29-38 and the `LIMITS` map ~L40-54)
- Test: `lib/__tests__/ratelimit.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside `lib/__tests__/ratelimit.test.ts` (a new `describe`):

```ts
import { ratelimit } from '../ratelimit';

describe('ai-feedback-draft bucket', () => {
  it('allows the first call and is keyed by name+key', () => {
    const r = ratelimit('ai-feedback-draft').limit('user-feedback-1');
    expect(r.success).toBe(true);
    expect(r.limit).toBe(20);
    expect(r.remaining).toBe(19);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run lib/__tests__/ratelimit.test.ts`
Expected: FAIL — TypeScript error / runtime: `'ai-feedback-draft'` is not assignable to `LimitName` (and `LIMITS['ai-feedback-draft']` is undefined).

- [ ] **Step 3: Add the bucket**

In `lib/ratelimit.ts`, add to the `LimitName` union (after `'ai-project-assist'`):

```ts
  | 'ai-feedback-draft'
```

And add to the `LIMITS` map (after the `'ai-project-assist'` line):

```ts
  // Deliverable revision-feedback draft/reformulate — a few per review session.
  'ai-feedback-draft': { max: 20, windowMs: 60_000 },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run lib/__tests__/ratelimit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ratelimit.ts lib/__tests__/ratelimit.test.ts
git commit -m "feat(ratelimit): add ai-feedback-draft bucket"
```

---

### Task 2: The prompt module

**Files:**
- Create: `modules/pulse/feedback-prompt.ts`
- Test: `modules/pulse/__tests__/feedback-prompt.test.ts`

The `FeedbackContext` / `DraftOpts` types are defined here so the prompt module has no dependency on `feedback.ts` (Task 3 re-exports them from here).

- [ ] **Step 1: Write the failing test**

Create `modules/pulse/__tests__/feedback-prompt.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { feedbackSystem, feedbackUserMessage, type FeedbackContext } from '../feedback-prompt';

const ctx: FeedbackContext = {
  locale: 'fr',
  deliverableTitle: 'Brand audit deck',
  deliverableDescription: null,
  version: 2,
  internFirstName: 'Arif',
  submissionNote: 'section concurrents pas complète',
  priorReviews: ['Manque une hiérarchie visuelle.'],
  taskTitle: 'Audit',
  recentCheckins: [{ shipped: 'v2', stuck: 'rien', next: 'concurrents' }],
};

describe('feedbackSystem', () => {
  it('injects the locale and keeps the honesty guardrail', () => {
    const fr = feedbackSystem('fr');
    expect(fr).toContain('fr (fr = French');
    expect(fr).toMatch(/NOT seen|Never invent/);
    const en = feedbackSystem('en');
    expect(en).toContain('en (fr = French');
  });
});

describe('feedbackUserMessage', () => {
  it('draft mode: no supervisor notes, mode=draft, carries context', () => {
    const msg = feedbackUserMessage(ctx);
    const parsed = JSON.parse(msg);
    expect(parsed.mode).toBe('draft');
    expect(parsed.supervisorNotes).toBeUndefined();
    expect(parsed.intern).toBe('Arif');
    expect(parsed.internSubmissionNote).toBe('section concurrents pas complète');
    expect(parsed.priorReviews).toEqual(['Manque une hiérarchie visuelle.']);
  });

  it('reformulate mode: carries the supervisor notes and flips the mode', () => {
    const msg = feedbackUserMessage(ctx, { draft: 'typo mieux. concurrents manque.' });
    const parsed = JSON.parse(msg);
    expect(parsed.mode).toBe('reformulate');
    expect(parsed.supervisorNotes).toBe('typo mieux. concurrents manque.');
  });

  it('treats whitespace-only draft as draft mode', () => {
    const parsed = JSON.parse(feedbackUserMessage(ctx, { draft: '   ' }));
    expect(parsed.mode).toBe('draft');
    expect(parsed.supervisorNotes).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run modules/pulse/__tests__/feedback-prompt.test.ts`
Expected: FAIL — `Cannot find module '../feedback-prompt'`.

- [ ] **Step 3: Write the implementation**

Create `modules/pulse/feedback-prompt.ts`:

```ts
/**
 * Prompt for the deliverable revision-feedback draft. Writes feedback the
 * supervisor will send TO the intern (second person), in the supervisor's voice.
 * Returns plain prose (not JSON) — it drops straight into the textarea.
 *
 * Honesty guardrail: the model has NOT seen the file. It must not invent
 * observations about the file's contents — only ground in the note, prior
 * reviews, task, and check-ins (draft mode), or the supervisor's own notes
 * (reformulate mode).
 */

export type FeedbackContext = {
  locale: 'fr' | 'en';
  deliverableTitle: string;
  deliverableDescription: string | null;
  version: number;
  internFirstName: string;
  submissionNote: string | null;
  priorReviews: string[];
  taskTitle: string | null;
  recentCheckins: { shipped: string; stuck: string; next: string }[];
};

export type DraftOpts = { draft?: string };

export const FEEDBACK_SYSTEM = `You are Pulse, an AI co-supervisor inside inturn (an internship platform). A company supervisor is sending REVISION FEEDBACK to their intern about a submitted deliverable. Write that feedback for the supervisor to send: in their voice, addressed TO the intern (second person, by first name), warm but direct, specific and constructive.

CRITICAL — you have NOT seen the file. Never invent observations about its contents (no "the design looks…", "slide 3…", "the code does…"). Ground ONLY in: the deliverable title/description, the intern's own submission note, prior reviews, the linked task, and recent check-ins. Anything you need the intern to change, phrase as a concrete request.

The user message is JSON. If "mode" is "reformulate", the supervisor wrote their own rough notes in "supervisorNotes" — they HAVE seen the file, so keep every point, their intent, and any file-specific claim they made; only improve phrasing, structure, completeness, and tone. Do NOT add claims they did not make and do NOT drop points they raised. If "mode" is "draft", compose the feedback from the context.

Structure: brief acknowledgment -> 1-3 specific, actionable points (favour what the intern flagged themselves + any unresolved point from a prior review) -> one clear next step. Under ~120 words. Plain prose only — no preamble, no markdown headers, no sign-off.

Write entirely in this locale: %LOCALE% (fr = French, en = English).`;

export function feedbackSystem(locale: 'fr' | 'en'): string {
  return FEEDBACK_SYSTEM.replace('%LOCALE%', locale);
}

export function feedbackUserMessage(ctx: FeedbackContext, opts: DraftOpts = {}): string {
  const notes = opts.draft?.trim();
  return JSON.stringify(
    {
      mode: notes ? 'reformulate' : 'draft',
      intern: ctx.internFirstName,
      deliverable: {
        title: ctx.deliverableTitle,
        description: ctx.deliverableDescription,
        version: ctx.version,
      },
      task: ctx.taskTitle,
      internSubmissionNote: ctx.submissionNote,
      priorReviews: ctx.priorReviews,
      recentCheckins: ctx.recentCheckins,
      supervisorNotes: notes || undefined,
    },
    null,
    1,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run modules/pulse/__tests__/feedback-prompt.test.ts`
Expected: PASS (all 4 assertions).

- [ ] **Step 5: Commit**

```bash
git add modules/pulse/feedback-prompt.ts modules/pulse/__tests__/feedback-prompt.test.ts
git commit -m "feat(pulse): feedback-draft prompt (draft + reformulate modes)"
```

---

### Task 3: The engine fn

**Files:**
- Create: `modules/pulse/feedback.ts`
- Test: `modules/pulse/__tests__/feedback.test.ts`

`draftRevisionFeedback` is pure (takes a pre-built `FeedbackContext`); `gatherFeedbackContext` does the DB reads (exercised by the live verify in Task 7, not unit-tested). The test mocks `@/db` only to neutralize the transitive import — `draftRevisionFeedback` never touches it.

- [ ] **Step 1: Write the failing test**

Create `modules/pulse/__tests__/feedback.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Anthropic SDK — a shared create spy backs every lazy client instance.
const create = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create };
  },
}));
// Neutralize the transitive @/db import (gatherFeedbackContext uses it; the
// draftRevisionFeedback tests below never call gatherFeedbackContext).
vi.mock('@/db', () => ({ db: {} }));

import { draftRevisionFeedback } from '../feedback';
import type { FeedbackContext } from '../feedback-prompt';

const ctx: FeedbackContext = {
  locale: 'fr',
  deliverableTitle: 'Brand audit deck',
  deliverableDescription: null,
  version: 2,
  internFirstName: 'Arif',
  submissionNote: 'section concurrents pas complète',
  priorReviews: [],
  taskTitle: null,
  recentCheckins: [],
};

const savedKey = process.env.ANTHROPIC_API_KEY;
const savedFlag = process.env.PULSE_ENABLED;
afterEach(() => {
  process.env.ANTHROPIC_API_KEY = savedKey;
  process.env.PULSE_ENABLED = savedFlag;
});
beforeEach(() => create.mockReset());

describe('draftRevisionFeedback — AI path', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    delete process.env.PULSE_ENABLED;
  });

  it('returns the model prose with source ai', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'text', text: 'Bonjour Arif, deux points…' }] });
    const out = await draftRevisionFeedback(ctx);
    expect(out).toEqual({ text: 'Bonjour Arif, deux points…', source: 'ai' });
  });

  it('falls back to heuristic when the model errors', async () => {
    create.mockRejectedValueOnce(new Error('boom'));
    const out = await draftRevisionFeedback(ctx);
    expect(out.source).toBe('heuristic');
    expect(out.text).toContain('Arif');
  });

  it('falls back to heuristic when the model returns empty text', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'text', text: '   ' }] });
    const out = await draftRevisionFeedback(ctx);
    expect(out.source).toBe('heuristic');
  });
});

describe('draftRevisionFeedback — AI disabled', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.PULSE_ENABLED = '0';
  });

  it('returns a scaffold without calling the model (draft mode)', async () => {
    const out = await draftRevisionFeedback(ctx);
    expect(create).not.toHaveBeenCalled();
    expect(out.source).toBe('heuristic');
    expect(out.text).toContain('Arif');
  });

  it('reformulate with AI off returns the supervisor notes unchanged', async () => {
    const out = await draftRevisionFeedback(ctx, { draft: '  typo mieux. concurrents manque.  ' });
    expect(create).not.toHaveBeenCalled();
    expect(out).toEqual({ text: 'typo mieux. concurrents manque.', source: 'heuristic' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run modules/pulse/__tests__/feedback.test.ts`
Expected: FAIL — `Cannot find module '../feedback'`.

- [ ] **Step 3: Write the implementation**

Create `modules/pulse/feedback.ts`:

```ts
/**
 * Deliverable revision-feedback drafting. AI synthesis when Pulse AI is enabled
 * (reuses engine's kill-switch), heuristic scaffold otherwise and on any error.
 * Never throws — mirrors computePulse. Server-only (imports the Anthropic SDK).
 *
 * draftRevisionFeedback is pure over a pre-built FeedbackContext; the server
 * action gathers the context via gatherFeedbackContext.
 */
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { users, tasks, events } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import type { Deliverable, DeliverableRevision, Workspace } from '@/db/schema';
import { pulseAiEnabled } from './engine';
import { feedbackSystem, feedbackUserMessage, type FeedbackContext, type DraftOpts } from './feedback-prompt';

export type { FeedbackContext, DraftOpts } from './feedback-prompt';

let _client: Anthropic | null = null;
function client(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

/** Build the model-ready context from a loaded deliverable + its workspace. */
export async function gatherFeedbackContext(
  deliverable: Deliverable,
  workspace: Workspace,
  locale: 'fr' | 'en',
): Promise<FeedbackContext> {
  const [intern] = await db.select().from(users).where(eq(users.id, workspace.internId)).limit(1);
  const task = deliverable.taskId
    ? (await db.select().from(tasks).where(eq(tasks.id, deliverable.taskId)).limit(1))[0]
    : null;
  const checkinEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.targetId, workspace.id), eq(events.type, 'checkin.submitted')))
    .orderBy(desc(events.createdAt))
    .limit(3);

  const history = (deliverable.revisionHistory ?? []) as DeliverableRevision[];
  const priorReviews = history
    .map((r) => r.review?.text?.trim())
    .filter((t): t is string => Boolean(t));
  const submissionNote =
    [...history].reverse().find((r) => r.note?.trim())?.note?.trim() ??
    (deliverable.feedback?.trim() ? null : null);

  const firstName =
    intern?.firstName?.trim() || intern?.email?.split('@')[0] || (locale === 'fr' ? "l'étudiant·e" : 'there');

  return {
    locale,
    deliverableTitle: deliverable.title,
    deliverableDescription: deliverable.description,
    version: deliverable.version,
    internFirstName: firstName,
    submissionNote,
    priorReviews,
    taskTitle: task?.title ?? null,
    recentCheckins: checkinEvents.map((c) => {
      const m = (c.metadata ?? {}) as Record<string, unknown>;
      return { shipped: String(m.shipped ?? ''), stuck: String(m.stuck ?? ''), next: String(m.next ?? '') };
    }),
  };
}

/** Heuristic fallback: reformulate → echo the notes; draft → a thin scaffold. */
export function feedbackScaffold(ctx: FeedbackContext, opts: DraftOpts): string {
  const notes = opts.draft?.trim();
  if (notes) return notes;
  const fr = `Bonjour ${ctx.internFirstName},\n\nMerci pour « ${ctx.deliverableTitle} ». Quelques points à revoir avant validation :\n- \n- \n\nPeux-tu reprendre ces éléments et me renvoyer la prochaine version ?`;
  const en = `Hi ${ctx.internFirstName},\n\nThanks for "${ctx.deliverableTitle}". A few things to address before I can approve:\n- \n- \n\nCould you revise these and send the next version?`;
  return ctx.locale === 'fr' ? fr : en;
}

async function aiDraft(ctx: FeedbackContext, opts: DraftOpts): Promise<string> {
  const c = client();
  if (!c) throw new Error('no anthropic client');
  const res = await c.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    system: feedbackSystem(ctx.locale),
    messages: [{ role: 'user', content: feedbackUserMessage(ctx, opts) }],
  });
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  if (!text) throw new Error('empty draft');
  return text;
}

export async function draftRevisionFeedback(
  ctx: FeedbackContext,
  opts: DraftOpts = {},
): Promise<{ text: string; source: 'ai' | 'heuristic' }> {
  if (!pulseAiEnabled()) return { text: feedbackScaffold(ctx, opts), source: 'heuristic' };
  try {
    return { text: await aiDraft(ctx, opts), source: 'ai' };
  } catch {
    return { text: feedbackScaffold(ctx, opts), source: 'heuristic' };
  }
}
```

> Note: `Deliverable`, `DeliverableRevision`, and `Workspace` are all exported from `@/db/schema` (`db/schema/index.ts`). If the `submissionNote` ternary reads oddly to you, simplify to `[...history].reverse().find((r) => r.note?.trim())?.note?.trim() ?? null` — the intent is "the most recent revision's note, else null."

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run modules/pulse/__tests__/feedback.test.ts`
Expected: PASS (5 assertions across both describes).

- [ ] **Step 5: Commit**

```bash
git add modules/pulse/feedback.ts modules/pulse/__tests__/feedback.test.ts
git commit -m "feat(pulse): draftRevisionFeedback engine (AI + heuristic fallback)"
```

---

### Task 4: The server action

**Files:**
- Modify: `modules/deliverables/server-actions.ts` (add the action + 3 imports)
- Test: `modules/deliverables/__tests__/draft-feedback-action.test.ts`

- [ ] **Step 1: Write the failing test**

Create `modules/deliverables/__tests__/draft-feedback-action.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable db mock: db.select().from().where().limit() -> Promise<[row]>
const { db, selectResult } = vi.hoisted(() => {
  const selectResult = vi.fn<() => unknown[]>(() => []);
  function makeChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'orderBy']) chain[m] = vi.fn(() => chain);
    chain.limit = vi.fn(() => Promise.resolve(selectResult()));
    return chain;
  }
  return { db: { select: vi.fn(() => makeChain()) }, selectResult };
});
vi.mock('@/db', () => ({ db }));
vi.mock('@/db/schema', () => ({ deliverables: {} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));
vi.mock('@/lib/blob', () => ({ assertOurBlobUrl: vi.fn() }));
vi.mock('../service', () => ({
  approveDeliverable: vi.fn(),
  requestRevision: vi.fn(),
  submitDeliverable: vi.fn(),
}));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'fr') }));
vi.mock('@/lib/ratelimit', () => ({ ratelimit: () => ({ limit: () => ({ success: true }) }) }));

const loadWorkspaceAccess = vi.fn();
vi.mock('@/modules/workspace/access', () => ({
  loadWorkspaceAccess: (...a: unknown[]) => loadWorkspaceAccess(...a),
}));

const draftRevisionFeedback = vi.fn();
const gatherFeedbackContext = vi.fn(async () => ({ locale: 'fr' }));
vi.mock('@/modules/pulse/feedback', () => ({
  draftRevisionFeedback: (...a: unknown[]) => draftRevisionFeedback(...a),
  gatherFeedbackContext: (...a: unknown[]) => gatherFeedbackContext(...a),
}));

import { draftRevisionFeedbackAction } from '../server-actions';

const fakeDeliverable = { id: 'd1', workspaceId: 'w1', title: 'Deck', revisionHistory: [] };

function setAccess(role: 'intern' | 'company' | 'admin') {
  loadWorkspaceAccess.mockResolvedValue({
    session: { role, user: { id: 'u1' } },
    workspace: { id: 'w1', internId: 'i1' },
    project: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  selectResult.mockReturnValue([fakeDeliverable]);
});

describe('draftRevisionFeedbackAction', () => {
  it('forbids an intern and never calls the engine', async () => {
    setAccess('intern');
    const res = await draftRevisionFeedbackAction({ deliverableId: 'd1' });
    expect(res).toEqual({ ok: false, error: 'forbidden' });
    expect(draftRevisionFeedback).not.toHaveBeenCalled();
  });

  it('returns the drafted text for a supervisor', async () => {
    setAccess('company');
    draftRevisionFeedback.mockResolvedValue({ text: 'Bonjour Arif…', source: 'ai' });
    const res = await draftRevisionFeedbackAction({ deliverableId: 'd1' });
    expect(res).toEqual({ ok: true, text: 'Bonjour Arif…', source: 'ai' });
    expect(gatherFeedbackContext).toHaveBeenCalledOnce();
  });

  it('passes the supervisor draft through to the engine (reformulate)', async () => {
    setAccess('company');
    draftRevisionFeedback.mockResolvedValue({ text: 'polished', source: 'ai' });
    await draftRevisionFeedbackAction({ deliverableId: 'd1', draft: 'rough notes' });
    expect(draftRevisionFeedback).toHaveBeenCalledWith(expect.anything(), { draft: 'rough notes' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run modules/deliverables/__tests__/draft-feedback-action.test.ts`
Expected: FAIL — `draftRevisionFeedbackAction` is not exported from `../server-actions`.

- [ ] **Step 3: Write the implementation**

In `modules/deliverables/server-actions.ts`, add these imports at the top (after the existing imports):

```ts
import { getLocale } from 'next-intl/server';
import { ratelimit } from '@/lib/ratelimit';
import { draftRevisionFeedback, gatherFeedbackContext } from '@/modules/pulse/feedback';
```

Add this exported action at the end of the file:

```ts
/**
 * Generate-only: draft (or reformulate) revision feedback for a submitted
 * deliverable. Writes nothing — returns prose the supervisor edits and sends
 * via requestRevisionAction. Supervisor/admin only. Rate-limited per user.
 * Returns a typed result (not a throw) so the UI shows an inline error.
 */
export async function draftRevisionFeedbackAction(input: {
  deliverableId: string;
  draft?: string;
}): Promise<{ ok: true; text: string; source: 'ai' | 'heuristic' } | { ok: false; error: string }> {
  const { session, workspace, deliverable } = await loadDeliverableContext(input.deliverableId);
  if (session.role === 'intern') return { ok: false, error: 'forbidden' };

  if (!ratelimit('ai-feedback-draft').limit(session.user.id).success) {
    return { ok: false, error: 'rate_limited' };
  }

  const locale = (await getLocale()) as 'fr' | 'en';
  const ctx = await gatherFeedbackContext(deliverable, workspace, locale);
  const { text, source } = await draftRevisionFeedback(ctx, { draft: input.draft });
  return { ok: true, text, source };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run modules/deliverables/__tests__/draft-feedback-action.test.ts`
Expected: PASS (3 assertions).

- [ ] **Step 5: Commit**

```bash
git add modules/deliverables/server-actions.ts modules/deliverables/__tests__/draft-feedback-action.test.ts
git commit -m "feat(deliverables): draftRevisionFeedbackAction (generate-only, supervisor-gated)"
```

---

### Task 5: i18n keys

**Files:**
- Modify: `locales/fr.json` and `locales/en.json` (under `workspace.deliverables.master`, alongside the existing `requestChanges` / `feedbackChangesRequired` keys)

No unit test (pure data); verified by Task 7 and typecheck.

- [ ] **Step 1: Add the French keys**

In `locales/fr.json`, inside `workspace.deliverables.master` (next to `"requestChanges"`), add:

```json
"draftWithPulse": "Rédiger avec Pulse",
"reformulate": "Reformuler",
"drafting": "Rédaction…",
"reformulating": "Reformulation…",
"aiAssistedHint": "Assisté par IA — relisez avant d'envoyer.",
"genericDraftHint": "Brouillon générique — IA non activée.",
"draftError": "Impossible de générer — réessayez."
```

- [ ] **Step 2: Add the English keys**

In `locales/en.json`, inside `workspace.deliverables.master`, add:

```json
"draftWithPulse": "Draft with Pulse",
"reformulate": "Reformulate",
"drafting": "Drafting…",
"reformulating": "Reformulating…",
"aiAssistedHint": "AI-assisted — review before sending.",
"genericDraftHint": "Generic draft — AI not enabled.",
"draftError": "Couldn't generate — try again."
```

- [ ] **Step 3: Verify the JSON parses**

Run: `node -e "require('./locales/fr.json'); require('./locales/en.json'); console.log('ok')"`
Expected: `ok` (no JSON syntax error from a stray/missing comma).

- [ ] **Step 4: Commit**

```bash
git add locales/fr.json locales/en.json
git commit -m "i18n(deliverables): feedback-draft button strings (FR/EN)"
```

---

### Task 6: The smart button in the review bar

**Files:**
- Modify: `modules/workspace/components/deliv-review-bar.tsx`

Client component — verified live in Task 7, no unit test.

- [ ] **Step 1: Add the import + state + handler**

In `modules/workspace/components/deliv-review-bar.tsx`:

Add to the imports from server-actions:

```ts
import {
  approveDeliverableAction,
  requestRevisionAction,
  draftRevisionFeedbackAction,
} from '@/modules/deliverables/server-actions';
```

Inside the component, after the existing `const [feedback, setFeedback] = useState('');`:

```ts
const [drafting, startDrafting] = useTransition();
const [hint, setHint] = useState<string | null>(null);

function onDraft() {
  startDrafting(async () => {
    const r = await draftRevisionFeedbackAction({
      deliverableId,
      draft: feedback.trim() || undefined,
    });
    if (r.ok) {
      setFeedback(r.text);
      setHint(t(r.source === 'ai' ? 'aiAssistedHint' : 'genericDraftHint'));
    } else {
      setHint(t('draftError'));
    }
  });
}
```

- [ ] **Step 2: Add the button inside the request-changes reveal**

In the `{showRequest && (...)}` block, immediately **above** the `<Textarea ... />`, insert:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
  <button
    type="button"
    className="dv-btn-changes"
    disabled={pending || drafting}
    onClick={onDraft}
  >
    {drafting
      ? feedback.trim()
        ? t('reformulating')
        : t('drafting')
      : feedback.trim()
        ? t('reformulate')
        : t('draftWithPulse')}
  </button>
  {hint && <span className="sub" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{hint}</span>}
</div>
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit` (or `pnpm typecheck` if defined)
Expected: no errors in `deliv-review-bar.tsx` (the new `t()` keys exist from Task 5; `draftRevisionFeedbackAction` is exported from Task 4).

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/deliv-review-bar.tsx
git commit -m "feat(workspace): Draft-with-Pulse / Reformulate button in the review bar"
```

---

### Task 7: Live verification (the verify discipline)

The AI path is only provable by driving the real app. No code; this is the evidence-capture gate. Use the `verify` skill conventions.

- [ ] **Step 1: Run the full unit suite once**

Run: `pnpm test`
Expected: all tests green, including the four new files. (This is the only place the whole suite runs — it is CI's job, but a single green run before manual verification is reasonable.)

- [ ] **Step 2: Boot the app and reach a submitted deliverable**

- Start the dev server (source `.env.local`, `--dns-result-order=ipv4first` per the local network quirk; do NOT read/copy `.env.local`).
- Sign in as a supervisor (dev-auth cookie) and open a workspace deliverable that is in `submitted` state (seed has one; if not, submit one as the intern first).

- [ ] **Step 3: Draft mode (empty box)**

- Click **Request changes** → the box opens with **Draft with Pulse**.
- Click it. Capture: the box fills with constructive FR prose that references the intern's note / prior review and makes **no** claim about the file's visual contents. Hint reads "Assisté par IA…".
- Screenshot.

- [ ] **Step 4: Reformulate mode**

- Clear the box, type rough notes (e.g. `typo mieux. section concurrents manque. slide 4 chargée.`). The button now reads **Reformuler**.
- Click it. Capture: the notes become polished prose that keeps all three points and adds nothing not in the notes (it may keep "slide 4" because you wrote it).
- Edit a word, click **Request changes** → the intern's deliverable flips to `revision-requested` with the feedback. Screenshot the result.

- [ ] **Step 5: Probes**

- 🔍 AI off: set `PULSE_ENABLED=0`, restart, repeat Step 3 → labeled "Brouillon générique…" scaffold; reformulate echoes the notes. Restore.
- 🔍 Intern cannot reach it: confirm the review bar (and thus the action) is supervisor-only — the intern view never renders the button.
- 🔍 Second click regenerates a fresh draft.

- [ ] **Step 6: Report**

Write the verification report (verdict PASS/FAIL/BLOCKED, steps, screenshot path, findings) per the verify skill.

---

## Self-Review (run after writing — checklist, not a dispatch)

**1. Spec coverage:**
- §2 two modes (draft/reformulate) → Tasks 2,3,6 ✓
- §3 on-demand / context-only / revision-only / one smart button / fallback (a) → Tasks 3,6 ✓
- §4 files (anthropic.ts extraction **intentionally dropped** — documented in header) → Tasks 2,3 ✓
- §5 engine fn + prompt + honesty guardrail → Tasks 2,3 ✓
- §6 server action (auth, getLocale, rate-limit, generate-only) → Task 4 ✓
- §7 UI button → Task 6 ✓
- §8 fallback/kill-switch/cost → Tasks 1,3 ✓
- §9 i18n keys → Task 5 ✓
- §10 error handling (never throws / typed result / box intact) → Tasks 3,4,6 ✓
- §11 testing → Tasks 2,3,4,7 ✓

**2. Placeholder scan:** no TBD/TODO; every code step shows full code. ✓

**3. Type consistency:** `FeedbackContext`/`DraftOpts` defined in Task 2, re-exported in Task 3, consumed in Task 4. `draftRevisionFeedback(ctx, opts?)` and `gatherFeedbackContext(deliverable, workspace, locale)` signatures match across Tasks 3,4. `{ ok, text, source }` action shape matches Task 4 test + Task 6 consumer. `t()` keys in Task 6 match Task 5 additions. ✓
