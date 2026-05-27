import { NextResponse } from 'next/server';
import { requireActiveSession } from '@/modules/auth/session';
import { parseCv } from '@/modules/ai/cv-parser';
import { ratelimit, sweepExpired } from '@/lib/ratelimit';

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const PDF_MAGIC = Buffer.from('%PDF', 'utf-8');

/**
 * Parse an uploaded CV PDF and return extracted profile fields.
 *
 * Auth: any active session (intern, company, admin — we don't gate the
 * helper by role because companies might use it for their own profile
 * eventually).
 *
 * Rate-limited 5/min/user via the existing in-memory limiter — CV
 * parsing is expensive (Claude vision).
 *
 * Returns: { parsed: CvParseResult } on 200; standard `{ error }` on
 * non-2xx.
 */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireActiveSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  sweepExpired();
  const rl = ratelimit('ai-cv-parse').limit(session.user.id);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: Math.ceil((rl.reset - Date.now()) / 1000) },
      { status: 429, headers: { 'X-RateLimit-Reset': String(Math.floor(rl.reset / 1000)) } },
    );
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // Magic-byte check — guards against renamed files (e.g. .pdf with png content).
  if (!buf.subarray(0, 4).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: 'not_pdf' }, { status: 400 });
  }

  try {
    const parsed = await parseCv(buf.toString('base64'));
    return NextResponse.json({ parsed });
  } catch (err) {
    console.error('[ai/cv-parse] failed:', err);
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 });
  }
}
