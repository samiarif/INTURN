import { describe, it, expect } from 'vitest';
import { internshipFormSchema } from '../validators';

const valid = {
  title: 'Visual designer — Brand audit',
  description: 'Lead visual exploration for the brand refresh. Twenty char minimum.',
  sector: 'Design',
  skills: ['Figma', 'Brand'],
  duration: 12,
  locationType: 'hybrid' as const,
  location: 'Tunis',
  isPaid: true,
  compensation: '800 TND / mo',
  internCount: 1,
  language: 'fr' as const,
  deadline: '2026-06-30',
  customQuestions: [
    { question: 'Why this internship?', required: true },
    { question: 'Portfolio link?', required: false },
  ],
};

describe('internshipFormSchema', () => {
  it('accepts a valid internship', () => {
    expect(internshipFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(internshipFormSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
  });

  it('rejects description shorter than 20 chars', () => {
    expect(internshipFormSchema.safeParse({ ...valid, description: 'too short' }).success).toBe(false);
  });

  it('rejects duration > 52', () => {
    expect(internshipFormSchema.safeParse({ ...valid, duration: 53 }).success).toBe(false);
  });

  it('rejects duration < 4', () => {
    expect(internshipFormSchema.safeParse({ ...valid, duration: 3 }).success).toBe(false);
  });

  it('rejects internCount > 10', () => {
    expect(internshipFormSchema.safeParse({ ...valid, internCount: 11 }).success).toBe(false);
  });

  it('requires location when locationType is hybrid', () => {
    expect(
      internshipFormSchema.safeParse({ ...valid, locationType: 'hybrid', location: '' }).success,
    ).toBe(false);
  });

  it('requires location when locationType is on-site', () => {
    expect(
      internshipFormSchema.safeParse({ ...valid, locationType: 'on-site', location: '' }).success,
    ).toBe(false);
  });

  it('allows empty location when locationType is virtual', () => {
    expect(
      internshipFormSchema.safeParse({ ...valid, locationType: 'virtual', location: '' }).success,
    ).toBe(true);
  });

  it('rejects more than 12 skills', () => {
    expect(
      internshipFormSchema.safeParse({
        ...valid,
        skills: Array.from({ length: 13 }, (_, i) => `s${i}`),
      }).success,
    ).toBe(false);
  });

  it('rejects more than 8 custom questions', () => {
    expect(
      internshipFormSchema.safeParse({
        ...valid,
        customQuestions: Array.from({ length: 9 }, (_, i) => ({ question: `q${i}`, required: false })),
      }).success,
    ).toBe(false);
  });

  // Sprint 3 wireframe: deliverables (optional, min 3 enforced in UI, max 10).
  it('accepts up to 10 deliverables', () => {
    const deliverables = Array.from({ length: 10 }, (_, i) => ({
      name: `D${i + 1}`,
      dueWeek: i + 1,
    }));
    expect(internshipFormSchema.safeParse({ ...valid, deliverables }).success).toBe(true);
  });

  it('rejects more than 10 deliverables', () => {
    const deliverables = Array.from({ length: 11 }, (_, i) => ({
      name: `D${i + 1}`,
      dueWeek: i + 1,
    }));
    expect(internshipFormSchema.safeParse({ ...valid, deliverables }).success).toBe(false);
  });

  it('accepts an empty deliverables array (draft autosave)', () => {
    expect(internshipFormSchema.safeParse({ ...valid, deliverables: [] }).success).toBe(true);
  });
});
