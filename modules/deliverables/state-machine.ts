// Pure deliverable status state machine. Safe to import from client.
export type DeliverableStatus = 'draft' | 'submitted' | 'approved' | 'revision-requested';

/** Actions a reviewer/intern can take on a deliverable. */
export type DeliverableAction = 'submit' | 'approve' | 'request-revision';

const VALID: Record<DeliverableStatus, DeliverableStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'revision-requested'],
  'revision-requested': ['submitted'],
  approved: [], // terminal
};

/** Map an action to the status it drives the deliverable toward. */
const ACTION_TARGET: Record<DeliverableAction, DeliverableStatus> = {
  submit: 'submitted',
  approve: 'approved',
  'request-revision': 'revision-requested',
};

export function isValidDeliverableTransition(
  from: DeliverableStatus,
  to: DeliverableStatus,
): boolean {
  return VALID[from].includes(to);
}

/**
 * Pure resolver for the deliverable lifecycle. Given the current status +
 * version and an action, returns the next status and version. This is the
 * single source of truth for the transition rules AND the version-increment
 * policy (resubmit after a revision request = a new version); the service
 * layer (`submitDeliverable` etc.) calls this and then performs the DB write /
 * revision-history bookkeeping around it.
 *
 * Throws on an invalid transition so callers get a consistent error message.
 *
 * Version rule:
 *   - draft → submitted:               version unchanged (first submission)
 *   - revision-requested → submitted:  version + 1 (a genuine resubmission)
 *   - approve / request-revision:      version unchanged (no new artifact)
 */
export function nextDeliverableState(
  current: { status: DeliverableStatus; version: number },
  action: DeliverableAction,
): { status: DeliverableStatus; version: number } {
  const to = ACTION_TARGET[action];
  if (!isValidDeliverableTransition(current.status, to)) {
    throw new Error(`Cannot ${action} from status ${current.status}`);
  }

  const isResubmit = action === 'submit' && current.status === 'revision-requested';
  return {
    status: to,
    version: isResubmit ? current.version + 1 : current.version,
  };
}
