import { describe, it, expect } from 'vitest';

/**
 * The audit service inserts a row and swallows errors. The "best-effort"
 * contract is the important part — admin actions must not roll back if
 * the audit write fails. We document that here as an invariant.
 */
describe('audit service contract', () => {
  it('append-only semantics: no update/delete entry points exist', async () => {
    const mod = await import('../service');
    const exported = Object.keys(mod);
    expect(exported).toContain('recordAuditLog');
    // No "update" or "delete" should be exported — log entries are immutable.
    expect(exported.some((k) => /update|delete/i.test(k))).toBe(false);
  });

  it('queries module exposes only read functions', async () => {
    const mod = await import('../queries');
    const exported = Object.keys(mod);
    expect(exported).toContain('listRecentAuditLogs');
    expect(exported.some((k) => /insert|update|delete/i.test(k))).toBe(false);
  });
});
