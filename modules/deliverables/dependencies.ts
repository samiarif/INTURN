import { cache } from 'react';
import { aliasedTable, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  deliverableDependencies,
  deliverables,
  workspaces,
  internships,
  users,
} from '@/db/schema';

/**
 * Read side of the deliverable-dependency layer (Phase 2 of the Project Command
 * Center). All edges live within a single project; "upstream feeds downstream".
 * A deliverable reaches its project via
 *   deliverables.workspaceId → workspaces.internshipId → internships.projectId
 * and its owning intern via workspaces.internId → users.
 *
 * These are pure projections — no auth here (callers gate). Writes + the cycle
 * guard live in ./dependency-actions.
 */

export type DeliverableEndpoint = {
  id: string;
  title: string;
  status: string;
  internName: string;
};

export type ProjectDependencyEdge = {
  id: string;
  upstream: DeliverableEndpoint;
  downstream: DeliverableEndpoint;
};

function displayName(firstName: string | null, lastName: string | null, email: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || email;
}

// Two independent joins onto deliverables/workspaces/users — one for the
// upstream end of each edge, one for the downstream. Drizzle needs aliased
// tables so the same physical table can appear twice in one statement.
const upstreamDeliv = aliasedTable(deliverables, 'upstream_deliv');
const downstreamDeliv = aliasedTable(deliverables, 'downstream_deliv');
const upstreamWs = aliasedTable(workspaces, 'upstream_ws');
const downstreamWs = aliasedTable(workspaces, 'downstream_ws');
const upstreamUser = aliasedTable(users, 'upstream_user');
const downstreamUser = aliasedTable(users, 'downstream_user');

/**
 * Every dependency edge in a project, enriched on both ends with the
 * deliverable's title/status and its owning intern's name. Feeds both the
 * supervisor editor (existing-edges list) and the command-center stuck signal.
 */
export const getProjectDependencies = cache(
  async (projectId: string): Promise<ProjectDependencyEdge[]> => {
    const rows = await db
      .select({
        id: deliverableDependencies.id,
        upstreamId: upstreamDeliv.id,
        upstreamTitle: upstreamDeliv.title,
        upstreamStatus: upstreamDeliv.status,
        upstreamFirst: upstreamUser.firstName,
        upstreamLast: upstreamUser.lastName,
        upstreamEmail: upstreamUser.email,
        downstreamId: downstreamDeliv.id,
        downstreamTitle: downstreamDeliv.title,
        downstreamStatus: downstreamDeliv.status,
        downstreamFirst: downstreamUser.firstName,
        downstreamLast: downstreamUser.lastName,
        downstreamEmail: downstreamUser.email,
      })
      .from(deliverableDependencies)
      .innerJoin(upstreamDeliv, eq(upstreamDeliv.id, deliverableDependencies.upstreamId))
      .innerJoin(upstreamWs, eq(upstreamWs.id, upstreamDeliv.workspaceId))
      .innerJoin(upstreamUser, eq(upstreamUser.id, upstreamWs.internId))
      .innerJoin(downstreamDeliv, eq(downstreamDeliv.id, deliverableDependencies.downstreamId))
      .innerJoin(downstreamWs, eq(downstreamWs.id, downstreamDeliv.workspaceId))
      .innerJoin(downstreamUser, eq(downstreamUser.id, downstreamWs.internId))
      .where(eq(deliverableDependencies.projectId, projectId));

    return rows.map((r) => ({
      id: r.id,
      upstream: {
        id: r.upstreamId,
        title: r.upstreamTitle,
        status: r.upstreamStatus ?? 'draft',
        internName: displayName(r.upstreamFirst, r.upstreamLast, r.upstreamEmail),
      },
      downstream: {
        id: r.downstreamId,
        title: r.downstreamTitle,
        status: r.downstreamStatus ?? 'draft',
        internName: displayName(r.downstreamFirst, r.downstreamLast, r.downstreamEmail),
      },
    }));
  },
);

export type DeliverableLinks = {
  dependsOn: DeliverableEndpoint[];
  feedsInto: Array<Pick<DeliverableEndpoint, 'id' | 'title' | 'internName'>>;
};

/**
 * The upstream/downstream awareness for one deliverable, from the intern's
 * point of view: `dependsOn` = the deliverables feeding INTO this one (this
 * deliverable is their downstream), `feedsInto` = the deliverables this one
 * feeds (this deliverable is their upstream). Awareness only — never gates.
 */
export const getDeliverableLinks = cache(
  async (deliverableId: string): Promise<DeliverableLinks> => {
    const map = await getWorkspaceDeliverableLinks([deliverableId]);
    return map.get(deliverableId) ?? { dependsOn: [], feedsInto: [] };
  },
);

/**
 * Batched variant: links for a set of deliverables in one pair of round-trips.
 * Preferred when rendering a whole workspace's deliverables (the intern view)
 * so we don't fan out one query per row. Returns a map keyed by deliverable id;
 * deliverables with no edges are simply absent (callers default to empty).
 */
