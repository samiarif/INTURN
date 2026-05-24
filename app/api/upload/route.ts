import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireEnv } from '@/lib/env';
import { getSession } from '@/modules/auth/session';
import type { Role } from '@/modules/auth/types';
import { ALLOWED_KINDS, validateUpload, type Kind } from '@/lib/uploads/allowlist';

function isKind(value: string | null): value is Kind {
  return ALLOWED_KINDS.includes(value as Kind);
}

const ALLOWED_ROLES_BY_KIND: Record<Kind, ReadonlyArray<Role>> = {
  cv: ['intern', 'admin'],
  logo: ['company', 'admin'],
  registry: ['company', 'admin'],
  deliverable: ['intern', 'company', 'admin'],
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  if (!isKind(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  if (!ALLOWED_ROLES_BY_KIND[kind].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  const validation = await validateUpload(kind, file);
  if (!validation.ok) {
    const status = validation.code === 'too_large' ? 413 : 400;
    return NextResponse.json({ error: validation.code }, { status });
  }

  requireEnv('BLOB_READ_WRITE_TOKEN');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${kind}/${session.clerkId}/${safeName}`;

  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: true,
  });

  return NextResponse.json({
    url: blob.url,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
}
