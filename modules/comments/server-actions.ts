'use server';

import { revalidatePath } from 'next/cache';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { workspaces, internships } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { canViewWorkspace } from '@/modules/workspace/service';
import { getProjectById } from '@/modules/projects/queries';
import { addComment, deleteComment } from './service';

async function loadContext(workspaceId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role =
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'intern';

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
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
  return { user, workspace };
}

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
  const { user, workspace } = await loadContext(input.workspaceId);
  await addComment({
    workspaceId: workspace.id,
    taskId: input.taskId,
    deliverableId: input.deliverableId,
    authorId: user.id,
    body: input.body,
  });
  revalidateWorkspace(workspace.id);
}

export async function deleteCommentAction(input: {
  commentId: string;
  workspaceId: string;
}) {
  const { user, workspace } = await loadContext(input.workspaceId);
  await deleteComment({ commentId: input.commentId, actorId: user.id });
  revalidateWorkspace(workspace.id);
}
