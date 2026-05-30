import { db } from '@/db';
import { applications, events, internships, organizations, profiles, users } from '@/db/schema';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { ApplicationStatus } from './state-machine';

export async function getApplicationsByApplicant(applicantId: string) {
  return db
    .select({ application: applications, internship: internships })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .where(eq(applications.applicantId, applicantId))
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationsByProject(projectId: string) {
  const projectInternships = await db
    .select()
    .from(internships)
    .where(eq(internships.projectId, projectId));
  const internshipIds = projectInternships.map((i) => i.id);
  if (internshipIds.length === 0) return [];
  return db
    .select({
      application: applications,
      internship: internships,
      applicant: users,
      profile: profiles,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .leftJoin(profiles, eq(profiles.userId, applications.applicantId))
    .where(inArray(applications.internshipId, internshipIds))
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationById(id: string) {
  const [row] = await db
    .select({
      application: applications,
      internship: internships,
      applicant: users,
      profile: profiles,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .leftJoin(profiles, eq(profiles.userId, applications.applicantId))
    .where(eq(applications.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Fetch organizations by a set of IDs — used on the intern dashboard to
 * display org info alongside recent applications.
 */
export async function getOrganizationsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(organizations).where(inArray(organizations.id, ids));
}

export async function getApplicationsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({
      application: applications,
      internship: internships,
      applicant: users,
      profile: profiles,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .leftJoin(profiles, eq(profiles.userId, applications.applicantId))
    .where(inArray(applications.id, ids));
}

export type TimelineEntry = { status: ApplicationStatus | 'applied'; at: Date };

/**
 * Derive an application's status history from the immutable `events` log — no
 * dedicated history table. Reads every application-scoped event (covered by
 * events_target_created_idx) and maps:
 *   application.created        → 'applied'
 *   application.status.changed → metadata.to
 *   application.accepted       → 'accepted'
 * Collapses repeated statuses (accept emits status.changed(accepted) AND
 * application.accepted), keeping the earliest, ascending by time. For legacy
 * applications with no events, falls back to [applied @ createdAt] (+ current
 * status if past 'new').
 */
export async function getApplicationTimeline(applicationId: string): Promise<TimelineEntry[]> {
  const rows = await db
    .select({ type: events.type, metadata: events.metadata, createdAt: events.createdAt })
    .from(events)
    .where(and(eq(events.targetType, 'application'), eq(events.targetId, applicationId)))
    .orderBy(asc(events.createdAt));

  const entries: TimelineEntry[] = [];
  for (const r of rows) {
    if (r.type === 'application.created') {
      entries.push({ status: 'applied', at: r.createdAt });
    } else if (r.type === 'application.status.changed') {
      const to = (r.metadata as { to?: string } | null)?.to;
      if (to) entries.push({ status: to as ApplicationStatus, at: r.createdAt });
    } else if (r.type === 'application.accepted') {
      entries.push({ status: 'accepted', at: r.createdAt });
    }
  }

  // Collapse repeated statuses (keep the earliest), ascending by time.
  const seen = new Set<string>();
  const deduped = entries
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .filter((e) => (seen.has(e.status) ? false : (seen.add(e.status), true)));

  if (deduped.length > 0) return deduped;

  // Legacy/sparse fallback: no events recorded for this application.
  const [app] = await db
    .select({ createdAt: applications.createdAt, status: applications.status })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return [];
  const fallback: TimelineEntry[] = [{ status: 'applied', at: app.createdAt }];
  if (app.status && app.status !== 'new') {
    fallback.push({ status: app.status as ApplicationStatus, at: app.createdAt });
  }
  return fallback;
}
