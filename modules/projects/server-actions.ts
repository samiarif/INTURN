'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { createDraftProject, transitionProjectStatus } from './service';
import { projectCreateSchema } from './validators';

export async function createProjectAction(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, user.id))
    .limit(1);
  if (!org) {
    redirect('/onboarding/company');
  }
  if (org.verificationStatus !== 'verified') {
    throw new Error('Your organization must be verified before creating projects');
  }

  const parsed = projectCreateSchema.parse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    brief: formData.get('brief') || undefined,
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
  });

  const project = await createDraftProject({
    organizationId: org.id,
    name: parsed.name,
    slug: parsed.slug,
    brief: parsed.brief,
    supervisorIds: [user.id],
    actorId: user.id,
  });

  redirect(`/company/projects/${project.id}`);
}

export async function activateProjectAction(projectId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  await transitionProjectStatus({
    projectId,
    to: 'active',
    actorId: user.id,
  });
}
