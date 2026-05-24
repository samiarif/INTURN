'use server';

import { revalidatePath } from 'next/cache';
import { loadWorkspaceAccess } from './access';
import { recordEvent } from '@/modules/events/service';

export async function scheduleCheckInAction(input: {
  workspaceId: string;
  scheduledAtIso: string;
  durationMinutes: number;
  note?: string;
}) {
  const { session, workspace } = await loadWorkspaceAccess(input.workspaceId);

  const scheduledAt = new Date(input.scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid date');
  if (scheduledAt.getTime() < Date.now() - 5 * 60_000) {
    throw new Error('Check-in time must be in the future');
  }
  if (input.durationMinutes < 5 || input.durationMinutes > 240) {
    throw new Error('Duration must be 5-240 minutes');
  }

  // Deterministic Jitsi room URL — meet.jit.si is free, URL-based.
  const roomName = `inturn-${workspace.id.slice(0, 8)}-${scheduledAt.getTime()}`;
  const meetingUrl = `https://meet.jit.si/${roomName}`;

  await recordEvent({
    type: 'system.checkin.scheduled',
    actorId: session.user.id,
    targetType: 'workspace',
    targetId: workspace.id,
    metadata: {
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: input.durationMinutes,
      meetingUrl,
      note: input.note ?? null,
    },
  });

  revalidatePath(`/intern/workspaces/${workspace.id}`);
  revalidatePath(`/company/workspaces/${workspace.id}`);

  return { meetingUrl, scheduledAt: scheduledAt.toISOString() };
}
