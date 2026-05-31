import { db } from '@/db';
import { internships, organizations, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { ReportSubjectType } from './server-actions';

/**
 * Locale-agnostic detail parts. The loader runs server-side without a request
 * locale, so it returns raw fields and lets the (localized) admin page compose
 * + translate the connector words and enum values at render time.
 */
export type SubjectDetail =
  | { kind: 'internship'; sector: string | null; status: string }
  | { kind: 'organization'; place: string | null; verificationStatus: string }
  | { kind: 'user'; email: string; role: string | null };

export type SubjectSummary = {
  exists: boolean;
  subjectType: ReportSubjectType;
  /**
   * Real entity name (internship title / org name / user name|email). Null when
   * the subject row was deleted — the page renders a localized "Deleted {type}"
   * label instead, so a French admin never sees an English fallback.
   */
  label: string | null;
  href: string | null;
  detail: SubjectDetail | null;
  /**
   * Populated only when the subject is a user (directly, via subjectType
   * 'user'). Lets the admin report-detail page surface a "Suspend user"
   * action against the offending account. Null for internship/org subjects.
   */
  user: { id: string; email: string; role: string | null; suspended: boolean } | null;
};

export async function loadSubject(
  type: ReportSubjectType,
  id: string,
): Promise<SubjectSummary> {
  if (type === 'internship') {
    const [row] = await db.select().from(internships).where(eq(internships.id, id)).limit(1);
    if (!row)
      return { exists: false, subjectType: type, label: null, href: null, detail: null, user: null };
    return {
      exists: true,
      subjectType: type,
      label: row.title,
      href: `/internships/${row.id}`,
      detail: { kind: 'internship', sector: row.sector ?? null, status: row.status ?? 'draft' },
      user: null,
    };
  }
  if (type === 'organization') {
    const [row] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    if (!row)
      return { exists: false, subjectType: type, label: null, href: null, detail: null, user: null };
    return {
      exists: true,
      subjectType: type,
      label: row.name,
      href: `/admin/verifications/${row.id}`,
      detail: {
        kind: 'organization',
        place: row.city ?? row.country ?? null,
        verificationStatus: row.verificationStatus,
      },
      user: null,
    };
  }
  // user
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row)
    return { exists: false, subjectType: type, label: null, href: null, detail: null, user: null };
  return {
    exists: true,
    subjectType: type,
    label: `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || row.email,
    href: `/admin/users/${row.id}`,
    detail: { kind: 'user', email: row.email, role: row.role ?? null },
    user: {
      id: row.id,
      email: row.email,
      role: row.role,
      suspended: Boolean(row.suspendedAt),
    },
  };
}
