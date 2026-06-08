'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { workspaces, internships, projectSprints, tasks } from '@/db/schema';
import { requireActiveSession } from '@/modules/auth/session';
import { getActiveMembership } from '@/modules/team/authz';
import { seedWorkspaceFromSprints } from './sprint-seed';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Result = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Load workspace row + its internship's projectId in one join.
 * Returns null when the workspace doesn't exist.
 */
async function loadWorkspace(workspaceId: string) {
  const [row] = await db
    .select({ ws: workspaces, projectId: internships.projectId })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return row ?? null;
}

/**
 * IDOR-safe gate: allow if caller is the workspace's intern OR an active
 * org-level owner/admin.  Throws on not-found or forbidden.
 */
async function gateWorkspace(userId: string, workspaceId: string) {
  const row = await loadWorkspace(workspaceId);
  if (!row) throw new Error('workspace_not_found');

  // Fast path: intern is always allowed to act on their own workspace.
  if (row.ws.internId === userId) return row;

  // Org-level gate: owner or admin only.
  const m = await getActiveMembership(userId, row.ws.organizationId);
  if (m?.role === 'owner' || m?.role === 'admin') return row;

  throw new Error('Forbidden');
}

function revalidate(workspaceId: string) {
  revalidatePath(`/intern/workspaces/${workspaceId}`);
  revalidatePath(`/company/workspaces/${workspaceId}`);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Trigger a one-shot seed of the workspace's task board from the project's
 * sprint blueprints.  Allowed for the workspace intern or an org owner/admin.
 */
export async function applySprintPlanAction(input: {
  workspaceId: string;
}): Promise<Result> {
  try {
    const { user } = await requireActiveSession();
    await gateWorkspace(user.id, input.workspaceId);
    await seedWorkspaceFromSprints(input.workspaceId);
    revalidate(input.workspaceId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/**
 * Assign or clear a task's sprint.  When `sprintId` is non-null it must
 * belong to the same project as the task's workspace — the DB FK alone
 * doesn't prevent cross-project assignment.
 */
export async function setTaskSprintAction(input: {
  taskId: string;
  sprintId: string | null;
}): Promise<Result> {
  try {
    const { user } = await requireActiveSession();

    // Load the task to resolve the workspace.
    const [task] = await db
      .select({ id: tasks.id, workspaceId: tasks.workspaceId })
      .from(tasks)
      .where(eq(tasks.id, input.taskId))
      .limit(1);
    if (!task) return { ok: false, error: 'task_not_found' };

    // Gate on the workspace (intern or org owner/admin).
    const row = await gateWorkspace(user.id, task.workspaceId);

    // Cross-project sprint validation: skip only when clearing (null).
    if (input.sprintId) {
      // If the internship has no linked project, no sprint can be valid.
      if (!row.projectId) return { ok: false, error: 'invalid_sprint' };

      const [s] = await db
        .select({ id: projectSprints.id })
        .from(projectSprints)
        .where(
          and(
            eq(projectSprints.id, input.sprintId),
            eq(projectSprints.projectId, row.projectId),
          ),
        )
        .limit(1);
      if (!s) return { ok: false, error: 'invalid_sprint' };
    }

    await db
      .update(tasks)
      .set({ sprintId: input.sprintId, updatedAt: new Date() })
      .where(eq(tasks.id, input.taskId));

    revalidate(task.workspaceId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
