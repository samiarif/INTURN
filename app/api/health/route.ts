import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        component: 'db',
        message: err instanceof Error ? err.message : 'unknown',
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: 'ok',
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    env: process.env.VERCEL_ENV ?? 'local',
    latencyMs: Date.now() - startedAt,
  });
}
