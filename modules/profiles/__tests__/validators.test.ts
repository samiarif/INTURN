import { describe, it, expect } from 'vitest';
import {
  profileBasicsSchema,
  profileSkillsSchema,
  companyProfileSchema,
  ROLE_CATEGORIES,
} from '../validators';

describe('profileBasicsSchema', () => {
  const valid = {
    firstName: 'Yasmine',
    lastName: 'Ben Salah',
    university: 'enit',
    yearOfStudy: 'L3',
    fieldOfStudy: 'Computer Science',
    city: 'Tunis',
    preferredLanguage: 'fr',
  };

  it('accepts a valid profile', () => {
    expect(profileBasicsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing first name', () => {
    expect(profileBasicsSchema.safeParse({ ...valid, firstName: '' }).success).toBe(false);
  });

  it('rejects invalid preferredLanguage', () => {
    expect(profileBasicsSchema.safeParse({ ...valid, preferredLanguage: 'ar' }).success).toBe(false);
  });
});

describe('profileSkillsSchema', () => {
  const valid = {
    skills: ['React', 'TypeScript', 'Figma'],
    roles: ['Design'],
    portfolioLinks: [],
  };

  it('accepts 3 skills and 1 role', () => {
    expect(profileSkillsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects fewer than 3 skills', () => {
    expect(profileSkillsSchema.safeParse({ ...valid, skills: ['React', 'TS'] }).success).toBe(false);
  });

  it('rejects more than 8 skills', () => {
    const tooMany = Array.from({ length: 9 }, (_, i) => `s${i}`);
    expect(profileSkillsSchema.safeParse({ ...valid, skills: tooMany }).success).toBe(false);
  });

  it('rejects more than 3 roles', () => {
    expect(
      profileSkillsSchema.safeParse({
        ...valid,
        roles: ['Design', 'Product', 'Engineering', 'Marketing'],
      }).success,
    ).toBe(false);
  });

  it('rejects role not in fixed list', () => {
    expect(profileSkillsSchema.safeParse({ ...valid, roles: ['Other'] }).success).toBe(false);
  });

  it('rejects malformed portfolio URL', () => {
    expect(
      profileSkillsSchema.safeParse({
        ...valid,
        portfolioLinks: [{ platform: 'GitHub', url: 'not-a-url' }],
      }).success,
    ).toBe(false);
  });

  it('exposes 9 fixed role categories', () => {
    expect(ROLE_CATEGORIES).toHaveLength(9);
  });
});

describe('companyProfileSchema', () => {
  const valid = {
    name: 'Acme Studio',
    industry: 'Design & creative',
    size: '11-50',
    country: 'Tunisia',
    city: 'Tunis',
    description: 'We design brands and digital products.',
    website: 'https://acme.tn',
  };

  it('accepts a valid company', () => {
    expect(companyProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects description over 280 chars', () => {
    const long = 'x'.repeat(281);
    expect(companyProfileSchema.safeParse({ ...valid, description: long }).success).toBe(false);
  });

  it('rejects invalid website URL', () => {
    expect(companyProfileSchema.safeParse({ ...valid, website: 'not a url' }).success).toBe(false);
  });

  it('accepts empty string for website (optional)', () => {
    expect(companyProfileSchema.safeParse({ ...valid, website: '' }).success).toBe(true);
  });
});
