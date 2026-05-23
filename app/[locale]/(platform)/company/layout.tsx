import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
    return null;
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const role = user.publicMetadata.role as string | undefined;

  if (role !== 'company' && role !== 'admin') {
    redirect(`/${role}/dashboard`);
    return null;
  }

  return <>{children}</>;
}
