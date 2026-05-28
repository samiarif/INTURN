/**
 * ===========================================================================
 * OPT-IN DATABASE INTEGRATION TESTS  (NOT part of default CI / `pnpm test`)
 * ===========================================================================
 *
 * These hit a REAL Postgres (Neon) through the real services + Drizzle. They
 * are GATED behind the `DB_INTEGRATION` env var via `describe.skipIf`, so a
 * plain `pnpm vitest run` / CI run SKIPS them entirely — nothing connects to a
 * database and prod is never touched.
 *
 * HOW TO RUN (against a SCRATCH / CI database — NEVER prod):
 *
 *     # point DATABASE_URL at a throwaway branch DB, then:
 *     DATABASE_URL="postgres://…scratch…" pnpm test:integration
 *
 *   (`test:integration` sets DB_INTEGRATION=1 for you — see package.json.)
 *
 * SAFETY / CLEANLINESS:
 *   • Every row this suite creates is namespaced with a unique run id
 *     (`RUN = 'itest-<timestamp>'`) embedded in emails / slugs / titles.
 *   • `afterAll` deletes everything created by this run (by id, with FK
 *     cascades doing most of the work) so a real DB is left clean even if
 *     individual assertions fail.
 *
 * FOLLOW-UP: wiring this into CI with an ephemeral Neon branch (create branch
 * → migrate → DB_INTEGRATION=1 → drop branch) is a future task; intentionally
 * not done here so the default pipeline stays DB-free.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  users,
  organizations,
  projects,
  internships,
  applications,
  workspaces,
  events,
} from '@/db/schema';
import { createInternship, publishInternship } from '@/modules/internships/service';
import { listPublishedInternships } from '@/modules/internships/queries';
import { createApplication, acceptApplication } from '@/modules/applications/service';
import type { InternshipFormInput } from '@/modules/internships/validators';

const RUN = `itest-${Date.now()}`;

// Track everything we create so afterAll can delete by id regardless of which
// FK cascade would (or would not) have reached it.
const created = {
  userIds: [] as string[],
  orgIds: [] as string[],
  projectIds: [] as string[],
  internshipIds: [] as string[],
  applicationIds: [] as string[],
  workspaceIds: [] as string[],
  // event rows have no FK to the above, so they must be cleaned explicitly.
  eventTargetIds: [] as string[],
};

function internshipForm(overrides: Partial<InternshipFormInput> = {}): InternshipFormInput {
  return {
    title: `${RUN} Brand Audit Internship`,
    description: `Integration-test internship created by run ${RUN}. Long enough to clear the 20-char minimum.`,
    sector: 'Marketing',
    skills: ['figma', 'copywriting'],
    duration: 12,
    locationType: 'virtual',
    location: '',
    isPaid: true,
    compensation: '500 TND/mo',
    internCount: 1,
    language: 'en',
    deadline: '2099-12-31',
    customQuestions: [],
    ...overrides,
  };
}

async function makeUser(role: 'intern' | 'company', label: string) {
  const [u] = await db
    .insert(users)
    .values({
      clerkId: `${RUN}-${label}`,
      email: `${RUN}-${label}@example.test`,
      firstName: label,
      lastName: 'Itest',
      role,
    })
    .returning();
  created.userIds.push(u.id);
  return u;
}

async function makeVerifiedOrg(ownerId: string) {
  const [org] = await db
    .insert(organizations)
    .values({
      ownerId,
      name: `${RUN} Org`,
      slug: `${RUN}-org`,
      verificationStatus: 'verified',
      verified: true,
    })
    .returning();
  created.orgIds.push(org.id);
  return org;
}

async function makeProject(organizationId: string, supervisorId: string) {
  const [proj] = await db
    .insert(projects)
    .values({
      organizationId,
      name: `${RUN} Project`,
      slug: `${RUN}-project`,
      supervisorIds: [supervisorId],
      status: 'draft',
    })
    .returning();
  created.projectIds.push(proj.id);
  return proj;
}

afterAll(async () => {
  if (!process.env.DB_INTEGRATION) return;
  // Child → parent, but FK cascades also cover most of it. Delete events first
  // (no cascade reaches them), then orgs (cascades projects/internships/apps/
  // workspaces), then users (cascades their owned orgs + apps + workspaces +
  // notifications). Belt-and-suspenders: also delete the leaf tables by id.
  if (created.eventTargetIds.length) {
    await db.delete(events).where(inArray(events.targetId, created.eventTargetIds));
  }
  if (created.workspaceIds.length) {
    await db.delete(workspaces).where(inArray(workspaces.id, created.workspaceIds));
  }
  if (created.applicationIds.length) {
    await db.delete(applications).where(inArray(applications.id, created.applicationIds));
  }
  if (created.internshipIds.length) {
    await db.delete(internships).where(inArray(internships.id, created.internshipIds));
  }
  if (created.projectIds.length) {
    await db.delete(projects).where(inArray(projects.id, created.projectIds));
  }
  if (created.orgIds.length) {
    await db.delete(organizations).where(inArray(organizations.id, created.orgIds));
  }
  if (created.userIds.length) {
    await db.delete(users).where(inArray(users.id, created.userIds));
  }
});

describe.skipIf(!process.env.DB_INTEGRATION)('core flows (DB integration)', () => {
  describe('publish → marketplace', () => {
    it('a published internship from a verified org appears in the marketplace listing', async () => {
      const company = await makeUser('company', 'owner');
      const org = await makeVerifiedOrg(company.id);
      const project = await makeProject(org.id, company.id);

      const internship = await createInternship({
        projectId: project.id,
        organizationId: org.id,
        data: internshipForm(),
        actorId: company.id,
      });
      created.internshipIds.push(internship.id);
      created.eventTargetIds.push(internship.id);
      expect(internship.status).toBe('draft'); // not yet visible

      const published = await publishInternship({
        internshipId: internship.id,
        actorId: company.id,
      });
      expect(published.status).toBe('published');

      // Query the real marketplace path. Search by the unique run-id token so we
      // get a distinct unstable_cache key (no cross-run cache bleed) and a tight
      // result set.
      const listed = await listPublishedInternships({ search: RUN, limit: 50 });
      const match = listed.find((r) => r.internship.id === internship.id);

      expect(match).toBeDefined();
      expect(match?.internship.status).toBe('published');
      expect(match?.organization.id).toBe(org.id);
    });
  });

  describe('accept → workspace', () => {
    it('accepting an application creates a workspace and flips the application to accepted', async () => {
      const company = await makeUser('company', 'owner2');
      const intern = await makeUser('intern', 'intern2');
      const org = await makeVerifiedOrg(company.id);
      const project = await makeProject(org.id, company.id);

      const internship = await createInternship({
        projectId: project.id,
        organizationId: org.id,
        data: internshipForm(),
        actorId: company.id,
      });
      created.internshipIds.push(internship.id);
      created.eventTargetIds.push(internship.id);

      // Application starts at 'new'; promote through the funnel to 'shortlisted'
      // since accept is only valid from shortlisted/interview.
      const application = await createApplication({
        internshipId: internship.id,
        applicantId: intern.id,
        coverNote: `${RUN} please pick me`,
        actorId: intern.id,
      });
      created.applicationIds.push(application.id);
      created.eventTargetIds.push(application.id);

      await db
        .update(applications)
        .set({ status: 'shortlisted' })
        .where(eq(applications.id, application.id));

      const { workspace } = await acceptApplication({
        applicationId: application.id,
        actorId: company.id,
      });
      created.workspaceIds.push(workspace.id);
      created.eventTargetIds.push(workspace.id);

      // 1) a workspace row exists for this (intern, internship) pair
      const [wsRow] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspace.id))
        .limit(1);
      expect(wsRow).toBeDefined();
      expect(wsRow.internId).toBe(intern.id);
      expect(wsRow.internshipId).toBe(internship.id);

      // 2) the application is now 'accepted'
      const [appRow] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, application.id))
        .limit(1);
      expect(appRow.status).toBe('accepted');
    });
  });
});
