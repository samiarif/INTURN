'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tasks, deliverables, events, users, internships } from '@/db/schema';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { loadWorkspaceAccess } from '@/modules/workspace/access';
import { recordEvent } from '@/modules/events/service';
import { generateCheckInDraft, type Draft } from './ai-draft';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function generateWeeklyCheckInDraftAction(input: {
  workspaceId: string;
}): Promise<Draft> {
  const { workspace } = await loadWorkspaceAccess(input.workspaceId);

  // Pull last 7 days of activity in parallel with tasks/deliverables/intern.
  const weekAgo = new Date(Date.now() - 7 * MS_PER_DAY);
  const [workspaceTasks, workspaceDelivs, internshipRows, internRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.workspaceId, workspace.id)),
    db.select().from(deliverables).where(eq(deliverables.workspaceId, workspace.id)),
    db
      .select()
      .from(internships)
      .where(eq(internships.id, workspace.internshipId))
      .limit(1),
    db.select().from(users).where(eq(users.id, workspace.internId)).limit(1),
  ]);

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

  const intern = internRows[0];
  const internName = intern ? `${intern.firstName ?? ''} ${intern.lastName ?? ''}`.trim() : 'Intern';

  return generateCheckInDraft({
    weekEvents,
    tasks: workspaceTasks,
    deliverables: workspaceDelivs,
    internshipTitle: internshipRows[0]?.title ?? 'Internship',
    internName,
  });
}

export async function submitWeeklyCheckInAction(input: {
  workspaceId: string;
  shipped: string;
  stuck: string;
  next: string;
}) {
  const { session, workspace } = await loadWorkspaceAccess(input.workspaceId);

  const shipped = input.shipped.trim();
  const stuck = input.stuck.trim();
  const next = input.next.trim();
  if (!shipped && !stuck && !next) {
    throw new Error('Check-in cannot be empty');
  }

  await recordEvent({
    type: 'checkin.submitted',
    actorId: session.user.id,
    targetType: 'workspace',
    targetId: workspace.id,
    metadata: {
      shipped,
      stuck,
      next,
      authorName: `${session.user.firstName ?? ''} ${session.user.lastName ?? ''}`.trim(),
    },
  });

  revalidatePath(`/intern/workspaces/${workspace.id}`);
  revalidatePath(`/company/workspaces/${workspace.id}`);
  revalidatePath(`/intern/workspaces/${workspace.id}/check-in`);
}
