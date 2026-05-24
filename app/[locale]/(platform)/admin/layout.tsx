import { redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.role !== 'admin') {
    redirect(`/${session.role}/dashboard`);
  }
  return <>{children}</>;
}
