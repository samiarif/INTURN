// Pure deliverable status state machine. Safe to import from client.
export type DeliverableStatus = 'draft' | 'submitted' | 'approved' | 'revision-requested';

const VALID: Record<DeliverableStatus, DeliverableStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'revision-requested'],
  'revision-requested': ['submitted'],
  approved: [], // terminal
};

export function isValidDeliverableTransition(
  from: DeliverableStatus,
  to: DeliverableStatus,
): boolean {
  return VALID[from].includes(to);
}
