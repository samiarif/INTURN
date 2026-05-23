import { describe, it, expect } from 'vitest';
import { isValidProjectTransition, type ProjectStatus } from '../service';

describe('project state machine', () => {
  it('allows draft → active', () => {
    expect(isValidProjectTransition('draft', 'active')).toBe(true);
  });

  it('allows active → archived', () => {
    expect(isValidProjectTransition('active', 'archived')).toBe(true);
  });

  it('rejects archived → active', () => {
    expect(isValidProjectTransition('archived', 'active')).toBe(false);
  });

  it('rejects draft → archived', () => {
    expect(isValidProjectTransition('draft', 'archived')).toBe(false);
  });

  it('rejects same-state transitions', () => {
    const states: ProjectStatus[] = ['draft', 'active', 'archived'];
    for (const s of states) expect(isValidProjectTransition(s, s)).toBe(false);
  });
});
