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
import { Crown } from 'lucide-react';
import { Avatar } from '@/components/avatar';
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

  // KPI tile labels — the `*Count` messages are plain "{count} <noun>"
  // interpolations in both locales, so rendering them with an empty count
  // yields the bare noun for the tile eyebrow. Reuses the existing keys
  // (no new literal strings); revisit if these ever become ICU plurals.
  const statLabel = (key: 'managedCount' | 'placedCount' | 'awaitingReviewCount') =>
    t(key, { count: '' }).trim();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <PageHeader
        eyebrow={current.org.name}
        title={t('title')}
        description={t('subtitle')}
        actions={<InviteStudentButton />}
        className="mb-6"
      />

      <div className="mb-6">
        <BulkInviteButton coordinators={coordinatorOptions} />
      </div>

      {/* Stat tiles — same idiom as the intern dashboard: mono uppercase
          label + big number + faint tinted square. */}
      <div
        className={`grid grid-cols-1 gap-3 mb-6 ${isHead ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}
      >
        <StatTile
          label={statLabel('managedCount')}
          value={students.length}
          accentClass="bg-[var(--surface-brand-tint)]"
        />
        <StatTile
          label={statLabel('placedCount')}
          value={snapshots.filter(Boolean).length}
          accentClass="bg-[var(--surface-accent-tint)]"
        />
        <StatTile
          label={statLabel('awaitingReviewCount')}
          value={awaitingReview}
          accentClass="bg-[var(--surface-brand-tint)]"
        />
        {isHead && (
          <StatTile
            label={t('coordinatorsTitle')}
            value={coordinators.length}
            accentClass="bg-[var(--surface-accent-tint)]"
          />
        )}
      </div>

      {students.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm mb-8">
          {t('emptyRoster')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] shadow-[var(--elev-card)] overflow-hidden mb-8">
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
                          : <span className="text-caption text-[var(--ink-4)]">{'—'}</span>;
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
            <h2 className="flex items-baseline gap-2 font-mono text-eyebrow uppercase tracking-[0.08em] text-[var(--brand-700)]">
              {t('coordinatorsTitle')}
              <span className="font-mono text-caption font-normal normal-case tracking-normal text-[var(--ink-4)]">
                {coordinators.length}
              </span>
            </h2>
            <InviteCoordinatorButton />
          </div>
          <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] shadow-[var(--elev-card)] divide-y divide-[var(--border-color)]">
            {coordinators.map((c) => {
              const count = students.filter((s) => s.assignedCoordinatorId === c.userId).length;
              return (
                <div
                  key={c.userId}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <Avatar name={c.name} email={c.email} size="sm" />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-medium text-[var(--ink)]">{c.name}</span>
                    {c.role === 'owner' && (
                      <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-brand-700">
                        <Crown size={12} strokeWidth={1.75} aria-hidden />
                        {t('headBadge')}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-caption text-[var(--ink-4)]">
                    {t('studentCount', { count })}
                  </span>
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

/** Stat tile — mirrors the intern dashboard's StatTile (static variant). */
function StatTile({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: number;
  accentClass: string;
}) {
  return (
    <div className="relative border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-4 overflow-hidden">
      <span aria-hidden className={`absolute top-3 right-3 w-7 h-7 rounded-md ${accentClass}`} />
      <div className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-1">{label}</div>
      <div className="text-title text-[var(--ink)]">{value}</div>
    </div>
  );
}
