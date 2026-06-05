import { db } from '@/db';
import { projectSprints, type ProjectSprint, type SprintTaskBlueprint } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function createSprint(input: {
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  taskBlueprint?: SprintTaskBlueprint[];
}): Promise<ProjectSprint> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${projectSprints.orderIndex}), -1)` })
    .from(projectSprints)
    .where(eq(projectSprints.projectId, input.projectId))
    .limit(1);
  const [created] = await db
    .insert(projectSprints)
    .values({
      projectId: input.projectId,
      name: input.name,
      goal: input.goal ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      orderIndex: (max ?? -1) + 1,
      taskBlueprint: input.taskBlueprint ?? [],
    })
    .returning();
  return created;
}

export async function updateSprint(input: {
  projectId: string;
  sprintId: string;
  name?: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.goal !== undefined) patch.goal = input.goal;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.endDate !== undefined) patch.endDate = input.endDate;
  await db
    .update(projectSprints)
    .set(patch)
    .where(and(eq(projectSprints.id, input.sprintId), eq(projectSprints.projectId, input.projectId)));
}

export async function setSprintTaskBlueprint(input: {
  projectId: string;
  sprintId: string;
  tasks: SprintTaskBlueprint[];
}): Promise<void> {
  await db
    .update(projectSprints)
    .set({ taskBlueprint: input.tasks, updatedAt: new Date() })
    .where(and(eq(projectSprints.id, input.sprintId), eq(projectSprints.projectId, input.projectId)));
}

export async function deleteSprint(input: { projectId: string; sprintId: string }): Promise<void> {
  await db
    .delete(projectSprints)
    .where(and(eq(projectSprints.id, input.sprintId), eq(projectSprints.projectId, input.projectId)));
}

/** Persist a new order: ids in desired order → orderIndex 0..n. */
export async function reorderSprints(input: { projectId: string; orderedIds: string[] }): Promise<void> {
  const now = new Date();
  for (let i = 0; i < input.orderedIds.length; i++) {
    await db
      .update(projectSprints)
      .set({ orderIndex: i, updatedAt: now })
      .where(and(eq(projectSprints.id, input.orderedIds[i]), eq(projectSprints.projectId, input.projectId)));
  }
}

/** Bulk-create sprints from an accepted AI plan (preserves given order). */
export async function createSprintsBulk(input: {
  projectId: string;
  sprints: { name: string; goal?: string | null; startDate?: string | null; endDate?: string | null }[];
}): Promise<void> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${projectSprints.orderIndex}), -1)` })
    .from(projectSprints)
    .where(eq(projectSprints.projectId, input.projectId))
    .limit(1);
  let next = (max ?? -1) + 1;
  for (const s of input.sprints) {
    await db.insert(projectSprints).values({
      projectId: input.projectId,
      name: s.name,
      goal: s.goal ?? null,
      startDate: s.startDate ?? null,
      endDate: s.endDate ?? null,
      orderIndex: next++,
      taskBlueprint: [],
    });
  }
}
