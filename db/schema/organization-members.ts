import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Staff membership of an organization. Additive to the legacy single-`ownerId`
 * model: every existing org owner is backfilled here as an `owner/active` row.
 *
 * - `owner`      — billing + everything; cannot be removed or demoted.
 * - `admin`      — full co-manager (projects/internships/applications/team).
 * - `supervisor` — scoped only to assigned projects (via `projects.supervisorIds`).
 *
 * Pending invites live here too: a row with `status='invited'`, an `inviteToken`,
 * and (until accepted) a possibly-null `userId`. Interns are NOT members — they
 * are derived from the `workspaces` table.
 */
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role', { enum: ['owner', 'admin', 'supervisor'] })
      .notNull()
      .default('supervisor'),
    status: text('status', { enum: ['invited', 'active', 'removed'] })
      .notNull()
      .default('invited'),
    pendingProjectIds: jsonb('pending_project_ids').$type<string[]>().default([]),
    inviteToken: text('invite_token'),
    inviteExpiresAt: timestamp('invite_expires_at'),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    invitedAt: timestamp('invited_at').defaultNow().notNull(),
    joinedAt: timestamp('joined_at'),
    removedAt: timestamp('removed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('org_members_org_email_unique').on(
      table.organizationId,
      sql`lower(${table.email})`,
    ),
    uniqueIndex('org_members_org_user_unique')
      .on(table.organizationId, table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
    uniqueIndex('org_members_invite_token_unique')
      .on(table.inviteToken)
      .where(sql`${table.inviteToken} IS NOT NULL`),
    index('org_members_user_idx').on(table.userId),
    index('org_members_org_idx').on(table.organizationId),
  ],
);

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type MemberRole = NonNullable<OrganizationMember['role']>;
export type MemberStatus = NonNullable<OrganizationMember['status']>;
