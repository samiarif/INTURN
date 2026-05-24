import { cache } from 'react';
import { db } from '@/db';
import { workspaces, internships } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireSession, type Session } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { canViewWorkspace } from './service';
import type { Workspace, Project } from '@/db/schema';

export type WorkspaceAccess = {
  session: Session;
  workspace: Workspace;
  project: Project | null;
};

/**
 * Resolve session + workspace + project + authz check in one go.
 *
 * Use from server actions that touch a workspace (tasks, deliverables,
 * comments, check-ins). Throws on Unauthorized / Forbidden / Workspace
 * not found. Cached per-request so multiple actions in the same request
 * share one trip through Clerk + DB.
 */
export const loadWorkspaceAccess = cache(
  async (workspaceId: string): Promise<WorkspaceAccess> => {
    const session = await requireSession();
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    if (!workspace) throw new Error('Workspace not found');

    const [internship] = await db
      .select()
      .from(internships)
      .where(eq(internships.id, workspace.internshipId))
      .limit(1);
    const project = internship?.projectId ? await getProjectById(internship.projectId) : null;

    if (
      !canViewWorkspace(workspace, project, { userId: session.user.id, role: session.role })
    ) {
      throw new Error('Forbidden');
    }

    return { session, workspace, project };
  },
);
