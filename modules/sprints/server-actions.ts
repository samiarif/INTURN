'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireActiveSession } from '@/modules/auth/session';
import { requireOrgRole } from '@/modules/team/authz';
import {
  createSprint,
  updateSprint,
  deleteSprint,
  reorderSprints,
  setSprintTaskBlueprint,
  createSprintsBulk,
} from './service';
import type { SprintTaskBlueprint } from '@/db/schema';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** IDOR-safe gate: loads the project, then checks org-level owner/admin role. */
async function gate(projectId: string) {
  const { user } = await requireActiveSession();

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Error('project_not_found');
  }

  await requireOrgRole(user.id, project.organizationId, ['owner', 'admin']);

  return { user, project };
}

function revalidate(projectId: string) {
  revalidatePath(`/company/projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createSprintAction(input: {
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!input.name.trim()) {
      return { ok: false, error: 'name_required' };
    }

    await gate(input.projectId);
    await createSprint(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function updateSprintAction(input: {
  projectId: string;
  sprintId: string;
  name?: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await gate(input.projectId);
    await updateSprint(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function deleteSprintAction(input: {
  projectId: string;
  sprintId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await gate(input.projectId);
    await deleteSprint(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function reorderSprintsAction(input: {
  projectId: string;
  orderedIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await gate(input.projectId);
    await reorderSprints(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function setSprintTasksAction(input: {
  projectId: string;
  sprintId: string;
  tasks: SprintTaskBlueprint[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await gate(input.projectId);
    await setSprintTaskBlueprint(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function applySprintPlanAction(input: {
  projectId: string;
  sprints: { name: string; goal?: string | null; startDate?: string | null; endDate?: string | null }[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await gate(input.projectId);
    await createSprintsBulk(input);
    revalidate(input.projectId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
