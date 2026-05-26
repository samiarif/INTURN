import { db } from '@/db';
import {
  users,
  profiles,
  applications,
  comments,
  internshipBookmarks,
  notifications,
  workspaces,
  organizations,
  internships,
  communityPosts,
  communityComments,
  internshipRecords,
} from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Build a JSON snapshot of everything we hold about a user, for GDPR
 * data export. This is the "right of access" deliverable — when a user
 * asks "show me what you have," we return this.
 *
 * Excludes audit logs that reference them as a third party (e.g. a
 * supervisor who reviewed their work) — that data belongs to the
 * supervisor, not to them.
 */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');

  const orgRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, userId));
  const orgIds = orgRows.map((o) => o.id);

  const [
    profileRows,
    appRows,
    commentRows,
    bookmarkRows,
    notifRows,
    workspaceRows,
    internshipRows,
    communityPostRows,
    communityCommentRows,
    recordRows,
  ] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, userId)),
    db.select().from(applications).where(eq(applications.applicantId, userId)),
    db.select().from(comments).where(eq(comments.authorId, userId)),
    db.select().from(internshipBookmarks).where(eq(internshipBookmarks.internId, userId)),
    db.select().from(notifications).where(eq(notifications.recipientId, userId)),
    db.select().from(workspaces).where(eq(workspaces.internId, userId)),
    orgIds.length > 0
      ? db
          .select({
            id: internships.id,
            title: internships.title,
            status: internships.status,
            organizationId: internships.organizationId,
          })
          .from(internships)
          .where(inArray(internships.organizationId, orgIds))
      : Promise.resolve([]),
    db.select().from(communityPosts).where(eq(communityPosts.authorId, userId)),
    db.select().from(communityComments).where(eq(communityComments.authorId, userId)),
    db.select().from(internshipRecords).where(eq(internshipRecords.internUserId, userId)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    },
    profile: profileRows[0] ?? null,
    applications: appRows,
    comments: commentRows,
    bookmarks: bookmarkRows,
    notifications: notifRows,
    workspaces: workspaceRows,
    organizations: orgRows,
    internships: internshipRows,
    communityPosts: communityPostRows,
    communityComments: communityCommentRows,
    records: recordRows,
  };
}

/**
 * Hard-delete the local user row. Cascades through schema-level ON DELETE
 * CASCADE on: profiles, applications, comments, bookmarks, notifications,
 * workspaces (and through them tasks/deliverables), community posts +
 * comments, internship records. Sets null on: audit_logs.actor_id and
 * reports.reporter_id (we keep those rows for audit but anonymise the
 * link to the deleted user).
 *
 * The caller is responsible for deleting the corresponding Clerk user
 * (and signing out). This function only handles the DB side.
 */
export async function hardDeleteUserData(userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}
