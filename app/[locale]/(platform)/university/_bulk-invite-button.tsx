'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { bulkInviteStudentsAction } from '@/modules/university/server-actions';

export function BulkInviteButton({
  coordinators,
}: {
  coordinators: { userId: string; name: string }[];
}) {
  const t = useTranslations('university.dashboard');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [encadrant, setEncadrant] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await bulkInviteStudentsAction({ csv, encadrantUserId: encadrant || null });
      if (res.ok) {
        setMsg(
          t('bulkSummary', {
            invited: res.invited,
            skipped: res.skippedDuplicate.length,
            invalid: res.invalid.length,
          }),
        );
        setCsv('');
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        {t('bulkImport')}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] p-3">
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={t('bulkPlaceholder')}
        aria-label={t('bulkImport')}
        rows={5}
        className="rounded-md border border-[var(--border-color)] bg-[var(--surface)] p-2 font-mono text-sm"
      />
      <input
        type="file"
        accept=".csv,text/csv"
        className="text-caption text-[var(--ink-3)]"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          f.text().then(setCsv);
        }}
      />
      {coordinators.length > 0 && (
        <select
          value={encadrant}
          onChange={(e) => setEncadrant(e.target.value)}
          className="h-8 rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2 text-caption text-[var(--ink-2)]"
        >
          <option value="">{t('bulkAssignSelf')}</option>
          {coordinators.map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={pending || !csv.trim()} onClick={submit}>
          {pending ? t('sending') : t('bulkSubmit')}
        </Button>
        {msg && <span className="text-caption text-[var(--ink-3)]">{msg}</span>}
      </div>
    </div>
  );
}
