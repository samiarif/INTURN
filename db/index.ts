import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { requireEnv } from '@/lib/env';
import * as schema from './schema';

// Neon HTTP is fetch-based, so it inherits whatever network flakiness
// the host network has. Two failure modes we see in dev:
//
//   1. Cold start — Neon compute spun down → first request `fetch failed`
//      after ~200ms while the connection RSTs.
//   2. Parallel fan-out — a dashboard that fires 5+ queries via
//      Promise.all sometimes has 1-2 fail with `fetch failed` even when
//      the rest succeed. Likely Neon HTTP front-end coalescing or
//      cellular/Wi-Fi packet loss on Sam's connection.
//
// Retry transparently on network-level failures (TypeError from fetch),
// with jittered backoff so parallel fan-out doesn't all retry at the
// same instant. We do NOT retry on HTTP 4xx/5xx or query errors —
// those mean the request reached the DB and got a real response.
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 150;
// Per-attempt timeout. A healthy Neon HTTP query answers in <1s (even a
// cold compute wake is a few seconds). A *stale* connection — the long-
// running dev server's biggest failure mode — instead HANGS until the OS
// TCP timeout (~30-60s) before fetch finally throws. That hang, multiplied
// by the retry loop, is what produced the ~54s "wedge" where every query
// stalled. Aborting each attempt at 10s cleanly separates the two: healthy
// queries never hit it; a stale connection fails fast and the next attempt
// re-resolves DNS (ipv4first) and opens a fresh connection that succeeds
// immediately. 10s is safe in prod too — no healthy query takes that long.
const PER_ATTEMPT_TIMEOUT_MS = 10_000;

const retryingFetch: typeof fetch = async (input, init) => {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const timeout = AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS);
    // Respect a caller-provided signal: abort if EITHER it or our timeout fires.
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    try {
      return await fetch(input, { ...init, signal });
    } catch (err) {
      lastErr = err;
      // If the CALLER's own signal aborted (not our timeout), honor it — don't retry.
      if (init?.signal?.aborted) throw err;
      // Retry on network errors (TypeError) and our per-attempt timeout
      // (TimeoutError / AbortError). Anything else is a real error — rethrow.
      const name = err instanceof Error ? err.name : '';
      const retryable =
        err instanceof TypeError || name === 'TimeoutError' || name === 'AbortError';
      if (!retryable) throw err;
      if (attempt < MAX_RETRIES - 1) {
        // Exponential backoff with jitter: 150, 300, 600ms (± 50%).
        const base = BASE_BACKOFF_MS * Math.pow(2, attempt);
        const jitter = base * (0.5 + Math.random());
        await new Promise((r) => setTimeout(r, jitter));
      }
    }
  }
  throw lastErr;
};

neonConfig.fetchFunction = retryingFetch;

const sql = neon(requireEnv('DATABASE_URL'));

export const db = drizzle({ client: sql, schema });
