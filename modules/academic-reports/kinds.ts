export const DELIVERABLE_KINDS = ['rapport', 'presentation', 'diagram', 'other'] as const;
export type DeliverableKind = (typeof DELIVERABLE_KINDS)[number];

export function isDeliverableKind(v: unknown): v is DeliverableKind {
  return typeof v === 'string' && (DELIVERABLE_KINDS as readonly string[]).includes(v);
}
