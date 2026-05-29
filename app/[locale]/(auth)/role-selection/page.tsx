import { auth } from '@/lib/server-auth';
import { clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GradientStar } from '@/components/brand/gradient-star';
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
    <div className="w-full max-w-2xl px-6 py-12">
      <div className="flex flex-col items-center text-center mb-10">
        <GradientStar size="lg" />
        <h1 className="text-display font-[family-name:var(--font-display)] mt-6 mb-2">{t('title')}</h1>
        <p className="text-body text-[var(--ink-3)]">{t('subtitle')}</p>
      </div>
      <RoleSelectionForm />
    </div>
  );
}
