import { db } from '@/db';
import { projectSprints, tasks, workspaces, internships, type ProjectSprint } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import type { SprintProgress } from './active-sprint';

/** All sprints for a project, in order. No auth (queries-layer convention). */
export async function getProjectSprints(projectId: string): Promise<ProjectSprint[]> {
  return db
    .select()
    .from(projectSprints)
    .where(eq(projectSprints.projectId, projectId))
    .orderBy(asc(projectSprints.orderIndex))
    .limit(100);
}

/** All sprints for a workspace's project, ordered. Empty array when none. */
export async function getSprintsForWorkspace(workspaceId: string): Promise<ProjectSprint[]> {
  const [row] = await db
    .select({ projectId: internships.projectId })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!row?.projectId) return [];
  return db
    .select()
    .from(projectSprints)
    .where(eq(projectSprints.projectId, row.projectId))
    .orderBy(asc(projectSprints.orderIndex))
    .limit(100);
}

/** Map<sprintId, {total, done}> over the workspace's sprint-linked tasks. */
export async function getTaskCountsBySprint(
  workspaceId: string,
): Promise<Map<string, SprintProgress>> {
  const rows = await db
    .select({ sprintId: tasks.sprintId, status: tasks.status })
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId))
    // Workspace tasks are bounded in practice (typically far under this cap); 2000
    // is generous. These counts feed the active-sprint resolver, so if a workspace
    // ever exceeds this the progress fallback would silently undercount.
    .limit(2000);
  const map = new Map<string, SprintProgress>();
  for (const r of rows) {
    if (!r.sprintId) continue;
    const cur = map.get(r.sprintId) ?? { total: 0, done: 0 };
    cur.total++;
    if (r.status === 'done') cur.done++;
    map.set(r.sprintId, cur);
  }
  return map;
}
