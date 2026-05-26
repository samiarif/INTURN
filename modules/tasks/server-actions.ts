'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tasks, type Task } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { loadWorkspaceAccess } from '@/modules/workspace/access';
import { createTask, moveTask } from './service';
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

export type CreateTaskActionInput = {
  workspaceId: string;
  title: string;
  description?: string | null;
  tag?: string | null;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
};

export type CreateTaskActionResult =
  | { ok: true; task: Task }
  | { ok: false; error: string };

/**
 * Create a task in a workspace. Supervisors (company + admin) only;
 * interns drive their workflow but tasks land on the board from the
 * supervisor side.
 */
export async function createTaskAction(
  input: CreateTaskActionInput,
): Promise<CreateTaskActionResult> {
  if (input.title.trim().length < 3) return { ok: false, error: 'title_too_short' };
  if (input.title.length > 140) return { ok: false, error: 'title_too_long' };

  const { session, workspace } = await loadWorkspaceAccess(input.workspaceId);
  if (session.role !== 'company' && session.role !== 'admin') {
    return { ok: false, error: 'forbidden' };
  }

  const task = await createTask({
    workspaceId: input.workspaceId,
    actorId: session.user.id,
    title: input.title,
    description: input.description ?? null,
    tag: input.tag ?? null,
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ?? null,
  });

  revalidatePath(`/intern/workspaces/${workspace.id}`);
  revalidatePath(`/company/workspaces/${workspace.id}`);
  revalidatePath(`/intern/workspaces/${workspace.id}/tasks`);
  revalidatePath(`/company/workspaces/${workspace.id}/tasks`);

  return { ok: true, task };
}
