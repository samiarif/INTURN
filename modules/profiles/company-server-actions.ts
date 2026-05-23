'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId } from './queries';
import { createOrUpdateCompanyProfile } from './company-service';
import { companyProfileSchema } from './validators';

export async function saveCompanyProfileAction(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');

  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  const parsed = companyProfileSchema.parse({
    name: formData.get('name'),
    industry: formData.get('industry'),
    size: formData.get('size'),
    country: formData.get('country'),
    city: formData.get('city') || undefined,
    description: formData.get('description') || undefined,
    website: formData.get('website') || undefined,
    logoUrl: formData.get('logoUrl') || undefined,
    rneUrl: formData.get('rneUrl') || undefined,
  });

  await createOrUpdateCompanyProfile(user.id, parsed);
  redirect('/company/dashboard');
}
