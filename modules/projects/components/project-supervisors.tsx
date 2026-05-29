'use client';

// ProjectSupervisors — manage which org members supervise THIS project.
//
// The backing action (setSupervisorProjectsAction) is *user-centric*: it
// replaces a member's entire set of supervised projects. This UI is
// *project-centric* (toggle members on one project), so each toggle recomputes
// the member's full project set from `projectIdsByUserId` (their current
// assignments across the org) and adds/removes only this project.
//
// Owner/admin only — the caller gates the trigger and the action re-checks
// `requireOrgRole(['owner','admin'])` server-side. Assignment state derives
// from the `supervisorIds` prop, so router.refresh() after a toggle reflects
// the new state without any local mirror to keep in sync.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Check } from 'lucide-react';
import { setSupervisorProjectsAction } from '@/modules/team/server-actions';
import { teamStrings } from '@/modules/team/components/strings';
import type { MemberRole } from '@/db/schema';

export type SupervisorCandidate = {
  userId: string;
  name: string;
  role: MemberRole;
};

export function ProjectSupervisors({
  orgId,
  projectId,
  supervisorIds,
  candidates,
  projectIdsByUserId,
  triggerClassName,
}: {
  orgId: string;
  projectId: string;
  supervisorIds: string[];
  candidates: SupervisorCandidate[];
  /** Each candidate's current supervised-project ids across the whole org. */
  projectIdsByUserId: Record<string, string[]>;
  triggerClassName?: string;
}) {
  const t = teamStrings(useLocale());
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roleLabel: Record<MemberRole, string> = {
    owner: t.roleOwner,
    admin: t.roleAdmin,
    supervisor: t.roleSupervisor,
  };

  function toggle(userId: string, assigned: boolean) {
    setError(null);
    setBusyUserId(userId);
    const current = projectIdsByUserId[userId] ?? [];
    const next = assigned
      ? current.filter((id) => id !== projectId)
      : Array.from(new Set([...current, projectId]));
    startTransition(async () => {
      const res = await setSupervisorProjectsAction({ orgId, userId, projectIds: next });
      setBusyUserId(null);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error === 'rate_limited' ? t.errorRateLimited : t.errorGeneric);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          'text-caption text-[var(--ink-3)] hover:text-[var(--brand-700)] hover:underline'
        }
      >
        {t.manageSupervisors}
      </button>
    );
  }

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.manageSupervisors}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(440px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: 20,
          zIndex: 50,
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.3)',
        }}
      >
        <h3 className="text-[16px] font-semibold mb-1">{t.manageSupervisors}</h3>
        <p className="text-[12.5px] text-[var(--ink-3)] mb-4">{t.supervisorsHint}</p>

        {candidates.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-3)] italic py-4 text-center">
            {t.noEligibleMembers}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {candidates.map((c) => {
              const assigned = supervisorIds.includes(c.userId);
              const isBusy = pending && busyUserId === c.userId;
              return (
                <li key={c.userId}>
                  <button
                    type="button"
                    onClick={() => toggle(c.userId, assigned)}
                    disabled={pending}
                    aria-pressed={assigned}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-[var(--surface-muted)] disabled:opacity-60"
                  >
                    <span
                      className={
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border ' +
                        (assigned
                          ? 'border-[var(--brand-500)] bg-[var(--brand-500)] text-white'
                          : 'border-[var(--border-strong)] bg-[var(--surface)]')
                      }
                      aria-hidden
                    >
                      {assigned ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[var(--ink)]">{c.name}</span>
                      <span className="block text-[11.5px] text-[var(--ink-4)]">
                        {roleLabel[c.role]}
                      </span>
                    </span>
                    {isBusy ? <span className="text-[11px] text-[var(--ink-4)]">…</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error ? <p className="text-[13px] text-[var(--danger)] mt-3">{error}</p> : null}

        <div className="mt-5 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="rounded-md bg-[var(--brand-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--brand-600)] disabled:opacity-60"
          >
            {t.done}
          </button>
        </div>
      </div>
    </>
  );
}
