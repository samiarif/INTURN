/**
 * Local-dev demo helper: place a SECOND intern on Dazz Studio's "Brand audit"
 * project, so the company demo shows a project with more than one intern.
 *
 * Run AFTER `pnpm db:seed` (needs Dazz Studio + its internships to exist):
 *   pnpm tsx --env-file=.env.local scripts/dev-add-second-intern.ts
 * Idempotent.
 */
import { db } from '../db';
import { users, organizations, projects, internships, workspaces } from '../db/schema';
import { and, eq } from 'drizzle-orm';

const SECOND_INTERN_EMAIL = 'fares@esprit.tn';

async function main() {
  const [dazz] = await db.select().from(users).where(eq(users.email, 'dazzsemi@gmail.com')).limit(1);
  if (!dazz) throw new Error('dazzsemi user missing — run dev-local-personas.ts + db:seed first');

  const [org] = await db.select().from(organizations).where(eq(organizations.ownerId, dazz.id)).limit(1);
  if (!org) throw new Error('Dazz Studio org missing — run db:seed first');

  const [proj] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.organizationId, org.id), eq(projects.slug, 'brand-audit')))
    .limit(1);
  if (!proj) throw new Error('Brand audit project missing — run db:seed first');

  const projectInternships = await db.select().from(internships).where(eq(internships.projectId, proj.id));
  if (projectInternships.length === 0) throw new Error('No internships under Brand audit');

  const [intern] = await db.select().from(users).where(eq(users.email, SECOND_INTERN_EMAIL)).limit(1);
  if (!intern) throw new Error(`Second intern ${SECOND_INTERN_EMAIL} not found (seeded interns only)`);

  // Use the 2nd internship if there is one (a different role, same project),
  // else the first. Same project either way.
  const target = projectInternships[1] ?? projectInternships[0];

  const [existing] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.internshipId, target.id), eq(workspaces.internId, intern.id)))
    .limit(1);
  if (existing) {
    console.log(`✓ ${SECOND_INTERN_EMAIL} already placed on "${target.title}" — nothing to do`);
    process.exit(0);
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 10);
  const end = new Date(today);
  end.setDate(end.getDate() + 72);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  await db.insert(workspaces).values({
    internshipId: target.id,
    internId: intern.id,
    organizationId: org.id,
    status: 'active',
    startDate: iso(start),
    endDate: iso(end),
  });

  console.log(`✓ Placed ${SECOND_INTERN_EMAIL} on "${target.title}" under project "${proj.name}" (Dazz Studio) — second intern added`);
  process.exit(0);
}

main().catch((e) => {
  console.error('add-second-intern failed:', e);
  process.exit(1);
});
