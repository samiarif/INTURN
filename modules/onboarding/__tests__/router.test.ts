import { describe, it, expect } from 'vitest';
import { nextInternStep } from '../router';

describe('nextInternStep', () => {
  it('null profile → basics', () => {
    expect(nextInternStep(null)).toBe('/onboarding/intern/basics');
  });

  it('profile with no university → basics', () => {
    expect(
      nextInternStep({ university: null, skills: [], profileStep: 'none' } as never),
    ).toBe('/onboarding/intern/basics');
  });

  it('university set, no skills → skills', () => {
    expect(
      nextInternStep({
        university: 'ESPRIT',
        skills: [],
        profileStep: 'basics-done',
      } as never),
    ).toBe('/onboarding/intern/skills');
  });

  it('university set, 2 skills → skills', () => {
    expect(
      nextInternStep({
        university: 'ESPRIT',
        skills: ['React', 'Figma'],
        profileStep: 'basics-done',
      } as never),
    ).toBe('/onboarding/intern/skills');
  });

  it('university set, 3 skills → done', () => {
    expect(
      nextInternStep({
        university: 'ESPRIT',
        skills: ['React', 'Figma', 'TS'],
        profileStep: 'complete',
      } as never),
    ).toBe('/onboarding/intern/done');
  });
});
