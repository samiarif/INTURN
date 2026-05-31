import { describe, it, expect } from 'vitest';
import { ratelimit } from '../ratelimit';

describe('ratelimit', () => {
  it('allows requests under the limit', () => {
    const rl = ratelimit('ai-task-clarity'); // 10/min
    for (let i = 0; i < 10; i++) {
      const r = rl.limit('user-a');
      expect(r.success).toBe(true);
    }
  });

  it('rejects when limit exceeded', () => {
    const rl = ratelimit('ai-task-clarity');
    for (let i = 0; i < 10; i++) rl.limit('user-b');
    const r11 = rl.limit('user-b');
    expect(r11.success).toBe(false);
    expect(r11.remaining).toBe(0);
  });

  it('separates buckets by key', () => {
    const rl = ratelimit('ai-task-clarity');
    for (let i = 0; i < 10; i++) rl.limit('user-c');
    // separate user is unaffected
    expect(rl.limit('user-d').success).toBe(true);
  });

  it('returns descending remaining', () => {
    const rl = ratelimit('upload'); // 20/min
    const r1 = rl.limit('user-e');
    const r2 = rl.limit('user-e');
    expect(r1.remaining).toBe(19);
    expect(r2.remaining).toBe(18);
  });
});

describe('ai-feedback-draft bucket', () => {
  it('allows the first call and is keyed by name+key', () => {
    const r = ratelimit('ai-feedback-draft').limit('user-feedback-1');
    expect(r.success).toBe(true);
    expect(r.limit).toBe(20);
    expect(r.remaining).toBe(19);
  });
});
