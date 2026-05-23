import { db } from '@/db';
import { workspaces, applications, internships } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import type { Workspace } from '@/db/schema';
import type { WorkspaceViewer } from './types';

export function canViewWorkspace(workspace: Workspace, viewer: WorkspaceViewer): boolean {
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'intern') return workspace.internId === viewer.userId;
  if (viewer.role === 'company') return viewer.supervisorOf.includes(workspace.organizationId);
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
