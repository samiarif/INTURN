import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import type { CompanyProfileInput } from './validators';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export async function createOrUpdateCompanyProfile(userId: string, input: CompanyProfileInput) {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, userId))
    .limit(1);

  if (existing.length === 0) {
    const slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const [created] = await db
      .insert(organizations)
      .values({
        ownerId: userId,
        name: input.name,
        slug,
        industry: input.industry,
        size: input.size,
        country: input.country,
        city: input.city,
        description: input.description,
        website: input.website || null,
        logoUrl: input.logoUrl,
        rneUrl: input.rneUrl,
        verificationStatus: 'draft',
      })
      .returning();

    await recordEvent({
      type: 'organization.created',
      actorId: userId,
      targetType: 'organization',
      targetId: created.id,
      metadata: { name: input.name },
    });
    return created;
  }

  const [updated] = await db
    .update(organizations)
    .set({
      name: input.name,
      industry: input.industry,
      size: input.size,
      country: input.country,
      city: input.city,
      description: input.description,
      website: input.website || null,
      logoUrl: input.logoUrl,
      rneUrl: input.rneUrl,
      updatedAt: new Date(),
    })
    .where(eq(organizations.ownerId, userId))
    .returning();

  await recordEvent({
    type: 'organization.updated',
    actorId: userId,
    targetType: 'organization',
    targetId: updated.id,
    metadata: { name: input.name },
  });
  return updated;
}
