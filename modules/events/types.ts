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
  'project.updated',
  'project.status.changed',
  'workspace.created',
  'task.created',
  'task.moved',
  'comment.added',
  'deliverable.submitted',
  'deliverable.approved',
  'deliverable.revision.requested',
  'system.checkin.scheduled',
  'checkin.submitted',
  'stuck.signaled',
  'internship.created',
  'internship.updated',
  'internship.published',
  'internship.unpublished',
  'internship.closed',
  'internship.status_changed',
  'application.created',
  'application.status.changed',
  'application.accepted',
  'organization.verification.changed',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface RecordEventInput {
  type: EventType;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}
