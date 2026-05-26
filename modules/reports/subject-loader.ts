import { db } from '@/db';
import { internships, organizations, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { ReportSubjectType } from './server-actions';

export type SubjectSummary = {
  exists: boolean;
  label: string;
  href: string | null;
  detail: string | null;
};

export async function loadSubject(
  type: ReportSubjectType,
  id: string,
): Promise<SubjectSummary> {
  if (type === 'internship') {
    const [row] = await db.select().from(internships).where(eq(internships.id, id)).limit(1);
    if (!row) return { exists: false, label: 'Deleted internship', href: null, detail: null };
    return {
      exists: true,
      label: row.title,
      href: `/internships/${row.id}`,
      detail: `${row.sector ?? ''} · status: ${row.status ?? 'draft'}`,
    };
  }
  if (type === 'organization') {
    const [row] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    if (!row) return { exists: false, label: 'Deleted organization', href: null, detail: null };
    return {
      exists: true,
      label: row.name,
      href: `/admin/verifications/${row.id}`,
      detail: `${row.city ?? row.country ?? ''} · ${row.verificationStatus}`,
    };
  }
  // user
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) return { exists: false, label: 'Deleted user', href: null, detail: null };
  return {
    exists: true,
    label: `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || row.email,
    href: null,
    detail: `${row.email} · role: ${row.role ?? '—'}`,
  };
}
