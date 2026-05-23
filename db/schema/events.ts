import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';

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
    index('events_target_idx').on(table.targetType, table.targetId),
    index('events_created_at_idx').on(table.createdAt),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
