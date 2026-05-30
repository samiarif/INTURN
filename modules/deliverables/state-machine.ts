// The deliverable lifecycle is the shared review lifecycle. This module keeps
// the deliverable-named API as thin aliases over modules/review/state-machine
// so existing importers are untouched; the rules live in one place now.
import {
  isValidReviewTransition,
  nextReviewState,
  type ReviewStatus,
  type ReviewAction,
} from '@/modules/review/state-machine';

export type DeliverableStatus = ReviewStatus;
export type DeliverableAction = ReviewAction;

export function isValidDeliverableTransition(
  from: DeliverableStatus,
  to: DeliverableStatus,
): boolean {
  return isValidReviewTransition(from, to);
}

export function nextDeliverableState(
  current: { status: DeliverableStatus; version: number },
  action: DeliverableAction,
): { status: DeliverableStatus; version: number } {
  return nextReviewState(current, action);
}
