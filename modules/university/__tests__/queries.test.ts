import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    return chain;
  }
  const db = { select: vi.fn(() => makeSelectChain()) };
  return { db, selectQueue };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  workspaces: {}, internships: {}, organizations: {}, projects: {}, users: {},
  organizationMembers: {}, profiles: {},
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and'), desc: vi.fn(() => 'desc'),
}));

import { getStudentInternshipSnapshot, getManagedStudents } from '../queries';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

// The fields the snapshot is ALLOWED to surface.
const ALLOWED = [
  'companyName', 'internshipTitle', 'startDate', 'endDate', 'durationWeeks',
  'status', 'currentPhaseIndex', 'phaseCount', 'phaseNames', 'weekCurrent', 'weekTotal',
];
// Fields that must NEVER leak (private workspace internals).
const FORBIDDEN = [
  'tasks', 'deliverables', 'comments', 'brief', 'goals', 'supervisorIds',
  'workspaceId', 'internId', 'fromWeek', 'toWeek', 'description', 'phases',
  'notes', 'feedback',
];

describe('getStudentInternshipSnapshot — firewall', () => {
  it('returns null when the student has no workspace ("not yet placed")', async () => {
    mocks.selectQueue.push([]); // no workspace row
    const snap = await getStudentInternshipSnapshot('student-1');
    expect(snap).toBeNull();
  });

  it('returns ONLY the safe projection (no private fields)', async () => {
    // Row 1: workspace + internship + organization join.
    mocks.selectQueue.push([
      {
        workspaceId: 'ws1',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2026-03-26',
        durationWeeks: 12,
        companyName: 'Acme',
        internshipTitle: 'Brand audit',
        projectId: 'proj1',
      },
    ]);
    // Row 2: project (only phases needed).
    mocks.selectQueue.push([
      {
        phases: [
          { name: 'Discovery', description: 'SECRET', fromWeek: 1, toWeek: 4 },
          { name: 'Build', description: 'SECRET', fromWeek: 5, toWeek: 12 },
        ],
        startDate: '2026-01-01',
      },
    ]);

    const snap = await getStudentInternshipSnapshot('student-1');
    expect(snap).not.toBeNull();
    const keys = Object.keys(snap!);

    // Every returned key is on the allow-list.
    for (const k of keys) expect(ALLOWED).toContain(k);
    // None of the forbidden keys are present at the top level.
    for (const f of FORBIDDEN) expect(keys).not.toContain(f);

    // phaseNames carries ONLY names — never descriptions or week boundaries.
    expect(snap!.phaseNames).toEqual(['Discovery', 'Build']);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('fromWeek');
    expect(serialized).not.toContain('toWeek');

    expect(snap!.phaseCount).toBe(2);
    expect(snap!.companyName).toBe('Acme');
    expect(snap!.internshipTitle).toBe('Brand audit');
    expect(typeof snap!.currentPhaseIndex).toBe('number');
    expect(snap!.weekTotal).toBe(12);
  });

  it('handles a placed student with no project/phases (empty phase arc)', async () => {
    mocks.selectQueue.push([
      {
        workspaceId: 'ws1', status: 'active', startDate: '2026-01-01',
        endDate: '2026-03-26', durationWeeks: 12, companyName: 'Acme',
        internshipTitle: 'Brand audit', projectId: null,
      },
    ]);
    // No second select happens when projectId is null — but if the impl always
    // queries, queue an empty result so the FIFO doesn't underflow.
    mocks.selectQueue.push([]);

    const snap = await getStudentInternshipSnapshot('student-1');
    expect(snap).not.toBeNull();
    expect(snap!.phaseNames).toEqual([]);
    expect(snap!.phaseCount).toBe(0);
    expect(snap!.currentPhaseIndex).toBe(0);
  });
});

describe('getManagedStudents', () => {
  it('returns active student-role members with user + profile fields', async () => {
    mocks.selectQueue.push([
      {
        memberId: 'm1',
        userId: 'stu-1',
        firstName: 'Lina',
        lastName: 'Ben',
        email: 'lina@uni.edu',
        imageUrl: null,
        university: 'ESPRIT',
        fieldOfStudy: 'Design',
        invitedAt: new Date('2026-01-01'),
        joinedAt: new Date('2026-01-02'),
      },
    ]);

    const rows = await getManagedStudents('uni-1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: 'stu-1', firstName: 'Lina', university: 'ESPRIT' });
  });

  it('returns [] when the university has no managed students', async () => {
    mocks.selectQueue.push([]);
    const rows = await getManagedStudents('uni-1');
    expect(rows).toEqual([]);
  });
});
