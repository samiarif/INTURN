import { db } from '@/db';
import { workspaces, applications, internships } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import type { Workspace, Project } from '@/db/schema';
import type { UserRole } from './types';

/**
 * Project-scoped workspace visibility.
 *
 * - Admin: always.
 * - Intern: owns the workspace (workspace.internId === viewer.userId).
 * - Company role: must be in project.supervisorIds. Falls back to NOT visible
 *   if the project has no supervisorIds (deny by default — Sprint 2 seeds
 *   that set org-owner-as-supervisor must populate supervisorIds via the seed
 *   update).
 */
export function canViewWorkspace(
  workspace: Workspace,
  project: Project | null,
  viewer: { userId: string; role: UserRole },
): boolean {
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'intern') return workspace.internId === viewer.userId;
  if (viewer.role === 'company') {
    return Boolean(project?.supervisorIds?.includes(viewer.userId));
  }
  return false;
}

export async function createWorkspaceFromApplication(applicationId: string, actorId: string) {
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!application) throw new Error('Application not found');
  if (application.status !== 'accepted') throw new Error('Application must be accepted');

  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, application.internshipId))
    .limit(1);
  if (!internship) throw new Error('Internship not found');

  const [workspace] = await db
    .insert(workspaces)
    .values({
      internshipId: internship.id,
      internId: application.applicantId,
      organizationId: internship.organizationId,
      status: 'active',
    })
    .returning();

  await recordEvent({
    type: 'workspace.created',
    actorId,
    targetType: 'workspace',
    targetId: workspace.id,
    metadata: { applicationId, internshipId: internship.id },
  });

  return workspace;
}
