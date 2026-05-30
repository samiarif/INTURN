import { describe, it, expect, vi, beforeEach } from 'vitest';

// db.select(...).limit() returns the current report row from a FIFO queue;
// db.update(...).returning() echoes the set() values merged onto an id;
// db.insert(...).returning() echoes the inserted values. Mirrors the
// deliverables service test harness.
const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  const updateSet = vi.fn();
  const insertValues = vi.fn();

  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    return chain;
  }

  const db = {
    select: vi.fn(() => makeSelectChain()),
    update: vi.fn(() => ({
      set: (vals: Record<string, unknown>) => {
        updateSet(vals);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 'r1', ...vals }])),
          })),
        };
      },
    })),
    insert: vi.fn(() => ({
      values: (vals: Record<string, unknown>) => {
        insertValues(vals);
        return { returning: vi.fn(() => Promise.resolve([{ id: 'new1', ...vals }])) };
      },
    })),
  };

  return { db, selectQueue, updateSet, insertValues };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({ academicReports: {}, academicReportComments: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and'), desc: vi.fn(() => 'desc') }));
vi.mock('@/modules/events/service', () => ({ recordEvent: vi.fn().mockResolvedValue({}) }));

import {
  createReportDraft,
  submitReport,
  approveReport,
  requestReportRevision,
  addReportComment,
} from '../service';
import { recordEvent } from '@/modules/events/service';

function baseReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    studentUserId: 'stu1',
    universityOrgId: 'uni1',
    internshipId: null,
    title: 'Rapport de stage',
    description: null,
    status: 'draft',
    version: 1,
    fileUrl: null,
    fileName: null,
    fileType: null,
    feedback: null,
    submittedAt: null,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    revisionHistory: [],
    ...overrides,
  };
}

const submitInput = {
  reportId: 'r1',
  fileUrl: 'https://blob/rapport.pdf',
  fileName: 'rapport.pdf',
  fileType: 'application/pdf',
  actorId: 'stu1',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

describe('createReportDraft', () => {
  it('inserts a draft report for the student+university pair', async () => {
    await createReportDraft({
      studentUserId: 'stu1',
      universityOrgId: 'uni1',
      internshipId: 'int1',
      title: 'Rapport de stage',
    });
    const vals = mocks.insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(vals).toMatchObject({
      studentUserId: 'stu1',
      universityOrgId: 'uni1',
      internshipId: 'int1',
      status: 'draft',
      version: 1,
    });
  });
});

describe('submitReport', () => {
  it('draft → submitted keeps version 1 and pushes NO history (first submission)', async () => {
    mocks.selectQueue.push([baseReport({ status: 'draft', version: 1 })]);
    const result = await submitReport(submitInput);
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.status).toBe('submitted');
    expect(persisted.version).toBe(1);
    expect(persisted.revisionHistory).toEqual([]);
    expect(persisted.submittedAt).toBeInstanceOf(Date);
    expect(result.status).toBe('submitted');
    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'academicReport.submitted', targetType: 'academicReport', targetId: 'r1' }),
    );
  });

  it('revision-requested → submitted increments version + snapshots prior (newest-first) + clears feedback', async () => {
    mocks.selectQueue.push([
      baseReport({
        status: 'revision-requested',
        version: 1,
        fileUrl: 'https://blob/old.pdf',
        fileName: 'old.pdf',
        fileType: 'application/pdf',
        feedback: 'Add the methodology section',
        revisionHistory: [],
      }),
    ]);
    await submitReport(submitInput);
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.version).toBe(2);
    expect(persisted.feedback).toBeNull();
    const history = persisted.revisionHistory as Array<Record<string, unknown>>;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ version: 1, status: 'revision-requested', fileUrl: 'https://blob/old.pdf' });
    expect(history[0].review).toMatchObject({ state: 'changes', text: 'Add the methodology section' });
  });

  it('prepends new snapshots so history stays newest-first', async () => {
    const older = { version: 1, status: 'revision-requested', fileUrl: 'v1.pdf' };
    mocks.selectQueue.push([baseReport({ status: 'revision-requested', version: 2, revisionHistory: [older] })]);
    await submitReport(submitInput);
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    const history = persisted.revisionHistory as Array<Record<string, unknown>>;
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(2);
    expect(history[1]).toEqual(older);
  });

  it('rejects an invalid transition (submitted → submit) and never writes', async () => {
    mocks.selectQueue.push([baseReport({ status: 'submitted', version: 1 })]);
    await expect(submitReport(submitInput)).rejects.toThrow('Cannot submit from status submitted');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it('rejects when the report does not exist', async () => {
    mocks.selectQueue.push([]);
    await expect(submitReport(submitInput)).rejects.toThrow('Report not found');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('approveReport', () => {
  it('submitted → approved persists status approved + records event', async () => {
    mocks.selectQueue.push([baseReport({ status: 'submitted', version: 2 })]);
    await approveReport({ reportId: 'r1', actorId: 'coord1' });
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.status).toBe('approved');
    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'academicReport.approved', targetType: 'academicReport', targetId: 'r1' }),
    );
  });

  it('rejects approving a draft', async () => {
    mocks.selectQueue.push([baseReport({ status: 'draft' })]);
    await expect(approveReport({ reportId: 'r1', actorId: 'coord1' })).rejects.toThrow(
      'Cannot approve from status draft',
    );
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('requestReportRevision', () => {
  it('submitted → revision-requested persists status + feedback + records event', async () => {
    mocks.selectQueue.push([baseReport({ status: 'submitted', version: 1 })]);
    await requestReportRevision({ reportId: 'r1', feedback: 'Needs sources', actorId: 'coord1' });
    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.status).toBe('revision-requested');
    expect(persisted.feedback).toBe('Needs sources');
    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'academicReport.revision.requested', targetId: 'r1' }),
    );
  });

  it('rejects requesting revision on a draft', async () => {
    mocks.selectQueue.push([baseReport({ status: 'draft' })]);
    await expect(
      requestReportRevision({ reportId: 'r1', feedback: 'x', actorId: 'coord1' }),
    ).rejects.toThrow('Cannot request-revision from status draft');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('addReportComment', () => {
  it('inserts a comment row (no workspaceId) and does NOT record an event', async () => {
    await addReportComment({ reportId: 'r1', authorId: 'coord1', body: '  Looks good  ' });
    const vals = mocks.insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(vals).toEqual({ reportId: 'r1', authorId: 'coord1', body: 'Looks good' });
    expect(vals).not.toHaveProperty('workspaceId');
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('rejects an empty body', async () => {
    await expect(addReportComment({ reportId: 'r1', authorId: 'c', body: '   ' })).rejects.toThrow(
      'Comment body is required',
    );
  });
});
