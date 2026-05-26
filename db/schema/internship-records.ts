import { pgTable, text, timestamp, uuid, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { internships } from './internships';
import { workspaces } from './workspaces';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Sprint D · End-of-internship records.
 *
 * When an internship is marked completed (status='completed' on the
 * workspace), the supervisor can generate a permanent record. The record
 * snapshots intern + org + deliverables + supervisor signature at the
 * moment of issuance — so future profile or org edits never break the
 * artifact. A short `shareToken` makes the record publicly viewable at
 * /records/[token] (no auth required) — interns share the link with
 * future employers as proof.
 *
 * Tokens are random url-safe strings. Revocation is soft (revokedAt) so
 * the row stays for audit, but the public viewer returns 410 Gone.
 */
export type RecordSnapshot = {
  intern: {
    name: string;
    email: string;
    university: string | null;
    fieldOfStudy: string | null;
    graduationYear: number | null;
  };
  organization: {
    name: string;
    location: string | null;
    website: string | null;
    logoUrl: string | null;
  };
  internship: {
    title: string;
    sector: string | null;
    duration: number | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
  };
  supervisor: {
    name: string;
    email: string;
  };
  deliverables: Array<{
    title: string;
    status: string;
    version: number;
    submittedAt: string | null;
    feedback: string | null;
  }>;
  taskStats: {
    total: number;
    done: number;
  };
  signature: {
    reviewText: string;
    rating: number | null; // 1-5
    signedAt: string;
  };
  locale: 'fr' | 'en';
};

export const internshipRecords = pgTable(
  'internship_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    internshipId: uuid('internship_id')
      .notNull()
      .references(() => internships.id, { onDelete: 'cascade' }),
    internUserId: uuid('intern_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    generatedBy: uuid('generated_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    shareToken: text('share_token').notNull(),
    snapshot: jsonb('snapshot').$type<RecordSnapshot>().notNull(),
    pdfBlobUrl: text('pdf_blob_url'),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('internship_records_share_token_idx').on(table.shareToken),
    index('internship_records_workspace_idx').on(table.workspaceId),
    index('internship_records_intern_idx').on(table.internUserId),
    index('internship_records_org_idx').on(table.organizationId),
  ],
);

export type InternshipRecord = typeof internshipRecords.$inferSelect;
export type NewInternshipRecord = typeof internshipRecords.$inferInsert;
