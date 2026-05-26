import { db } from '@/db';
import { events } from '@/db/schema';
import type { RecordEventInput } from './types';
import type { Event } from '@/db/schema';
import { dispatchNotificationsFor } from '@/modules/notifications/dispatcher';

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

  // Fire-and-forget notifications. Failures are logged inside the dispatcher;
  // we never let a notification problem fail the originating action.
  void dispatchNotificationsFor({
    type: event.type,
    actorId: event.actorId,
    targetType: event.targetType,
    targetId: event.targetId,
    metadata: (event.metadata as Record<string, unknown> | null) ?? null,
  });

  return event;
}
