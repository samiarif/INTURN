'use client';

// MemberRow — one staff member in the roster (active or invited). Renders the
// avatar + identity + RolePill, plus a `⋯` actions popover whose contents are
// driven entirely by the member's status and role:
//
//   owner (active)   → no menu (owner is immutable)
//   active non-owner → flip role · manage projects (supervisors) · remove
//   invited          → resend · revoke
//
// "Remove" is hidden for the viewer's own row so nobody locks themselves out
// from the UI. All mutations run through useTransition and refresh on success.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  setMemberRoleAction,
  removeMemberAction,
  resendInviteAction,
  revokeInviteAction,
  setSupervisorProjectsAction,
} from '@/modules/team/server-actions';
import { RolePill } from './role-pill';
import { ProjectMultiselect } from './project-multiselect';
import type { TeamMember, ProjectLite } from './types';
import { teamStrings } from './strings';

function initials(member: TeamMember): string {
  const first = member.firstName?.trim()?.[0] ?? '';
  const last = member.lastName?.trim()?.[0] ?? '';
  const fromName = (first + last).toUpperCase();
  if (fromName) return fromName;
  return member.email.slice(0, 2).toUpperCase();
}

function displayName(member: TeamMember): string {
  const full = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return full || member.email;
}

const MENU_ITEM =
  'w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50';

export function MemberRow({
  member,
  currentUserId,
  orgId,
  projects,
  locale,
}: {
  member: TeamMember;
  currentUserId: string;
  orgId: string;
  projects: ProjectLite[];
  locale: string;
}) {
  const t = teamStrings(locale);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const isActive = member.status === 'active';
  const isOwner = member.role === 'owner';
  const isSupervisor = member.role === 'supervisor';
  const isSelf = !!member.userId && member.userId === currentUserId;

  // Menu item availability. You can't change your own role or remove yourself
  // here (prevents a sole admin locking themselves out of org management); the
  // owner row is immutable. Invited rows always offer resend/revoke.
  const canFlipRole = isActive && !isOwner && !isSelf;
  const canManageProjects = isActive && isSupervisor && !!member.userId;
  const canRemove = isActive && !isOwner && !isSelf;
  const canResendOrRevoke = !isActive && !isOwner;

  // Hide the trigger entirely when no actions are available (e.g. an admin
  // viewing their own row) rather than rendering an empty popover.
  const hasMenu = canFlipRole || canManageProjects || canRemove || canResendOrRevoke;

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setMenuOpen(false);
        setProjectsOpen(false);
        router.refresh();
      } else {
        setError(res.error === 'rate_limited' ? t.errorRateLimited : t.errorGeneric);
      }
    });
  }

  function handleRemove() {
    if (typeof window !== 'undefined' && !window.confirm(t.confirmRemove)) return;
    run(() => removeMemberAction({ orgId, memberId: member.id }));
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar size="sm">
        {member.imageUrl ? (
          <AvatarImage src={member.imageUrl} alt={displayName(member)} />
        ) : null}
        <AvatarFallback>{initials(member)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {displayName(member)}
          </span>
          <RolePill role={member.role} locale={locale} pending={member.status === 'invited'} />
        </div>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        {error ? <p className="mt-0.5 text-xs text-destructive">{error}</p> : null}
      </div>

      {hasMenu ? (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${t.rowActions} — ${displayName(member)}`}
              />
            }
          >
            <MoreHorizontal strokeWidth={1.75} />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 gap-0.5 p-1">
            {canFlipRole ? (
              isSupervisor ? (
                <button
                  type="button"
                  className={MENU_ITEM}
                  disabled={pending}
                  onClick={() =>
                    run(() => setMemberRoleAction({ orgId, memberId: member.id, role: 'admin' }))
                  }
                >
                  {t.actionChangeToAdmin}
                </button>
              ) : (
                <button
                  type="button"
                  className={MENU_ITEM}
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      setMemberRoleAction({ orgId, memberId: member.id, role: 'supervisor' }),
                    )
                  }
                >
                  {t.actionChangeToSupervisor}
                </button>
              )
            ) : null}

            {canManageProjects ? (
              <button
                type="button"
                className={MENU_ITEM}
                disabled={pending}
                onClick={() => {
                  setMenuOpen(false);
                  setProjectsOpen(true);
                }}
              >
                {t.actionManageProjects}
              </button>
            ) : null}

            {canRemove ? (
              <button
                type="button"
                className={MENU_ITEM + ' text-destructive hover:bg-destructive/10'}
                disabled={pending}
                onClick={handleRemove}
              >
                {t.actionRemove}
              </button>
            ) : null}

            {canResendOrRevoke ? (
              <>
                <button
                  type="button"
                  className={MENU_ITEM}
                  disabled={pending}
                  onClick={() => run(() => resendInviteAction({ orgId, memberId: member.id }))}
                >
                  {t.actionResend}
                </button>
                <button
                  type="button"
                  className={MENU_ITEM + ' text-destructive hover:bg-destructive/10'}
                  disabled={pending}
                  onClick={() => run(() => revokeInviteAction({ orgId, memberId: member.id }))}
                >
                  {t.actionRevoke}
                </button>
              </>
            ) : null}
          </PopoverContent>
        </Popover>
      ) : null}

      {/* Manage-projects dialog — only reachable for active supervisors with a
          linked user id (setSupervisorProjectsAction keys off userId). Mounted
          only while open so its initial selection is recomputed from the latest
          `projects` on every open (after a save + router.refresh()). */}
      {projectsOpen && isSupervisor && member.userId ? (
        <ManageProjectsDialog
          open={projectsOpen}
          onOpenChange={setProjectsOpen}
          orgId={orgId}
          userId={member.userId}
          projects={projects}
          locale={locale}
        />
      ) : null}
    </div>
  );
}

function ManageProjectsDialog({
  open,
  onOpenChange,
  orgId,
  userId,
  projects,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  userId: string;
  projects: ProjectLite[];
  locale: string;
}) {
  const t = teamStrings(locale);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Preselect the projects this supervisor already supervises.
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    projects.filter((p) => p.supervisorIds?.includes(userId)).map((p) => p.id),
  );

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await setSupervisorProjectsAction({ orgId, userId, projectIds: selectedIds });
      if (res.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error === 'rate_limited' ? t.errorRateLimited : t.errorGeneric);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t.actionManageProjects}</DialogTitle>
        <div className="flex flex-col gap-1.5">
          <ProjectMultiselect
            projects={projects}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            locale={locale}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t.modalCancel}
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? t.saving : t.saveProjects}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
