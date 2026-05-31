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
