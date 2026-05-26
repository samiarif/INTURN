import { db } from '@/db';
import { tasks, type NewTask, type Task } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import type { TaskStatus } from './state-machine';

export async function moveTask(input: { taskId: string; to: TaskStatus; actorId: string }) {
  const [current] = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
  if (!current) throw new Error('Task not found');
  if (current.status === input.to) return current;

  const [updated] = await db
    .update(tasks)
    .set({ status: input.to, updatedAt: new Date() })
    .where(eq(tasks.id, input.taskId))
    .returning();

  await recordEvent({
    type: 'task.moved',
    actorId: input.actorId,
    targetType: 'task',
    targetId: input.taskId,
    metadata: {
      tag: current.tag,
      title: current.title,
      from: current.status,
      to: input.to,
    },
  });

  return updated;
}

export type CreateTaskInput = {
  workspaceId: string;
  actorId: string;
  title: string;
  description?: string | null;
  tag?: string | null;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  status?: TaskStatus;
};

/**
 * Insert a new task. New tasks land at the bottom of their status
 * column (max(order)+1 within the workspace).
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const [maxRow] = await db
    .select({ max: sql<number>`COALESCE(MAX("order"), 0)::int` })
    .from(tasks)
    .where(eq(tasks.workspaceId, input.workspaceId));
  const nextOrder = Number(maxRow?.max ?? 0) + 1;

  const newRow: NewTask = {
    workspaceId: input.workspaceId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    tag: input.tag?.trim() || null,
    priority: input.priority ?? 'medium',
    status: input.status ?? 'todo',
    dueDate: input.dueDate || null,
    order: nextOrder,
  };

  const [created] = await db.insert(tasks).values(newRow).returning();

  await recordEvent({
    type: 'task.created',
    actorId: input.actorId,
    targetType: 'task',
    targetId: created.id,
    metadata: {
      workspaceId: created.workspaceId,
      title: created.title,
      status: created.status,
    },
  });

  return created;
}
