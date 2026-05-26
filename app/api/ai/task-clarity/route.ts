import { NextResponse } from 'next/server';
import { requireSession } from '@/modules/auth/session';
import { suggestTaskClarity, type TaskClarityInput } from '@/modules/ai/task-clarity';
import { ratelimit, sweepExpired } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const session = await requireSession();
  if (session.role !== 'company' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  sweepExpired();
  const rl = ratelimit('ai-task-clarity').limit(session.user.id);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: Math.ceil((rl.reset - Date.now()) / 1000) },
      { status: 429, headers: { 'X-RateLimit-Reset': String(Math.floor(rl.reset / 1000)) } },
    );
  }

  let body: TaskClarityInput;
  try {
    body = (await req.json()) as TaskClarityInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title || body.title.length < 3) {
    return NextResponse.json({ error: 'Title required (min 3 chars)' }, { status: 400 });
  }

  try {
    const result = await suggestTaskClarity(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[ai/task-clarity] failed:', err);
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 });
  }
}
