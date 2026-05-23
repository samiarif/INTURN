import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
    return null;
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const role = user.publicMetadata.role as string | undefined;

  if (!role) {
    redirect('/role-selection');
    return null;
  }

  return <>{children}</>;
}
