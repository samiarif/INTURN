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
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await inviteCoordinatorAction({ universityOrgId, email });
      if (res.ok) {
        setMsg({ text: t('inviteSent'), ok: true });
        setEmail('');
        router.refresh();
      } else {
        // inviteCoordinatorAction only surfaces shouldn't-happen codes
        // (org_not_found/not_a_university) or thrown errors → generic copy.
        setMsg({ text: t('errorGeneric'), ok: false });
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
        type="email"
        value={email}
        placeholder={t('coordinatorEmail')}
        aria-label={t('coordinatorEmail')}
        onChange={(e) => setEmail(e.target.value)}
        className="h-8 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
      />
      <Button size="sm" disabled={pending || !email} onClick={submit}>
        {pending ? t('sending') : t('send')}
      </Button>
      {msg && (
        <span
          className={
            msg.ok ? 'text-caption text-[var(--ink-3)]' : 'text-caption text-destructive'
          }
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}
