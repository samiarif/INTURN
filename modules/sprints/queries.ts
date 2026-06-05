import { db } from '@/db';
import { projectSprints, type ProjectSprint } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';

/** All sprints for a project, in order. No auth (queries-layer convention). */
export async function getProjectSprints(projectId: string): Promise<ProjectSprint[]> {
  return db
    .select()
    .from(projectSprints)
    .where(eq(projectSprints.projectId, projectId))
    .orderBy(asc(projectSprints.orderIndex))
    .limit(100);
}
