import { db } from '@/db';
import { applications, internships, projects, tasks, workspaces } from '@/db/schema';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type ProjectsIndexStats = {
  /** All internships whose projectId is in `projectIds`. */
  internshipsList: Array<typeof internships.$inferSelect>;
  /** Lightweight workspace rows: id, internshipId, status. */
  workspaceRows: Array<{ id: string; internshipId: string; status: string | null }>;
  /** Task status + workspaceId for every workspace in `workspaceRows`. */
  taskRows: Array<{ status: string | null; workspaceId: string }>;
  /** Application IDs created within the last 7 days for the org's internships. */
  appsThisWeek: Array<{ id: string }>;
};

/**
 * Fan-out query for the company projects index page.
 * Given a list of project IDs under an org, returns internship/workspace/task/
 * application rollup data in one coordinated multi-step fetch.
 */
export async function listCompanyProjectsWithStats(
  projectIds: string[],
): Promise<ProjectsIndexStats> {
  if (projectIds.length === 0) {
    return { internshipsList: [], workspaceRows: [], taskRows: [], appsThisWeek: [] };
  }

  const internshipsList = await db
    .select()
    .from(internships)
    .where(inArray(internships.projectId, projectIds));

  const internshipIds = internshipsList.map((i) => i.id);
  if (internshipIds.length === 0) {
    return { internshipsList, workspaceRows: [], taskRows: [], appsThisWeek: [] };
  }

  const workspaceRows = await db
    .select({
      id: workspaces.id,
      internshipId: workspaces.internshipId,
      status: workspaces.status,
    })
    .from(workspaces)
    .where(inArray(workspaces.internshipId, internshipIds));

  const workspaceIds = workspaceRows.map((w) => w.id);
  const weekAgo = new Date(Date.now() - 7 * MS_PER_DAY);

  const [taskRows, appsThisWeek] = await Promise.all([
    workspaceIds.length > 0
      ? db
          .select({ status: tasks.status, workspaceId: tasks.workspaceId })
          .from(tasks)
          .where(inArray(tasks.workspaceId, workspaceIds))
      : Promise.resolve([] as Array<{ status: string | null; workspaceId: string }>),
    db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          inArray(applications.internshipId, internshipIds),
          gte(applications.createdAt, weekAgo),
        ),
      ),
  ]);

  return { internshipsList, workspaceRows, taskRows, appsThisWeek };
}

export async function getProjectsByOrganization(organizationId: string) {
  return db.select().from(projects).where(eq(projects.organizationId, organizationId));
}

export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project ?? null;
}

export async function getActiveProjectsBySupervisor(supervisorUserId: string) {
  return db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.status, 'active'),
        sql`${projects.supervisorIds} @> ${JSON.stringify([supervisorUserId])}::jsonb`,
      ),
    );
}

export async function getProjectsForOrganizations(organizationIds: string[]) {
  if (organizationIds.length === 0) return [];
  return db.select().from(projects).where(inArray(projects.organizationId, organizationIds));
}
