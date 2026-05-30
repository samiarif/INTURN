/**
 * Gather one workspace's raw signals and derive the model-ready `PulseSignals`.
 * Read-only. Reuses data the platform already stores — no new schema.
 */
import { db } from '@/db';
import {
  workspaces,
  users,
  internships,
  organizations,
  deliverables,
  tasks,
  events,
} from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { daysSince } from '@/lib/format-time';
import type { PulseSignals } from './types';

const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

export async function gatherPulseSignals(
  workspaceId: string,
  locale: 'fr' | 'en',
): Promise<PulseSignals | null> {
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!ws) return null;

  const [intern] = await db.select().from(users).where(eq(users.id, ws.internId)).limit(1);
  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, ws.internshipId))
    .limit(1);
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, ws.organizationId))
    .limit(1);

  const dels = await db.select().from(deliverables).where(eq(deliverables.workspaceId, workspaceId));
  const tks = await db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId));
  const checkinEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.targetId, workspaceId), eq(events.type, 'checkin.submitted')))
    .orderBy(desc(events.createdAt));
  const wsEvents = await db
    .select()
    .from(events)
    .where(eq(events.targetId, workspaceId))
    .orderBy(desc(events.createdAt))
    .limit(60);

  // Week-clock
  const weeksElapsed = ws.startDate ? Math.max(0, Math.floor(daysSince(ws.startDate) / 7)) : 0;
  let weeksTotal: number | null = internship?.duration ?? null;
  if (weeksTotal == null && ws.startDate && ws.endDate) {
    weeksTotal = Math.max(1, Math.round((+new Date(ws.endDate) - +new Date(ws.startDate)) / MS_PER_WEEK));
  }

  // Tasks
  const counts = { done: 0, 'in-progress': 0, review: 0, todo: 0 } as Record<string, number>;
  for (const t of tks) counts[t.status ?? 'todo'] = (counts[t.status ?? 'todo'] ?? 0) + 1;
  const lastTaskUpdate = tks.reduce<number | null>((acc, t) => {
    const ts = +new Date(t.updatedAt);
    return acc == null || ts > acc ? ts : acc;
  }, null);

  // Supervisor touch = most recent event by anyone who is NOT the intern
  const supTouch = wsEvents.find((e) => e.actorId && e.actorId !== ws.internId);

  return {
    locale,
    internName:
      [intern?.firstName, intern?.lastName].filter(Boolean).join(' ').trim() ||
      intern?.email ||
      'the intern',
    internshipTitle: internship?.title ?? 'Internship',
    orgName: org?.name ?? '',
    weeksElapsed,
    weeksTotal,
    checkins: checkinEvents.map((c) => {
      const m = (c.metadata ?? {}) as Record<string, unknown>;
      return {
        at: c.createdAt.toISOString(),
        shipped: String(m.shipped ?? ''),
        stuck: String(m.stuck ?? ''),
        next: String(m.next ?? ''),
      };
    }),
    deliverables: dels.map((d) => ({
      title: d.title,
      status: d.status ?? 'draft',
      version: d.version,
      revisions: Array.isArray(d.revisionHistory) ? (d.revisionHistory as unknown[]).length : 0,
      hasFeedback: Boolean(d.feedback && d.feedback.trim()),
      submittedAt: d.submittedAt ? d.submittedAt.toISOString() : null,
      daysSinceSubmit: d.submittedAt ? daysSince(d.submittedAt) : null,
    })),
    tasks: {
      total: tks.length,
      done: counts.done ?? 0,
      inProgress: counts['in-progress'] ?? 0,
      review: counts.review ?? 0,
      todo: counts.todo ?? 0,
      daysSinceAnyUpdate: lastTaskUpdate == null ? null : daysSince(new Date(lastTaskUpdate)),
    },
    daysSinceSupervisorTouch: supTouch ? daysSince(supTouch.createdAt) : null,
  };
}
