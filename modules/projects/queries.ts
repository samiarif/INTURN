import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function getProjectsByOrganization(organizationId: string) {
  return db.select().from(projects).where(eq(projects.organizationId, organizationId));
}

export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project ?? null;
}

export async function getActiveProjectsBySupervisor(supervisorUserId: string) {
  const all = await db.select().from(projects).where(eq(projects.status, 'active'));
  return all.filter((p) => p.supervisorIds?.includes(supervisorUserId));
}

export async function getProjectsForOrganizations(organizationIds: string[]) {
  if (organizationIds.length === 0) return [];
  return db.select().from(projects).where(inArray(projects.organizationId, organizationIds));
}
