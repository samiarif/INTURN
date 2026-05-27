import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatTimeAgo,
  formatDateShort,
  formatDateLong,
  hoursSince,
} from '../format-time';

describe('formatTimeAgo', () => {
  beforeEach(() => {
    // Pin "now" to 2026-05-15 12:00:00 UTC so the relative buckets are
    // deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns "just now" for the current instant', () => {
    expect(formatTimeAgo(new Date('2026-05-15T12:00:00Z'), 'en')).toBe('just now');
    expect(formatTimeAgo(new Date('2026-05-15T12:00:00Z'), 'fr')).toBe('à l’instant');
  });

  it('returns minutes for <1h ago', () => {
    expect(formatTimeAgo(new Date('2026-05-15T11:55:00Z'), 'en')).toBe('5m ago');
    expect(formatTimeAgo(new Date('2026-05-15T11:55:00Z'), 'fr')).toBe('il y a 5 min');
  });

  it('returns hours for <24h ago', () => {
    expect(formatTimeAgo(new Date('2026-05-15T09:00:00Z'), 'en')).toBe('3h ago');
    expect(formatTimeAgo(new Date('2026-05-15T09:00:00Z'), 'fr')).toBe('il y a 3 h');
  });

  it('returns days for <7d ago', () => {
    expect(formatTimeAgo(new Date('2026-05-12T12:00:00Z'), 'en')).toBe('3d ago');
    expect(formatTimeAgo(new Date('2026-05-12T12:00:00Z'), 'fr')).toBe('il y a 3 j');
  });

  it('falls back to short date for >7d ago', () => {
    // 2026-04-15 → "15 Apr" / "15 avr."
    const ago = formatTimeAgo(new Date('2026-04-15T12:00:00Z'), 'en');
    expect(ago).toMatch(/Apr/);
  });

  it('returns "just now" for future dates (safety)', () => {
    expect(formatTimeAgo(new Date('2026-06-01T12:00:00Z'), 'en')).toBe('just now');
  });

  it('returns "—" for invalid dates', () => {
    expect(formatTimeAgo('not a date', 'en')).toBe('—');
  });
});

describe('formatDateShort', () => {
  it('returns "—" for null', () => {
    expect(formatDateShort(null)).toBe('—');
  });
  it('renders day + month (ordering depends on locale)', () => {
    const en = formatDateShort(new Date('2026-04-15T12:00:00Z'), 'en');
    expect(en).toContain('15');
    expect(en).toMatch(/Apr/i);
    const fr = formatDateShort(new Date('2026-04-15T12:00:00Z'), 'fr');
    expect(fr).toContain('15');
    expect(fr).toMatch(/avr/i);
  });
});

describe('formatDateLong', () => {
  it('returns "—" for null', () => {
    expect(formatDateLong(null)).toBe('—');
  });
  it('includes the year', () => {
    expect(formatDateLong(new Date('2026-04-15T12:00:00Z'), 'en')).toMatch(/2026/);
  });
});

describe('hoursSince', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('floors the result', () => {
    expect(hoursSince(new Date('2026-05-15T08:59:00Z'))).toBe(3);
  });
  it('returns 0 for invalid input', () => {
    expect(hoursSince('invalid')).toBe(0);
  });
});
