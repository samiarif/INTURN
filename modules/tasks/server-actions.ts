'use server';

import { revalidatePath } from 'next/cache';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { tasks, workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { canViewWorkspace } from '@/modules/workspace/service';
import { getProjectById } from '@/modules/projects/queries';
import { moveTask } from './service';
import type { TaskStatus } from './state-machine';

export async function moveTaskAction(input: { taskId: string; to: TaskStatus }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role = (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'intern';

  // Authz: load the workspace + project to check viewer can act on this task.
  const [task] = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
  if (!task) throw new Error('Task not found');
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, task.workspaceId))
    .limit(1);
  if (!workspace) throw new Error('Workspace not found');

  // For task moves, we need the project to evaluate supervisor membership.
  // Load through internship → project.
  const { internships } = await import('@/db/schema');
  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, workspace.internshipId))
    .limit(1);
  const project = internship?.projectId ? await getProjectById(internship.projectId) : null;

  if (!canViewWorkspace(workspace, project, { userId: user.id, role })) {
    throw new Error('Forbidden');
  }

  await moveTask({ taskId: input.taskId, to: input.to, actorId: user.id });

  // Revalidate the workspace pages so the new state is visible without a hard reload.
  revalidatePath(`/intern/workspaces/${workspace.id}`);
  revalidatePath(`/company/workspaces/${workspace.id}`);
  revalidatePath(`/intern/workspaces/${workspace.id}/tasks`);
  revalidatePath(`/company/workspaces/${workspace.id}/tasks`);
}
