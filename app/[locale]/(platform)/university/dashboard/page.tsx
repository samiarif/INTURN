import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getCurrentOrg, requireOrgRole } from '@/modules/team/authz';
import { getOrgMembers } from '@/modules/team/queries';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill } from '@/components/status-pill';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getManagedStudents, getStudentInternshipSnapshot } from '@/modules/university/queries';
import { countReportsAwaitingReview, getReportStatusByStudent } from '@/modules/academic-reports/queries';
import { toneFor } from '@/modules/academic-reports/status-tone';
import Link from 'next/link';
import { InviteStudentButton } from '../_invite-student-button';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const t = await getTranslations('university.dashboard');
  const current = await getCurrentOrg(session.user.id);
  if (!current || current.org.kind !== 'university') {
    // university-role user without an active university org — nothing to manage yet.
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
        <PageHeader title={t('title')} description={t('subtitle')} className="mb-6" />
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('noOrg')}
        </div>
      </div>
    );
  }

  // Defense-in-depth: the layout gates the global role; this also confirms the
  // viewer is an owner/admin of THIS university org before reading its roster —
  // parity with the mutating coordinator actions. Cannot fail for a real
  // coordinator; throws Forbidden otherwise.
  await requireOrgRole(session.user.id, current.org.id, ['owner', 'admin']);

  const [students, members, awaitingReview, reportStatus] = await Promise.all([
    getManagedStudents(current.org.id),
    getOrgMembers(current.org.id),
    countReportsAwaitingReview(current.org.id),
    getReportStatusByStudent(current.org.id),
  ]);

  // Per-student sanitized snapshot (independent → parallel). Students with a
  // null userId (invite not yet linked) get no snapshot.
  const snapshots = await Promise.all(
    students.map((s) => (s.userId ? getStudentInternshipSnapshot(s.userId) : Promise.resolve(null))),
  );

  const pendingStudents = members.filter((m) => m.role === 'student' && m.status === 'invited');

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={<InviteStudentButton />}
        className="mb-6"
      />

      <div className="flex gap-6 mb-6 text-sm">
        <span className="text-[var(--ink-3)]">{t('managedCount', { count: students.length })}</span>
        <span className="text-[var(--ink-3)]">
          {t('placedCount', { count: snapshots.filter(Boolean).length })}
        </span>
        {awaitingReview > 0 && (
          <span className="font-medium text-[var(--brand-700)]">
            {t('awaitingReviewCount', { count: awaitingReview })}
          </span>
        )}
      </div>

      {students.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm mb-8">
          {t('emptyRoster')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-hidden mb-8">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('colStudent')}</TableHead>
                <TableHead>{t('colField')}</TableHead>
                <TableHead>{t('colInternship')}</TableHead>
                <TableHead>{t('colPhase')}</TableHead>
                <TableHead>{t('colReport')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, i) => {
                const snap = snapshots[i];
                const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
                const rStatus = s.userId ? reportStatus.get(s.userId) : undefined;
                return (
                  <TableRow key={s.memberId}>
                    <TableCell className="font-medium text-[var(--ink)]">
                      {s.userId ? (
                        <Link
                          href={`/university/students/${s.userId}`}
                          className="text-[var(--brand-700)] hover:underline"
                        >
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </TableCell>
                    <TableCell className="text-caption text-[var(--ink-3)]">
                      {s.fieldOfStudy ?? s.university ?? '—'}
                    </TableCell>
                    <TableCell className="text-caption text-[var(--ink-3)]">
                      {snap ? `${snap.companyName} · ${snap.internshipTitle}` : t('notPlaced')}
                    </TableCell>
                    <TableCell>
                      {snap && snap.phaseCount > 0 ? (
                        <StatusPill tone="info">
                          {t('phaseOf', { current: snap.currentPhaseIndex + 1, total: snap.phaseCount })}
                        </StatusPill>
                      ) : (
                        <span className="text-caption text-[var(--ink-4)]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rStatus ? (
                        <StatusPill tone={toneFor(rStatus)}>
                          {t(`reportStatus.${rStatus === 'revision-requested' ? 'revisionRequested' : rStatus}`)}
                        </StatusPill>
                      ) : (
                        <span className="text-caption text-[var(--ink-4)]">{t('reportStatus.none')}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pendingStudents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-2">{t('pendingTitle')}</h2>
          <ul className="text-sm text-[var(--ink-3)] flex flex-col gap-1">
            {pendingStudents.map((m) => (
              <li key={m.id}>{m.email}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
