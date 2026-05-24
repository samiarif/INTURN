import { redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (!session.user.role) redirect('/role-selection');
  return <>{children}</>;
}
