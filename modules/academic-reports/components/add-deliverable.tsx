'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createReportDraftAction } from '@/modules/academic-reports/server-actions';

export function AddDeliverable({
  universityOrgId,
  kindOptions,
  labels,
}: {
  universityOrgId: string;
  kindOptions: { value: string; label: string }[];
  labels: { add: string; kindLabel: string; titleLabel: string; create: string; creating: string };
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(kindOptions[0]?.value ?? 'rapport');
  const [title, setTitle] = useState(kindOptions[0]?.label ?? '');
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-[var(--brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-600)]"
      >
        {labels.add}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4">
      <label className="flex flex-col gap-1 text-caption text-[var(--ink-3)]">
        {labels.kindLabel}
        <select
          value={kind}
          onChange={(e) => {
            const next = e.target.value;
            setKind(next);
            const opt = kindOptions.find((o) => o.value === next);
            if (opt) setTitle(opt.label);
          }}
          className="rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--ink-2)]"
        >
          {kindOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1 text-caption text-[var(--ink-3)]">
        {labels.titleLabel}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--ink)]"
        />
      </label>
      <button
        disabled={pending || !title.trim()}
        onClick={() =>
          start(async () => {
            await createReportDraftAction({ universityOrgId, kind, title: title.trim() });
            setOpen(false);
            router.refresh();
          })
        }
        className="inline-flex items-center rounded-md bg-[var(--brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-600)] disabled:opacity-50"
      >
        {pending ? labels.creating : labels.create}
      </button>
    </div>
  );
}
