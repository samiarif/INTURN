import { db } from '../db';
import {
  users,
  profiles,
  organizations,
  projects,
  internships,
  applications,
  workspaces,
  tasks,
  deliverables,
  events,
} from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

async function upsertUser(input: {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'intern' | 'company' | 'admin';
}) {
  const existing = await db.select().from(users).where(eq(users.clerkId, input.clerkId)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(users).values(input).returning();
  return created;
}

async function upsertOrgBySlug(input: {
  ownerId: string;
  name: string;
  slug: string;
  industry: string;
  size: '11-50';
  country: string;
  city: string;
  description: string;
}) {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, input.slug))
    .limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(organizations)
    .values({ ...input, verified: true, verificationStatus: 'verified' })
    .returning();
  return created;
}

async function upsertProjectBySlug(input: {
  organizationId: string;
  slug: string;
  name: string;
  brief: string;
  supervisorIds: string[];
}) {
  const existing = await db.select().from(projects).where(eq(projects.slug, input.slug)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(projects)
    .values({
      ...input,
      status: 'active',
      startDate: '2026-05-05',
      endDate: '2026-07-25',
    })
    .returning();
  return created;
}

export async function runSeed() {
  console.log('Seeding…');

  const mehdi = await upsertUser({
    clerkId: 'seed_user_mehdi',
    email: 'mehdi@acmestudio.tn',
    firstName: 'Mehdi',
    lastName: 'Triki',
    role: 'company',
  });
  const yasmine = await upsertUser({
    clerkId: 'seed_user_yasmine',
    email: 'yasmine@enit.utm.tn',
    firstName: 'Yasmine',
    lastName: 'Ben Salah',
    role: 'intern',
  });

  const existingProfile = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, yasmine.id))
    .limit(1);
  if (!existingProfile[0]) {
    await db.insert(profiles).values({
      userId: yasmine.id,
      university: 'enit',
      yearOfStudy: 'L3',
      fieldOfStudy: 'Computer Science',
      city: 'Tunis',
      preferredLanguage: 'fr',
      skills: ['React', 'TypeScript', 'Figma', 'User research'],
      roles: ['Design', 'Product'],
      portfolioLinks: [
        { platform: 'GitHub', url: 'https://github.com/yasmine' },
        { platform: 'Behance', url: 'https://behance.net/yasmine' },
      ],
      profileStep: 'complete',
    });
  }

  const acme = await upsertOrgBySlug({
    ownerId: mehdi.id,
    name: 'Acme Studio',
    slug: 'acme-studio',
    industry: 'Design & creative',
    size: '11-50',
    country: 'Tunisia',
    city: 'Tunis',
    description:
      'We design brands & digital products for the Maghreb. 12 people, working with founders from idea to launch.',
  });

  const project = await upsertProjectBySlug({
    organizationId: acme.id,
    slug: 'brand-audit',
    name: 'Brand audit & system refresh',
    brief:
      "A full-funnel audit of Acme's brand and a refreshed system delivered as Figma library + guidelines. 5 deliverables, 12 weeks, mostly async with one weekly check-in.",
    supervisorIds: [mehdi.id],
  });

  let internship = (
    await db.select().from(internships).where(eq(internships.projectId, project.id)).limit(1)
  )[0];
  if (!internship) {
    [internship] = await db
      .insert(internships)
      .values({
        organizationId: acme.id,
        projectId: project.id,
        title: 'Visual designer — Brand audit',
        description: 'Lead visual exploration for the brand refresh.',
        sector: 'Design',
        skills: ['Figma', 'Brand', 'Type'],
        duration: 12,
        locationType: 'hybrid',
        location: 'Tunis',
        isPaid: true,
        compensation: '800 TND / mo',
        internCount: 1,
        language: 'fr',
        status: 'published',
        deadline: '2026-04-30',
      })
      .returning();
  }

  let application = (
    await db.select().from(applications).where(eq(applications.applicantId, yasmine.id)).limit(1)
  )[0];
  if (!application) {
    [application] = await db
      .insert(applications)
      .values({
        internshipId: internship.id,
        applicantId: yasmine.id,
        status: 'accepted',
        coverNote: 'Excited to work on the brand audit.',
      })
      .returning();
  }

  let workspace = (
    await db.select().from(workspaces).where(eq(workspaces.internId, yasmine.id)).limit(1)
  )[0];
  if (!workspace) {
    [workspace] = await db
      .insert(workspaces)
      .values({
        internshipId: internship.id,
        internId: yasmine.id,
        organizationId: acme.id,
        status: 'active',
        startDate: '2026-05-05',
        endDate: '2026-07-25',
      })
      .returning();
  }

  const seedTasksData = [
    { title: 'Kickoff brief sign-off', tag: 'BA-001', status: 'done', priority: 'high', order: 1, dueDate: '2026-05-09' },
    { title: 'Stakeholder interviews · 6 of 6', tag: 'BA-002', status: 'done', priority: 'medium', order: 2, dueDate: '2026-05-19' },
    { title: 'Audit slide deck · v2', tag: 'BA-003', status: 'review', priority: 'high', order: 3, dueDate: '2026-05-22' },
    { title: 'Visual exploration · moodboards', tag: 'BA-005', status: 'in-progress', priority: 'high', order: 4, dueDate: '2026-05-30' },
    { title: 'Type pairings — 3 options', tag: 'BA-006', status: 'in-progress', priority: 'medium', order: 5, dueDate: '2026-05-30' },
    { title: 'Logo refresh — round 1', tag: 'BA-007', status: 'todo', priority: 'medium', order: 6, dueDate: '2026-06-06' },
  ] as const;

  // Wipe + re-insert tasks so they get the tag column populated and we get
  // the IDs back for event targetIds.
  await db.delete(tasks).where(eq(tasks.workspaceId, workspace.id));
  const insertedTasks = await db
    .insert(tasks)
    .values(seedTasksData.map((t) => ({
      workspaceId: workspace.id,
      tag: t.tag,
      title: t.title,
      status: t.status,
      priority: t.priority,
      order: t.order,
      dueDate: t.dueDate,
    })))
    .returning();
  const taskByTag = new Map(insertedTasks.map((t) => [t.tag, t]));

  const seedDelivsData = [
    {
      title: 'Brand audit · stakeholder findings',
      status: 'submitted' as const,
      feedback: 'Cleaned up stakeholder quotes, fixed numbering',
    },
    { title: 'Visual exploration · moodboards', status: 'draft' as const, feedback: null },
    { title: 'Logo refresh — round 1', status: 'draft' as const, feedback: null },
    { title: 'Design system library', status: 'draft' as const, feedback: null },
    { title: 'Final handoff package', status: 'draft' as const, feedback: null },
  ];

  await db.delete(deliverables).where(eq(deliverables.workspaceId, workspace.id));
  const insertedDelivs = await db
    .insert(deliverables)
    .values(seedDelivsData.map((d) => ({ ...d, workspaceId: workspace.id })))
    .returning();
  const auditDeliv = insertedDelivs.find((d) => d.title === 'Brand audit · stakeholder findings');
  const moodboardTask = taskByTag.get('BA-005');
  const typePairingsTask = taskByTag.get('BA-006');

  // Wipe + re-insert events with correct targetIds.
  const allTaskAndDelivIds = [
    ...insertedTasks.map((t) => t.id),
    ...insertedDelivs.map((d) => d.id),
    workspace.id,
  ];
  if (allTaskAndDelivIds.length > 0) {
    await db.delete(events).where(inArray(events.targetId, allTaskAndDelivIds));
  }

  const now = Date.now();
  const hours = (h: number) => new Date(now - h * 3600_000);
  await db.insert(events).values([
    auditDeliv && {
      type: 'deliverable.submitted',
      actorId: yasmine.id,
      targetType: 'deliverable',
      targetId: auditDeliv.id,
      metadata: { name: 'Brand audit · v2' },
      createdAt: hours(2),
    },
    typePairingsTask && {
      type: 'comment.added',
      actorId: mehdi.id,
      targetType: 'task',
      targetId: typePairingsTask.id,
      metadata: { task: 'Type pairings', text: 'Try a pair without the contrast serif' },
      createdAt: hours(5),
    },
    moodboardTask && {
      type: 'task.moved',
      actorId: yasmine.id,
      targetType: 'task',
      targetId: moodboardTask.id,
      metadata: { tag: 'BA-005', to: 'in-progress' },
      createdAt: hours(28),
    },
    {
      type: 'system.checkin.scheduled',
      targetType: 'workspace',
      targetId: workspace.id,
      metadata: { for: '2026-05-30T14:00' },
      createdAt: hours(30),
    },
    auditDeliv && {
      type: 'deliverable.revision.requested',
      actorId: mehdi.id,
      targetType: 'deliverable',
      targetId: auditDeliv.id,
      metadata: { name: 'Brand audit · v1', note: 'Findings section needs a TL;DR' },
      createdAt: hours(72),
    },
  ].filter((v): v is NonNullable<typeof v> => Boolean(v)));

  return {
    workspaceId: workspace.id,
    internUserId: yasmine.id,
    supervisorUserId: mehdi.id,
    organizationId: acme.id,
    projectId: project.id,
  };
}

// CLI entrypoint
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then((result) => {
      console.log(
        JSON.stringify(
          {
            ...result,
            internUrl: `http://localhost:3000/intern/workspaces/${result.workspaceId}`,
            companyUrl: `http://localhost:3000/company/workspaces/${result.workspaceId}`,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
