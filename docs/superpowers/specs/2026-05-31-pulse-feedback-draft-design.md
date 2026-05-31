# Pulse Deliverable-Feedback Draft — Design / Spec

**Date:** 2026-05-31
**Branch:** `feat/pulse-feedback-draft` (off `main` — depends on the Pulse engine landed in `feat/pulse`)
**Status:** Draft

---

## 1. Problem

When an intern submits a deliverable, the supervisor must write **revision
feedback** to send it back: `requestRevisionAction({ deliverableId, feedback })`
*requires* non-empty prose. That blank box — "how do I phrase this constructively
and specifically?" — is the friction point. Approving is one click; requesting
changes is a small writing task, repeated for every revision, for every intern.

This is the second Pulse surface (after the supervisor health-read): **Pulse as
co-supervisor that helps you write**, not just read.

## 2. What we're building

One on-demand button in the supervisor's deliverable review bar, with **two modes
keyed on whether the feedback box already has text**:

- **Empty box → "Draft with Pulse"** — generates a constructive first draft from
  the deliverable's *context*.
- **Box has the supervisor's rough notes → "Reformulate"** — rewrites *their*
  notes into polished, complete feedback in their voice.

The button fills the existing textarea. The supervisor edits and sends via the
**unchanged** `requestRevisionAction`. The draft action **writes nothing** — it
returns a string; nothing in the DB changes until the supervisor clicks *Request
changes* as they do today.

### Why reformulate is the stronger mode

The AI does **not** see the file (scope decision §3). From-scratch drafts are
therefore honest-but-generic. Reformulate dissolves the file-blindness problem:
the supervisor *has* seen the deck and supplies the real, file-specific
observations (terse is fine); the AI only elevates phrasing, structure, and tone.
Substance is the human's (honest + specific); polish is the AI's.

### Concrete examples (FR default)

**Draft (empty box, context-only).** Intern note on submission: *"j'ai retravaillé
la typo, section concurrents pas complète."* Prior review existed. Output:

> Merci Arif. Tu indiques avoir retravaillé la hiérarchie typo depuis la v1 —
> c'était justement le point principal de mon retour précédent. Deux choses avant
> validation : (1) la section concurrents que tu signales comme incomplète :
> finalise-la avec au moins trois acteurs et un axe de différenciation pour
> chacun ; (2) ajoute une slide de synthèse en ouverture. Renvoie-la-moi dès que
> c'est prêt.

It never claims to have *seen* the deck — it leans on the intern's note + prior
review. That is the honesty guardrail (§6) holding.

**Reformulate.** Supervisor types: *"typo mieux que v1. section concurrents manque.
ajouter slide synthèse au début. slide 4 encore chargée."* Output:

> Merci Arif. La hiérarchie typographique est plus claire que sur la v1 — bon
> travail. Trois points avant de valider : (1) la section concurrents est encore
> manquante, complète-la ; (2) ajoute une slide de synthèse en ouverture pour
> poser la recommandation d'emblée ; (3) la slide 4 reste un peu chargée,
> allège-la. Renvoie-moi la prochaine version dès que c'est prêt.

It *can* say "slide 4 chargée" — because the supervisor said it. The AI elevates;
it never invents.

## 3. Scope decisions (locked)

| Decision | Choice |
|---|---|
| Trigger | **On-demand button** (one model call only when clicked) — not auto-fill, not proactive pre-draft |
| Signal source | **Context only** — title, description, intern note, revision history + prior reviews, linked task, recent check-ins. **No file contents.** |
| Verdict scope | **Revision feedback only.** Approve stays a text-less one click, untouched. |
| Modes | **One smart button:** empty → draft; has text → reformulate |
| Architecture | **Server action now, streaming-ready later** — engine fn structured so a streaming route can wrap it with no rework |
| No-AI fallback | **(a)** thin localized scaffold tagged `source: 'heuristic'`, hint reads "generic draft — AI not enabled" (keeps it testable; degrades honestly) |

## 4. Architecture / files

All on `main`'s tree (where `modules/pulse/*` lives).

**New:**
- `modules/pulse/anthropic.ts` — extract the lazy Anthropic client + `pulseAiEnabled()`
  out of `engine.ts` into one shared module; `engine.ts` and the feedback fn both
  import it (no duplicated singleton/key logic).
- `modules/pulse/feedback.ts` — `draftRevisionFeedback(ctx, opts?) →
  { text, source: 'ai' | 'heuristic' }` (locale rides in `ctx`). Mirrors
  `computePulse`: AI when enabled,
  heuristic fallback, **never throws**. The fn a streaming route would later wrap.
- `modules/pulse/feedback-prompt.ts` — `feedbackSystem(locale)` +
  `feedbackUserMessage(ctx, opts)`. Separate from `prompt.ts` because the voice
  differs (writes *to the intern*, returns prose not JSON).
- A context gatherer (`gatherFeedbackContext`, colocated in `feedback.ts`) — loads
  the deliverable, its `revisionHistory` (+ prior `review.text`), the linked task
  title, the intern's recent check-ins (reuses the check-in query from
  `signals.ts`), and the intern's first name.

**Modified:**
- `modules/deliverables/server-actions.ts` — add `draftRevisionFeedbackAction`.
- `modules/workspace/components/deliv-review-bar.tsx` — add the smart button (~15
  lines inside the existing request-changes reveal block).
- `messages/fr.json` + `messages/en.json` — new keys under
  `workspace.deliverables.master`.

## 5. The engine fn + prompt (the AI core)

