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

/**
 * Coarse-grained completion based on `profileStep` only — kept for backwards
 * compat with existing callers. Prefer `computeProfileCompleteness` below
 * which returns per-field detail so the UI can show missing items.
 */
export function getProfileCompletion(profile: { profileStep: string | null }) {
  if (profile.profileStep === 'complete') return 100;
  if (profile.profileStep === 'basics-done') return 60;
  return 0;
}

/**
 * Per-field completion score (0-100) with a list of missing items.
 *
 * Weights chosen so the basics step lands at ~50% and the full filled-in
 * profile lands at 100%. Hitting 80%+ should unlock "ready to apply"
 * confidence; under 50% means the intern probably hasn't finished
 * onboarding properly.
 */
export type CompletenessItem = {
  key:
    | 'name'
    | 'university'
    | 'year'
    | 'field'
    | 'city'
    | 'skills'
    | 'roles'
    | 'cv'
    | 'portfolio';
  weight: number;
  done: boolean;
};

export type ProfileCompleteness = {
  percent: number;
  items: CompletenessItem[];
  missing: CompletenessItem[];
};

export function computeProfileCompleteness(input: {
  firstName: string | null;
  lastName: string | null;
  university: string | null;
  yearOfStudy: string | null;
  fieldOfStudy: string | null;
  city: string | null;
  skills: string[] | null;
  roles: string[] | null;
  resumeUrl: string | null;
  portfolioLinks: Array<{ platform: string; url: string }> | null;
}): ProfileCompleteness {
  const items: CompletenessItem[] = [
    {
      key: 'name',
      weight: 15,
      done: Boolean(input.firstName?.trim() && input.lastName?.trim()),
    },
    { key: 'university', weight: 10, done: Boolean(input.university?.trim()) },
    { key: 'year', weight: 10, done: Boolean(input.yearOfStudy?.trim()) },
    { key: 'field', weight: 10, done: Boolean(input.fieldOfStudy?.trim()) },
    { key: 'city', weight: 10, done: Boolean(input.city?.trim()) },
    { key: 'skills', weight: 15, done: (input.skills?.length ?? 0) >= 3 },
    { key: 'roles', weight: 10, done: (input.roles?.length ?? 0) >= 1 },
    { key: 'cv', weight: 15, done: Boolean(input.resumeUrl?.trim()) },
    { key: 'portfolio', weight: 5, done: (input.portfolioLinks?.length ?? 0) >= 1 },
  ];
  const percent = items.reduce((acc, it) => acc + (it.done ? it.weight : 0), 0);
  return {
    percent,
    items,
    missing: items.filter((it) => !it.done),
  };
}
