import { db } from '@/db';
import { deliverables, type DeliverableRevision } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import {
  isValidDeliverableTransition,
  type DeliverableStatus,
} from './state-machine';

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
  if (!isValidDeliverableTransition(from, 'submitted')) {
    throw new Error(`Cannot submit from status ${from}`);
  }

  // Bump version on resubmit (revision-requested → submitted = new version)
  const isResubmit = from === 'revision-requested';
  const nextVersion = isResubmit ? current.version + 1 : current.version;

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
  if (!isValidDeliverableTransition(from, 'approved')) {
    throw new Error(`Cannot approve from status ${from}`);
  }

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
  if (!isValidDeliverableTransition(from, 'revision-requested')) {
    throw new Error(`Cannot request revision from status ${from}`);
  }

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
