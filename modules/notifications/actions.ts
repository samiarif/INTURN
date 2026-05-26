'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { requireSession } from '@/modules/auth/session';
import { and, eq } from 'drizzle-orm';

export async function markAsReadAction(id: string): Promise<void> {
  const session = await requireSession();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, session.user.id)));
  revalidatePath('/', 'layout');
}

export async function markAllAsReadAction(): Promise<void> {
  const session = await requireSession();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.recipientId, session.user.id));
  revalidatePath('/', 'layout');
}
