// modules/workspace/utils/task-view-state.test.ts
import { describe, it, expect } from 'vitest';
import { parseFilterParam } from './task-view-state';

describe('parseFilterParam', () => {
  it('parses a single key:value', () => {
    expect(parseFilterParam('dueIn:7d')).toEqual({ dueIn: '7d' });
  });
  it('parses multiple comma-separated pairs', () => {
    expect(parseFilterParam('phase:BA,dueIn:7d')).toEqual({ phase: ['BA'], dueIn: '7d' });
  });
  it('parses multiple phases as a list', () => {
    expect(parseFilterParam('phase:BA,phase:UX')).toEqual({ phase: ['BA', 'UX'] });
  });
  it('parses status filter', () => {
    expect(parseFilterParam('status:todo')).toEqual({ status: 'todo' });
  });
  it('returns empty object for null', () => {
    expect(parseFilterParam(null)).toEqual({});
  });
  it('returns empty object for empty string', () => {
    expect(parseFilterParam('')).toEqual({});
  });
  it('silently drops malformed pairs', () => {
    expect(parseFilterParam('garbage,dueIn:7d')).toEqual({ dueIn: '7d' });
  });
  it('silently drops unknown keys', () => {
    expect(parseFilterParam('badkey:foo,dueIn:7d')).toEqual({ dueIn: '7d' });
  });
});

import { serializeFilterParam } from './task-view-state';

describe('serializeFilterParam', () => {
  it('returns undefined for empty state', () => {
    expect(serializeFilterParam({})).toBeUndefined();
  });
  it('serializes a single key', () => {
    expect(serializeFilterParam({ dueIn: '7d' })).toBe('dueIn:7d');
  });
  it('serializes multiple phases', () => {
    expect(serializeFilterParam({ phase: ['BA', 'UX'] })).toBe('phase:BA,phase:UX');
  });
  it('round-trips with parseFilterParam', () => {
    const state = { phase: ['BA'], dueIn: '7d' as const, status: 'todo' as const };
    const serialized = serializeFilterParam(state);
    expect(serialized).toBeDefined();
    expect(parseFilterParam(serialized!)).toEqual(state);
  });
});
