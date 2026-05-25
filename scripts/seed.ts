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
  comments,
  internshipBookmarks,
} from '../db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

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

// ============================================================
// Sam-accounts seed
// ------------------------------------------------------------
// Sam has 3 real Clerk-backed sign-in emails. This block makes the
// in-app experience for each of those accounts rich and consistent:
//   - hellowemakeitgrow@gmail.com → admin (verification queue)
//   - dazzsemi@gmail.com         → company supervisor with project,
//                                   internships, applications, workspace
//   - sami.arif@thog.io          → intern with complete profile,
//                                   applications, bookmarks, and an
//                                   active workspace + deliverables.
//
// All lookups use email as the stable key so the script works on any
// DB (clerk_id varies per-environment). Re-runs do not duplicate
// rows: every insert checks for an existing record first, and any
// wipe-and-reinsert is scoped to a workspace that this seed owns or
// to events tagged with metadata.seed === 'sam-accounts'.
// ============================================================
const SAM_SEED_TAG = 'sam-accounts';

async function seedSamAccounts(ctx: { candidateApplicants: Array<typeof users.$inferSelect> }) {
  const findUserByEmail = async (email: string) => {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return row;
  };

  const dazzsemi = await findUserByEmail('dazzsemi@gmail.com');
  const samiArif = await findUserByEmail('sami.arif@thog.io');
  const helloWmig = await findUserByEmail('hellowemakeitgrow@gmail.com');

  const missing: string[] = [];
  if (!dazzsemi) missing.push('dazzsemi@gmail.com');
  if (!samiArif) missing.push('sami.arif@thog.io');
  if (!helloWmig) missing.push('hellowemakeitgrow@gmail.com');
  if (missing.length === 3) {
    console.log(
      `↷ Skipping Sam-accounts seed — none of [${missing.join(', ')}] are in the users table yet (sign in once to create them).`,
    );
    return;
  }
  if (missing.length > 0) {
    console.log(
      `⚠ Sam-accounts seed: missing user rows for [${missing.join(', ')}] — they will be skipped.`,
    );
  }

  // ---- 1. hellowemakeitgrow → admin ----
  if (helloWmig) {
    if (helloWmig.role !== 'admin') {
      await db
        .update(users)
        .set({ role: 'admin', updatedAt: new Date() })
        .where(eq(users.id, helloWmig.id));
    }
    console.log(`✓ Promoted hellowemakeitgrow@gmail.com → admin`);
  }

  // ---- 2. dazzsemi → company supervisor ----
  let dazzOrgId: string | null = null;
  let dazzProjectId: string | null = null;
  let visualInternshipId: string | null = null;
  let uxResearcherInternshipId: string | null = null;
  let activeWorkspaceId: string | null = null;

  if (dazzsemi) {
    // Keep role 'company' (already set by Clerk onboarding).
    if (dazzsemi.role !== 'company') {
      await db
        .update(users)
        .set({ role: 'company', updatedAt: new Date() })
        .where(eq(users.id, dazzsemi.id));
    }

    // Find his existing org (auto-created by selectRole as "My Company").
    const [dazzOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, dazzsemi.id))
      .limit(1);

    if (dazzOrg) {
      dazzOrgId = dazzOrg.id;
      const renameToDazzStudio = dazzOrg.name === 'My Company';
      await db
        .update(organizations)
        .set({
          name: renameToDazzStudio ? 'Dazz Studio' : dazzOrg.name,
          industry: dazzOrg.industry ?? 'Design & creative',
          size: dazzOrg.size ?? '11-50',
          country: dazzOrg.country ?? 'Tunisia',
          city: dazzOrg.city ?? 'Tunis',
          description:
            dazzOrg.description ??
            'Independent design studio in Lac 2. Brand systems and product UI for founders shipping in MENA.',
          verified: true,
          verificationStatus: 'verified',
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, dazzOrg.id));

      // Delete the placeholder "sami test" draft project — but only if it's
      // truly empty (0 internships) and still a draft.
      const draftCandidates = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, dazzOrg.id),
            eq(projects.status, 'draft'),
          ),
        );
      for (const p of draftCandidates) {
        if (!/sami\s*test/i.test(p.name)) continue;
        const intCount = await db
          .select({ id: internships.id })
          .from(internships)
          .where(eq(internships.projectId, p.id))
          .limit(1);
        if (intCount.length === 0) {
          await db.delete(projects).where(eq(projects.id, p.id));
        }
      }

      // --- Project: Brand audit & system refresh (under Dazz Studio) ---
      const projectSlug = 'brand-audit';
      const goals = [
        'Clarity of position. Stakeholder-validated story of who Dazz is, in one paragraph.',
        'System, not assets. Refresh ships as a token-backed Figma library, not a deck of mocks.',
        'Handoff that lasts. Guidelines a junior designer can apply on day one without us.',
      ];
      const phases = [
        { name: 'Discovery & audit', description: 'Stakeholder interviews + surface gaps', fromWeek: 1, toWeek: 4 },
        { name: 'Explore & moodboard', description: 'Direction tests, type & colour exploration', fromWeek: 4, toWeek: 7 },
        { name: 'System build', description: 'Token-backed Figma library + spec', fromWeek: 7, toWeek: 10 },
        { name: 'Handoff', description: 'Written guidelines + walkthrough', fromWeek: 10, toWeek: 12 },
      ];
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 14); // 2 weeks ago
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 70); // ~10 weeks out
      const isoDate = (d: Date) => d.toISOString().slice(0, 10);

      const [existingProject] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.organizationId, dazzOrg.id), eq(projects.slug, projectSlug)))
        .limit(1);

      const projectValues = {
        organizationId: dazzOrg.id,
        slug: projectSlug,
        name: 'Brand audit & system refresh',
        brief:
          "Audit Dazz Studio's current brand across every surface, surface the gaps with stakeholders, then deliver a refreshed identity system as a Figma library + written guidelines. Two interns running in parallel — design and research — for the full 12 weeks.",
        status: 'active' as const,
        supervisorIds: [dazzsemi.id],
        startDate: isoDate(startDate),
        endDate: isoDate(endDate),
        goals,
        phases,
      };

      if (existingProject) {
        await db
          .update(projects)
          .set({ ...projectValues, updatedAt: new Date() })
          .where(eq(projects.id, existingProject.id));
        dazzProjectId = existingProject.id;
      } else {
        const [created] = await db.insert(projects).values(projectValues).returning();
        dazzProjectId = created.id;
      }

      // --- 2 internships under the Brand audit project ---
      const visualDeliverables = [
        { name: 'D1 · Brand audit · stakeholder findings', description: 'Slide deck synthesising interviews and visual audit.', dueWeek: 3 },
        { name: 'D2 · Visual exploration · moodboards', description: '3 distinct directions, each with a one-pager rationale.', dueWeek: 5 },
        { name: 'D3 · Logo refresh round 1', description: 'Refined marks based on chosen direction.', dueWeek: 7 },
        { name: 'D4 · Design system library', description: 'Token-backed Figma library: type, colour, components.', dueWeek: 10 },
        { name: 'D5 · Final handoff package', description: 'Written guidelines + walkthrough video.', dueWeek: 12 },
      ];
      const uxDeliverables = [
        { name: 'R1 · Stakeholder interview plan', description: 'Question bank + screener + scheduling.', dueWeek: 2 },
        { name: 'R2 · Interview synthesis', description: 'Affinity map + theme write-up.', dueWeek: 5 },
        { name: 'R3 · Positioning recommendation', description: 'One-paragraph position validated by stakeholders.', dueWeek: 8 },
        { name: 'R4 · Research handoff', description: 'Notion archive + insights memo for the design lead.', dueWeek: 10 },
      ];

      const upsertSamInternship = async (data: {
        title: string;
        description: string;
        sector: string;
        skills: string[];
        duration: number;
        compensation: string;
        deliverables: Array<{ name: string; description?: string; dueWeek: number }>;
      }) => {
        const [existing] = await db
          .select()
          .from(internships)
          .where(
            and(
              eq(internships.organizationId, dazzOrg.id),
              eq(internships.title, data.title),
            ),
          )
          .limit(1);

        const values = {
          organizationId: dazzOrg.id,
          projectId: dazzProjectId!,
          title: data.title,
          description: data.description,
          sector: data.sector,
          skills: data.skills,
          duration: data.duration,
          locationType: 'hybrid' as const,
          location: 'Tunis · Lac 2',
          isPaid: true,
          compensation: data.compensation,
          internCount: 1,
          language: 'fr' as const,
          status: 'published' as const,
          deadline: isoDate(new Date(today.getTime() + 14 * 24 * 3600_000)),
          deliverables: data.deliverables,
        };

        if (existing) {
          await db
            .update(internships)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(internships.id, existing.id));
          return existing.id;
        }
        const [created] = await db.insert(internships).values(values).returning();
        return created.id;
      };

      visualInternshipId = await upsertSamInternship({
        title: 'Visual designer · Brand audit',
        description:
          'Lead the visual exploration for the brand refresh — moodboards, type pairings, logo work, and the final Figma library. Working closely with the UX researcher on the same project.',
        sector: 'Design',
        skills: ['Figma', 'Brand systems', 'Typography', 'Moodboards', 'Design tokens'],
        duration: 12,
        compensation: '800 TND / mo',
        deliverables: visualDeliverables,
      });

      uxResearcherInternshipId = await upsertSamInternship({
        title: 'UX researcher · Brand audit',
        description:
          'Run the discovery leg of the brand audit — stakeholder interviews, synthesis, and the positioning paragraph that anchors the visual work.',
        sector: 'Research',
        skills: ['User interviews', 'Synthesis', 'Figma', 'Notion'],
        duration: 10,
        compensation: '750 TND / mo',
        deliverables: uxDeliverables,
      });

      // --- Applications ---
      // sami.arif → Visual designer → ACCEPTED (this is the active workspace).
      if (samiArif && visualInternshipId) {
        const [existingApp] = await db
          .select()
          .from(applications)
          .where(
            and(
              eq(applications.internshipId, visualInternshipId),
              eq(applications.applicantId, samiArif.id),
            ),
          )
          .limit(1);
        if (!existingApp) {
          await db.insert(applications).values({
            internshipId: visualInternshipId,
            applicantId: samiArif.id,
            status: 'accepted',
            coverNote:
              'Brand systems are the work I want to be doing for the rest of my career — would love to learn yours.',
          });
        } else if (existingApp.status !== 'accepted') {
          await db
            .update(applications)
            .set({ status: 'accepted', updatedAt: new Date() })
            .where(eq(applications.id, existingApp.id));
        }
      }

      // 3 other applicants → UX researcher (mixed statuses).
      const uxApplicantPicks: Array<{
        emailPrefix: string;
        status: 'new' | 'reviewed' | 'shortlisted';
        coverNote: string;
        internalNotes?: string;
      }> = [
        {
          emailPrefix: 'lina@',
          status: 'new',
          coverNote: 'I ran the discovery for my final-year project — interviews, synthesis, the works.',
        },
        {
          emailPrefix: 'amir@',
          status: 'reviewed',
          coverNote: 'Strong in synthesis. Interview transcripts attached.',
        },
        {
          emailPrefix: 'sarra@',
          status: 'shortlisted',
          coverNote: 'Available immediately. Big fan of brand-led research.',
          internalNotes: 'Strong sample. Schedule call.',
        },
        {
          emailPrefix: 'imen@',
          status: 'new',
          coverNote: 'INSAT CS background, but research is the part that gets me out of bed.',
        },
      ];

      if (uxResearcherInternshipId) {
        for (const pick of uxApplicantPicks) {
          const candidate = ctx.candidateApplicants.find((a) => a.email.startsWith(pick.emailPrefix));
          if (!candidate) continue;
          const [existingApp] = await db
            .select()
            .from(applications)
            .where(
              and(
                eq(applications.internshipId, uxResearcherInternshipId),
                eq(applications.applicantId, candidate.id),
              ),
            )
            .limit(1);
          if (existingApp) continue;
          await db.insert(applications).values({
            internshipId: uxResearcherInternshipId,
            applicantId: candidate.id,
            status: pick.status,
            coverNote: pick.coverNote,
            internalNotes: pick.internalNotes ?? null,
          });
        }
      }

      // 1-2 applicants → Visual designer too (pending in dazzsemi's inbox).
      const visualPendingPicks: Array<{
        emailPrefix: string;
        status: 'new' | 'reviewed';
        coverNote: string;
      }> = [
        {
          emailPrefix: 'sarra@',
          status: 'new',
          coverNote: 'Brand-first designer. Would love a shot at the Dazz refresh.',
        },
        {
          emailPrefix: 'fares@',
          status: 'reviewed',
          coverNote: 'Motion + brand systems background. Reel attached.',
        },
      ];
      if (visualInternshipId) {
        for (const pick of visualPendingPicks) {
          const candidate = ctx.candidateApplicants.find((a) => a.email.startsWith(pick.emailPrefix));
          if (!candidate) continue;
          const [existingApp] = await db
            .select()
            .from(applications)
            .where(
              and(
                eq(applications.internshipId, visualInternshipId),
                eq(applications.applicantId, candidate.id),
              ),
            )
            .limit(1);
          if (existingApp) continue;
          await db.insert(applications).values({
            internshipId: visualInternshipId,
            applicantId: candidate.id,
            status: pick.status,
            coverNote: pick.coverNote,
          });
        }
      }

      // --- Workspace for the accepted sami.arif application ---
      if (samiArif && visualInternshipId) {
        const [existingWs] = await db
          .select()
          .from(workspaces)
          .where(
            and(
              eq(workspaces.internshipId, visualInternshipId),
              eq(workspaces.internId, samiArif.id),
            ),
          )
          .limit(1);
        const wsValues = {
          internshipId: visualInternshipId,
          internId: samiArif.id,
          organizationId: dazzOrg.id,
          status: 'active' as const,
          startDate: isoDate(startDate),
          endDate: isoDate(endDate),
        };
        if (existingWs) {
          await db
            .update(workspaces)
            .set({ ...wsValues, updatedAt: new Date() })
            .where(eq(workspaces.id, existingWs.id));
          activeWorkspaceId = existingWs.id;
        } else {
          const [created] = await db.insert(workspaces).values(wsValues).returning();
          activeWorkspaceId = created.id;
        }
      }
    }
  }

  // ---- 3. sami.arif → intern profile + bookmarks + cross-org applications ----
  if (samiArif) {
    if (samiArif.role !== 'intern') {
      await db
        .update(users)
        .set({ role: 'intern', updatedAt: new Date() })
        .where(eq(users.id, samiArif.id));
    }

    const profileValues = {
      userId: samiArif.id,
      university: 'enit',
      yearOfStudy: 'L3',
      fieldOfStudy: 'Industrial design',
      city: 'Tunis',
      preferredLanguage: 'fr' as const,
      skills: [
        'Figma',
        'Brand systems',
        'Typography',
        'Design tokens',
        'React',
        'TypeScript',
        'Prototyping',
      ],
      roles: ['Visual designer', 'Junior product designer', 'Brand designer'],
      portfolioLinks: [
        { platform: 'Behance', url: 'https://behance.net/samiarif' },
        { platform: 'GitHub', url: 'https://github.com/samiarif' },
      ],
      profileStep: 'complete' as const,
    };
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, samiArif.id))
      .limit(1);
    if (existingProfile) {
      await db
        .update(profiles)
        .set({ ...profileValues, updatedAt: new Date() })
        .where(eq(profiles.userId, samiArif.id));
    } else {
      await db.insert(profiles).values(profileValues);
    }

    // Cross-org applications for sami.arif so his inbox feels lived-in.
    // Look up by internship title (stable across seeds).
    const findInternshipByTitle = async (title: string) => {
      const [row] = await db
        .select()
        .from(internships)
        .where(eq(internships.title, title))
        .limit(1);
      return row;
    };
    const acmeVisual = await findInternshipByTitle('Visual designer — Brand audit');
    const greenvibeContent = await findInternshipByTitle('Content + brand intern');

    const ensureApp = async (
      internshipId: string,
      status: 'new' | 'reviewed' | 'shortlisted' | 'accepted',
      coverNote: string,
    ) => {
      const [existing] = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.internshipId, internshipId),
            eq(applications.applicantId, samiArif.id),
          ),
        )
        .limit(1);
      if (existing) {
        if (existing.status !== status) {
          await db
            .update(applications)
            .set({ status, updatedAt: new Date() })
            .where(eq(applications.id, existing.id));
        }
        return;
      }
      await db.insert(applications).values({
        internshipId,
        applicantId: samiArif.id,
        status,
        coverNote,
      });
    };

    if (acmeVisual) {
      await ensureApp(
        acmeVisual.id,
        'reviewed',
        'Big fan of Acme. Would love a shot at the brand-audit role.',
      );
    }
    if (greenvibeContent) {
      await ensureApp(
        greenvibeContent.id,
        'shortlisted',
        'I write campaign copy in FR + EN — happy to share samples.',
      );
    }

    // 3 bookmarks for the bookmarks tab.
    const foretEditorRow = await findInternshipByTitle('Bilingual editor intern');
    const beyondFrontendRow = await findInternshipByTitle('Junior frontend engineer');
    const acmeJuniorRow = await findInternshipByTitle('Junior product designer');
    const bookmarkTargets = [foretEditorRow, beyondFrontendRow, acmeJuniorRow].filter(
      (r): r is NonNullable<typeof r> => Boolean(r),
    );
    for (const target of bookmarkTargets) {
      await db
        .insert(internshipBookmarks)
        .values({ internId: samiArif.id, internshipId: target.id })
        .onConflictDoNothing();
    }

    // ---- 4. Sami's workspace under Dazz: tasks/deliverables/comments/events/checkin ----
    if (activeWorkspaceId && dazzsemi) {
      const wsId = activeWorkspaceId;
      const samiId = samiArif.id;
      const dazzId = dazzsemi.id;
      const todayTs = Date.now();
      const daysAgo = (n: number) => new Date(todayTs - n * 24 * 3600_000);
      const isoTs = (d: Date) => d.toISOString();

      // Wipe + re-insert: scoped to wsId (we own it). The deliverables
      // contain a revisionHistory snapshot for D1.
      await db.delete(tasks).where(eq(tasks.workspaceId, wsId));
      const taskRows = await db
        .insert(tasks)
        .values([
          { workspaceId: wsId, tag: 'BA-001', title: 'Kickoff brief sign-off', status: 'done', priority: 'medium', order: 1, dueDate: '2026-05-12' },
          { workspaceId: wsId, tag: 'BA-002', title: 'Stakeholder interviews · 6 of 6', status: 'done', priority: 'high', order: 2, dueDate: '2026-05-18' },
          { workspaceId: wsId, tag: 'BA-003', title: 'Audit slide deck · in review', status: 'review', priority: 'high', order: 3, dueDate: '2026-05-22' },
          { workspaceId: wsId, tag: 'BA-005', title: 'Visual exploration · moodboards', status: 'in-progress', priority: 'high', order: 4, dueDate: '2026-05-30' },
          { workspaceId: wsId, tag: 'BA-006', title: 'Type pairings · 3 options', status: 'in-progress', priority: 'medium', order: 5, dueDate: '2026-05-30' },
          { workspaceId: wsId, tag: 'BA-007', title: 'Logo refresh · round 1', status: 'todo', priority: 'medium', order: 6, dueDate: '2026-06-06' },
        ])
        .returning();
      const taskByTag = new Map(taskRows.map((t) => [t.tag, t]));

      await db.delete(deliverables).where(eq(deliverables.workspaceId, wsId));
      const d1V1: import('../db/schema').DeliverableRevision = {
        version: 1,
        submittedAt: isoTs(daysAgo(7)),
        submittedBy: samiId,
        fileUrl: null,
        fileName: 'brand-audit-v1.pdf',
        fileType: 'application/pdf',
        note: 'First pass — covers all 6 interviews + visual audit photos.',
        status: 'revision-requested',
        review: {
          reviewerId: dazzId,
          reviewedAt: isoTs(daysAgo(5)),
          state: 'changes',
          text: 'Findings section needs a TL;DR up top. Quote attribution is solid.',
        },
      };
      const delivRows = await db
        .insert(deliverables)
        .values([
          {
            workspaceId: wsId,
            title: 'D1 · Brand audit · stakeholder findings',
            description: 'Slide deck synthesising interviews and visual audit.',
            status: 'submitted',
            version: 2,
            submittedAt: daysAgo(1),
            fileName: 'brand-audit-v2.pdf',
            fileType: 'application/pdf',
            revisionHistory: [d1V1],
          },
          {
            workspaceId: wsId,
            title: 'D2 · Visual exploration · moodboards',
            description: '3 distinct directions, each with a one-pager rationale.',
            status: 'draft',
            version: 1,
            revisionHistory: [],
          },
          {
            workspaceId: wsId,
            title: 'D3 · Logo refresh round 1',
            description: 'Refined marks based on chosen direction.',
            status: 'draft',
            version: 1,
            revisionHistory: [],
          },
          {
            workspaceId: wsId,
            title: 'D4 · Design system library',
            description: 'Token-backed Figma library: type, colour, components.',
            status: 'draft',
            version: 1,
            revisionHistory: [],
          },
          {
            workspaceId: wsId,
            title: 'D5 · Final handoff package',
            description: 'Written guidelines + walkthrough video.',
            status: 'draft',
            version: 1,
            revisionHistory: [],
          },
        ])
        .returning();
      const d1Row = delivRows.find((d) => d.title.startsWith('D1'));
      const d2Row = delivRows.find((d) => d.title.startsWith('D2'));

      // Wipe + re-insert events tagged with sam-accounts SAM_SEED_TAG so we
      // don't pile up on re-runs.
      await db.delete(events).where(sql`metadata->>'seed' = ${SAM_SEED_TAG}`);

      const moodboardTask = taskByTag.get('BA-005');
      const typePairingsTask = taskByTag.get('BA-006');
      const logoTask = taskByTag.get('BA-007');

      const eventsToInsert: Array<typeof events.$inferInsert> = [
        {
          type: 'system.workspace.opened',
          actorId: dazzId,
          targetType: 'workspace',
          targetId: wsId,
          metadata: { seed: SAM_SEED_TAG, by: 'Dazz Studio' },
          createdAt: daysAgo(14),
        },
      ];
      if (d1Row) {
        eventsToInsert.push(
          {
            type: 'deliverable.submitted',
            actorId: samiId,
            targetType: 'deliverable',
            targetId: d1Row.id,
            metadata: { seed: SAM_SEED_TAG, name: 'D1 · Brand audit · stakeholder findings', version: 1 },
            createdAt: daysAgo(7),
          },
          {
            type: 'deliverable.revision.requested',
            actorId: dazzId,
            targetType: 'deliverable',
            targetId: d1Row.id,
            metadata: { seed: SAM_SEED_TAG, name: 'D1 · Brand audit · v1', note: 'Findings section needs a TL;DR' },
            createdAt: daysAgo(5),
          },
          {
            type: 'deliverable.submitted',
            actorId: samiId,
            targetType: 'deliverable',
            targetId: d1Row.id,
            metadata: { seed: SAM_SEED_TAG, name: 'D1 · Brand audit · stakeholder findings', version: 2 },
            createdAt: daysAgo(1),
          },
        );
      }
      if (moodboardTask) {
        eventsToInsert.push({
          type: 'task.moved',
          actorId: samiId,
          targetType: 'task',
          targetId: moodboardTask.id,
          metadata: { seed: SAM_SEED_TAG, tag: 'BA-005', to: 'in-progress' },
          createdAt: daysAgo(3),
        });
      }
      if (typePairingsTask) {
        eventsToInsert.push({
          type: 'comment.added',
          actorId: dazzId,
          targetType: 'task',
          targetId: typePairingsTask.id,
          metadata: { seed: SAM_SEED_TAG, task: 'Type pairings', text: 'Try a pair without the contrast serif' },
          createdAt: daysAgo(2),
        });
      }
      if (logoTask) {
        eventsToInsert.push({
          type: 'task.moved',
          actorId: dazzId,
          targetType: 'task',
          targetId: logoTask.id,
          metadata: { seed: SAM_SEED_TAG, tag: 'BA-007', to: 'todo' },
          createdAt: daysAgo(4),
        });
      }
      eventsToInsert.push({
        type: 'checkin.submitted',
        actorId: samiId,
        targetType: 'workspace',
        targetId: wsId,
        metadata: {
          seed: SAM_SEED_TAG,
          shipped:
            '- Closed BA-001 Kickoff brief sign-off\n- Closed BA-002 Stakeholder interviews · 6 of 6\n- Submitted D1 Brand audit · stakeholder findings (v2)',
          stuck:
            '- Waiting on review feedback for BA-003\n- Direction call for moodboards (3 options ready)',
          next:
            '- Lock moodboard direction\n- Start BA-006 Type pairings · 3 options\n- Open BA-007 Logo refresh draft',
          authorName: 'Sami Arif',
          aiDraftFollowup:
            'Suggested focus next week: lock the moodboard direction with Dazz before opening logo work.',
          source: 'ai',
        },
        createdAt: daysAgo(7),
      });
      await db.insert(events).values(eventsToInsert);

      // Wipe + re-insert comments scoped to wsId (we own this workspace).
      await db.delete(comments).where(eq(comments.workspaceId, wsId));
      const commentRows: Array<typeof comments.$inferInsert> = [
        {
          workspaceId: wsId,
          authorId: dazzId,
          body: 'Welcome aboard! Kickoff brief is in Notion — give it a read before our 1:1 Thursday.',
          createdAt: daysAgo(13),
        },
        {
          workspaceId: wsId,
          authorId: samiId,
          body: 'Read it twice. Two questions in the doc — flagged with @Dazz.',
          createdAt: daysAgo(12),
        },
        {
          workspaceId: wsId,
          authorId: dazzId,
          body: 'Answered both. Push the stakeholder findings as v1 whenever you are ready.',
          createdAt: daysAgo(8),
        },
        {
          workspaceId: wsId,
          authorId: samiId,
          body: 'V2 of the audit is up — added the TL;DR you asked for and tightened the quote pull-outs.',
          createdAt: daysAgo(1),
        },
        {
          workspaceId: wsId,
          authorId: dazzId,
          body: 'Sharp. Will review tomorrow morning. Start exploring moodboards in parallel.',
          createdAt: daysAgo(1),
        },
      ];
      if (d2Row) {
        commentRows.push({
          workspaceId: wsId,
          deliverableId: d2Row.id,
          authorId: samiId,
          body: 'Pushed three initial moodboards as draft — editorial, brutalist, and a softer geometric one.',
          createdAt: daysAgo(2),
        });
      }
      if (typePairingsTask) {
        commentRows.push({
          workspaceId: wsId,
          taskId: typePairingsTask.id,
          authorId: samiId,
          body: 'First pairing is editorial (Söhne + Tiempos). Second leans bolder (GT Walsheim + Editorial New).',
          createdAt: daysAgo(2),
        });
      }
      await db.insert(comments).values(commentRows);
    }

    console.log(
      `✓ Set up sami.arif@thog.io → complete profile + ${
        2 + (acmeVisual && greenvibeContent ? 1 : 0)
      } applications (1 accepted under Dazz) + ${bookmarkTargets.length} bookmarks + workspace with 5 deliverables + 6 tasks + comments + check-in`,
    );
  }

  if (dazzsemi && dazzOrgId) {
    console.log(
      `✓ Set up dazzsemi@gmail.com → Dazz Studio (verified) + Brand audit project + ${
        (visualInternshipId ? 1 : 0) + (uxResearcherInternshipId ? 1 : 0)
      } internships + applications + ${activeWorkspaceId ? '1 active workspace' : '0 workspaces'}`,
    );
  }
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

  // ---- Sprint 3 additions ----
  // A second internship under the same Brand Audit project (UX researcher).
  let uxInternship = (
    await db
      .select()
      .from(internships)
      .where(eq(internships.title, 'UX researcher — Brand audit'))
      .limit(1)
  )[0];
  if (!uxInternship) {
    [uxInternship] = await db
      .insert(internships)
      .values({
        organizationId: acme.id,
        projectId: project.id,
        title: 'UX researcher — Brand audit',
        description:
          'Run stakeholder interviews and synthesize findings to inform the visual refresh. 8 weeks, async first, one weekly sync.',
        sector: 'Design',
        skills: ['User research', 'Interview', 'Notion', 'Figma'],
        duration: 8,
        locationType: 'virtual',
        location: '',
        isPaid: true,
        compensation: '600 TND / mo',
        internCount: 1,
        language: 'fr',
        status: 'published',
        deadline: '2026-05-10',
        customQuestions: [
          { question: 'Describe a user interview you ran — what did you learn?', required: true },
          { question: 'Tools you use for synthesis?', required: false },
        ],
      })
      .returning();
  }

  // Three demo applicants on the UX researcher internship + 1 on visual designer.
  const applicants = await Promise.all([
    upsertUser({
      clerkId: 'seed_user_applicant_1',
      email: 'lina@enit.utm.tn',
      firstName: 'Lina',
      lastName: 'Khelifi',
      role: 'intern',
    }),
    upsertUser({
      clerkId: 'seed_user_applicant_2',
      email: 'amir@insat.utm.tn',
      firstName: 'Amir',
      lastName: 'Ben Amor',
      role: 'intern',
    }),
    upsertUser({
      clerkId: 'seed_user_applicant_3',
      email: 'sarra@esprit.tn',
      firstName: 'Sarra',
      lastName: 'Mansouri',
      role: 'intern',
    }),
  ]);

  // Make sure each applicant has a complete profile
  for (const a of applicants) {
    const existingProfile = await db.select().from(profiles).where(eq(profiles.userId, a.id)).limit(1);
    if (!existingProfile[0]) {
      await db.insert(profiles).values({
        userId: a.id,
        university: a.email.includes('enit') ? 'enit' : a.email.includes('insat') ? 'insat' : 'esprit',
        yearOfStudy: 'L3',
        fieldOfStudy: a.email.includes('esprit') ? 'Design' : 'Computer Science',
        city: 'Tunis',
        preferredLanguage: 'fr',
        skills: ['User research', 'Figma', 'Notion'],
        roles: ['Design', 'Product'],
        portfolioLinks: [],
        profileStep: 'complete',
      });
    }
  }

  const seedApps = [
    {
      internshipId: uxInternship.id,
      applicantId: applicants[0].id,
      status: 'new' as const,
      coverNote: "I'd love to learn what a real research practice looks like under deadline pressure.",
    },
    {
      internshipId: uxInternship.id,
      applicantId: applicants[1].id,
      status: 'reviewed' as const,
      coverNote: 'I ran the UX leg of my final-year project — interviews, affinity mapping, the works.',
    },
    {
      internshipId: uxInternship.id,
      applicantId: applicants[2].id,
      status: 'shortlisted' as const,
      coverNote: 'Strongly motivated by Tunisian brand work. Available immediately.',
      internalNotes: 'Strong portfolio. Move to interview.',
    },
  ];

  for (const a of seedApps) {
    const existing = await db
      .select()
      .from(applications)
      .where(eq(applications.applicantId, a.applicantId))
      .limit(1);
    if (existing.length > 0 && existing.some((x) => x.internshipId === a.internshipId)) continue;
    await db.insert(applications).values({
      internshipId: a.internshipId,
      applicantId: a.applicantId,
      status: a.status,
      coverNote: a.coverNote,
      internalNotes: 'internalNotes' in a ? a.internalNotes : null,
      customAnswers: [
        { question: 'Describe a user interview you ran — what did you learn?', answer: 'Lots.' },
      ],
    });
  }

  // A second, unverified organization for admin testing.
  const sariMounir = await upsertUser({
    clerkId: 'seed_user_sari_mounir',
    email: 'mounir@numentech.tn',
    firstName: 'Mounir',
    lastName: 'Sari',
    role: 'company',
  });
  const existingNumentech = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, 'numentech'))
    .limit(1);
  if (!existingNumentech[0]) {
    await db.insert(organizations).values({
      ownerId: sariMounir.id,
      name: 'Numentech',
      slug: 'numentech',
      industry: 'Software & tech',
      size: '11-50',
      country: 'Tunisia',
      city: 'Sfax',
      description:
        'Engineering studio building B2B SaaS for the MENA region. 24 people, founded 2019.',
      verificationStatus: 'draft',
      verified: false,
    });
  }

  // ---- Sprint C additions: diverse marketplace, bookmarks, comments, check-in ----

  // --- 3 new verified orgs + their owners ---
  const youssef = await upsertUser({
    clerkId: 'seed_user_youssef',
    email: 'youssef@beyond.tn',
    firstName: 'Youssef',
    lastName: 'Garbi',
    role: 'company',
  });
  const nada = await upsertUser({
    clerkId: 'seed_user_nada',
    email: 'nada@greenvibe.tn',
    firstName: 'Nada',
    lastName: 'Hammami',
    role: 'company',
  });
  const karim = await upsertUser({
    clerkId: 'seed_user_karim',
    email: 'karim@foret.tn',
    firstName: 'Karim',
    lastName: 'Chebbi',
    role: 'company',
  });

  const beyond = await upsertOrgBySlug({
    ownerId: youssef.id,
    name: 'Beyond',
    slug: 'beyond',
    industry: 'Software & tech',
    size: '11-50',
    country: 'Tunisia',
    city: 'Tunis',
    description: 'Product engineering studio building remote-first tools.',
  });
  const greenvibe = await upsertOrgBySlug({
    ownerId: nada.id,
    name: 'GreenVibe',
    slug: 'greenvibe',
    industry: 'Marketing & growth',
    size: '11-50',
    country: 'Tunisia',
    city: 'Sousse',
    description: 'Sustainability-focused brand consultancy.',
  });
  const foret = await upsertOrgBySlug({
    ownerId: karim.id,
    name: 'Forêt',
    slug: 'foret',
    industry: 'Content & media',
    size: '11-50',
    country: 'Tunisia',
    city: 'Sousse',
    description: 'Bilingual content studio (FR/EN) serving Maghreb founders.',
  });

  // --- One project per new org ---
  const beyondProject = await upsertProjectBySlug({
    organizationId: beyond.id,
    slug: 'mobile-discovery',
    name: 'Mobile app discovery sprint',
    brief:
      'Six-week discovery on a new mobile companion app: interviews, prototyping, validation.',
    supervisorIds: [youssef.id],
  });
  const greenvibeProject = await upsertProjectBySlug({
    organizationId: greenvibe.id,
    slug: 'eco-campaign-q3',
    name: 'Eco-brand campaign Q3',
    brief:
      'Q3 campaign to launch a recycled-fabric collection — brand, social, and editorial.',
    supervisorIds: [nada.id],
  });
  const foretProject = await upsertProjectBySlug({
    organizationId: foret.id,
    slug: 'founder-content',
    name: 'Founder content series',
    brief:
      'Bilingual long-form content series featuring Maghreb founders. Interviews + editorial.',
    supervisorIds: [karim.id],
  });

  // --- 8 new internships across new orgs + extra Acme roles ---
  type SeedInternship = {
    key: string;
    organizationId: string;
    projectId: string | null;
    title: string;
    description: string;
    sector: string;
    skills: string[];
    duration: number;
    locationType: 'on-site' | 'virtual' | 'hybrid';
    location: string;
    isPaid: boolean;
    compensation: string | null;
    language: 'fr' | 'en' | 'ar';
    deadline: string;
    customQuestions:
      | Array<{ question: string; required: boolean }>
      | null;
  };

  const deadlineIn = (weeks: number) => {
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().slice(0, 10);
  };

  const seedInternshipsData: SeedInternship[] = [
    {
      key: 'beyondUxResearch',
      organizationId: beyond.id,
      projectId: beyondProject.id,
      title: 'UX research intern · multi-product',
      description:
        'Run discovery interviews across two product lines and synthesize findings. Remote-first, async-first.',
      sector: 'Product',
      skills: ['User interviews', 'Synthesis', 'Figma', 'Notion'],
      duration: 10,
      locationType: 'virtual',
      location: '',
      isPaid: true,
      compensation: '750 TND / mo',
      language: 'fr',
      deadline: deadlineIn(6),
      customQuestions: [
        { question: 'Share a research artifact you produced.', required: true },
      ],
    },
    {
      key: 'beyondFrontend',
      organizationId: beyond.id,
      projectId: beyondProject.id,
      title: 'Junior frontend engineer',
      description:
        'Ship UI for a new React + TypeScript companion app. Pair with senior engineers, code-review heavy.',
      sector: 'Engineering',
      skills: ['React', 'TypeScript', 'Tailwind'],
      duration: 12,
      locationType: 'hybrid',
      location: 'Tunis',
      isPaid: true,
      compensation: '1200 TND / mo',
      language: 'en',
      deadline: deadlineIn(5),
      customQuestions: null,
    },
    {
      key: 'greenvibeContent',
      organizationId: greenvibe.id,
      projectId: greenvibeProject.id,
      title: 'Content + brand intern',
      description:
        'Write campaign copy, social captions, and short editorial. French primary, English a plus.',
      sector: 'Marketing',
      skills: ['Copywriting', 'Brand voice', 'French + English'],
      duration: 6,
      locationType: 'hybrid',
      location: 'Sousse',
      isPaid: true,
      compensation: '650 TND / mo',
      language: 'fr',
      deadline: deadlineIn(4),
      customQuestions: [
        { question: 'Link a long-form piece you wrote.', required: true },
        { question: 'Favorite brand voice in the wild?', required: false },
      ],
    },
    {
      key: 'greenvibeSocial',
      organizationId: greenvibe.id,
      projectId: greenvibeProject.id,
      title: 'Social media intern — Q3 launch',
      description:
        'Run the Q3 launch on Instagram + TikTok. Plan, post, and read the comments.',
      sector: 'Marketing',
      skills: ['Instagram', 'TikTok', 'Community management'],
      duration: 8,
      locationType: 'virtual',
      location: '',
      isPaid: false,
      compensation: null,
      language: 'fr',
      deadline: deadlineIn(4),
      customQuestions: null,
    },
    {
      key: 'foretEditor',
      organizationId: foret.id,
      projectId: foretProject.id,
      title: 'Bilingual editor intern',
      description:
        'Edit founder interviews in French and English. Heavy on clarity, voice, and tight deadlines.',
      sector: 'Content',
      skills: ['Editing', 'French', 'English', 'Notion'],
      duration: 12,
      locationType: 'virtual',
      location: '',
      isPaid: true,
      compensation: '800 TND / mo',
      language: 'fr',
      deadline: deadlineIn(7),
      customQuestions: [
        { question: 'Share one edit you are proud of (link or attach).', required: true },
      ],
    },
    {
      key: 'acmeJuniorProduct',
      organizationId: acme.id,
      projectId: project.id,
      title: 'Junior product designer',
      description:
        'Design mobile UI flows for an Acme client. Figma, prototyping, weekly critique.',
      sector: 'Design',
      skills: ['Figma', 'Prototyping', 'Mobile UI'],
      duration: 8,
      locationType: 'hybrid',
      location: 'Tunis',
      isPaid: true,
      compensation: '900 TND / mo',
      language: 'fr',
      deadline: deadlineIn(5),
      customQuestions: null,
    },
    {
      key: 'acmeMotion',
      organizationId: acme.id,
      projectId: project.id,
      title: 'Motion design intern',
      description:
        'Produce short brand motion pieces (logo idents, social loops) under direction of the brand lead.',
      sector: 'Design',
      skills: ['After Effects', 'Lottie', 'Brand motion'],
      duration: 4,
      locationType: 'on-site',
      location: 'Tunis',
      isPaid: true,
      compensation: '500 TND / mo',
      language: 'fr',
      deadline: deadlineIn(4),
      customQuestions: null,
    },
    {
      key: 'acmeDataViz',
      organizationId: acme.id,
      projectId: project.id,
      title: 'Data viz intern',
      description:
        'Build interactive charts for a client report — D3 + Observable, Figma for static exports.',
      sector: 'Design',
      skills: ['D3', 'Observable', 'Figma'],
      duration: 10,
      locationType: 'virtual',
      location: '',
      isPaid: true,
      compensation: '700 TND / mo',
      language: 'en',
      deadline: deadlineIn(8),
      customQuestions: [
        { question: 'Link a chart you built.', required: false },
      ],
    },
  ];

  const internshipByKey = new Map<string, typeof internships.$inferSelect>();
  for (const data of seedInternshipsData) {
    const existing = (
      await db
        .select()
        .from(internships)
        .where(
          and(
            eq(internships.organizationId, data.organizationId),
            eq(internships.title, data.title),
          ),
        )
        .limit(1)
    )[0];
    if (existing) {
      internshipByKey.set(data.key, existing);
      continue;
    }
    const [created] = await db
      .insert(internships)
      .values({
        organizationId: data.organizationId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        sector: data.sector,
        skills: data.skills,
        duration: data.duration,
        locationType: data.locationType,
        location: data.location,
        isPaid: data.isPaid,
        compensation: data.compensation,
        internCount: 1,
        language: data.language,
        status: 'published',
        deadline: data.deadline,
        customQuestions: data.customQuestions,
      })
      .returning();
    internshipByKey.set(data.key, created);
  }

  // --- 4 more applicant users with profiles ---
  const extraApplicants = await Promise.all([
    upsertUser({
      clerkId: 'seed_user_applicant_4',
      email: 'imen@ensi.utm.tn',
      firstName: 'Imen',
      lastName: 'Bouzid',
      role: 'intern',
    }),
    upsertUser({
      clerkId: 'seed_user_applicant_5',
      email: 'rayen@essec.tn',
      firstName: 'Rayen',
      lastName: 'Trabelsi',
      role: 'intern',
    }),
    upsertUser({
      clerkId: 'seed_user_applicant_6',
      email: 'syrine@insat.utm.tn',
      firstName: 'Syrine',
      lastName: 'Jebali',
      role: 'intern',
    }),
    upsertUser({
      clerkId: 'seed_user_applicant_7',
      email: 'fares@esprit.tn',
      firstName: 'Fares',
      lastName: 'Mejri',
      role: 'intern',
    }),
  ]);

  type ProfileSeed = {
    university: string;
    yearOfStudy: string;
    fieldOfStudy: string;
    city: string;
    preferredLanguage: 'fr' | 'en';
    skills: string[];
    roles: string[];
  };
  const profileSeedByEmail: Record<string, ProfileSeed> = {
    'imen@ensi.utm.tn': {
      university: 'ensi',
      yearOfStudy: 'M1',
      fieldOfStudy: 'Software Engineering',
      city: 'Tunis',
      preferredLanguage: 'fr',
      skills: ['React', 'TypeScript', 'Node', 'Tailwind'],
      roles: ['Engineering', 'Frontend'],
    },
    'rayen@essec.tn': {
      university: 'essec-tunis',
      yearOfStudy: 'L3',
      fieldOfStudy: 'Marketing',
      city: 'Tunis',
      preferredLanguage: 'fr',
      skills: ['Copywriting', 'Brand voice', 'French + English', 'Instagram'],
      roles: ['Marketing', 'Content'],
    },
    'syrine@insat.utm.tn': {
      university: 'insat',
      yearOfStudy: 'L3',
      fieldOfStudy: 'Computer Science',
      city: 'Tunis',
      preferredLanguage: 'fr',
      skills: ['User research', 'Figma', 'Notion', 'Prototyping'],
      roles: ['Product', 'Design'],
    },
    'fares@esprit.tn': {
      university: 'esprit',
      yearOfStudy: 'M2',
      fieldOfStudy: 'Design',
      city: 'Sousse',
      preferredLanguage: 'fr',
      skills: ['After Effects', 'Lottie', 'Figma', 'Motion'],
      roles: ['Design', 'Motion'],
    },
  };

  for (const a of extraApplicants) {
    const existingExtra = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, a.id))
      .limit(1);
    if (existingExtra[0]) continue;
    const p = profileSeedByEmail[a.email];
    if (!p) continue;
    await db.insert(profiles).values({
      userId: a.id,
      university: p.university,
      yearOfStudy: p.yearOfStudy,
      fieldOfStudy: p.fieldOfStudy,
      city: p.city,
      preferredLanguage: p.preferredLanguage,
      skills: p.skills,
      roles: p.roles,
      portfolioLinks: [],
      profileStep: 'complete',
    });
  }

  // --- Applications (Yasmine + new applicants across new internships) ---
  const beyondUx = internshipByKey.get('beyondUxResearch')!;
  const beyondFe = internshipByKey.get('beyondFrontend')!;
  const greenvibeContent = internshipByKey.get('greenvibeContent')!;
  const greenvibeSocial = internshipByKey.get('greenvibeSocial')!;
  const foretEditor = internshipByKey.get('foretEditor')!;
  const acmeJuniorProduct = internshipByKey.get('acmeJuniorProduct')!;
  const acmeMotion = internshipByKey.get('acmeMotion')!;

  type SeedApp = {
    internshipId: string;
    applicantId: string;
    status: 'new' | 'reviewed' | 'shortlisted' | 'interview' | 'accepted' | 'rejected';
    coverNote: string;
    internalNotes?: string | null;
  };

  const extraApps: SeedApp[] = [
    // Yasmine: 2 more applications
    {
      internshipId: beyondUx.id,
      applicantId: yasmine.id,
      status: 'reviewed',
      coverNote:
        'I led discovery on a small product last semester — would love to repeat the pattern at Beyond.',
    },
    {
      internshipId: greenvibeContent.id,
      applicantId: yasmine.id,
      status: 'shortlisted',
      coverNote: 'Big fan of GreenVibe campaigns. Comfortable writing in FR + EN.',
      internalNotes: 'Strong sample. Schedule call.',
    },
    // Other applicants — distribute 6 across new internships, varied statuses
    {
      internshipId: beyondFe.id,
      applicantId: extraApplicants[0].id,
      status: 'shortlisted',
      coverNote: 'Built a React + TS dashboard for my final-year project. Ready to ship.',
      internalNotes: 'Send tech screen link.',
    },
    {
      internshipId: foretEditor.id,
      applicantId: extraApplicants[1].id,
      status: 'reviewed',
      coverNote: 'Bilingual editor with ESSEC marketing background. Founder interview tape attached.',
    },
    {
      internshipId: greenvibeSocial.id,
      applicantId: extraApplicants[1].id,
      status: 'new',
      coverNote: 'Run the Instagram for my student org — 12k followers, organic growth.',
    },
    {
      internshipId: beyondUx.id,
      applicantId: extraApplicants[2].id,
      status: 'new',
      coverNote: 'INSAT CS, but research is what gets me out of bed.',
    },
    {
      internshipId: acmeJuniorProduct.id,
      applicantId: extraApplicants[2].id,
      status: 'reviewed',
      coverNote: 'Designed three mobile flows for our internal hackathon win.',
    },
    {
      internshipId: acmeMotion.id,
      applicantId: extraApplicants[3].id,
      status: 'shortlisted',
      coverNote: 'After Effects since 2022. Reel attached. Lottie-ready.',
      internalNotes: 'Reel is solid. Move to interview.',
    },
  ];

  for (const a of extraApps) {
    const existing = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.internshipId, a.internshipId),
          eq(applications.applicantId, a.applicantId),
        ),
      )
      .limit(1);
    if (existing[0]) continue;
    await db.insert(applications).values({
      internshipId: a.internshipId,
      applicantId: a.applicantId,
      status: a.status,
      coverNote: a.coverNote,
      internalNotes: a.internalNotes ?? null,
    });
  }

  // --- Bookmarks for Yasmine (3 internships) ---
  const bookmarkIds = [beyondFe.id, foretEditor.id, acmeJuniorProduct.id];
  for (const internshipId of bookmarkIds) {
    await db
      .insert(internshipBookmarks)
      .values({ internId: yasmine.id, internshipId })
      .onConflictDoNothing();
  }

  // --- Comments on Yasmine's workspace ---
  // The tasks + deliverables tables get wiped + re-inserted on every seed
  // run, which cascades comments that reference them. So we check workspace
  // comments and task/deliv comments independently to keep the seed truly
  // idempotent across re-runs.
  const moodboardTaskRow = taskByTag.get('BA-005');
  const submittedDeliv = insertedDelivs.find(
    (d) => d.title === 'Brand audit · stakeholder findings',
  );

  const existingWorkspaceComments = await db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.workspaceId, workspace.id),
        sql`task_id IS NULL AND deliverable_id IS NULL`,
      ),
    )
    .limit(1);
  if (!existingWorkspaceComments[0]) {
    await db.insert(comments).values([
      {
        workspaceId: workspace.id,
        authorId: mehdi.id,
        body: 'Great progress this week — the stakeholder synthesis is sharp. Let me know when you start moodboards.',
      },
      {
        workspaceId: workspace.id,
        authorId: yasmine.id,
        body: 'Thanks! Starting moodboards today. I will share three directions by Friday.',
      },
      {
        workspaceId: workspace.id,
        authorId: mehdi.id,
        body: 'Sounds good. Push them as a single Figma file so I can comment inline.',
      },
    ]);
  }

  if (moodboardTaskRow) {
    const existingTaskComment = await db
      .select()
      .from(comments)
      .where(eq(comments.taskId, moodboardTaskRow.id))
      .limit(1);
    if (!existingTaskComment[0]) {
      await db.insert(comments).values({
        workspaceId: workspace.id,
        taskId: moodboardTaskRow.id,
        authorId: yasmine.id,
        body: 'First direction is more editorial, second is bolder. Will add the third tomorrow.',
      });
    }
  }

  if (submittedDeliv) {
    const existingDelivComment = await db
      .select()
      .from(comments)
      .where(eq(comments.deliverableId, submittedDeliv.id))
      .limit(1);
    if (!existingDelivComment[0]) {
      await db.insert(comments).values({
        workspaceId: workspace.id,
        deliverableId: submittedDeliv.id,
        authorId: mehdi.id,
        body: 'Loved the TL;DR — that landed well with the team. Ship v2.',
      });
    }
  }

  // --- Weekly check-in (event of type checkin.submitted) + AI followup ---
  const days = (d: number) => new Date(Date.now() - d * 24 * 3600_000);
  const existingCheckin = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.targetId, workspace.id),
        eq(events.type, 'checkin.submitted'),
      ),
    )
    .limit(1);
  if (!existingCheckin[0]) {
    await db.insert(events).values([
      {
        type: 'checkin.submitted',
        actorId: yasmine.id,
        targetType: 'workspace',
        targetId: workspace.id,
        metadata: {
          shipped:
            '- Closed BA-001 Kickoff brief sign-off\n- Closed BA-002 Stakeholder interviews · 6 of 6\n- Submitted Brand audit · stakeholder findings (v1)',
          stuck:
            '- Still working through BA-003 Audit slide deck · v2\n- Need feedback on Brand audit findings revisions',
          next:
            '- Start BA-005 Visual exploration · moodboards\n- Start BA-006 Type pairings — 3 options',
          authorName: 'Yasmine Ben Salah',
          aiDraftFollowup:
            'Suggested focus next week: lock the moodboard direction with Mehdi before opening logo work.',
          source: 'ai',
        },
        createdAt: days(6),
      },
    ]);
  }

  // --- Extra realism: ~10 more timeline events spread across last 14 days ---
  // Task/deliv-targeted events reference newly-inserted task IDs (re-created
  // on every seed run). Wipe any prior seed events by metadata.seed tag
  // before re-inserting to stay idempotent.
  const SEED_TAG = 'sprint-c-extra';
  await db.delete(events).where(sql`metadata->>'seed' = ${SEED_TAG}`);

  const typePairingsTaskRow = taskByTag.get('BA-006');
  const logoTaskRow = taskByTag.get('BA-007');
  const moodboardDelivRow = insertedDelivs.find(
    (d) => d.title === 'Visual exploration · moodboards',
  );
  const auditDelivRow = insertedDelivs.find(
    (d) => d.title === 'Brand audit · stakeholder findings',
  );

  const taskDelivEvents: Array<typeof events.$inferInsert> = [];
  if (moodboardTaskRow) {
    taskDelivEvents.push({
      type: 'task.moved',
      actorId: yasmine.id,
      targetType: 'task',
      targetId: moodboardTaskRow.id,
      metadata: { seed: SEED_TAG, tag: 'BA-005', to: 'in-progress' },
      createdAt: days(1),
    });
  }
  if (typePairingsTaskRow) {
    taskDelivEvents.push({
      type: 'comment.added',
      actorId: yasmine.id,
      targetType: 'task',
      targetId: typePairingsTaskRow.id,
      metadata: { seed: SEED_TAG, scope: 'task', text: 'Trying a serif + grotesk combo next.' },
      createdAt: days(2),
    });
  }
  if (logoTaskRow) {
    taskDelivEvents.push({
      type: 'task.moved',
      actorId: mehdi.id,
      targetType: 'task',
      targetId: logoTaskRow.id,
      metadata: { seed: SEED_TAG, tag: 'BA-007', to: 'todo' },
      createdAt: days(3),
    });
  }
  if (moodboardDelivRow) {
    taskDelivEvents.push({
      type: 'deliverable.submitted',
      actorId: yasmine.id,
      targetType: 'deliverable',
      targetId: moodboardDelivRow.id,
      metadata: { seed: SEED_TAG, name: 'Visual exploration · moodboards', version: 1 },
      createdAt: days(4),
    });
  }
  if (auditDelivRow) {
    taskDelivEvents.push({
      type: 'deliverable.approved',
      actorId: mehdi.id,
      targetType: 'deliverable',
      targetId: auditDelivRow.id,
      metadata: { seed: SEED_TAG, name: 'Brand audit · stakeholder findings' },
      createdAt: days(5),
    });
  }
  if (taskDelivEvents.length > 0) {
    await db.insert(events).values(taskDelivEvents);
  }

  // application.received events on internships (also tagged with SEED_TAG so
  // they get wiped + re-inserted alongside the task/deliv events above).
  await db.insert(events).values([
    {
      type: 'application.received',
      actorId: extraApplicants[0].id,
      targetType: 'internship',
      targetId: beyondFe.id,
      metadata: { seed: SEED_TAG, applicantName: 'Imen Bouzid' },
      createdAt: days(7),
    },
    {
      type: 'application.received',
      actorId: extraApplicants[1].id,
      targetType: 'internship',
      targetId: foretEditor.id,
      metadata: { seed: SEED_TAG, applicantName: 'Rayen Trabelsi' },
      createdAt: days(9),
    },
    {
      type: 'application.received',
      actorId: extraApplicants[2].id,
      targetType: 'internship',
      targetId: beyondUx.id,
      metadata: { seed: SEED_TAG, applicantName: 'Syrine Jebali' },
      createdAt: days(11),
    },
    {
      type: 'application.received',
      actorId: extraApplicants[3].id,
      targetType: 'internship',
      targetId: acmeMotion.id,
      metadata: { seed: SEED_TAG, applicantName: 'Fares Mejri' },
      createdAt: days(13),
    },
    {
      type: 'application.received',
      actorId: yasmine.id,
      targetType: 'internship',
      targetId: greenvibeContent.id,
      metadata: { seed: SEED_TAG, applicantName: 'Yasmine Ben Salah' },
      createdAt: days(12),
    },
  ]);

  // ============================================================
  // Sam-accounts seed: bind rich data to Sam's 3 sign-in emails so
  // admin / company / intern dashboards have real content when he
  // signs in. Looks users up by email (stable key) so this works
  // across DBs. Fully idempotent — safe to re-run.
  // ============================================================
  await seedSamAccounts({
    candidateApplicants: [
      ...applicants, // Lina, Amir, Sarra
      ...extraApplicants, // Imen, Rayen, Syrine, Fares
    ],
  });

  return {
    workspaceId: workspace.id,
    internUserId: yasmine.id,
    supervisorUserId: mehdi.id,
    organizationId: acme.id,
    projectId: project.id,
    uxInternshipId: uxInternship.id,
    applicantUserIds: applicants.map((a) => a.id),
    extraApplicantUserIds: extraApplicants.map((a) => a.id),
    organizationIds: {
      acme: acme.id,
      beyond: beyond.id,
      greenvibe: greenvibe.id,
      foret: foret.id,
    },
    projectIds: {
      brandAudit: project.id,
      mobileDiscovery: beyondProject.id,
      ecoCampaignQ3: greenvibeProject.id,
      founderContent: foretProject.id,
    },
    internshipIds: {
      acmeVisual: internship.id,
      acmeUx: uxInternship.id,
      acmeJuniorProduct: acmeJuniorProduct.id,
      acmeMotion: acmeMotion.id,
      acmeDataViz: internshipByKey.get('acmeDataViz')!.id,
      beyondUxResearch: beyondUx.id,
      beyondFrontend: beyondFe.id,
      greenvibeContent: greenvibeContent.id,
      greenvibeSocial: greenvibeSocial.id,
      foretEditor: foretEditor.id,
    },
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
