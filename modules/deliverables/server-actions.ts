'use server';

import { revalidatePath } from 'next/cache';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { deliverables, workspaces, internships } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { canViewWorkspace } from '@/modules/workspace/service';
import { getProjectById } from '@/modules/projects/queries';
import { assertOurBlobUrl } from '@/lib/blob';
import {
  approveDeliverable,
  requestRevision,
  submitDeliverable,
} from './service';

async function loadContext(deliverableId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role =
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'intern';

  const [deliverable] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, deliverableId))
    .limit(1);
  if (!deliverable) throw new Error('Deliverable not found');

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, deliverable.workspaceId))
    .limit(1);
  if (!workspace) throw new Error('Workspace not found');

  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, workspace.internshipId))
    .limit(1);
  const project = internship?.projectId ? await getProjectById(internship.projectId) : null;

  if (!canViewWorkspace(workspace, project, { userId: user.id, role })) {
    throw new Error('Forbidden');
  }

  return { user, role, workspace, deliverable };
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
}) {
  const { user, role, workspace } = await loadContext(input.deliverableId);
  if (role !== 'intern' && role !== 'admin') {
    // Companies can re-submit on behalf of an intern? No — only the intern submits.
    if (workspace.internId !== user.id) {
      throw new Error('Only the intern can submit a deliverable');
    }
  }
  // Validate the blob URL came from our store
  assertOurBlobUrl(input.fileUrl, 'fileUrl');

  await submitDeliverable({
    deliverableId: input.deliverableId,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    fileType: input.fileType ?? null,
    actorId: user.id,
  });
  revalidateWorkspace(workspace.id);
}

export async function approveDeliverableAction(input: { deliverableId: string }) {
  const { user, role, workspace } = await loadContext(input.deliverableId);
  if (role === 'intern') throw new Error('Forbidden');
  await approveDeliverable({ deliverableId: input.deliverableId, actorId: user.id });
  revalidateWorkspace(workspace.id);
}

export async function requestRevisionAction(input: {
  deliverableId: string;
  feedback: string;
}) {
  const { user, role, workspace } = await loadContext(input.deliverableId);
  if (role === 'intern') throw new Error('Forbidden');
  if (!input.feedback || input.feedback.trim().length === 0) {
    throw new Error('Feedback is required');
  }
  await requestRevision({
    deliverableId: input.deliverableId,
    feedback: input.feedback.trim(),
    actorId: user.id,
  });
  revalidateWorkspace(workspace.id);
}
