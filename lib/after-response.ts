import { after } from 'next/server';

/**
 * Run side-effect work after the HTTP response is sent. On Vercel a bare
 * floating promise can be frozen mid-flight the moment the response streams
 * out — `after()` keeps the function alive until the callback settles.
 * Outside a request scope (unit tests, seed/maintenance scripts) `after()`
 * throws synchronously; fall back to firing the promise directly so callers
 * behave identically everywhere.
 */
export function afterResponse(work: () => Promise<unknown>): void {
  try {
    after(work);
  } catch {
    void work();
  }
}
