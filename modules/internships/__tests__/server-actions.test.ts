import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks -----------------------------------------------------------------
// `redirect` throws internally in Next (that's how it unwinds the request).
// We mirror that by throwing a sentinel carrying the URL so the test can
// catch it and assert on the destination.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error('REDIRECT:' + url);
  }),
}));

vi.mock('next/cache', () => ({
  updateTag: vi.fn(),
}));

const requireSession = vi.fn();
const requireActiveSession = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
  requireActiveSession: (...args: unknown[]) => requireActiveSession(...args),
}));

const getProjectById = vi.fn();
vi.mock('@/modules/projects/queries', () => ({
  getProjectById: (...args: unknown[]) => getProjectById(...args),
}));

const createInternship = vi.fn();
const publishInternship = vi.fn();
vi.mock('@/modules/internships/service', () => ({
  createInternship: (...args: unknown[]) => createInternship(...args),
  publishInternship: (...args: unknown[]) => publishInternship(...args),
}));

vi.mock('@/modules/internships/queries', () => ({
  MARKETPLACE_TAG: 'marketplace-internships',
}));

import { createInternshipAction } from '../server-actions';
import { updateTag } from 'next/cache';

// --- Helpers ---------------------------------------------------------------

/** Build a FormData with every field internshipFormSchema requires. */
function validFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    title: 'Visual designer — Brand audit',
    description: 'Lead visual exploration for the brand refresh. Twenty char minimum.',
    sector: 'Design',
    skills: JSON.stringify(['Figma', 'Brand']),
    duration: '12',
    locationType: 'hybrid',
    location: 'Tunis',
    isPaid: 'true',
    compensation: '800 TND / mo',
    internCount: '2',
    language: 'fr',
    deadline: '2026-06-30',
    customQuestions: JSON.stringify([{ question: 'Why this internship?', required: true }]),
    deliverables: JSON.stringify([{ name: 'Brand guide', dueWeek: 4 }]),
  };
  for (const [k, v] of Object.entries({ ...base, ...overrides })) fd.set(k, v);
  return fd;
}

/** Run the action and return the redirect URL the sentinel carried. */
async function runAndCatchRedirect(projectId: string, fd: FormData): Promise<string> {
  try {
    await createInternshipAction(projectId, fd);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('REDIRECT:')) return msg.slice('REDIRECT:'.length);
    throw err;
  }
  throw new Error('expected action to redirect, but it returned normally');
}

beforeEach(() => {
  vi.clearAllMocks();
  requireSession.mockResolvedValue({ user: { id: 'u1' } });
  getProjectById.mockResolvedValue({
    id: 'p1',
    organizationId: 'o1',
    supervisorIds: ['u1'],
  });
  createInternship.mockResolvedValue({ id: 'i1' });
  publishInternship.mockResolvedValue({ id: 'i1', status: 'published' });
});

describe('createInternshipAction', () => {
  // Test A — THE regression guard. If the publish button ever regresses to a
  // stub (the bug that shipped), publishInternship stops being called and this
  // fails.
  it('intent=publish: publishes, refreshes the marketplace tag, and redirects with published=1', async () => {
    const url = await runAndCatchRedirect('p1', validFormData({ intent: 'publish' }));

    // The intern was actually created from the parsed form…
    expect(createInternship).toHaveBeenCalledTimes(1);
    expect(createInternship).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p1',
        organizationId: 'o1',
        actorId: 'u1',
      }),
    );

    // …and then PUBLISHED with the created id + actor (the load-bearing wiring).
    expect(publishInternship).toHaveBeenCalledTimes(1);
    expect(publishInternship).toHaveBeenCalledWith({ internshipId: 'i1', actorId: 'u1' });

    // …the marketplace cache tag was busted…
    expect(updateTag).toHaveBeenCalledWith('marketplace-internships');

    // …and the user lands on the success URL.
    expect(url).toContain('published=1');
    expect(url).toBe('/company/projects/p1?published=1');
  });

  // Test B — draft intent must NOT publish.
  it('intent=draft: saves draft only, never publishes, redirects to the plain project URL', async () => {
    const url = await runAndCatchRedirect('p1', validFormData({ intent: 'draft' }));

    expect(createInternship).toHaveBeenCalledTimes(1);
    expect(publishInternship).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
    expect(url).toBe('/company/projects/p1');
    expect(url).not.toContain('published=');
  });

  // Test C — publish throws (e.g. org not verified). The draft is saved; the
  // action degrades to published=blocked instead of crashing.
  it('intent=publish but publishInternship throws: redirects to published=blocked, does not crash', async () => {
    publishInternship.mockRejectedValueOnce(new Error('org_not_verified'));

    const url = await runAndCatchRedirect('p1', validFormData({ intent: 'publish' }));

    expect(createInternship).toHaveBeenCalledTimes(1);
    expect(publishInternship).toHaveBeenCalledTimes(1);
    // Tag is NOT busted when publish failed.
    expect(updateTag).not.toHaveBeenCalled();
    expect(url).toBe('/company/projects/p1?published=blocked');
  });

  // Authorization wiring: a non-supervisor cannot post.
  it('throws when the caller is not a project supervisor', async () => {
    getProjectById.mockResolvedValueOnce({
      id: 'p1',
      organizationId: 'o1',
      supervisorIds: ['someone-else'],
    });

    await expect(
      createInternshipAction('p1', validFormData({ intent: 'publish' })),
    ).rejects.toThrow(/supervisors/i);
    expect(createInternship).not.toHaveBeenCalled();
    expect(publishInternship).not.toHaveBeenCalled();
  });

  it('throws when the project does not exist', async () => {
    getProjectById.mockResolvedValueOnce(null);

    await expect(
      createInternshipAction('p1', validFormData({ intent: 'draft' })),
    ).rejects.toThrow(/not found/i);
    expect(createInternship).not.toHaveBeenCalled();
  });
});
