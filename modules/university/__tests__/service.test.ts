import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReturning, mockInsert, mockRecordEvent } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockRecordEvent = vi.fn().mockResolvedValue({});
  return { mockReturning, mockValues, mockInsert, mockRecordEvent };
});

vi.mock('@/db', () => ({ db: { insert: mockInsert } }));
vi.mock('@/db/schema', () => ({ organizations: { _: 'organizations' } }));
vi.mock('@/modules/events/service', () => ({ recordEvent: mockRecordEvent }));

import { createUniversity } from '../service';

beforeEach(() => {
  vi.clearAllMocks();
  mockReturning.mockResolvedValue([{ id: 'uni-1', name: 'ESPRIT', kind: 'university' }]);
});

describe('createUniversity', () => {
  it('inserts a kind=university org owned by the provisioning admin, verified', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'ESPRIT', city: 'Tunis', country: 'TN' });

    const values = mockInsert.mock.results[0]?.value.values;
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'admin-1',
        kind: 'university',
        name: 'ESPRIT',
        city: 'Tunis',
        country: 'TN',
        verified: true,
        verificationStatus: 'verified',
      }),
    );
  });

  it('auto-generates a slug from the name when none is given', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'École Supérieure', city: 'Tunis', country: 'TN' });
    const values = mockInsert.mock.results[0]?.value.values;
    const arg = values.mock.calls[0][0];
    expect(typeof arg.slug).toBe('string');
    expect(arg.slug.length).toBeGreaterThan(0);
    expect(arg.slug).toMatch(/^[a-z0-9-]+$/); // slugified
  });

  it('uses the provided slug verbatim when given', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'X', slug: 'custom-slug', city: 'T', country: 'TN' });
    const values = mockInsert.mock.results[0]?.value.values;
    expect(values.mock.calls[0][0].slug).toBe('custom-slug');
  });

  it('records an organization.created event', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'ESPRIT', city: 'Tunis', country: 'TN' });
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'organization.created', actorId: 'admin-1', targetId: 'uni-1' }),
    );
  });
});
