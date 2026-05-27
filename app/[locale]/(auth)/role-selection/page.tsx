import { auth } from '@/lib/server-auth';
import { clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { RoleSelectionForm } from './role-selection-form';

export default async function RoleSelectionPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
    return null;
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const role = user.publicMetadata.role as string | undefined;

  if (role === 'intern') {
    redirect('/intern/dashboard');
    return null;
  }
  if (role === 'company') {
    redirect('/company/dashboard');
    return null;
  }
  if (role === 'admin') {
    redirect('/admin/dashboard');
    return null;
  }

  const t = await getTranslations('auth.roleSelection');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
      <RoleSelectionForm />
    </div>
  );
}
