import { describe, it, expect } from 'vitest';
import { isValidVerificationTransition, type VerificationStatus } from '../service';

describe('verification state machine', () => {
  const cases: Array<[VerificationStatus, VerificationStatus, boolean]> = [
    ['draft', 'pending', true],
    ['draft', 'verified', true],
    ['draft', 'suspended', false],
    ['pending', 'verified', true],
    ['pending', 'draft', true],
    ['pending', 'suspended', false],
    ['verified', 'suspended', true],
    ['verified', 'pending', false],
    ['verified', 'draft', false],
    ['suspended', 'verified', true],
    ['suspended', 'draft', false],
    ['suspended', 'pending', false],
  ];
  for (const [from, to, expected] of cases) {
    it(`${from} → ${to} ${expected ? 'allowed' : 'denied'}`, () => {
      expect(isValidVerificationTransition(from, to)).toBe(expected);
    });
  }
});
