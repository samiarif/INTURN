import { describe, it, expect, vi, beforeEach } from 'vitest';

// Thenable FIFO select-chain mock: awaiting the chain at any point resolves the
// next queued row-set (so both `await …orderBy()` and `await …limit()` work).
const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  function makeSelectChain() {
    const result = () => Promise.resolve(selectQueue.shift() ?? []);
    const chain: Record<string, unknown> = {
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        result().then(onF, onR),
    };
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit']) {
      chain[m] = vi.fn(() => chain);
    }
    return chain;
  }
  const db = { select: vi.fn(() => makeSelectChain()) };
  return { db, selectQueue };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  applications: {},
  events: {},
  internships: {},
  organizations: {},
  profiles: {},
  users: {},
}));
vi.mock('drizzle-orm', () => ({
  and: vi.fn(() => 'and'),
  asc: vi.fn(() => 'asc'),
  desc: vi.fn(() => 'desc'),
  eq: vi.fn(() => 'eq'),
  inArray: vi.fn(() => 'inArray'),
}));

import { getApplicationTimeline } from '../queries';

const d = (iso: string) => new Date(iso);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

describe('getApplicationTimeline', () => {
  it('maps a created→reviewed→shortlisted event stream to ordered steps', async () => {
    mocks.selectQueue.push([
      { type: 'application.created', metadata: null, createdAt: d('2026-05-01T09:00:00Z') },
      { type: 'application.status.changed', metadata: { to: 'reviewed' }, createdAt: d('2026-05-03T09:00:00Z') },
      { type: 'application.status.changed', metadata: { to: 'shortlisted' }, createdAt: d('2026-05-06T09:00:00Z') },
    ]);

    const timeline = await getApplicationTimeline('app1');

    expect(timeline.map((e) => e.status)).toEqual(['applied', 'reviewed', 'shortlisted']);
    expect(timeline[0].at).toEqual(d('2026-05-01T09:00:00Z'));
    expect(timeline[2].at).toEqual(d('2026-05-06T09:00:00Z'));
  });

  it('collapses the duplicate accepted (status.changed + application.accepted) into one entry', async () => {
    mocks.selectQueue.push([
      { type: 'application.created', metadata: null, createdAt: d('2026-05-01T09:00:00Z') },
      { type: 'application.status.changed', metadata: { to: 'shortlisted' }, createdAt: d('2026-05-04T09:00:00Z') },
      { type: 'application.status.changed', metadata: { to: 'accepted' }, createdAt: d('2026-05-07T09:00:00Z') },
      { type: 'application.accepted', metadata: { workspaceId: 'ws1' }, createdAt: d('2026-05-07T09:00:01Z') },
    ]);

    const timeline = await getApplicationTimeline('app1');

    expect(timeline.map((e) => e.status)).toEqual(['applied', 'shortlisted', 'accepted']);
    // The retained accepted is the earliest of the two (the status.changed row).
    expect(timeline[2].at).toEqual(d('2026-05-07T09:00:00Z'));
  });

  it('falls back to applied + current status when there are no events (legacy row)', async () => {
    mocks.selectQueue.push([]); // no events
    mocks.selectQueue.push([{ createdAt: d('2026-04-20T08:00:00Z'), status: 'reviewed' }]); // app fetch

    const timeline = await getApplicationTimeline('legacy1');

    expect(timeline).toEqual([
      { status: 'applied', at: d('2026-04-20T08:00:00Z') },
      { status: 'reviewed', at: d('2026-04-20T08:00:00Z') },
    ]);
  });

  it('returns just applied for a brand-new legacy row still in "new"', async () => {
    mocks.selectQueue.push([]); // no events
    mocks.selectQueue.push([{ createdAt: d('2026-04-20T08:00:00Z'), status: 'new' }]);

    const timeline = await getApplicationTimeline('legacy2');

    expect(timeline).toEqual([{ status: 'applied', at: d('2026-04-20T08:00:00Z') }]);
  });
});
