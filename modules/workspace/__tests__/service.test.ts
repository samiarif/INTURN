import { describe, it, expect } from 'vitest';
import { canViewWorkspace } from '../service';
import type { Workspace } from '@/db/schema';

const baseWorkspace = {
  id: 'ws-1',
  internshipId: 'int-1',
  internId: 'intern-1',
  organizationId: 'org-1',
  status: 'active',
  startDate: null,
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Workspace;

describe('canViewWorkspace', () => {
  it('admin sees any workspace', () => {
    expect(
      canViewWorkspace(baseWorkspace, { userId: 'whoever', role: 'admin', supervisorOf: [] }),
    ).toBe(true);
  });

  it('the intern sees their own workspace', () => {
    expect(
      canViewWorkspace(baseWorkspace, { userId: 'intern-1', role: 'intern', supervisorOf: [] }),
    ).toBe(true);
  });

  it('a different intern is denied', () => {
    expect(
      canViewWorkspace(baseWorkspace, { userId: 'intern-2', role: 'intern', supervisorOf: [] }),
    ).toBe(false);
  });

  it('a supervisor in supervisorOf list sees the workspace', () => {
    expect(
      canViewWorkspace(baseWorkspace, {
        userId: 'sup-1',
        role: 'company',
        supervisorOf: ['org-1'],
      }),
    ).toBe(true);
  });

  it('a company user not in supervisorOf is denied', () => {
    expect(
      canViewWorkspace(baseWorkspace, {
        userId: 'sup-2',
        role: 'company',
        supervisorOf: ['org-other'],
      }),
    ).toBe(false);
  });
});
