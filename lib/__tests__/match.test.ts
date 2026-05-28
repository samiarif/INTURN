import { describe, it, expect } from 'vitest';
import { matchScore, intersectingSkills } from '../match';

describe('matchScore', () => {
  it('returns the fraction of listing skills the intern has, 0–100', () => {
    // intern has 2 of the 4 required → 50.
    expect(matchScore(['Figma', 'Typography'], ['Figma', 'Typography', 'Brand', 'Tokens'])).toBe(50);
  });

  it('rounds to the nearest integer', () => {
    // 2 of 3 → 66.67 → 67.
    expect(matchScore(['Figma', 'Typography'], ['Figma', 'Typography', 'Brand'])).toBe(67);
  });

  it('returns 100 when the intern has every required skill', () => {
    expect(matchScore(['Figma', 'Typography'], ['Figma', 'Typography'])).toBe(100);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(matchScore(['  figma  ', 'TYPOGRAPHY'], ['Figma', 'Typography'])).toBe(100);
  });

  it('returns 0 when the intern has no skills', () => {
    expect(matchScore([], ['Figma'])).toBe(0);
    expect(matchScore(null, ['Figma'])).toBe(0);
    expect(matchScore(undefined, ['Figma'])).toBe(0);
  });

  it('returns 0 when the listing has no skills', () => {
    expect(matchScore(['Figma'], [])).toBe(0);
    expect(matchScore(['Figma'], null)).toBe(0);
    expect(matchScore(['Figma'], 'not-an-array')).toBe(0);
  });

  it('counts non-string listing entries in the denominator but never as a match', () => {
    // Denominator is the full listing length (3); only the string "Figma"
    // can match → 1/3 → 33.
    expect(matchScore(['Figma'], ['Figma', 42, null])).toBe(33);
  });
});

describe('intersectingSkills', () => {
  it('returns listing skills the intern has, preserving listing casing', () => {
    const result = intersectingSkills(['figma', 'typography'], ['Figma', 'Typography', 'Brand']);
    expect([...result]).toEqual(['Figma', 'Typography']);
  });

  it('returns an empty set when the intern has no skills', () => {
    expect([...intersectingSkills([], ['Figma'])]).toEqual([]);
    expect([...intersectingSkills(null, ['Figma'])]).toEqual([]);
  });

  it('returns an empty set when the listing is not an array', () => {
    expect([...intersectingSkills(['Figma'], null)]).toEqual([]);
    expect([...intersectingSkills(['Figma'], undefined)]).toEqual([]);
  });

  it('supports computing the "missing" set as listing minus intersection', () => {
    // This is exactly how the marketplace "Why these →" explainer derives
    // the missing-skills chips, so guard it directly.
    const listing = ['Figma', 'Typography', 'Brand systems', 'Design tokens'];
    const have = intersectingSkills(['Figma', 'Typography'], listing);
    const missing = listing.filter((s) => !have.has(s));
    expect([...have]).toEqual(['Figma', 'Typography']);
    expect(missing).toEqual(['Brand systems', 'Design tokens']);
  });
});
