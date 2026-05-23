'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getProfileByUserId, getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectById } from '@/modules/projects/queries';
import { applyFormSchema } from './validators';
import {
  acceptApplication,
  createApplication,
  transitionApplicationStatus,
  updateInternalNotes,
  type ApplicationStatus,
} from './service';

async function requireUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');
  return user;
}

async function assertProjectSupervisor(projectId: string, userId: string) {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  if (!project.supervisorIds?.includes(userId)) {
    throw new Error('Forbidden');
  }
  return project;
}

export async function applyToInternshipAction(internshipId: string, formData: FormData) {
  const user = await requireUser();
  const profile = await getProfileByUserId(user.id);
  if (!profile || profile.profileStep !== 'complete') {
    redirect('/onboarding/intern/basics');
  }

  let customAnswers: unknown;
  try {
    customAnswers = JSON.parse(String(formData.get('customAnswers') ?? '[]'));
  } catch {
    throw new Error('Invalid form data');
  }

  const parsed = applyFormSchema.parse({
    coverNote: formData.get('coverNote') || undefined,
    customAnswers,
  });

  const created = await createApplication({
    internshipId,
    applicantId: user.id,
    coverNote: parsed.coverNote,
    customAnswers: parsed.customAnswers,
    actorId: user.id,
  });

  redirect(`/intern/applications/${created.id}`);
}

export async function transitionApplicationStatusAction(input: {
  applicationId: string;
  projectId: string;
  to: ApplicationStatus;
}) {
  const user = await requireUser();
  await assertProjectSupervisor(input.projectId, user.id);
  await transitionApplicationStatus({
    applicationId: input.applicationId,
    to: input.to,
    actorId: user.id,
  });
}

export async function updateInternalNotesAction(input: {
  applicationId: string;
  projectId: string;
  notes: string;
}) {
  const user = await requireUser();
  await assertProjectSupervisor(input.projectId, user.id);
  await updateInternalNotes({
    applicationId: input.applicationId,
    notes: input.notes,
  });
}

export async function acceptApplicationAction(input: {
  applicationId: string;
  projectId: string;
}) {
  const user = await requireUser();
  await assertProjectSupervisor(input.projectId, user.id);
  const result = await acceptApplication({
    applicationId: input.applicationId,
    actorId: user.id,
  });
  redirect(`/company/workspaces/${result.workspace.id}`);
}
