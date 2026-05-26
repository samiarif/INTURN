import { db } from '@/db';
import { auditLogs } from '@/db/schema';

/**
 * Append a new audit-log entry. Best-effort: failures are logged but never
 * thrown — admin actions must not be rolled back just because the audit
 * write failed (those failures are extremely rare on Neon http).
 */
export async function recordAuditLog(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error('[audit] failed to record entry:', err, { input });
  }
}
