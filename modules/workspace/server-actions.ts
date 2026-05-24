'use server';

import { revalidatePath } from 'next/cache';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { workspaces, internships } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { canViewWorkspace } from '@/modules/workspace/service';
import { getProjectById } from '@/modules/projects/queries';
import { recordEvent } from '@/modules/events/service';

/**
 * Schedule a check-in: records the event with a deterministic Jitsi room URL.
 * Jitsi (meet.jit.si) is free and URL-based — no API or auth required.
 */
export async function scheduleCheckInAction(input: {
  workspaceId: string;
  scheduledAtIso: string;
  durationMinutes: number;
  note?: string;
}) {
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
    .where(eq(workspaces.id, input.workspaceId))
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

  const scheduledAt = new Date(input.scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid date');
  if (scheduledAt.getTime() < Date.now() - 5 * 60_000) {
    throw new Error('Check-in time must be in the future');
  }
  if (input.durationMinutes < 5 || input.durationMinutes > 240) {
    throw new Error('Duration must be 5-240 minutes');
  }

  // Generate a stable-ish Jitsi room URL. Including the timestamp keeps
  // recurring check-ins from colliding rooms.
  const roomName = `inturn-${input.workspaceId.slice(0, 8)}-${scheduledAt.getTime()}`;
  const meetingUrl = `https://meet.jit.si/${roomName}`;

  await recordEvent({
    type: 'system.checkin.scheduled',
    actorId: user.id,
    targetType: 'workspace',
    targetId: input.workspaceId,
    metadata: {
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: input.durationMinutes,
      meetingUrl,
      note: input.note ?? null,
    },
  });

  revalidatePath(`/intern/workspaces/${input.workspaceId}`);
  revalidatePath(`/company/workspaces/${input.workspaceId}`);

  return { meetingUrl, scheduledAt: scheduledAt.toISOString() };
}
