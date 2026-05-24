import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireEnv } from '@/lib/env';
import { recordEvent } from '@/modules/events/service';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = requireEnv('CLERK_WEBHOOK_SECRET');

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  // svix.Webhook.verify() enforces a 5-minute svix-timestamp tolerance by default
  // (see WEBHOOK_TOLERANCE_IN_SECONDS in standardwebhooks). Replays older than
  // 5 minutes are rejected here as part of signature verification — no extra
  // freshness check is needed at this layer. svix@1.94.0 does not expose a
  // tolerance option in its public API, so narrowing the window further would
  // require an unsafe cast; leaving the default.
  // Idempotency (svix-id dedupe) is tracked separately for Sprint E.
  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response('Invalid signature or stale timestamp', { status: 400 });
  }

  switch (evt.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);

      const [user] = await db
        .insert(users)
        .values({
          clerkId: id,
          email: primaryEmail?.email_address ?? '',
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: primaryEmail?.email_address ?? '',
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
            updatedAt: new Date(),
          },
        })
        .returning();

      await recordEvent({
        type: 'user.created',
        actorId: user.id,
        targetType: 'user',
        targetId: user.id,
        metadata: { clerkId: id, provider: 'clerk-webhook' },
      });
      break;
    }

    case 'user.updated': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);

      const [user] = await db
        .update(users)
        .set({
          email: primaryEmail?.email_address ?? '',
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, id))
        .returning();

      if (user) {
        await recordEvent({
          type: 'user.updated',
          actorId: user.id,
          targetType: 'user',
          targetId: user.id,
          metadata: { clerkId: id, provider: 'clerk-webhook' },
        });
      }
      break;
    }

    case 'user.deleted': {
      if (evt.data.id) {
        const [user] = await db.delete(users).where(eq(users.clerkId, evt.data.id)).returning();

        if (user) {
          await recordEvent({
            type: 'user.deleted',
            targetType: 'user',
            targetId: user.id,
            metadata: { clerkId: evt.data.id },
          });
        }
      }
      break;
    }
  }

  return new Response('OK', { status: 200 });
}
