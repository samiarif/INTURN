import { db } from '@/db';
import { deliverables } from '@/db/schema';
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
  const nextVersion = from === 'revision-requested' ? current.version + 1 : current.version;

  const [updated] = await db
    .update(deliverables)
    .set({
      status: 'submitted',
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileType: input.fileType,
      version: nextVersion,
      submittedAt: new Date(),
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
