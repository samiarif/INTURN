import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  function makeSelectChain() {
    const rows = mocks.selectQueue.shift() ?? [];
    // drizzle query builders are thenable; model the whole chain as thenable so
    // a chain terminated on .orderBy(...) (no .limit) still awaits to rows.
    const chain: Record<string, unknown> = {
      then: (res: (v: unknown) => unknown) => res(rows),
    };
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) chain[m] = () => chain;
    chain.limit = () => Promise.resolve(rows);
    return chain;
  }
  const db = { select: vi.fn(() => makeSelectChain()) };
  return { db, selectQueue };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  academicReports: {}, academicReportComments: {}, users: {}, organizationMembers: {},
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and'), desc: vi.fn(() => 'desc'), asc: vi.fn(() => 'asc'), inArray: vi.fn(() => 'inArray') }));

import {
  getReportForStudent,
  getReportComments,
  countReportsAwaitingReview,
  getReportStatusByStudent,
} from '../queries';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

describe('getReportForStudent', () => {
  it('returns the latest rapport for the student+university pair', async () => {
    mocks.selectQueue.push([{ id: 'r1', status: 'submitted', version: 2 }]);
    const r = await getReportForStudent('stu1', 'uni1');
    expect(r).toMatchObject({ id: 'r1', status: 'submitted' });
  });

  it('returns null when no rapport exists yet', async () => {
    mocks.selectQueue.push([]);
    const r = await getReportForStudent('stu1', 'uni1');
    expect(r).toBeNull();
  });
});

describe('getReportComments', () => {
  it('returns the thread joined to authors, oldest-first', async () => {
    mocks.selectQueue.push([
      { comment: { id: 'c1', body: 'Hi' }, author: { id: 'a1', firstName: 'Lina' } },
    ]);
    const rows = await getReportComments('r1');
    expect(rows).toHaveLength(1);
    expect(rows[0].author.firstName).toBe('Lina');
  });
});

describe('countReportsAwaitingReview', () => {
  it('counts reports at status submitted for the university', async () => {
    mocks.selectQueue.push([{ id: 'r1' }, { id: 'r2' }]);
    const n = await countReportsAwaitingReview('uni1');
    expect(n).toBe(2);
  });
});

describe('getReportStatusByStudent', () => {
  it('maps each student to their latest report status (newest-first wins)', async () => {
    mocks.selectQueue.push([
      { studentUserId: 'stu1', status: 'approved', createdAt: new Date('2026-02-01') },
      { studentUserId: 'stu1', status: 'submitted', createdAt: new Date('2026-01-01') },
      { studentUserId: 'stu2', status: 'submitted', createdAt: new Date('2026-01-15') },
    ]);
    const map = await getReportStatusByStudent('uni1');
    expect(map.get('stu1')).toBe('approved');
    expect(map.get('stu2')).toBe('submitted');
  });
});
