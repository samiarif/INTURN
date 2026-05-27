import { db } from '@/db';
import {
  users,
  organizations,
  internships,
  applications,
  workspaces,
  communityPosts,
  internshipRecords,
  reports,
  notifications,
  tasks,
  deliverables,
} from '@/db/schema';
import { sql, eq } from 'drizzle-orm';

async function main() {
  const counts = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(users),
    db.select({ c: sql<number>`count(*)::int` }).from(organizations),
    db.select({ c: sql<number>`count(*)::int` }).from(internships),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(internships)
      .where(eq(internships.status, 'published')),
    db.select({ c: sql<number>`count(*)::int` }).from(applications),
    db.select({ c: sql<number>`count(*)::int` }).from(workspaces),
    db.select({ c: sql<number>`count(*)::int` }).from(tasks),
    db.select({ c: sql<number>`count(*)::int` }).from(deliverables),
    db.select({ c: sql<number>`count(*)::int` }).from(communityPosts),
    db.select({ c: sql<number>`count(*)::int` }).from(internshipRecords),
    db.select({ c: sql<number>`count(*)::int` }).from(reports),
    db.select({ c: sql<number>`count(*)::int` }).from(notifications),
  ]);

  const samEmails = await db
    .select({ email: users.email, role: users.role, firstName: users.firstName })
    .from(users)
    .where(
      sql`${users.email} IN ('dazzsemi@gmail.com', 'sami.arif@thog.io', 'hellowemakeitgrow@gmail.com')`,
    );

  console.log('Row counts:');
  console.log({
    users: counts[0][0].c,
    organizations: counts[1][0].c,
    internships: counts[2][0].c,
    internshipsPublished: counts[3][0].c,
    applications: counts[4][0].c,
    workspaces: counts[5][0].c,
    tasks: counts[6][0].c,
    deliverables: counts[7][0].c,
    communityPosts: counts[8][0].c,
    records: counts[9][0].c,
    reports: counts[10][0].c,
    notifications: counts[11][0].c,
  });
  console.log('\nSam accounts present:');
  for (const u of samEmails) {
    console.log(`  ${u.email} → ${u.role} (${u.firstName ?? '—'})`);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
