import { describe, it, expect } from 'vitest';
import { avatarInitials } from '../avatar';

describe('avatarInitials', () => {
  it('returns first letter of first + last names', () => {
    expect(avatarInitials('Yasmine Ben Salah')).toBe('YB');
    expect(avatarInitials('Sam Daz')).toBe('SD');
  });

  it('handles a single word', () => {
    expect(avatarInitials('Sami')).toBe('S');
  });

  it('handles email by splitting on @ and dots', () => {
    expect(avatarInitials(null, 'mehdi.triki@acmestudio.tn')).toBe('MT');
    expect(avatarInitials(null, 'sami_arif@thog.io')).toBe('SA');
  });

  it('falls back to ? when nothing provided', () => {
    expect(avatarInitials(null)).toBe('?');
    expect(avatarInitials(undefined, undefined)).toBe('?');
    expect(avatarInitials('   ')).toBe('?');
  });

  it('upper-cases letters even when input is lowercase', () => {
    expect(avatarInitials('youssef garbi')).toBe('YG');
  });

  it('caps at 2 letters even with very long names', () => {
    expect(avatarInitials('Mary Sue Ellen Watson')).toBe('MS');
  });
});
