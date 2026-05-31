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
    [...history].reverse().find((r) => r.note?.trim())?.note?.trim() ?? null;

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
