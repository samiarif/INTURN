'use client';

// AddMemberModal — self-contained invite flow. Renders its own trigger button
// and owns the dialog open state. Only mounted by TeamClient when the viewer
// can manage the org, so it assumes the caller is authorized (the server
// action re-checks anyway).
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteMemberAction } from '@/modules/team/server-actions';
import { ProjectMultiselect } from './project-multiselect';
import type { ProjectLite } from './types';
import { teamStrings } from './strings';

// Loose, deliberately-forgiving email shape check — the server validates for
// real; this only stops obviously-empty / malformed submits.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddMemberModal({
  orgId,
  projects,
  locale,
}: {
  orgId: string;
  projects: ProjectLite[];
  locale: string;
}) {
  const t = teamStrings(locale);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'supervisor'>('supervisor');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setEmail('');
    setRole('supervisor');
    setProjectIds([]);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError(t.emailRequired);
      return;
    }
    startTransition(async () => {
      const res = await inviteMemberAction({
        orgId,
        email: trimmed,
        role,
        projectIds: role === 'supervisor' ? projectIds : undefined,
      });
      if (res.ok) {
        reset();
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error === 'rate_limited' ? t.errorRateLimited : t.errorGeneric);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="default" size="sm" />}>
        <UserPlus strokeWidth={1.75} />
        {t.addMember}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t.modalTitle}</DialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">{t.modalEmailLabel}</Label>
            <Input
              id="invite-email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.modalEmailPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t.modalRoleLabel}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole((v as 'admin' | 'supervisor') ?? 'supervisor')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supervisor">{t.roleSupervisor}</SelectItem>
                <SelectItem value="admin">{t.roleAdmin}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === 'supervisor' ? (
            <div className="flex flex-col gap-1.5">
              <Label>{t.modalProjectsLabel}</Label>
              <ProjectMultiselect
                projects={projects}
                selectedIds={projectIds}
                onChange={setProjectIds}
                locale={locale}
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t.modalCancel}
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? t.modalSending : t.modalSend}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
