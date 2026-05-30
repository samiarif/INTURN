// Pure review status state machine. Domain-neutral — shared by deliverables
// AND academic reports. Safe to import from client (no DB, no I/O).
export type ReviewStatus = 'draft' | 'submitted' | 'approved' | 'revision-requested';

/** Actions a reviewer/submitter can take in the review lifecycle. */
export type ReviewAction = 'submit' | 'approve' | 'request-revision';

const VALID: Record<ReviewStatus, ReviewStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'revision-requested'],
  'revision-requested': ['submitted'],
  approved: [], // terminal
};

/** Map an action to the status it drives the artifact toward. */
const ACTION_TARGET: Record<ReviewAction, ReviewStatus> = {
  submit: 'submitted',
  approve: 'approved',
  'request-revision': 'revision-requested',
};

export function isValidReviewTransition(from: ReviewStatus, to: ReviewStatus): boolean {
  return VALID[from].includes(to);
}

/**
 * Pure resolver for the review lifecycle. Given the current status + version
 * and an action, returns the next status and version. Single source of truth
 * for the transition rules AND the version-increment policy (resubmit after a
 * revision request = a new version); the service layer calls this and then
 * performs the DB write / revision-history bookkeeping around it.
 *
 * Throws on an invalid transition so callers get a consistent error message.
 *
 * Version rule:
 *   - draft → submitted:               version unchanged (first submission)
 *   - revision-requested → submitted:  version + 1 (a genuine resubmission)
 *   - approve / request-revision:      version unchanged (no new artifact)
 */
export function nextReviewState(
  current: { status: ReviewStatus; version: number },
  action: ReviewAction,
): { status: ReviewStatus; version: number } {
  const to = ACTION_TARGET[action];
  if (!isValidReviewTransition(current.status, to)) {
    throw new Error(`Cannot ${action} from status ${current.status}`);
  }

  const isResubmit = action === 'submit' && current.status === 'revision-requested';
  return {
    status: to,
    version: isResubmit ? current.version + 1 : current.version,
  };
}
