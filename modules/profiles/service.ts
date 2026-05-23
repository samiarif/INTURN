import { db } from '@/db';
import { profiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import type { ProfileBasicsInput, ProfileSkillsInput } from './validators';

export async function createOrUpdateBasics(userId: string, input: ProfileBasicsInput) {
  await db
    .update(users)
    .set({ firstName: input.firstName, lastName: input.lastName, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const existing = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

  if (existing.length === 0) {
    await db.insert(profiles).values({
      userId,
      university: input.university,
      yearOfStudy: input.yearOfStudy,
      fieldOfStudy: input.fieldOfStudy,
      city: input.city,
      preferredLanguage: input.preferredLanguage,
      profileStep: 'basics-done',
    });
  } else {
    await db
      .update(profiles)
      .set({
        university: input.university,
        yearOfStudy: input.yearOfStudy,
        fieldOfStudy: input.fieldOfStudy,
        city: input.city,
        preferredLanguage: input.preferredLanguage,
        profileStep: existing[0].profileStep === 'complete' ? 'complete' : 'basics-done',
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
  }

  await recordEvent({
    type: 'profile.basics.saved',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    metadata: { step: 'basics' },
  });
}

export async function createOrUpdateSkills(userId: string, input: ProfileSkillsInput) {
  await db
    .update(profiles)
    .set({
      skills: input.skills,
      roles: input.roles,
      resumeUrl: input.cvUrl ?? null,
      portfolioLinks: input.portfolioLinks,
      profileStep: 'complete',
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));

  await recordEvent({
    type: 'profile.skills.saved',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    metadata: { skillCount: input.skills.length, roles: input.roles },
  });
}

export function getProfileCompletion(profile: { profileStep: string | null }) {
  if (profile.profileStep === 'complete') return 100;
  if (profile.profileStep === 'basics-done') return 60;
  return 0;
}
