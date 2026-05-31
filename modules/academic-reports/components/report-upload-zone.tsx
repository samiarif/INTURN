'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Check } from 'lucide-react';
import { FileDrop } from '@/components/file-drop';
import { Button } from '@/components/ui/button';
import { submitReportAction } from '@/modules/academic-reports/server-actions';

export function ReportUploadZone({
  reportId,
  labels,
}: {
  reportId: string;
  labels: {
    title: string;
    helper: string;
    notePlaceholder: string;
    cancel: string;
    send: string;
    sending: string;
    errorRateLimited: string;
    errorGeneric: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<{ url: string; fileName: string; contentType: string } | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Map the action's machine error codes to localized copy; unknown/shouldn't-
  // happen states funnel to a generic line (the established mapError pattern).
  function mapError(code: string): string {
    return code === 'rate_limited' ? labels.errorRateLimited : labels.errorGeneric;
  }

  function submit() {
    if (!staged) return;
    setError(null);
    startTransition(async () => {
      const res = await submitReportAction({
        reportId,
        fileUrl: staged.url,
        fileName: staged.fileName,
        fileType: staged.contentType,
        note: note.trim() || undefined,
      });
      if (res.ok) {
        setStaged(null);
        setNote('');
        setOpen(false);
        router.refresh();
      } else {
        setError(mapError(res.error));
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Upload size={16} aria-hidden /> {labels.title}
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-[var(--brand-100)] bg-[var(--brand-50)] p-4">
      <FileDrop
        kind="report"
        accept=".pdf"
        helper={labels.helper}
        onUploaded={(r) => setStaged({ url: r.url, fileName: r.fileName, contentType: r.contentType })}
      />
      {staged && (
        <div className="mt-2.5 flex items-center gap-2 rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm">
          <Check size={14} className="text-[var(--success)]" aria-hidden />
          <span className="truncate">{staged.fileName}</span>
        </div>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder={labels.notePlaceholder}
        aria-label={labels.notePlaceholder}
        className="mt-2.5 w-full rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
      />
      {error && <p className="mt-1 text-caption text-[var(--danger)]">{error}</p>}
      <div className="mt-2.5 flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => { setOpen(false); setStaged(null); setNote(''); }}>
          {labels.cancel}
        </Button>
        <Button size="sm" disabled={pending || !staged} onClick={submit}>
          {pending ? labels.sending : labels.send}
        </Button>
      </div>
    </div>
  );
}
