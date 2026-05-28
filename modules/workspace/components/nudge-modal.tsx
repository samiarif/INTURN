'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { sendNudgeAction } from '@/modules/notifications/nudge-actions';

const MAX_LENGTH = 280;

type Props = {
  workspaceId: string;
  onClose: () => void;
};

export function NudgeModal({ workspaceId, onClose }: Props) {
  const t = useTranslations('workspace.nudge');
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const res = await sendNudgeAction(workspaceId, message.trim() || null);
      if (!res.ok) {
        if (res.error === 'rate_limited') {
          setError(t('rateLimited'));
        } else {
          setError(t('errorGeneric'));
        }
        return;
      }
      setSent(true);
      router.refresh();
      setTimeout(() => {
        onClose();
      }, 1200);
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
          width: 'min(440px, calc(100vw - 32px))',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: 24,
          zIndex: 50,
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.3)',
        }}
      >
        {sent ? (
          <div
            style={{
              textAlign: 'center',
              padding: '8px 0',
              color: 'var(--ink)',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {t('sent')}
          </div>
        ) : (
          <>
            <h3
              style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}
            >
              {t('title')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <textarea
                  id="nudge-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                  rows={3}
                  placeholder={t('placeholder')}
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
                    boxSizing: 'border-box',
                  }}
                />
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: 11,
                    color: message.length >= MAX_LENGTH ? 'var(--danger)' : 'var(--ink-3)',
                    marginTop: 2,
                  }}
                >
                  {message.length}/{MAX_LENGTH}
                </div>
              </div>

              {error && (
                <p style={{ fontSize: 12.5, color: 'var(--danger)', margin: 0 }}>{error}</p>
              )}

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
                  onClick={handleSend}
                  disabled={pending}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: 'var(--brand-500)',
                    border: 'none',
                    fontSize: 13,
                    cursor: pending ? 'not-allowed' : 'pointer',
                    color: '#fff',
                    fontWeight: 500,
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  {pending ? '…' : t('send')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
