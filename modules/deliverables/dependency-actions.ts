'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { deliverableDependencies } from '@/db/schema';
import { requireActiveSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { getActiveMembership, canManageOrg } from '@/modules/team/authz';
import {
  resolveDeliverableProjectId,
  getProjectEdgePairs,
  wouldCreateCycle,
} from './dependencies';

export type DependencyActionError =
  | 'forbidden'
  | 'wrong_project'
  | 'self'
  | 'cycle'
  | 'duplicate'
  | 'not_found'
  | 'unknown_error';

export type DependencyActionResult = { ok: true } | { ok: false; error: DependencyActionError };

// Postgres unique-violation SQLSTATE — the (upstream_id, downstream_id) edge
// index throws this when the same edge already exists.
const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (code === PG_UNIQUE_VIOLATION) return true;
  // neon-http surfaces the driver error nested or in the message; be lenient.
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('deliverable_dependencies_edge_idx') || msg.includes('duplicate key');
}

/**
 * May this user manage dependencies on a project? Assigned supervisor on the
 * project, platform admin, or an org-level owner/admin of the project's org.
 * Mirrors the project-hub view guard (modules/team/authz#canViewProject) but
 * is the write gate for the dependency editor.
 */
async function canManageProjectDependencies(
  userId: string,
  globalRole: string | null | undefined,
  project: { organizationId: string; supervisorIds: string[] | null },
): Promise<boolean> {
  if (globalRole === 'admin') return true;
  if (project.supervisorIds?.includes(userId)) return true;
  const membership = await getActiveMembership(userId, project.organizationId);
  return canManageOrg(membership?.role);
}

/**
 * Wire an "upstream feeds downstream" edge between two deliverables in the same
 * project. Supervisor/admin/org-manager gated. Validates same-project, rejects
 * self-edges, and runs an in-memory cycle guard over the project's existing
 * edges before inserting. Duplicate edges (unique index) resolve to
 * `'duplicate'` rather than throwing.
 */
export async function addDeliverableDependencyAction(input: {
  projectId: string;
  upstreamId: string;
  downstreamId: string;
}): Promise<DependencyActionResult> {
  try {
    const { user, role } = await requireActiveSession();

    const project = await getProjectById(input.projectId);
    if (!project) return { ok: false, error: 'not_found' };

    if (!(await canManageProjectDependencies(user.id, role, project))) {
      return { ok: false, error: 'forbidden' };
    }

    // Reject self before any DB work — cheap and unambiguous.
    if (input.upstreamId === input.downstreamId) {
      return { ok: false, error: 'self' };
    }

    // Both deliverables must resolve to THIS project (workspace→internship→project).
    const [upstreamProject, downstreamProject] = await Promise.all([
      resolveDeliverableProjectId(input.upstreamId),
      resolveDeliverableProjectId(input.downstreamId),
    ]);
    if (upstreamProject !== input.projectId || downstreamProject !== input.projectId) {
      return { ok: false, error: 'wrong_project' };
    }

    // Cycle guard: load the project's edges once, walk in memory.
    const edges = await getProjectEdgePairs(input.projectId);
    if (wouldCreateCycle(edges, input.upstreamId, input.downstreamId)) {
      return { ok: false, error: 'cycle' };
    }

    try {
      await db.insert(deliverableDependencies).values({
        upstreamId: input.upstreamId,
        downstreamId: input.downstreamId,
        projectId: input.projectId,
        createdBy: user.id,
      });
    } catch (err) {
      if (isUniqueViolation(err)) return { ok: false, error: 'duplicate' };
      throw err;
    }

    revalidatePath(`/company/projects/${input.projectId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'unknown_error' };
  }
}

/**
 * Remove a dependency edge. Same authz as add — resolve the project via the
 * row, then gate. Returns `{ ok: false }` if the row is gone or the caller
 * isn't permitted.
 */
export async function removeDeliverableDependencyAction(
  id: string,
): Promise<{ ok: boolean }> {
  try {
    const { user, role } = await requireActiveSession();

    const [row] = await db
      .select()
      .from(deliverableDependencies)
      .where(eq(deliverableDependencies.id, id))
      .limit(1);
    if (!row) return { ok: false };

    const project = await getProjectById(row.projectId);
    if (!project) return { ok: false };

    if (!(await canManageProjectDependencies(user.id, role, project))) {
      return { ok: false };
    }

    await db.delete(deliverableDependencies).where(eq(deliverableDependencies.id, id));

    revalidatePath(`/company/projects/${row.projectId}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
