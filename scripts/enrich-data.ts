/**
 * One-shot enrichment for local testing. Idempotent — checks for
 * existing rows before inserting.
 *
 * Adds:
 *   - 4-6 notifications per Sam-test account so the bell isn't empty
 *   - 4 more community posts so the feed has variety
 *   - 2 more comments on the existing thread
 *
 * Safe to re-run.
 */
import { db } from '@/db';
import {
  users,
  notifications,
  communityPosts,
  communityComments,
} from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const findByEmail = async (email: string) => {
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return u;
  };

  const dazzsemi = await findByEmail('dazzsemi@gmail.com');
  const samiArif = await findByEmail('sami.arif@thog.io');
  const yasmine = await findByEmail('yasmine@enit.utm.tn');
  const lina = await findByEmail('lina@enit.utm.tn');
  const imen = await findByEmail('imen@ensi.utm.tn');
  const syrine = await findByEmail('syrine@insat.utm.tn');

  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

  // ---- Notifications -----------------------------------------------------
  // We tag each notification with a stable seed marker in `metadata.seed`
  // so re-running this script doesn't duplicate.
  const SEED_TAG = 'enrich-local-1';

  const existingSeeded = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(sql`metadata->>'seed' = ${SEED_TAG}`);

  if (existingSeeded.length === 0) {
    const notifRows: Array<typeof notifications.$inferInsert> = [];

    // For dazzsemi (company)
    if (dazzsemi) {
      notifRows.push(
        {
          recipientId: dazzsemi.id,
          type: 'application.created',
          body: 'Lina Khelifi applied to UX researcher — Brand audit.',
          href: '/company/projects/brand-audit/applications',
          metadata: { seed: SEED_TAG },
          createdAt: hoursAgo(2),
        },
        {
          recipientId: dazzsemi.id,
          type: 'deliverable.submitted',
          body: 'Yasmine submitted Brand audit · stakeholder findings (v2).',
          href: '/company/workspaces',
          metadata: { seed: SEED_TAG },
          createdAt: hoursAgo(6),
        },
        {
          recipientId: dazzsemi.id,
          type: 'comment.added',
          body: 'Yasmine commented on Type pairings — 3 options.',
          href: '/company/workspaces',
          metadata: { seed: SEED_TAG },
          createdAt: hoursAgo(20),
        },
        {
          recipientId: dazzsemi.id,
          type: 'application.created',
          body: 'Amir Ben Amor applied to UX researcher — Brand audit.',
          href: '/company/projects/brand-audit/applications',
          metadata: { seed: SEED_TAG },
          createdAt: hoursAgo(48),
          readAt: hoursAgo(24),
        },
      );
    }

    // For sami.arif (intern)
    if (samiArif) {
      notifRows.push(
        {
          recipientId: samiArif.id,
          type: 'application.status.changed',
          body: 'Your application was shortlisted at GreenVibe.',
          href: '/intern/applications',
          metadata: { seed: SEED_TAG },
          createdAt: hoursAgo(3),
        },
        {
          recipientId: samiArif.id,
          type: 'community.comment.added',
          body: 'Syrine replied to your post: "Try \'what does a good day at work look like for you?\'…"',
          href: '/intern/community',
          metadata: { seed: SEED_TAG },
          createdAt: hoursAgo(8),
        },
        {
          recipientId: samiArif.id,
          type: 'checkin.due',
          body: 'Weekly check-in due tomorrow at Acme Studio.',
          href: '/intern/workspaces',
          metadata: { seed: SEED_TAG },
          createdAt: hoursAgo(18),
          readAt: hoursAgo(10),
        },
      );
    }

    // For hellowemakeitgrow (admin)
    const helloAdmin = await findByEmail('hellowemakeitgrow@gmail.com');
    if (helloAdmin) {
      notifRows.push(
        {
          recipientId: helloAdmin.id,
          type: 'organization.verification.changed',
          body: 'Numentech is awaiting verification.',
          href: '/admin/verifications?status=pending',
          metadata: { seed: SEED_TAG },
          createdAt: hoursAgo(4),
        },
        {
          recipientId: helloAdmin.id,
          type: 'report.created',
          body: 'New report filed against an internship: misleading compensation.',
          href: '/admin/reports?status=open',
          metadata: { seed: SEED_TAG },
          createdAt: hoursAgo(7),
        },
      );
    }

    if (notifRows.length > 0) {
      await db.insert(notifications).values(notifRows);
      console.log(`✓ Inserted ${notifRows.length} notifications`);
    }
  } else {
    console.log(`✓ Notifications already seeded (${existingSeeded.length} found)`);
  }

  // ---- Extra community posts --------------------------------------------
  type PostSeed = {
    authorId: string | undefined;
    title: string;
    body: string;
    hoursAgo: number;
  };

  const extraPosts: PostSeed[] = [
    {
      authorId: lina?.id,
      title: 'How do you keep momentum after a rejection?',
      body: "Got rejected from my second-choice internship today. Trying not to let it kill the rhythm. What helped you bounce back from your first internship 'no'?",
      hoursAgo: 12,
    },
    {
      authorId: imen?.id,
      title: 'Anyone using React Server Components day-to-day?',
      body: "I'm 3 weeks into shipping RSC at my internship and I keep second-guessing 'use client' boundaries. Curious how others draw the line.",
      hoursAgo: 30,
    },
    {
      authorId: syrine?.id,
      title: 'Tips for taking notes during stakeholder interviews?',
      body: "I tried typing live and it killed eye contact. Tried just listening + writing after — missed too many quotes. What's your sweet spot?",
      hoursAgo: 56,
    },
    {
      authorId: yasmine?.id,
      title: 'Anyone hire a freelance illustrator they loved?',
      body: 'Need a one-off illustration for a client deck and the in-house design team is slammed. Tunisian or Maghreb-based illustrators welcome — comment with their portfolio.',
      hoursAgo: 78,
    },
  ];

  for (const p of extraPosts) {
    if (!p.authorId) continue;
    const existing = await db
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(eq(communityPosts.title, p.title))
      .limit(1);
    if (existing[0]) continue;
    const when = hoursAgo(p.hoursAgo);
    await db.insert(communityPosts).values({
      authorId: p.authorId,
      title: p.title,
      body: p.body,
      status: 'active',
      commentCount: 0,
      lastActivityAt: when,
      createdAt: when,
      updatedAt: when,
    });
    console.log(`✓ Added community post "${p.title.slice(0, 40)}…"`);
  }

  // ---- A few more replies on Lina's rejection post ----------------------
  const linaPost = (
    await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.title, 'How do you keep momentum after a rejection?'))
      .limit(1)
  )[0];
  if (linaPost) {
    const existingComments = await db
      .select({ id: communityComments.id })
      .from(communityComments)
      .where(eq(communityComments.postId, linaPost.id))
      .limit(1);
    if (!existingComments[0] && yasmine && samiArif) {
      await db.insert(communityComments).values([
        {
          postId: linaPost.id,
          authorId: yasmine.id,
          body: 'Reframe — every rejection narrows the company you actually want to work for. Got 7 nos before my Acme yes.',
          createdAt: hoursAgo(8),
        },
        {
          postId: linaPost.id,
          authorId: samiArif.id,
          body: 'Block 24h to feel bad about it, then book your next 3 applications. Movement > mood.',
          createdAt: hoursAgo(4),
        },
      ]);
      await db
        .update(communityPosts)
        .set({ commentCount: 2, lastActivityAt: hoursAgo(4) })
        .where(eq(communityPosts.id, linaPost.id));
      console.log('✓ Added 2 replies on Lina rejection post');
    }
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
