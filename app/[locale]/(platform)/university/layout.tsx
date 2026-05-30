import { redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';

export default async function UniversityLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.role !== 'university' && session.role !== 'admin') {
    redirect(`/${session.role}/dashboard`);
  }
  return <>{children}</>;
}