```ts
// modules/pulse/feedback.ts
type FeedbackContext = {
  deliverableTitle: string;
  deliverableDescription: string | null;
  version: number;
  internFirstName: string;
  submissionNote: string | null;       // the intern's note on this submission
  priorReviews: string[];              // revisionHistory[].review.text, oldest→newest
  taskTitle: string | null;            // linked task, if any
  recentCheckins: string[];            // compact highlights
  locale: 'fr' | 'en';
};

type DraftOpts = { draft?: string };   // present → reformulate; absent → from-scratch

draftRevisionFeedback(ctx, opts?): Promise<{ text: string; source }>
```

AI path: same client/model pattern as `engine.ts` (`claude-sonnet-4-5`,
`max_tokens` ~400), but **returns plain prose, not JSON**. On any error →
heuristic scaffold. `source` reports which path ran.

**Prompt rules (`feedbackSystem`):**
1. **Audience flips.** Pulse-read writes *for the supervisor* in JSON. This writes
   *to the intern* — second person, their first name, the supervisor's
   warm-but-direct voice — and returns prose only.
2. **Honesty guardrail (non-negotiable, stress-tested like the Pulse prompt):**
   you have **not** seen the file. Do not fabricate observations about its
   contents. Ground only in the note + prior reviews + task + check-ins (draft
   mode) or in the supervisor's own notes (reformulate mode). Phrase anything you
   need as a concrete request.
3. **Structure:** brief acknowledgment → 1–3 specific, actionable points (favor
   what the intern flagged + unresolved prior-review items) → clear next step.
   ≤ ~120 words.
4. **Locale:** write entirely in `%LOCALE%`.
5. **Reformulate mode** (`opts.draft` present): preserve the supervisor's substance
   and intent; improve phrasing, structure, completeness, tone. Do **not** add
   claims they didn't make. Do not drop points they raised.

## 6. The server action

```ts
// modules/deliverables/server-actions.ts
draftRevisionFeedbackAction(input: { deliverableId: string; draft?: string }):
  Promise<{ ok: true; text: string; source } | { ok: false; error: string }>
```

- Auth: reuse `loadDeliverableContext(input.deliverableId)`; reject if
  `session.role === 'intern'` (same gate as approve/request-revision).
- Locale via next-intl server `getLocale()`.
- Rate-limited: new `pulse-feedback-draft` bucket (~20/min/user) to cap cost +
  button-spam.
- **Generate-only:** no DB write, no `revalidatePath`. Returns the string.

## 7. The UI (`DelivReviewBar`)

Inside the existing `showRequest` reveal, above the textarea:
- Button label keyed on content: `feedback.trim() ? t('reformulate') : t('draftWithPulse')`.
- On click → `startTransition` → `draftRevisionFeedbackAction({ deliverableId,
  draft: feedback.trim() || undefined })` → on `ok`, `setFeedback(r.text)`.
- Pending: spinner + "Drafting…" / "Reformulating…".
- After fill: subtle hint *"AI-assisted — review before sending"* (or *"generic
  draft — AI not enabled"* when `source === 'heuristic'`).
- Reuses the component's existing `useTransition`/`pending` so controls disable
  during the call. The submit path (`requestRevisionAction`) is untouched.

## 8. Fallback, kill-switch, cost

- Kill-switch: reuse `pulseAiEnabled()` (`PULSE_ENABLED !== '0' && ANTHROPIC_API_KEY`).
- AI off → `source: 'heuristic'`, labeled in the UI. **Draft mode:** a minimal
  localized scaffold. **Reformulate mode:** returns the supervisor's text
  unchanged (nothing to elevate without the model).
- `max_tokens` ~400; rate-limit bucket per §6.

## 9. i18n keys

Under `workspace.deliverables.master`, FR + EN:
`draftWithPulse`, `reformulate`, `drafting`, `reformulating`, `aiAssistedHint`,
`genericDraftHint`, `draftError`.

## 10. Error handling

- Engine never throws (try/catch → heuristic, mirroring `computePulse`).
- Action returns `ok: false` only for forbidden / rate-limited.
- UI: on `ok: false`, inline error, leave the box's contents intact. The manual
  path always works — the AI is purely additive.

## 11. Testing / verification

- **Unit:** context-gatherer shape; both prompt branches (draft vs. reformulate,
  FR + EN); heuristic scaffold; forced-AI-error → heuristic.
- **Live (verify discipline — drive the real app):** supervisor opens a submitted
  deliverable; **draft** (blank → constructive FR prose grounded in context);
  **reformulate** (rough notes → polished, adds no claim not in the notes); edit;
  send; intern sees `revision-requested` with the feedback.
- **Probes:** intern role → forbidden; thin context → short, non-fabricated draft;
  reformulate preserves all points raised; AI-off → labeled scaffold; second click
  re-draws.

## 12. Out of scope (explicit non-goals / future)

- **Streaming route (B)** — wrap `draftRevisionFeedback` in a streaming endpoint
  for live token fill. Designed-for, not built.
- **File-reading (v2)** — fetch + multimodally read the submitted blob so the AI
  can comment on the actual work. Big jump (blob fetch, per-type parsing, cost).
- **Approval notes** — drafting positive praise on approve (needs a schema/action
  change to carry approve-time text).
- **Intern-side Pulse**, **first-run/activation** — the other two parked features.

## 13. Implementation note

Per `AGENTS.md`: this is a modified Next.js — consult `node_modules/next/dist/docs/`
before writing server actions / `getLocale` / revalidation code; do not assume
training-data APIs.
