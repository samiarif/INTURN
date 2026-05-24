'use server';

import { revalidatePath } from 'next/cache';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { workspaces, internships, tasks, deliverables, events, users } from '@/db/schema';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { canViewWorkspace } from '@/modules/workspace/service';
import { getProjectById } from '@/modules/projects/queries';
import { recordEvent } from '@/modules/events/service';
import { generateCheckInDraft, type Draft } from './ai-draft';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

async function loadContext(workspaceId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role =
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'intern';

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

  if (!canViewWorkspace(workspace, project, { userId: user.id, role })) {
    throw new Error('Forbidden');
  }
  return { user, workspace, internship };
}

export async function generateWeeklyCheckInDraftAction(input: {
  workspaceId: string;
}): Promise<Draft> {
  const { workspace, internship } = await loadContext(input.workspaceId);

  // Pull last 7 days of activity for this workspace
  const weekAgo = new Date(Date.now() - 7 * MS_PER_DAY);
  const workspaceTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.workspaceId, workspace.id));
  const workspaceDelivs = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.workspaceId, workspace.id));

  const taskIds = workspaceTasks.map((t) => t.id);
  const deliverableIds = workspaceDelivs.map((d) => d.id);
  const targetIds = [workspace.id, ...taskIds, ...deliverableIds];
  const weekEvents =
    targetIds.length > 0
      ? await db
          .select()
          .from(events)
          .where(and(inArray(events.targetId, targetIds), gte(events.createdAt, weekAgo)))
          .orderBy(desc(events.createdAt))
          .limit(50)
      : [];

  const [intern] = await db.select().from(users).where(eq(users.id, workspace.internId)).limit(1);
  const internName = intern ? `${intern.firstName ?? ''} ${intern.lastName ?? ''}`.trim() : 'Intern';

  return generateCheckInDraft({
    weekEvents,
    tasks: workspaceTasks,
    deliverables: workspaceDelivs,
    internshipTitle: internship?.title ?? 'Internship',
    internName,
  });
}

export async function submitWeeklyCheckInAction(input: {
  workspaceId: string;
  shipped: string;
  stuck: string;
  next: string;
}) {
  const { user, workspace } = await loadContext(input.workspaceId);

  const shipped = input.shipped.trim();
  const stuck = input.stuck.trim();
  const next = input.next.trim();
  if (!shipped && !stuck && !next) {
    throw new Error('Check-in cannot be empty');
  }

  await recordEvent({
    type: 'checkin.submitted',
    actorId: user.id,
    targetType: 'workspace',
    targetId: workspace.id,
    metadata: {
      shipped,
      stuck,
      next,
      authorName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    },
  });

  revalidatePath(`/intern/workspaces/${workspace.id}`);
  revalidatePath(`/company/workspaces/${workspace.id}`);
  revalidatePath(`/intern/workspaces/${workspace.id}/check-in`);
}
