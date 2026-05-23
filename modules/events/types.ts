export const EVENT_TYPES = [
  'auth.signup',
  'auth.login',
  'user.created',
  'user.updated',
  'user.deleted',
  'profile.created',
  'profile.updated',
  'organization.created',
  'organization.updated',
  'role.selected',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface RecordEventInput {
  type: EventType;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}
