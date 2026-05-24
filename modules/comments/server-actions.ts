'use server';

import { revalidatePath } from 'next/cache';
import { loadWorkspaceAccess } from '@/modules/workspace/access';
import { addComment, deleteComment } from './service';

function revalidateWorkspace(workspaceId: string) {
  revalidatePath(`/intern/workspaces/${workspaceId}`);
  revalidatePath(`/company/workspaces/${workspaceId}`);
  revalidatePath(`/intern/workspaces/${workspaceId}/comments`);
  revalidatePath(`/company/workspaces/${workspaceId}/comments`);
  revalidatePath(`/intern/workspaces/${workspaceId}/tasks`);
  revalidatePath(`/company/workspaces/${workspaceId}/tasks`);
  revalidatePath(`/intern/workspaces/${workspaceId}/deliverables`);
  revalidatePath(`/company/workspaces/${workspaceId}/deliverables`);
}

export async function addCommentAction(input: {
  workspaceId: string;
  taskId?: string;
  deliverableId?: string;
  body: string;
}) {
  const { session, workspace } = await loadWorkspaceAccess(input.workspaceId);
  await addComment({
    workspaceId: workspace.id,
    taskId: input.taskId,
    deliverableId: input.deliverableId,
    authorId: session.user.id,
    body: input.body,
  });
  revalidateWorkspace(workspace.id);
}

export async function deleteCommentAction(input: {
  commentId: string;
  workspaceId: string;
}) {
  const { session, workspace } = await loadWorkspaceAccess(input.workspaceId);
  await deleteComment({ commentId: input.commentId, actorId: session.user.id });
  revalidateWorkspace(workspace.id);
}
