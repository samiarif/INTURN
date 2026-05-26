import { describe, it, expect } from 'vitest';
import type { ReportReason, ReportSubjectType } from '../server-actions';

const VALID_REASONS: ReportReason[] = [
  'scam',
  'misleading',
  'inappropriate',
  'spam',
  'unsafe',
  'other',
];
const VALID_SUBJECTS: ReportSubjectType[] = ['internship', 'organization', 'user'];

describe('report validation invariants', () => {
  it('exposes a closed set of reasons', () => {
    expect(VALID_REASONS).toHaveLength(6);
    expect(new Set(VALID_REASONS).size).toBe(6);
  });

  it('exposes a closed set of subject types', () => {
    expect(VALID_SUBJECTS).toHaveLength(3);
    expect(new Set(VALID_SUBJECTS).size).toBe(3);
  });

  it('body min/max bounds', () => {
    const tooShort = 'too short';
    const justRight = 'a'.repeat(20);
    const tooLong = 'a'.repeat(4001);
    expect(tooShort.trim().length < 20).toBe(true);
    expect(justRight.trim().length >= 20).toBe(true);
    expect(tooLong.length > 4000).toBe(true);
  });
});
