import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  function chain() {
    const c: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) c[m] = vi.fn(() => c);
    c.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    (c as { then?: unknown }).then = (res: (v: unknown) => void) => res(selectQueue.shift() ?? []);
    return c;
  }
  const db = { select: vi.fn(() => chain()) };
  return { db, selectQueue };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  organizationMembers: {},
  internships: {},
  projects: {},
  users: {},
  workspaces: {},
  organizations: {},
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  and: vi.fn(() => 'and'),
  desc: vi.fn(() => 'desc'),
  inArray: vi.fn(() => 'inArray'),
}));

import { getOrgMembers, getOrgInterns } from '../queries';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

describe('getOrgMembers', () => {
  it('returns empty array when no members found', async () => {
    mocks.selectQueue.push([]);
    const result = await getOrgMembers('org1');
    expect(result).toEqual([]);
  });

  it('returns the rows it queried', async () => {
    const rows = [
      { id: 'm1', organizationId: 'org1', email: 'a@test.com', role: 'admin', status: 'active' },
      { id: 'm2', organizationId: 'org1', email: 'b@test.com', role: 'supervisor', status: 'invited' },
    ];
    mocks.selectQueue.push(rows);
    const result = await getOrgMembers('org1');
    expect(result).toEqual(rows);
    expect(result).toHaveLength(2);
  });
});

describe('getOrgInterns', () => {
  it('returns empty array when no interns found', async () => {
    mocks.selectQueue.push([]);
    const result = await getOrgInterns('org1');
    expect(result).toEqual([]);
  });

  it('maps joined row fields correctly', async () => {
    const row = {
      workspaceId: 'ws1',
      status: 'active',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      internId: 'u1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      imageUrl: null,
      internshipId: 'int1',
      internshipTitle: 'Frontend Internship',
      projectId: 'proj1',
      projectName: 'My Project',
      supervisorIds: ['sup1'],
    };
    mocks.selectQueue.push([row]);
    const interns = await getOrgInterns('org1');
    expect(interns).toHaveLength(1);
    expect(interns[0].internshipTitle).toBe('Frontend Internship');
    expect(interns[0].projectName).toBe('My Project');
    expect(interns[0].startDate).toBe('2026-01-01');
    expect(interns[0].firstName).toBe('Alice');
    expect(interns[0].supervisorIds).toEqual(['sup1']);
  });

  it('handles null project (no project linked to internship)', async () => {
    const row = {
      workspaceId: 'ws2',
      status: 'active',
      startDate: null,
      endDate: null,
      internId: 'u2',
      firstName: 'Bob',
      lastName: null,
      email: 'bob@example.com',
      imageUrl: null,
      internshipId: 'int2',
      internshipTitle: 'Backend Internship',
      projectId: null,
      projectName: null,
      supervisorIds: null,
    };
    mocks.selectQueue.push([row]);
    const interns = await getOrgInterns('org1');
    expect(interns[0].projectId).toBeNull();
    expect(interns[0].projectName).toBeNull();
    expect(interns[0].supervisorIds).toBeNull();
  });
});
