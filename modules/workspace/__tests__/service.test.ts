import { describe, it, expect } from 'vitest';
import { canViewWorkspace } from '../service';
import type { Workspace, Project } from '@/db/schema';

const ws = {
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

const projectWithSupervisor = {
  id: 'proj-1',
  organizationId: 'org-1',
  name: 'Brand audit',
  slug: 'brand-audit',
  brief: null,
  status: 'active',
  supervisorIds: ['sup-1'],
  startDate: null,
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Project;

const projectNoSupervisors = {
  ...projectWithSupervisor,
  supervisorIds: [],
} as unknown as Project;

describe('canViewWorkspace', () => {
  it('admin sees any workspace', () => {
    expect(canViewWorkspace(ws, projectWithSupervisor, { userId: 'whoever', role: 'admin' })).toBe(true);
  });

  it('admin sees workspace even with null project', () => {
    expect(canViewWorkspace(ws, null, { userId: 'whoever', role: 'admin' })).toBe(true);
  });

  it('the intern sees their own workspace', () => {
    expect(canViewWorkspace(ws, projectWithSupervisor, { userId: 'intern-1', role: 'intern' })).toBe(true);
  });

  it('a different intern is denied', () => {
    expect(canViewWorkspace(ws, projectWithSupervisor, { userId: 'intern-2', role: 'intern' })).toBe(false);
  });

  it('a company user in project.supervisorIds is allowed', () => {
    expect(canViewWorkspace(ws, projectWithSupervisor, { userId: 'sup-1', role: 'company' })).toBe(true);
  });

  it('a company user NOT in project.supervisorIds is denied', () => {
    expect(canViewWorkspace(ws, projectWithSupervisor, { userId: 'sup-2', role: 'company' })).toBe(false);
  });

  it('a company user is denied when project has no supervisorIds (deny by default)', () => {
    expect(canViewWorkspace(ws, projectNoSupervisors, { userId: 'sup-1', role: 'company' })).toBe(false);
  });

  it('a company user is denied when project is null', () => {
    expect(canViewWorkspace(ws, null, { userId: 'sup-1', role: 'company' })).toBe(false);
  });
});
