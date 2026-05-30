import { describe, it, expect } from 'vitest';
import {
  isValidReviewTransition,
  nextReviewState,
  type ReviewStatus,
  type ReviewAction,
} from '../state-machine';

// ---------------------------------------------------------------------------
// Pure transition matrix (no DB, no mocks). The review lifecycle (shared by
// deliverables AND academic reports) is:
//   draft → submitted → (approved | revision-requested)
//   revision-requested → submitted  (resubmission, bumps version)
//   approved is terminal.
// ---------------------------------------------------------------------------
describe('isValidReviewTransition', () => {
  const cases: Array<[ReviewStatus, ReviewStatus, boolean]> = [
    // from draft
    ['draft', 'submitted', true],
    ['draft', 'approved', false],
    ['draft', 'revision-requested', false],
    ['draft', 'draft', false],
    // from submitted
    ['submitted', 'approved', true],
    ['submitted', 'revision-requested', true],
    ['submitted', 'submitted', false],
    ['submitted', 'draft', false],
    // from revision-requested
    ['revision-requested', 'submitted', true],
    ['revision-requested', 'approved', false],
    ['revision-requested', 'draft', false],
    ['revision-requested', 'revision-requested', false],
    // from approved (terminal — nothing allowed)
    ['approved', 'submitted', false],
    ['approved', 'revision-requested', false],
    ['approved', 'draft', false],
    ['approved', 'approved', false],
  ];

  for (const [from, to, expected] of cases) {
    it(`${from} → ${to} ${expected ? 'allowed' : 'denied'}`, () => {
      expect(isValidReviewTransition(from, to)).toBe(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// nextReviewState — the pure resolver the service layer delegates to.
// It owns BOTH the transition guard and the version-increment policy.
// ---------------------------------------------------------------------------
describe('nextReviewState — valid actions', () => {
  it('draft + submit → submitted, version unchanged (first submission)', () => {
    expect(nextReviewState({ status: 'draft', version: 1 }, 'submit')).toEqual({
      status: 'submitted',
      version: 1,
    });
  });

  it('submitted + approve → approved, version unchanged', () => {
    expect(nextReviewState({ status: 'submitted', version: 1 }, 'approve')).toEqual({
      status: 'approved',
      version: 1,
    });
  });

  it('submitted + request-revision → revision-requested, version unchanged', () => {
    expect(
      nextReviewState({ status: 'submitted', version: 1 }, 'request-revision'),
    ).toEqual({ status: 'revision-requested', version: 1 });
  });

  it('revision-requested + submit → submitted, version INCREMENTED (resubmission)', () => {
    expect(
      nextReviewState({ status: 'revision-requested', version: 1 }, 'submit'),
    ).toEqual({ status: 'submitted', version: 2 });
  });

  it('version increment compounds across multiple revision cycles', () => {
    // v1 submitted → changes → resubmit (v2) → changes → resubmit (v3)
    let state = { status: 'revision-requested' as ReviewStatus, version: 2 };
    const after = nextReviewState(state, 'submit');
    expect(after).toEqual({ status: 'submitted', version: 3 });

    // approving the resubmitted version keeps that version number
    state = { status: 'submitted', version: after.version };
    expect(nextReviewState(state, 'approve')).toEqual({ status: 'approved', version: 3 });
  });
});

describe('nextReviewState — invalid actions throw', () => {
  const invalid: Array<[ReviewStatus, ReviewAction]> = [
    ['draft', 'approve'],
    ['draft', 'request-revision'],
    ['submitted', 'submit'],
    ['revision-requested', 'approve'],
    ['revision-requested', 'request-revision'],
    ['approved', 'submit'],
    ['approved', 'approve'],
    ['approved', 'request-revision'],
  ];

  for (const [status, action] of invalid) {
    it(`${action} from ${status} throws`, () => {
      expect(() => nextReviewState({ status, version: 1 }, action)).toThrow(
        `Cannot ${action} from status ${status}`,
      );
    });
  }

  it('does not mutate the input state object', () => {
    const input = { status: 'revision-requested' as ReviewStatus, version: 4 };
    nextReviewState(input, 'submit');
    expect(input).toEqual({ status: 'revision-requested', version: 4 });
  });
});
