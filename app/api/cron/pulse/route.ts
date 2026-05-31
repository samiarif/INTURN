import { NextResponse } from 'next/server';
import { runPulseSweep } from '@/modules/pulse/notify';

/**
 * Weekly Pulse sweep — notifies supervisors of interns at attention/at-risk.
 * Scheduled via `vercel.json` crons. Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the project
 * env; we require it. Fail-closed in production if the secret is missing; open
 * in dev so it can be triggered by hand.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }

  const result = await runPulseSweep();
  return NextResponse.json({ ok: true, ...result });
}
