import { db } from '@/db';
import { applications, internships, profiles, users } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

export async function getApplicationsByApplicant(applicantId: string) {
  return db
    .select({ application: applications, internship: internships })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .where(eq(applications.applicantId, applicantId))
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationsByProject(projectId: string) {
  const projectInternships = await db
    .select()
    .from(internships)
    .where(eq(internships.projectId, projectId));
  const internshipIds = projectInternships.map((i) => i.id);
  if (internshipIds.length === 0) return [];
  return db
    .select({
      application: applications,
      internship: internships,
      applicant: users,
      profile: profiles,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .leftJoin(profiles, eq(profiles.userId, applications.applicantId))
    .where(inArray(applications.internshipId, internshipIds))
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationById(id: string) {
  const [row] = await db
    .select({
      application: applications,
      internship: internships,
      applicant: users,
      profile: profiles,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .leftJoin(profiles, eq(profiles.userId, applications.applicantId))
    .where(eq(applications.id, id))
    .limit(1);
  return row ?? null;
}

export async function getApplicationsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({
      application: applications,
      internship: internships,
      applicant: users,
      profile: profiles,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .leftJoin(profiles, eq(profiles.userId, applications.applicantId))
    .where(inArray(applications.id, ids));
}
