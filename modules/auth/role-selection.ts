import { db } from '@/db';
import { users, profiles, organizations } from '@/db/schema';
import { recordEvent } from '@/modules/events/service';
import { eq } from 'drizzle-orm';
import { isSelectableRole } from './types';

type SelectRoleResult =
  | { success: true; role: string }
  | { success: false; error: string };

export async function selectRole(clerkId: string, role: string): Promise<SelectRoleResult> {
  if (!isSelectableRole(role)) {
    return { success: false, error: 'Invalid role' };
  }

  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (user.role) {
    return { success: false, error: 'Role already selected' };
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  if (role === 'intern') {
    await db.insert(profiles).values({ userId: user.id }).returning();
  } else if (role === 'company') {
    await db
      .insert(organizations)
      .values({
        ownerId: user.id,
        name: 'My Company',
        slug: `org-${user.id.slice(0, 8)}`,
      })
      .returning();
  }

  await recordEvent({
    type: 'role.selected',
    actorId: user.id,
    targetType: 'user',
    targetId: user.id,
    metadata: { role },
  });

  return { success: true, role };
}
