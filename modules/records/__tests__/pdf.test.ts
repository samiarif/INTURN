import { describe, it, expect } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { RecordPdf } from '../pdf';
import type { RecordSnapshot } from '@/db/schema';

function fixture(overrides: Partial<RecordSnapshot> = {}): RecordSnapshot {
  return {
    intern: {
      name: 'Sami Arif',
      email: 'sami@example.com',
      university: 'Université de Tunis',
      fieldOfStudy: 'Computer Science',
      graduationYear: 2026,
    },
    organization: {
      name: 'We Make It Grow',
      location: 'Tunis, Tunisia',
      website: 'https://wmig.tn',
      logoUrl: null,
    },
    internship: {
      title: 'Frontend Engineering Intern',
      sector: 'Software',
      duration: 12,
      startDate: '2026-01-15',
      endDate: '2026-04-15',
      description: 'Worked on the Inturn marketplace.',
    },
    supervisor: {
      name: 'Sam Daz',
      email: 'sam@wmig.tn',
    },
    deliverables: [
      {
        title: 'V1 launch',
        status: 'approved',
        version: 2,
        submittedAt: '2026-02-01T10:00:00Z',
        feedback: 'Great work.',
      },
      {
        title: 'Final review deck',
        status: 'submitted',
        version: 1,
        submittedAt: '2026-04-10T10:00:00Z',
        feedback: null,
      },
    ],
    taskStats: { total: 24, done: 22 },
    signature: {
      reviewText: 'Sami delivered everything on time and beyond expectations.',
      rating: 5,
      signedAt: '2026-04-16T09:00:00Z',
    },
    locale: 'en',
    ...overrides,
  };
}

describe('RecordPdf', () => {
  it('renders to a non-empty PDF buffer (EN)', async () => {
    const buf = await renderToBuffer(
      RecordPdf({
        snapshot: fixture(),
        shareUrl: 'https://inturn.tn/en/records/abc123',
      }),
    );
    expect(buf.byteLength).toBeGreaterThan(1000);
    // PDF magic header
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  }, 20_000);

  it('renders to a non-empty PDF buffer (FR)', async () => {
    const buf = await renderToBuffer(
      RecordPdf({
        snapshot: fixture({ locale: 'fr' }),
        shareUrl: 'https://inturn.tn/fr/records/abc123',
      }),
    );
    expect(buf.byteLength).toBeGreaterThan(1000);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  }, 20_000);

  it('handles missing optional fields gracefully', async () => {
    const buf = await renderToBuffer(
      RecordPdf({
        snapshot: fixture({
          intern: {
            name: 'Anon',
            email: 'a@b.tn',
            university: null,
            fieldOfStudy: null,
            graduationYear: null,
          },
          organization: { name: 'Acme', location: null, website: null, logoUrl: null },
          internship: {
            title: 'Intern',
            sector: null,
            duration: null,
            startDate: null,
            endDate: null,
            description: null,
          },
          deliverables: [],
          taskStats: { total: 0, done: 0 },
          signature: {
            reviewText: 'Solid work.',
            rating: null,
            signedAt: '2026-04-16T09:00:00Z',
          },
        }),
        shareUrl: 'https://inturn.tn/en/records/abc123',
      }),
    );
    expect(buf.byteLength).toBeGreaterThan(800);
  }, 20_000);
});
