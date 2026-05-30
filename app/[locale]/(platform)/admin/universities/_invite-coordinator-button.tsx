'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { inviteCoordinatorAction } from '@/modules/university/admin-actions';

export function InviteCoordinatorButton({ universityOrgId }: { universityOrgId: string }) {
  const t = useTranslations('university.admin');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await inviteCoordinatorAction({ universityOrgId, email });
      if (res.ok) {
        setMsg(t('inviteSent'));
        setEmail('');
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('inviteCoordinator')}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email" value={email} placeholder={t('coordinatorEmail')}
        onChange={(e) => setEmail(e.target.value)}
        className="h-8 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
      />
      <Button size="sm" disabled={pending || !email} onClick={submit}>
        {pending ? t('sending') : t('send')}
      </Button>
      {msg && <span className="text-caption text-[var(--ink-3)]">{msg}</span>}
    </div>
  );
}
