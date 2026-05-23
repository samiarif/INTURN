'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { assertOurBlobUrl } from '@/lib/blob';
import { getUserByClerkId } from './queries';
import { createOrUpdateBasics, createOrUpdateSkills } from './service';
import { profileBasicsSchema, profileSkillsSchema } from './validators';

export async function saveProfileBasicsAction(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');

  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  const parsed = profileBasicsSchema.parse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    university: formData.get('university'),
    yearOfStudy: formData.get('yearOfStudy'),
    fieldOfStudy: formData.get('fieldOfStudy'),
    city: formData.get('city'),
    preferredLanguage: formData.get('preferredLanguage'),
  });

  await createOrUpdateBasics(user.id, parsed);
  redirect('/onboarding/intern/skills');
}

export async function saveProfileSkillsAction(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');

  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  const skills = JSON.parse(String(formData.get('skills') ?? '[]'));
  const roles = JSON.parse(String(formData.get('roles') ?? '[]'));
  const portfolioLinks = JSON.parse(String(formData.get('portfolioLinks') ?? '[]'));
  const cvUrl = formData.get('cvUrl');

  // Trust boundary: only accept blob URLs from our store
  const cvUrlStr = typeof cvUrl === 'string' && cvUrl ? cvUrl : undefined;
  assertOurBlobUrl(cvUrlStr, 'cvUrl');

  const parsed = profileSkillsSchema.parse({
    skills,
    roles,
    cvUrl: cvUrlStr,
    portfolioLinks,
  });

  await createOrUpdateSkills(user.id, parsed);
  redirect('/onboarding/intern/done');
}
