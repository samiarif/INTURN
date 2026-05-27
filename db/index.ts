import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { requireEnv } from '@/lib/env';
import * as schema from './schema';

// Neon serverless has a "cold start" — when the compute spins down after
// a few minutes of inactivity, the first request can fail with
// `TypeError: fetch failed` while the compute wakes up. Subsequent
// requests succeed in <300ms. We retry network errors transparently so
// pages don't 500 just because the dev hadn't refreshed in a while.
//
// We only retry on network-level failures (no response from server),
// which means we know the request never reached the DB — safe to retry
// even for writes. We do NOT retry on HTTP errors or query errors.
const MAX_RETRIES = 3;
const BACKOFF_MS = [200, 600, 1500];

const defaultFetch: typeof fetch = (...args) => fetch(...args);

const retryingFetch: typeof fetch = async (...args) => {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await defaultFetch(...args);
    } catch (err) {
      lastErr = err;
      // Only retry network errors — fetch throws TypeError for these.
      // Anything else (AbortError, etc.) we let through.
      if (!(err instanceof TypeError)) throw err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
      }
    }
  }
  throw lastErr;
};

neonConfig.fetchFunction = retryingFetch;

const sql = neon(requireEnv('DATABASE_URL'));

export const db = drizzle({ client: sql, schema });
