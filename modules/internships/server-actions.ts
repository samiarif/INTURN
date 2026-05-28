'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { requireSession, requireActiveSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import {
  createInternship,
  publishInternship,
  setInternshipStatus,
  updateInternship,
} from './service';
import { MARKETPLACE_TAG, getInternshipById } from './queries';
import { internshipFormSchema } from './validators';

export async function createInternshipAction(projectId: string, formData: FormData) {
  const { user } = await requireSession();

  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  if (!project.supervisorIds?.includes(user.id)) {
    throw new Error('Only project supervisors can post internships');
  }

  let skills: unknown;
  let customQuestions: unknown;
  let deliverables: unknown;
  try {
    skills = JSON.parse(String(formData.get('skills') ?? '[]'));
    customQuestions = JSON.parse(String(formData.get('customQuestions') ?? '[]'));
    const deliverablesRaw = formData.get('deliverables');
    deliverables = deliverablesRaw ? JSON.parse(String(deliverablesRaw)) : undefined;
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
    deliverables,
  });

  const created = await createInternship({
    projectId,
    organizationId: project.organizationId,
    data: parsed,
    actorId: user.id,
  });

  const intent = formData.get('intent');
  if (intent === 'publish') {
    let publishBlocked = false;
    try {
      await publishInternship({ internshipId: created.id, actorId: user.id });
      updateTag(MARKETPLACE_TAG);
    } catch {
      // Org not verified / suspended — draft is saved, publish blocked.
      publishBlocked = true;
    }
    if (publishBlocked) {
      redirect(`/company/projects/${projectId}?published=blocked`);
    }
    redirect(`/company/projects/${projectId}?published=1`);
  }

  redirect(`/company/projects/${projectId}`);
}

export async function updateInternshipAction(internshipId: string, formData: FormData) {
  const { user } = await requireSession();

  const internship = await getInternshipById(internshipId);
  if (!internship) throw new Error('Internship not found');
  if (!internship.projectId) throw new Error('Internship has no project');

  const project = await getProjectById(internship.projectId);
  if (!project) throw new Error('Project not found');
  // Mirror createInternshipAction's authz: only project supervisors may edit.
  if (!project.supervisorIds?.includes(user.id)) {
    throw new Error('Only project supervisors can edit internships');
  }

  let skills: unknown;
  let customQuestions: unknown;
  let deliverables: unknown;
  try {
    skills = JSON.parse(String(formData.get('skills') ?? '[]'));
    customQuestions = JSON.parse(String(formData.get('customQuestions') ?? '[]'));
    const deliverablesRaw = formData.get('deliverables');
    deliverables = deliverablesRaw ? JSON.parse(String(deliverablesRaw)) : undefined;
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
    deliverables,
  });

  await updateInternship({ internshipId, data: parsed, actorId: user.id });

  revalidatePath(`/company/projects/${internship.projectId}`);
  // If the listing is live, its marketplace card content changed too.
  if (internship.status === 'published') {
    updateTag(MARKETPLACE_TAG);
  }

  redirect(`/company/projects/${internship.projectId}`);
}

export async function publishInternshipAction(internshipId: string) {
  const { user } = await requireActiveSession();
  await publishInternship({ internshipId, actorId: user.id });
  updateTag(MARKETPLACE_TAG);
}

/**
 * Resolve an internship + its project and assert the caller is a project
 * supervisor. Mirrors createInternshipAction / updateInternshipAction's authz
 * so company-side lifecycle actions stay consistent. Returns both rows so the
 * caller can revalidate the right project path.
 */
async function requireSupervisorOfInternship(internshipId: string, userId: string) {
  const internship = await getInternshipById(internshipId);
  if (!internship) throw new Error('Internship not found');
  if (!internship.projectId) throw new Error('Internship has no project');

  const project = await getProjectById(internship.projectId);
  if (!project) throw new Error('Project not found');
  if (!project.supervisorIds?.includes(userId)) {
    throw new Error('Only project supervisors can manage this internship');
  }
  return { internship, project };
}

/**
 * Company-side unpublish: published → draft. Pulls the listing out of the
 * marketplace but keeps it editable. Distinct from the ADMIN moderation
 * unpublish (which archives) — different authz, different terminal status.
 */
export async function companyUnpublishInternshipAction(internshipId: string) {
  const { user } = await requireActiveSession();
  const { internship } = await requireSupervisorOfInternship(internshipId, user.id);
  if (internship.status !== 'published') {
    throw new Error('Only published internships can be unpublished');
  }

  await setInternshipStatus({ internshipId, status: 'draft', actorId: user.id });

  revalidatePath(`/company/projects/${internship.projectId}`);
  updateTag(MARKETPLACE_TAG);
}

/**
 * Company-side close: published | draft → closed. No longer accepting
 * applicants and removed from the marketplace. Terminal-ish (Reopen is out of
 * scope for S2-B).
 */
export async function closeInternshipAction(internshipId: string) {
  const { user } = await requireActiveSession();
  const { internship } = await requireSupervisorOfInternship(internshipId, user.id);
  if (internship.status !== 'published' && internship.status !== 'draft') {
    throw new Error('Only published or draft internships can be closed');
  }

  await setInternshipStatus({ internshipId, status: 'closed', actorId: user.id });

  revalidatePath(`/company/projects/${internship.projectId}`);
  updateTag(MARKETPLACE_TAG);
}