export async function getWorkspaceDeliverableLinks(
  deliverableIds: string[],
): Promise<Map<string, DeliverableLinks>> {
  const out = new Map<string, DeliverableLinks>();
  if (deliverableIds.length === 0) return out;

  // dependsOn: edges whose downstream is one of ours → describe the upstream.
  // feedsInto: edges whose upstream is one of ours → describe the downstream.
  const [dependsOnRows, feedsIntoRows] = await Promise.all([
    db
      .select({
        anchorId: deliverableDependencies.downstreamId,
        otherId: upstreamDeliv.id,
        otherTitle: upstreamDeliv.title,
        otherStatus: upstreamDeliv.status,
        otherFirst: upstreamUser.firstName,
        otherLast: upstreamUser.lastName,
        otherEmail: upstreamUser.email,
      })
      .from(deliverableDependencies)
      .innerJoin(upstreamDeliv, eq(upstreamDeliv.id, deliverableDependencies.upstreamId))
      .innerJoin(upstreamWs, eq(upstreamWs.id, upstreamDeliv.workspaceId))
      .innerJoin(upstreamUser, eq(upstreamUser.id, upstreamWs.internId))
      .where(inArray(deliverableDependencies.downstreamId, deliverableIds)),
    db
      .select({
        anchorId: deliverableDependencies.upstreamId,
        otherId: downstreamDeliv.id,
        otherTitle: downstreamDeliv.title,
        otherStatus: downstreamDeliv.status,
        otherFirst: downstreamUser.firstName,
        otherLast: downstreamUser.lastName,
        otherEmail: downstreamUser.email,
      })
      .from(deliverableDependencies)
      .innerJoin(downstreamDeliv, eq(downstreamDeliv.id, deliverableDependencies.downstreamId))
      .innerJoin(downstreamWs, eq(downstreamWs.id, downstreamDeliv.workspaceId))
      .innerJoin(downstreamUser, eq(downstreamUser.id, downstreamWs.internId))
      .where(inArray(deliverableDependencies.upstreamId, deliverableIds)),
  ]);

  const ensure = (id: string): DeliverableLinks => {
    let entry = out.get(id);
    if (!entry) {
      entry = { dependsOn: [], feedsInto: [] };
      out.set(id, entry);
    }
    return entry;
  };

  for (const r of dependsOnRows) {
    ensure(r.anchorId).dependsOn.push({
      id: r.otherId,
      title: r.otherTitle,
      status: r.otherStatus ?? 'draft',
      internName: displayName(r.otherFirst, r.otherLast, r.otherEmail),
    });
  }
  for (const r of feedsIntoRows) {
    ensure(r.anchorId).feedsInto.push({
      id: r.otherId,
      title: r.otherTitle,
      internName: displayName(r.otherFirst, r.otherLast, r.otherEmail),
    });
  }

  return out;
}

export type LinkableDeliverable = {
  id: string;
  title: string;
  internName: string;
  workspaceId: string;
};

/**
 * Every deliverable in a project (across all interns' workspaces) with its
 * owning intern's name — populates the upstream/downstream selects in the
 * supervisor dependency editor.
 */
export const getProjectDeliverablesForLinking = cache(
  async (projectId: string): Promise<LinkableDeliverable[]> => {
    const rows = await db
      .select({
        id: deliverables.id,
        title: deliverables.title,
        workspaceId: deliverables.workspaceId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(deliverables)
      .innerJoin(workspaces, eq(workspaces.id, deliverables.workspaceId))
      .innerJoin(internships, eq(internships.id, workspaces.internshipId))
      .innerJoin(users, eq(users.id, workspaces.internId))
      .where(eq(internships.projectId, projectId))
      .orderBy(deliverables.createdAt);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      workspaceId: r.workspaceId,
      internName: displayName(r.firstName, r.lastName, r.email),
    }));
  },
);

/**
 * The projectId a deliverable belongs to, resolved through
 * workspace → internship → project. Returns null when the deliverable is
 * missing or its internship has no project. Used by the actions to validate
 * both endpoints land in the same project before inserting an edge.
 */
export async function resolveDeliverableProjectId(
  deliverableId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ projectId: internships.projectId })
    .from(deliverables)
    .innerJoin(workspaces, eq(workspaces.id, deliverables.workspaceId))
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .where(eq(deliverables.id, deliverableId))
    .limit(1);
  return row?.projectId ?? null;
}

/** Bare {upstreamId, downstreamId} edges for a project — fuel for the in-memory cycle walk. */
export async function getProjectEdgePairs(
  projectId: string,
): Promise<Array<{ upstreamId: string; downstreamId: string }>> {
  return db
    .select({
      upstreamId: deliverableDependencies.upstreamId,
      downstreamId: deliverableDependencies.downstreamId,
    })
    .from(deliverableDependencies)
    .where(eq(deliverableDependencies.projectId, projectId));
}

/**
 * Would adding `upstreamId → downstreamId` create a cycle? Walk the EXISTING
 * edges in the project's DAG starting from `downstreamId`, following the
 * upstream→downstream direction; if `upstreamId` is reachable, the new edge
 * closes a loop. Pure + in-memory so callers load the edge set once.
 */
export function wouldCreateCycle(
  edges: Array<{ upstreamId: string; downstreamId: string }>,
  upstreamId: string,
  downstreamId: string,
): boolean {
  // Adjacency: upstream → [downstreams].
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const arr = adj.get(e.upstreamId);
    if (arr) arr.push(e.downstreamId);
    else adj.set(e.upstreamId, [e.downstreamId]);
  }

  // BFS from downstreamId. If we ever reach upstreamId, downstream already
  // (transitively) feeds upstream, so upstream→downstream would be a cycle.
  const seen = new Set<string>([downstreamId]);
  const queue: string[] = [downstreamId];
  while (queue.length > 0) {
    const node = queue.shift() as string;
    if (node === upstreamId) return true;
    for (const next of adj.get(node) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}
