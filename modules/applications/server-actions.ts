'use server';

import { auth } from '@/lib/server-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getProfileByUserId, getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectById } from '@/modules/projects/queries';
import { db } from '@/db';
import { applications, internships } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
  if (user.suspendedAt) throw new Error('account_suspended');
  return user;
}

/**
 * Authorize a company action on an application by DERIVING the project from the
 * application itself — the client-supplied projectId is used only for cache
 * revalidation, never for authz. Closes the IDOR where a supervisor of project A
 * could accept/reject/annotate project B's application by passing A's id here.
 */
async function requireSupervisorOfApplication(applicationId: string, userId: string) {
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!application) throw new Error('Application not found');
  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, application.internshipId))
    .limit(1);
  if (!internship?.projectId) throw new Error('Forbidden');
  const project = await getProjectById(internship.projectId);
  if (!project?.supervisorIds?.includes(userId)) {
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

  // Fire-and-forget analytics — no awaiting on the Posthog HTTP call.
  void (async () => {
    const { trackServer } = await import('@/lib/analytics');
    await trackServer(user.id, {
      name: 'application_submitted',
      props: {
        internshipId,
        hasCustomAnswers: (parsed.customAnswers?.length ?? 0) > 0,
      },
    });
  })();

  // Dashboard + applications list show this new row. Without these, the
  // RSC cache holds the pre-apply snapshot and shows "No applications yet".
  revalidatePath('/intern/dashboard');
  revalidatePath('/intern/applications');

  redirect(`/intern/applications/${created.id}`);
}

export async function transitionApplicationStatusAction(input: {
  applicationId: string;
  projectId: string;
  to: ApplicationStatus;
  decisionNote?: string;
}) {
  const user = await requireUser();
  await requireSupervisorOfApplication(input.applicationId, user.id);
  await transitionApplicationStatus({
    applicationId: input.applicationId,
    to: input.to,
    actorId: user.id,
    decisionNote: input.decisionNote,
  });
  // Company inbox + applicant intern's dashboard/list all change.
  revalidatePath(`/company/projects/${input.projectId}/applications`);
  revalidatePath(`/company/projects/${input.projectId}/applications/${input.applicationId}`);
  revalidatePath('/intern/dashboard');
  revalidatePath('/intern/applications');
  revalidatePath(`/intern/applications/${input.applicationId}`);
}

export async function updateInternalNotesAction(input: {
  applicationId: string;
  projectId: string;
  notes: string;
}) {
  const user = await requireUser();
  await requireSupervisorOfApplication(input.applicationId, user.id);
  await updateInternalNotes({
    applicationId: input.applicationId,
    notes: input.notes,
  });
  revalidatePath(`/company/projects/${input.projectId}/applications/${input.applicationId}`);
}

export async function acceptApplicationAction(input: {
  applicationId: string;
  projectId: string;
  decisionNote?: string;
}) {
  const user = await requireUser();
  await requireSupervisorOfApplication(input.applicationId, user.id);
  const result = await acceptApplication({
    applicationId: input.applicationId,
    actorId: user.id,
    decisionNote: input.decisionNote,
  });
  // Workspace was just created; dashboards on both sides need refresh.
  revalidatePath('/intern/dashboard');
  revalidatePath('/intern/applications');
  revalidatePath('/company/dashboard');
  revalidatePath(`/company/projects/${input.projectId}`);
  revalidatePath(`/company/projects/${input.projectId}/applications`);
  redirect(`/company/workspaces/${result.workspace.id}`);
}

/**
 * Intern-initiated withdrawal. Soft transition to 'rejected' so the
 * intern row drops out of the company's active pipeline. The applicant
 * can re-apply later (the unique constraint is on (internshipId,
 * applicantId) but a 'rejected' row still occupies the slot — so we
 * actually hard-delete here. Companies that already accepted cannot
 * be withdrawn from on this path; the intern would have to ask
 * support.
 */
export async function withdrawApplicationAction(applicationId: string): Promise<void> {
  const user = await requireUser();
  const { db } = await import('@/db');
  const { applications } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) throw new Error('not_found');
  if (app.applicantId !== user.id) throw new Error('forbidden');
  if (app.status === 'accepted') throw new Error('already_accepted');

  await db.delete(applications).where(eq(applications.id, applicationId));

  revalidatePath('/intern/dashboard');
  revalidatePath('/intern/applications');
  redirect('/intern/applications');
}
