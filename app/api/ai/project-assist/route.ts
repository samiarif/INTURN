import { NextResponse } from 'next/server';
import { requireSession } from '@/modules/auth/session';
import { ratelimit, sweepExpired } from '@/lib/ratelimit';
import {
  reformulateDescription,
  suggestGoals,
  draftPhases,
  suggestDeliverables,
  suggestQuestions,
} from '@/modules/ai/project-assist';

/** Bad client input — distinct from an AI failure so we can return 400 vs 502. */
class BadRequestError extends Error {}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter((s) => s.length > 0) : [];
}
function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * One endpoint, many assists — dispatch on `kind`. Each branch validates the
 * fields its module function needs and throws BadRequestError on bad input;
 * the module clamps the *output* to the form's limits.
 */
async function runAssist(body: Record<string, unknown>): Promise<unknown> {
  switch (body.kind) {
    case 'reformulate': {
      const text = str(body.text);
      if (text.length < 10) throw new BadRequestError('text_too_short');
      return reformulateDescription({ text });
    }
    case 'goals': {
      const name = str(body.name);
      if (!name) throw new BadRequestError('name_required');
      return suggestGoals({ name, brief: str(body.brief) || undefined, duration: num(body.duration) });
    }
    case 'phases': {
      const name = str(body.name);
      if (!name) throw new BadRequestError('name_required');
      const duration = num(body.duration) ?? 12;
      return draftPhases({ name, brief: str(body.brief) || undefined, duration });
    }
    case 'deliverables': {
      const title = str(body.title);
      const description = str(body.description);
      if (!title) throw new BadRequestError('title_required');
      if (!description) throw new BadRequestError('description_required');
      return suggestDeliverables({
        title,
        description,
        skills: strArray(body.skills),
        duration: num(body.duration) ?? 12,
      });
    }
    case 'questions': {
      const title = str(body.title);
      const description = str(body.description);
      if (!title) throw new BadRequestError('title_required');
      return suggestQuestions({ title, description, skills: strArray(body.skills) });
    }
    default:
      throw new BadRequestError('unknown_kind');
  }
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (session.role !== 'company' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  sweepExpired();
  const rl = ratelimit('ai-project-assist').limit(session.user.id);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: Math.ceil((rl.reset - Date.now()) / 1000) },
      { status: 429, headers: { 'X-RateLimit-Reset': String(Math.floor(rl.reset / 1000)) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const result = await runAssist(body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[ai/project-assist] failed:', err);
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 });
  }
}
