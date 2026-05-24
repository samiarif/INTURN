'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { loadWorkspaceAccess } from '@/modules/workspace/access';
import { moveTask } from './service';
import type { TaskStatus } from './state-machine';

export async function moveTaskAction(input: { taskId: string; to: TaskStatus }) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
  if (!task) throw new Error('Task not found');
  const { session, workspace } = await loadWorkspaceAccess(task.workspaceId);

  await moveTask({ taskId: input.taskId, to: input.to, actorId: session.user.id });

  revalidatePath(`/intern/workspaces/${workspace.id}`);
  revalidatePath(`/company/workspaces/${workspace.id}`);
  revalidatePath(`/intern/workspaces/${workspace.id}/tasks`);
  revalidatePath(`/company/workspaces/${workspace.id}/tasks`);
}
