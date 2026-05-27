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
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 150;

const defaultFetch: typeof fetch = (...args) => fetch(...args);

const retryingFetch: typeof fetch = async (...args) => {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await defaultFetch(...args);
    } catch (err) {
      lastErr = err;
      // Only retry network errors — fetch throws TypeError for these.
      if (!(err instanceof TypeError)) throw err;
      if (attempt < MAX_RETRIES - 1) {
        // Exponential backoff with jitter: 150, 300, 600, 1200ms (± 50%)
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
