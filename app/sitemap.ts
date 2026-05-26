import type { MetadataRoute } from 'next';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { internships, organizations } from '@/db/schema';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://inturn-hub.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await db
    .select({ id: internships.id, updatedAt: internships.updatedAt })
    .from(internships)
    .innerJoin(organizations, eq(organizations.id, internships.organizationId))
    .where(
      and(
        eq(internships.status, 'published'),
        eq(organizations.verificationStatus, 'verified'),
      ),
    );

  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/en`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/marketplace`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/en/marketplace`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/cookies`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/en/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/en/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/en/cookies`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
  ];

  const internshipEntries: MetadataRoute.Sitemap = rows.map((r) => ({
    url: `${BASE}/internships/${r.id}`,
    lastModified: r.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticEntries, ...internshipEntries];
}
