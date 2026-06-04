/**
 * Local-dev bootstrap for offline use (no Clerk).
 *
 * On Neon, Sam's three dev-login accounts exist because he signed in through
 * Clerk, and Clerk onboarding (selectRole) auto-creates dazzsemi's company org.
 * A fresh LOCAL database has none of that, so `seedSamAccounts` in seed.ts
 * skips and the company/admin/intern dev-login personas are empty.
 *
 * This script recreates exactly what Clerk onboarding would: the three user
 * rows + an owned "My Company" org for dazzsemi. After running it, re-run
 * `pnpm db:seed` — `seedSamAccounts` then finds them and builds Dazz Studio
 * (project, internships, applications, intern workspace + deliverables).
 *
 * Run:  pnpm tsx --env-file=.env.local scripts/dev-local-personas.ts
 * Idempotent — safe to re-run.
 */
import { db } from '../db';
import { users, organizations, organizationMembers } from '../db/schema';
import { and, eq } from 'drizzle-orm';

async function ensureUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: 'intern' | 'company' | 'admin' | 'university';
}) {
  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) {
    if (existing.role !== input.role) {
      await db.update(users).set({ role: input.role, updatedAt: new Date() }).where(eq(users.id, existing.id));
    }
    return existing;
  }
  const [created] = await db
    .insert(users)
    .values({ clerkId: `local_${input.email}`, email: input.email, firstName: input.firstName, lastName: input.lastName, role: input.role })
    .returning();
  return created;
}

async function main() {
  const dazz = await ensureUser({ email: 'dazzsemi@gmail.com', firstName: 'Sami', lastName: 'Arif', role: 'company' });
  await ensureUser({ email: 'sami.arif@thog.io', firstName: 'Sami', lastName: 'Arif', role: 'intern' });
  await ensureUser({ email: 'hellowemakeitgrow@gmail.com', firstName: 'Sami', lastName: 'Arif', role: 'admin' });

  // dazzsemi needs an owned org — Clerk onboarding creates one named "My Company".
  // seedSamAccounts renames it to "Dazz Studio" and fills it with demo data.
  let [org] = await db.select().from(organizations).where(eq(organizations.ownerId, dazz.id)).limit(1);
  if (!org) {
    [org] = await db
      .insert(organizations)
      .values({
        ownerId: dazz.id,
        name: 'My Company',
        slug: 'dazz-my-company',
        industry: 'Design & creative',
        size: '11-50',
        country: 'Tunisia',
        city: 'Tunis',
        description: 'Independent design studio in Lac 2.',
        verified: true,
        verificationStatus: 'verified',
      })
      .returning();
    console.log('✓ Created "My Company" org owned by dazzsemi@gmail.com');
  } else {
    console.log(`✓ dazzsemi already owns an org (${org.name})`);
  }

  // CRUCIAL: getCurrentOrg (and the whole company dashboard) reads
  // organization_members, NOT organizations.ownerId. Clerk onboarding creates
  // an owner membership row alongside the org; we must too, or the company
  // user is bounced to /onboarding/company forever.
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, org.id), eq(organizationMembers.userId, dazz.id)))
    .limit(1);
  if (!member) {
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: dazz.id,
      email: dazz.email,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });
    console.log('✓ Added dazzsemi as active owner member of the org');
  } else {
    console.log('✓ dazzsemi already an active member');
  }

  console.log('✓ Bootstrap done.');
  process.exit(0);
}

main().catch((e) => {
  console.error('bootstrap failed:', e);
  process.exit(1);
});
