import { NextResponse } from 'next/server';
import { requireSession } from '@/modules/auth/session';
import { draftUnblockerMessage } from '@/modules/ai/intern-unblocker';
import { ratelimit, sweepExpired } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const session = await requireSession();
  if (session.role !== 'intern' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  sweepExpired();
  const rl = ratelimit('ai-intern-unblocker').limit(session.user.id);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: Math.ceil((rl.reset - Date.now()) / 1000) },
      { status: 429, headers: { 'X-RateLimit-Reset': String(Math.floor(rl.reset / 1000)) } },
    );
  }

  let body: { blockerText?: string; taskContext?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.blockerText || body.blockerText.length < 10) {
    return NextResponse.json(
      { error: 'blockerText required (min 10 chars)' },
      { status: 400 },
    );
  }

  try {
    const draft = await draftUnblockerMessage(body.blockerText, body.taskContext ?? '');
    return NextResponse.json({ draft });
  } catch (err) {
    console.error('[ai/intern-unblocker] failed:', err);
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 });
  }
}
