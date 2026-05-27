import { describe, it, expect } from 'vitest';
import { computeProfileCompleteness } from '../service';

const empty = {
  firstName: null,
  lastName: null,
  university: null,
  yearOfStudy: null,
  fieldOfStudy: null,
  city: null,
  skills: null,
  roles: null,
  resumeUrl: null,
  portfolioLinks: null,
};

const full = {
  firstName: 'Yasmine',
  lastName: 'Ben Salah',
  university: 'ENIT',
  yearOfStudy: 'L3',
  fieldOfStudy: 'Computer Science',
  city: 'Tunis',
  skills: ['React', 'TypeScript', 'Figma'],
  roles: ['Design'],
  resumeUrl: 'https://blob.example/cv.pdf',
  portfolioLinks: [{ platform: 'GitHub', url: 'https://github.com/yas' }],
};

describe('computeProfileCompleteness', () => {
  it('returns 0% on an empty profile with everything missing', () => {
    const c = computeProfileCompleteness(empty);
    expect(c.percent).toBe(0);
    expect(c.missing.length).toBe(c.items.length);
  });

  it('returns 100% on a fully filled profile with no missing items', () => {
    const c = computeProfileCompleteness(full);
    expect(c.percent).toBe(100);
    expect(c.missing).toHaveLength(0);
  });

  it('weights sum to 100', () => {
    const c = computeProfileCompleteness(empty);
    expect(c.items.reduce((acc, it) => acc + it.weight, 0)).toBe(100);
  });

  it('counts skills only when there are 3 or more', () => {
    const c2 = computeProfileCompleteness({ ...empty, skills: ['React', 'TS'] });
    expect(c2.items.find((i) => i.key === 'skills')?.done).toBe(false);
    const c3 = computeProfileCompleteness({ ...empty, skills: ['React', 'TS', 'Figma'] });
    expect(c3.items.find((i) => i.key === 'skills')?.done).toBe(true);
  });

  it('counts name only when both first and last are present', () => {
    const onlyFirst = computeProfileCompleteness({ ...empty, firstName: 'Sami' });
    expect(onlyFirst.items.find((i) => i.key === 'name')?.done).toBe(false);
    const both = computeProfileCompleteness({
      ...empty,
      firstName: 'Sami',
      lastName: 'Arif',
    });
    expect(both.items.find((i) => i.key === 'name')?.done).toBe(true);
  });

  it('partial fill returns proportional percent', () => {
    // basics-only profile: name + uni + year + field + city = 15+10+10+10+10 = 55
    const basics = {
      ...empty,
      firstName: 'X',
      lastName: 'Y',
      university: 'ENIT',
      yearOfStudy: 'L3',
      fieldOfStudy: 'CS',
      city: 'Tunis',
    };
    const c = computeProfileCompleteness(basics);
    expect(c.percent).toBe(55);
    expect(c.missing.map((m) => m.key).sort()).toEqual(['cv', 'portfolio', 'roles', 'skills']);
  });
});
