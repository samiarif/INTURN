export const EVENT_TYPES = [
  'auth.signup',
  'auth.login',
  'user.created',
  'user.updated',
  'user.deleted',
  'profile.created',
  'profile.updated',
  'profile.basics.saved',
  'profile.skills.saved',
  'organization.created',
  'organization.updated',
  'role.selected',
  'project.created',
  'project.status.changed',
  'workspace.created',
  'task.moved',
  'comment.added',
  'deliverable.submitted',
  'deliverable.revision.requested',
  'system.checkin.scheduled',
  'stuck.signaled',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface RecordEventInput {
  type: EventType;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}
