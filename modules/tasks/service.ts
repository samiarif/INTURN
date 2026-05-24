import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
