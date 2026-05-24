import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: text('type').notNull(),
    actorId: uuid('actor_id'),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('events_type_idx').on(table.type),
    index('events_actor_id_idx').on(table.actorId),
    // Compound index for the activity feed query
    //   WHERE target_id = $1 ORDER BY created_at DESC
    // (the feed is the hottest event query on every workspace render).
    index('events_target_created_idx').on(table.targetId, sql`created_at DESC`),
    index('events_created_at_idx').on(table.createdAt),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
