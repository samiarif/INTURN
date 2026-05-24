'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileDrop } from '@/components/file-drop';
import { submitDeliverableAction } from '@/modules/deliverables/server-actions';

/**
 * Intern-only upload zone for the next version. The pill-styled outer card is
 * also the click target — clicking it expands a FileDrop + note field. Submit
 * fires the server action which bumps the version and pushes the prior one
 * into revision_history.
 */
export function DelivUploadZone({
  deliverableId,
  nextVersion,
}: {
  deliverableId: string;
  nextVersion: number;
}) {
  const t = useTranslations('workspace.deliverables.master');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<{
    url: string;
    fileName: string;
    contentType: string;
  } | null>(null);
  const [note, setNote] = useState('');

  function submit() {
    if (!staged) return;
    startTransition(async () => {
      await submitDeliverableAction({
        deliverableId,
        fileUrl: staged.url,
        fileName: staged.fileName,
        fileType: staged.contentType,
        note: note.trim() || undefined,
      });
      setStaged(null);
      setNote('');
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="dv-upload"
        onClick={() => setOpen(true)}
        style={{ width: '100%', textAlign: 'left' }}
      >
        <div className="icon" aria-hidden>
          ↑
        </div>
        <div className="text">
          <div className="title">{t('dropFilesTitle', { n: nextVersion })}</div>
          <div className="sub">{t('dropFilesHelper')}</div>
        </div>
        <span className="pill">{t('supportedTypes')}</span>
      </button>
    );
  }

  return (
    <div
      style={{
        border: '1.5px solid var(--brand-100)',
        background: 'var(--brand-50)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: 'var(--ink)',
          marginBottom: 10,
        }}
      >
        {t('dropFilesTitle', { n: nextVersion })}
      </div>
      <FileDrop
        kind="deliverable"
        accept=".pdf,image/*,.zip,.fig,.md"
        onUploaded={(r) =>
          setStaged({
            url: r.url,
            fileName: r.fileName,
            contentType: r.contentType,
          })
        }
        helper={t('supportedTypes')}
      />
      {staged && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>✓ {staged.fileName}</span>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <label
          htmlFor={`dv-note-${deliverableId}`}
          style={{
            display: 'block',
            fontSize: 11.5,
            color: 'var(--ink-3)',
            marginBottom: 4,
            fontFamily: 'Geist Mono, monospace',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {t('feedbackOptional')}
        </label>
        <textarea
          id={`dv-note-${deliverableId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 13,
            background: 'var(--surface)',
            color: 'var(--ink)',
            resize: 'vertical',
          }}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        <button
          type="button"
          className="dv-btn-changes"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setStaged(null);
            setNote('');
          }}
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          className="dv-btn-approve"
          disabled={pending || !staged}
          onClick={submit}
        >
          {pending ? t('sending') : t('send')}
        </button>
      </div>
    </div>
  );
}
