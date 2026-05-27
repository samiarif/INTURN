/**
 * Lightweight in-memory rate limiter — sliding window per key.
 *
 * This is the v1 fallback while we wait on Upstash provisioning. The shape
 * matches what Upstash Ratelimit exposes, so swapping is a one-file change.
 *
 * Limits (per minute unless noted):
 *   - upload:               20 / 1m  per session.user.id
 *   - clerk-webhook:       120 / 1m  per source IP
 *   - ai-task-clarity:      10 / 1m  per session.user.id
 *   - ai-intern-unblocker:  10 / 1m  per session.user.id
 *   - ai-checkin-draft:      5 / 1h  per session.user.id
 *
 * Tuned for dev + light production; raise once we have real load data.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // unix ms
};

export type LimitName =
  | 'upload'
  | 'clerk-webhook'
  | 'ai-task-clarity'
  | 'ai-intern-unblocker'
  | 'ai-checkin-draft'
  | 'ai-cv-parse';

const LIMITS: Record<LimitName, { max: number; windowMs: number }> = {
  upload: { max: 20, windowMs: 60_000 },
  'clerk-webhook': { max: 120, windowMs: 60_000 },
  'ai-task-clarity': { max: 10, windowMs: 60_000 },
  'ai-intern-unblocker': { max: 10, windowMs: 60_000 },
  'ai-checkin-draft': { max: 5, windowMs: 3_600_000 },
  // CV parsing is expensive (Claude vision) — tight cap.
  'ai-cv-parse': { max: 5, windowMs: 60_000 },
};

export function ratelimit(name: LimitName) {
  const { max, windowMs } = LIMITS[name];
  return {
    limit(key: string): RateLimitResult {
      const now = Date.now();
      const bucketKey = `${name}:${key}`;
      const existing = buckets.get(bucketKey);

      if (!existing || existing.resetAt <= now) {
        const next: Bucket = { count: 1, resetAt: now + windowMs };
        buckets.set(bucketKey, next);
        return { success: true, limit: max, remaining: max - 1, reset: next.resetAt };
      }

      if (existing.count >= max) {
        return { success: false, limit: max, remaining: 0, reset: existing.resetAt };
      }

      existing.count += 1;
      return {
        success: true,
        limit: max,
        remaining: max - existing.count,
        reset: existing.resetAt,
      };
    },
  };
}

/**
 * Background cleanup of expired buckets. Runs at most once per minute when
 * any limit is checked. Keeps the Map from growing unboundedly when
 * many distinct keys hit infrequent endpoints.
 */
let lastSweep = 0;
export function sweepExpired(): void {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}
