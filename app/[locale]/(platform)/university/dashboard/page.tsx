import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getCurrentOrg, requireOrgRole } from '@/modules/team/authz';
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
import {
  getManagedStudents,
  getStudentInternshipSnapshot,
  getUniversityCoordinators,
  getPendingStudentInvites,
  type UniversityCoordinator,
} from '@/modules/university/queries';
import { countReportsAwaitingReview, getAwaitingReviewCountByStudent } from '@/modules/academic-reports/queries';
import Link from 'next/link';
import { InviteStudentButton } from '../_invite-student-button';
import { InviteCoordinatorButton } from '../_invite-coordinator-button';
import { AssignCoordinatorSelect } from '../_assign-coordinator-select';
import { BulkInviteButton } from '../_bulk-invite-button';
import { PendingInvites } from '../_pending-invites';

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

  // Gated visibility: the head (owner) sees every student + manages assignments;
  // an encadrant (admin) sees only the students assigned to them.
  const isHead = current.role === 'owner';

  const [students, awaitingReview, awaitingByStudent] = await Promise.all([
    getManagedStudents(current.org.id, isHead ? undefined : { forCoordinatorId: session.user.id }),
    countReportsAwaitingReview(current.org.id),
    getAwaitingReviewCountByStudent(current.org.id),
  ]);

  const coordinators: UniversityCoordinator[] = isHead
    ? await getUniversityCoordinators(current.org.id)
    : [];

  const pendingInvites = await getPendingStudentInvites(
    current.org.id,
    isHead ? undefined : { forCoordinatorId: session.user.id },
  );

  // Per-student sanitized snapshot (independent → parallel). Students with a
  // null userId (invite not yet linked) get no snapshot.
  const snapshots = await Promise.all(
    students.map((s) => (s.userId ? getStudentInternshipSnapshot(s.userId) : Promise.resolve(null))),
  );

  const coordinatorOptions = coordinators.map((c) => ({ userId: c.userId, name: c.name }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={<InviteStudentButton />}
        className="mb-6"
      />

      <div className="mb-6">
        <BulkInviteButton coordinators={coordinatorOptions} />
      </div>

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
                {isHead && <TableHead>{t('colEncadrant')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, i) => {
                const snap = snapshots[i];
                const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
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
                        <span className="text-caption text-[var(--ink-4)]">{'—'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const n = s.userId ? (awaitingByStudent.get(s.userId) ?? 0) : 0;
                        return n > 0
                          ? <StatusPill tone="warn">{t('reportStatus.awaiting', { count: n })}</StatusPill>
                          : <span className="text-caption text-[var(--ink-4)]">—</span>;
                      })()}
                    </TableCell>
                    {isHead && (
                      <TableCell>
                        <AssignCoordinatorSelect
                          studentMemberId={s.memberId}
                          current={s.assignedCoordinatorId}
                          coordinators={coordinatorOptions}
                          unassignedLabel={t('unassigned')}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {isHead && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[var(--ink-2)]">{t('coordinatorsTitle')}</h2>
            <InviteCoordinatorButton />
          </div>
          <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] divide-y divide-[var(--border-color)]">
            {coordinators.map((c) => {
              const count = students.filter((s) => s.assignedCoordinatorId === c.userId).length;
              return (
                <div key={c.userId} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-[var(--ink)]">
                    {c.name}
                    {c.role === 'owner' && (
                      <span className="ml-2 text-caption text-[var(--ink-4)]">{t('headBadge')}</span>
                    )}
                  </span>
                  <span className="text-caption text-[var(--ink-3)]">{t('studentCount', { count })}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <PendingInvites
        invites={pendingInvites.map((p) => ({
          memberId: p.memberId,
          email: p.email,
          encadrantName: p.encadrantName,
        }))}
      />
    </div>
  );
}
