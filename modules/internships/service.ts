import { db } from '@/db';
import { internships, organizations, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import { transitionProjectStatus } from '@/modules/projects/service';
import type { InternshipFormInput } from './validators';

export async function createInternship(input: {
  projectId: string;
  organizationId: string;
  data: InternshipFormInput;
  actorId: string;
}) {
  const [created] = await db
    .insert(internships)
    .values({
      organizationId: input.organizationId,
      projectId: input.projectId,
      title: input.data.title,
      description: input.data.description,
      sector: input.data.sector,
      skills: input.data.skills,
      duration: input.data.duration,
      locationType: input.data.locationType,
      location: input.data.location,
      isPaid: input.data.isPaid,
      compensation: input.data.compensation,
      internCount: input.data.internCount,
      language: input.data.language,
      deadline: input.data.deadline,
      customQuestions: input.data.customQuestions,
      // Sprint 3: deliverables defined here become the workspace
      // Deliverables tab verbatim — the brief is the contract.
      deliverables: input.data.deliverables?.filter((d) => d.name.trim().length > 0),
      status: 'draft',
    })
    .returning();

  await recordEvent({
    type: 'internship.created',
    actorId: input.actorId,
    targetType: 'internship',
    targetId: created.id,
    metadata: { title: input.data.title, projectId: input.projectId },
  });

  return created;
}

export async function publishInternship(input: { internshipId: string; actorId: string }) {
  const [existing] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, input.internshipId))
    .limit(1);
  if (!existing) throw new Error('Internship not found');
  if (existing.status === 'published') return existing;

  // Guard: only verified organizations may publish public internships.
  const [org] = await db
    .select({ verificationStatus: organizations.verificationStatus })
    .from(organizations)
    .where(eq(organizations.id, existing.organizationId))
    .limit(1);
  if (!org || org.verificationStatus !== 'verified') {
    throw new Error('org_not_verified');
  }

  const [updated] = await db
    .update(internships)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(internships.id, input.internshipId))
    .returning();

  await recordEvent({
    type: 'internship.published',
    actorId: input.actorId,
    targetType: 'internship',
    targetId: input.internshipId,
    metadata: { title: existing.title },
  });

  // Auto-transition project draft → active on first published internship
  if (existing.projectId) {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, existing.projectId))
      .limit(1);
    if (project?.status === 'draft') {
      await transitionProjectStatus({
        projectId: project.id,
        to: 'active',
        actorId: input.actorId,
      });
    }
  }

  return updated;
}
