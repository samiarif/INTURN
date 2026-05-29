import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { organizationMembers, internships, projects, users, workspaces } from '@/db/schema';
import type { OrganizationMember } from '@/db/schema';

export async function getOrgMembers(orgId: string): Promise<OrganizationMember[]> {
  return db.select().from(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, orgId),
      inArray(organizationMembers.status, ['invited', 'active']),
    ))
    .orderBy(desc(organizationMembers.invitedAt)) as Promise<OrganizationMember[]>;
}

export type OrgIntern = {
  workspaceId: string;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  internId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string | null;
  internshipId: string;
  internshipTitle: string;
  projectId: string | null;
  projectName: string | null;
  supervisorIds: string[] | null;
};

export async function getOrgInterns(orgId: string): Promise<OrgIntern[]> {
  const rows = await db.select({
    workspaceId: workspaces.id,
    status: workspaces.status,
    startDate: workspaces.startDate,
    endDate: workspaces.endDate,
    internId: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    imageUrl: users.imageUrl,
    internshipId: internships.id,
    internshipTitle: internships.title,
    projectId: projects.id,
    projectName: projects.name,
    supervisorIds: projects.supervisorIds,
  })
    .from(workspaces)
    .innerJoin(users, eq(workspaces.internId, users.id))
    .innerJoin(internships, eq(workspaces.internshipId, internships.id))
    .leftJoin(projects, eq(internships.projectId, projects.id))
    .where(and(eq(workspaces.organizationId, orgId), eq(workspaces.status, 'active')));
  return rows as OrgIntern[];
}
