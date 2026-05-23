'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectById } from '@/modules/projects/queries';
import { createInternship, publishInternship } from './service';
import { internshipFormSchema } from './validators';

export async function createInternshipAction(projectId: string, formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  if (!project.supervisorIds?.includes(user.id)) {
    throw new Error('Only project supervisors can post internships');
  }

  let skills: unknown;
  let customQuestions: unknown;
  try {
    skills = JSON.parse(String(formData.get('skills') ?? '[]'));
    customQuestions = JSON.parse(String(formData.get('customQuestions') ?? '[]'));
  } catch {
    throw new Error('Invalid form data');
  }

  const parsed = internshipFormSchema.parse({
    title: formData.get('title'),
    description: formData.get('description'),
    sector: formData.get('sector'),
    skills,
    duration: Number(formData.get('duration')),
    locationType: formData.get('locationType'),
    location: formData.get('location') ?? '',
    isPaid: formData.get('isPaid') === 'true',
    compensation: formData.get('compensation') || undefined,
    internCount: Number(formData.get('internCount')) || 1,
    language: formData.get('language'),
    deadline: formData.get('deadline'),
    customQuestions,
  });

  await createInternship({
    projectId,
    organizationId: project.organizationId,
    data: parsed,
    actorId: user.id,
  });

  redirect(`/company/projects/${projectId}`);
}

export async function publishInternshipAction(internshipId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  await publishInternship({ internshipId, actorId: user.id });
}
