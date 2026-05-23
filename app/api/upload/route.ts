import { auth, clerkClient } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireEnv } from '@/lib/env';

const ALLOWED_KINDS = ['cv', 'logo', 'deliverable', 'registry'] as const;
type Kind = (typeof ALLOWED_KINDS)[number];

function isKind(value: string | null): value is Kind {
  return ALLOWED_KINDS.includes(value as Kind);
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_ROLES_BY_KIND: Record<Kind, ReadonlyArray<'intern' | 'company' | 'admin'>> = {
  cv: ['intern', 'admin'],
  logo: ['company', 'admin'],
  registry: ['company', 'admin'],
  deliverable: ['intern', 'company', 'admin'],
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  if (!isKind(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined;
  if (!role || !ALLOWED_ROLES_BY_KIND[kind].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
  }

  requireEnv('BLOB_READ_WRITE_TOKEN');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${kind}/${userId}/${safeName}`;

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
