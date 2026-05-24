import { redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.role !== 'intern' && session.role !== 'admin') {
    redirect(`/${session.role}/dashboard`);
  }
  return <>{children}</>;
}
