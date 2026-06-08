import { db } from '@/db';
import {
  workspaces,
  internships,
  projectSprints,
  tasks,
} from '@/db/schema';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

/**
 * One-shot seed: copy a project's sprint blueprints into a workspace's task
 * board. Idempotent — if the workspace already has any task linked to a sprint,
 * does nothing (the intern has already pulled the plan).
 *
 * Project resolution: workspace.internshipId → internship.projectId.
 * Returns the number of tasks created.
 */
export async function seedWorkspaceFromSprints(workspaceId: string): Promise<number> {
  // 1. Resolve project via internship.
  const [row] = await db
    .select({ projectId: internships.projectId })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!row?.projectId) return 0;

  // 2. Load sprints in order.
  const sprints = await db
    .select()
    .from(projectSprints)
    .where(eq(projectSprints.projectId, row.projectId))
    .orderBy(asc(projectSprints.orderIndex))
    .limit(100);
  if (sprints.length === 0) return 0;

  // 3. Idempotency guard — any existing sprint-linked task → bail.
  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.workspaceId, workspaceId), isNotNull(tasks.sprintId)))
    .limit(1);
  if (existing) return 0;

  // 4. Insert blueprint tasks.
  let order = 0;
  let inserted = 0;
  // Best-effort: drizzle/neon-http has no transactions. A throw mid-loop leaves
  // partial tasks; the idempotency guard then blocks a clean retry, so callers
  // should treat this as fire-and-forget (see acceptApplication's try/catch).
  for (const sprint of sprints) {
    const blueprint = sprint.taskBlueprint ?? [];
    for (const tb of blueprint) {
      await db.insert(tasks).values({
        workspaceId,
        sprintId: sprint.id,
        title: tb.title,
        description: tb.description ?? null,
        status: 'todo',
        order: order++,
      });
      inserted++;
    }
  }
  return inserted;
}
