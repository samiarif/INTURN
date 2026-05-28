'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createNoteAction } from '@/modules/notes/server-actions';

type Props = {
  workspaceId: string;
  onClose: () => void;
};

export function AddNoteModal({ workspaceId, onClose }: Props) {
  const t = useTranslations('workspace.notes');
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!body.trim()) {
      setError(t('errorEmpty'));
      return;
    }
    startTransition(async () => {
      const res = await createNoteAction(workspaceId, body);
      if (!res.ok) {
        setError(t('errorGeneric'));
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={t('title')}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(480px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: 24,
          zIndex: 50,
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.3)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--ink)' }}>
          {t('title')}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label
              htmlFor="note-body"
              style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--ink-2)' }}
            >
              {t('placeholder')}
            </label>
            <textarea
              id="note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder={t('placeholder')}
               
              autoFocus
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                fontSize: 13,
                resize: 'vertical',
                fontFamily: 'inherit',
                color: 'var(--ink)',
                background: 'var(--surface)',
              }}
            />
          </div>

          {error && <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                background: 'transparent',
                border: '1px solid var(--border-color)',
                fontSize: 13,
                cursor: 'pointer',
                color: 'var(--ink-2)',
              }}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !body.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                background: 'var(--brand-500)',
                border: 'none',
                fontSize: 13,
                cursor: pending || !body.trim() ? 'not-allowed' : 'pointer',
                color: '#fff',
                fontWeight: 500,
                opacity: pending || !body.trim() ? 0.6 : 1,
              }}
            >
              {pending ? `${t('save')}…` : t('save')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
