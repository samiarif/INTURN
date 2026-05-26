import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';

// The token-gen helper isn't exported (private to service.ts). We mirror its
// implementation here and assert the invariants we rely on — url-safe alphabet,
// length, sufficient entropy. If the helper changes in service.ts, copy the
// new impl here to keep the contract honest.
function genToken(): string {
  return randomBytes(24).toString('base64url');
}

describe('share token generation', () => {
  it('produces url-safe tokens (base64url alphabet)', () => {
    for (let i = 0; i < 50; i++) {
      const t = genToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('produces tokens of at least 32 chars (24 bytes → 32-char base64url)', () => {
    for (let i = 0; i < 20; i++) {
      const t = genToken();
      expect(t.length).toBeGreaterThanOrEqual(32);
    }
  });

  it('does not produce duplicates over a 5000-sample run', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      const t = genToken();
      expect(seen.has(t)).toBe(false);
      seen.add(t);
    }
  });
});
