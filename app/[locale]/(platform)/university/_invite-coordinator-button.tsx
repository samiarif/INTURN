'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { inviteCoordinatorAction } from '@/modules/university/server-actions';

export function InviteCoordinatorButton() {
  const t = useTranslations('university.dashboard');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Map the action's machine error codes to localized copy; unknown/shouldn't-
  // happen states funnel to a generic line (the established mapError pattern).
  function mapError(code: string): string {
    return code === 'rate_limited' ? t('errorRateLimited') : t('errorGeneric');
  }

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await inviteCoordinatorAction({ email });
      if (res.ok) {
        setMsg({ text: t('inviteSent'), ok: true });
        setEmail('');
        router.refresh();
      } else {
        setMsg({ text: mapError(res.error), ok: false });
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
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
