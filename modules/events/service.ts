import { db } from '@/db';
import { events } from '@/db/schema';
import type { RecordEventInput } from './types';
import type { Event } from '@/db/schema';

export async function recordEvent(input: RecordEventInput): Promise<Event> {
  const [event] = await db
    .insert(events)
    .values({
      type: input.type,
      actorId: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
    })
    .returning();

  return event;
}
