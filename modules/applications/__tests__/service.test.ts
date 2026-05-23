import { describe, it, expect } from 'vitest';
import { isValidApplicationTransition, type ApplicationStatus } from '../service';

describe('application state machine', () => {
  const cases: Array<[ApplicationStatus, ApplicationStatus, boolean]> = [
    ['new', 'reviewed', true],
    ['new', 'rejected', true],
    ['new', 'shortlisted', false],
    ['new', 'accepted', false],
    ['reviewed', 'shortlisted', true],
    ['reviewed', 'rejected', true],
    ['reviewed', 'accepted', false],
    ['reviewed', 'new', false],
    ['shortlisted', 'interview', true],
    ['shortlisted', 'accepted', true],
    ['shortlisted', 'rejected', true],
    ['shortlisted', 'reviewed', false],
    ['interview', 'accepted', true],
    ['interview', 'rejected', true],
    ['interview', 'shortlisted', false],
    ['accepted', 'rejected', false],
    ['accepted', 'interview', false],
    ['rejected', 'reviewed', false],
    ['rejected', 'accepted', false],
  ];
  for (const [from, to, expected] of cases) {
    it(`${from} → ${to} ${expected ? 'allowed' : 'denied'}`, () => {
      expect(isValidApplicationTransition(from, to)).toBe(expected);
    });
  }
});
