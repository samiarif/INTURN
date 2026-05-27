import { auth } from '@/lib/server-auth';
import { clerkClient } from '@clerk/nextjs/server';
import { selectRole } from '@/modules/auth/role-selection';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { role } = body;

  if (!role || typeof role !== 'string') {
    return NextResponse.json({ error: 'Role is required' }, { status: 400 });
  }

  const result = await selectRole(userId, role);

  if (!result.success) {
    const status = result.error === 'User not found' ? 404 : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role: result.role },
  });

  return NextResponse.json({ role: result.role });
}
