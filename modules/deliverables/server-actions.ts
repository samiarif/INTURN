'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { deliverables } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { loadWorkspaceAccess } from '@/modules/workspace/access';
import { assertOurBlobUrl } from '@/lib/blob';
import {
  approveDeliverable,
  requestRevision,
  submitDeliverable,
} from './service';

async function loadDeliverableContext(deliverableId: string) {
  const [deliverable] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, deliverableId))
    .limit(1);
  if (!deliverable) throw new Error('Deliverable not found');
  const access = await loadWorkspaceAccess(deliverable.workspaceId);
  return { ...access, deliverable };
}

function revalidateWorkspace(workspaceId: string) {
  revalidatePath(`/intern/workspaces/${workspaceId}`);
  revalidatePath(`/company/workspaces/${workspaceId}`);
  revalidatePath(`/intern/workspaces/${workspaceId}/deliverables`);
  revalidatePath(`/company/workspaces/${workspaceId}/deliverables`);
}

export async function submitDeliverableAction(input: {
  deliverableId: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  note?: string;
}) {
  const { session, workspace } = await loadDeliverableContext(input.deliverableId);
  if (session.role !== 'admin' && workspace.internId !== session.user.id) {
    throw new Error('Only the intern can submit a deliverable');
  }
  assertOurBlobUrl(input.fileUrl, 'fileUrl');

  await submitDeliverable({
    deliverableId: input.deliverableId,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    fileType: input.fileType ?? null,
    note: input.note?.trim() || null,
    actorId: session.user.id,
  });
  revalidateWorkspace(workspace.id);
}

export async function approveDeliverableAction(input: { deliverableId: string }) {
  const { session, workspace } = await loadDeliverableContext(input.deliverableId);
  if (session.role === 'intern') throw new Error('Forbidden');
  await approveDeliverable({ deliverableId: input.deliverableId, actorId: session.user.id });
  revalidateWorkspace(workspace.id);
}

export async function requestRevisionAction(input: {
  deliverableId: string;
  feedback: string;
}) {
  const { session, workspace } = await loadDeliverableContext(input.deliverableId);
  if (session.role === 'intern') throw new Error('Forbidden');
  if (!input.feedback || input.feedback.trim().length === 0) {
    throw new Error('Feedback is required');
  }
  await requestRevision({
    deliverableId: input.deliverableId,
    feedback: input.feedback.trim(),
    actorId: session.user.id,
  });
  revalidateWorkspace(workspace.id);
}
