import { randomBytes } from 'node:crypto';
import { db } from '@/db';
import { deliverables, type DeliverableRevision } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import { nextDeliverableState, type DeliverableStatus } from './state-machine';

/**
 * URL-safe 24-byte token — same scheme as records' share tokens
 * (`randomBytes(24).toString('base64url')`). Collisions are astronomically
 * unlikely; the `share_token` column has a unique index so we retry on the
 * rare clash.
 */
function generateShareToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Idempotently ensure a deliverable has a public share token. Returns the
 * existing token if one is already set, otherwise generates + persists a new
 * one. Retries up to 3 times on the (vanishingly rare) unique-index clash.
 *
 * NO auth here — callers (the server action) do authz before invoking this.
 */
export async function ensureDeliverableShareToken(deliverableId: string): Promise<string> {
  const [current] = await db
    .select({ shareToken: deliverables.shareToken })
    .from(deliverables)
    .where(eq(deliverables.id, deliverableId))
    .limit(1);
  if (!current) throw new Error('Deliverable not found');
  if (current.shareToken) return current.shareToken;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateShareToken();
    try {
      const [updated] = await db
        .update(deliverables)
        .set({ shareToken: token, updatedAt: new Date() })
        .where(eq(deliverables.id, deliverableId))
        .returning({ shareToken: deliverables.shareToken });
      return updated.shareToken ?? token;
    } catch (e: unknown) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('share_token')) throw e;
    }
  }
  throw lastErr ?? new Error('Failed to set share token after 3 attempts');
}

export async function submitDeliverable(input: {
  deliverableId: string;
  fileUrl: string;
  fileName: string;
  fileType: string | null;
  note?: string | null;
  actorId: string;
}) {
  const [current] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, input.deliverableId))
    .limit(1);
  if (!current) throw new Error('Deliverable not found');

  const from = (current.status ?? 'draft') as DeliverableStatus;
  // Pure resolver owns both the transition guard and the version-bump rule
  // (revision-requested → submitted = a new version).
  const next = nextDeliverableState({ status: from, version: current.version }, 'submit');
  const isResubmit = from === 'revision-requested';
  const nextVersion = next.version;

  // Push the just-rejected (or first-submitted) snapshot into history before
  // overwriting the current row with the new submission. We only push when
  // there's actually something to keep — never on a fresh draft → submitted
  // first pass, otherwise we'd end up with a duplicate ghost v1 in history.
  const history: DeliverableRevision[] = Array.isArray(current.revisionHistory)
    ? [...current.revisionHistory]
    : [];
  if (isResubmit) {
    const snapshot: DeliverableRevision = {
      version: current.version,
      submittedAt: (current.submittedAt ?? current.updatedAt ?? new Date()).toISOString(),
      submittedBy: input.actorId, // best-effort: pre-row didn't track submittedBy
      fileUrl: current.fileUrl,
      fileName: current.fileName,
      fileType: current.fileType,
      note: null,
      status: 'revision-requested',
    };
    // If feedback was attached to the previous version, encode it as a review
    // entry so the version stack can render it inline.
    if (current.feedback) {
      snapshot.review = {
        reviewerId: input.actorId,
        reviewedAt: (current.updatedAt ?? new Date()).toISOString(),
        state: 'changes',
        text: current.feedback,
      };
    }
    history.unshift(snapshot);
  }

  const [updated] = await db
    .update(deliverables)
    .set({
      status: 'submitted',
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileType: input.fileType,
      feedback: null, // clear stale feedback — it now lives in history
      version: nextVersion,
      submittedAt: new Date(),
      revisionHistory: history,
      updatedAt: new Date(),
    })
    .where(eq(deliverables.id, input.deliverableId))
    .returning();

  await recordEvent({
    type: 'deliverable.submitted',
    actorId: input.actorId,
    targetType: 'deliverable',
    targetId: input.deliverableId,
    metadata: {
      name: current.title,
      version: nextVersion,
      fileName: input.fileName,
      note: input.note ?? null,
    },
  });

  return updated;
}

export async function approveDeliverable(input: { deliverableId: string; actorId: string }) {
  const [current] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, input.deliverableId))
    .limit(1);
  if (!current) throw new Error('Deliverable not found');
  const from = (current.status ?? 'draft') as DeliverableStatus;
  nextDeliverableState({ status: from, version: current.version }, 'approve');

  await db
    .update(deliverables)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(deliverables.id, input.deliverableId));

  await recordEvent({
    type: 'deliverable.submitted', // reuse — approval is an end-state, captured via metadata
    actorId: input.actorId,
    targetType: 'deliverable',
    targetId: input.deliverableId,
    metadata: { name: current.title, version: current.version, approved: true },
  });
}

export async function requestRevision(input: {
  deliverableId: string;
  feedback: string;
  actorId: string;
}) {
  const [current] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, input.deliverableId))
    .limit(1);
  if (!current) throw new Error('Deliverable not found');
  const from = (current.status ?? 'draft') as DeliverableStatus;
  nextDeliverableState({ status: from, version: current.version }, 'request-revision');

  await db
    .update(deliverables)
    .set({
      status: 'revision-requested',
      feedback: input.feedback,
      updatedAt: new Date(),
    })
    .where(eq(deliverables.id, input.deliverableId));

  await recordEvent({
    type: 'deliverable.revision.requested',
    actorId: input.actorId,
    targetType: 'deliverable',
    targetId: input.deliverableId,
    metadata: { name: current.title, version: current.version, note: input.feedback },
  });
}
