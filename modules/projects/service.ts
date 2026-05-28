import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';

export type ProjectStatus = 'draft' | 'active' | 'archived';

const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['active'],
  active: ['archived'],
  archived: [],
};

export function isValidProjectTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export async function createDraftProject(input: {
  organizationId: string;
  name: string;
  slug: string;
  brief?: string;
  supervisorIds: string[];
  actorId: string;
  startDate?: string;
  endDate?: string;
  goals?: string[];
  phases?: Array<{ name: string; description?: string; fromWeek: number; toWeek: number }>;
}) {
  const [project] = await db
    .insert(projects)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      brief: input.brief,
      supervisorIds: input.supervisorIds,
      startDate: input.startDate,
      endDate: input.endDate,
      // Drop empty strings — goal=[''] is essentially "no goal entered".
      goals: input.goals?.filter((g) => g.trim().length > 0),
      phases: input.phases?.filter((p) => p.name.trim().length > 0),
      status: 'draft',
    })
    .returning();

  await recordEvent({
    type: 'project.created',
    actorId: input.actorId,
    targetType: 'project',
    targetId: project.id,
    metadata: { name: input.name, status: 'draft' },
  });

  return project;
}

export async function updateProject(input: {
  projectId: string;
  name: string;
  slug: string;
  brief?: string;
  actorId: string;
  startDate?: string;
  endDate?: string;
  goals?: string[];
  phases?: Array<{ name: string; description?: string; fromWeek: number; toWeek: number }>;
}) {
  const [updated] = await db
    .update(projects)
    .set({
      name: input.name,
      slug: input.slug,
      brief: input.brief,
      startDate: input.startDate,
      endDate: input.endDate,
      // Drop empty strings — goal=[''] is essentially "no goal entered".
      goals: input.goals?.filter((g) => g.trim().length > 0),
      phases: input.phases?.filter((p) => p.name.trim().length > 0),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, input.projectId))
    .returning();

  if (!updated) throw new Error('Project not found');

  await recordEvent({
    type: 'project.updated',
    actorId: input.actorId,
    targetType: 'project',
    targetId: input.projectId,
    metadata: { name: input.name },
  });

  return updated;
}

export async function transitionProjectStatus(input: {
  projectId: string;
  to: ProjectStatus;
  actorId: string;
}) {
  const [current] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!current) throw new Error('Project not found');

  const from = current.status as ProjectStatus;
  if (!isValidProjectTransition(from, input.to)) {
    throw new Error(`Invalid transition: ${from} → ${input.to}`);
  }

  const [updated] = await db
    .update(projects)
    .set({ status: input.to, updatedAt: new Date() })
    .where(eq(projects.id, input.projectId))
    .returning();

  await recordEvent({
    type: 'project.status.changed',
    actorId: input.actorId,
    targetType: 'project',
    targetId: input.projectId,
    metadata: { from, to: input.to },
  });

  return updated;
}
