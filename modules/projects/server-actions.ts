'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { organizations, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { createDraftProject, transitionProjectStatus } from './service';
import { projectCreateSchema } from './validators';
import { getProjectById } from './queries';

export async function createProjectAction(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, user.id))
    .limit(1);
  if (!org) {
    redirect('/onboarding/company');
  }
  if (org.verificationStatus !== 'verified') {
    throw new Error('Your organization must be verified before creating projects');
  }

  // Goals + phases are JSON-encoded into hidden inputs by the client form so
  // we can keep the existing FormData server-action wiring intact.
  let goals: unknown;
  let phases: unknown;
  try {
    const goalsRaw = formData.get('goals');
    const phasesRaw = formData.get('phases');
    goals = goalsRaw ? JSON.parse(String(goalsRaw)) : undefined;
    phases = phasesRaw ? JSON.parse(String(phasesRaw)) : undefined;
  } catch {
    throw new Error('Invalid form data');
  }

  const parsed = projectCreateSchema.parse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    brief: formData.get('brief') || undefined,
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    goals,
    phases,
  });

  const project = await createDraftProject({
    organizationId: org.id,
    name: parsed.name,
    slug: parsed.slug,
    brief: parsed.brief,
    supervisorIds: [user.id],
    actorId: user.id,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    goals: parsed.goals,
    phases: parsed.phases,
  });

  redirect(`/company/projects/${project.id}`);
}

export async function activateProjectAction(projectId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  await transitionProjectStatus({
    projectId,
    to: 'active',
    actorId: user.id,
  });
}

export type UpdateGoalsPhasesInput = {
  projectId: string;
  goals?: string[];
  phases?: Array<{ name: string; description?: string; fromWeek: number; toWeek: number }>;
};

/**
 * Update a project's goals and/or phases in place. Supervisor-only.
 * Goals capped at 3, each ≤120 chars. Phases capped at 6, each
 * fromWeek/toWeek non-negative ints with fromWeek ≤ toWeek.
 */
export async function updateProjectGoalsPhasesAction(
  input: UpdateGoalsPhasesInput,
): Promise<{ ok: boolean; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: 'unauthorized' };
  const user = await getUserByClerkId(clerkId);
  if (!user) return { ok: false, error: 'unauthorized' };
  if (user.suspendedAt) return { ok: false, error: 'account_suspended' };

  const project = await getProjectById(input.projectId);
  if (!project) return { ok: false, error: 'not_found' };
  if (!project.supervisorIds?.includes(user.id)) return { ok: false, error: 'forbidden' };

  // Validate goals
  let goals: string[] | undefined;
  if (input.goals !== undefined) {
    const cleaned = input.goals
      .map((g) => (typeof g === 'string' ? g.trim() : ''))
      .filter((g) => g.length > 0 && g.length <= 120);
    if (cleaned.length > 3) return { ok: false, error: 'too_many_goals' };
    goals = cleaned;
  }

  // Validate phases
  let phases: typeof input.phases | undefined;
  if (input.phases !== undefined) {
    if (input.phases.length > 6) return { ok: false, error: 'too_many_phases' };
    const cleaned = input.phases
      .map((p) => ({
        name: typeof p.name === 'string' ? p.name.trim() : '',
        description: typeof p.description === 'string' ? p.description.trim() : undefined,
        fromWeek: Math.max(0, Math.floor(Number(p.fromWeek))),
        toWeek: Math.max(0, Math.floor(Number(p.toWeek))),
      }))
      .filter((p) => p.name.length > 0 && p.name.length <= 80 && p.fromWeek <= p.toWeek);
    phases = cleaned;
  }

  const updates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  if (goals !== undefined) updates.goals = goals;
  if (phases !== undefined) updates.phases = phases;

  await db.update(projects).set(updates).where(eq(projects.id, input.projectId));

  revalidatePath(`/company/projects/${input.projectId}`);
  return { ok: true };
}
