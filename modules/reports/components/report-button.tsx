'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  submitReportAction,
  type ReportReason,
  type ReportSubjectType,
} from '../server-actions';

type Props = {
  subjectType: ReportSubjectType;
  subjectId: string;
};

export function ReportButton({ subjectType, subjectId }: Props) {
  const t = useTranslations('report');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('scam');
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (body.trim().length < 20) {
      setError(t('errorMin'));
      return;
    }
    startTransition(async () => {
      const res = await submitReportAction({ subjectType, subjectId, reason, body });
      if (!res.ok) {
        setError(t('errorGeneric'));
        return;
      }
      setSuccess(true);
      setBody('');
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] text-[var(--ink-3)] hover:text-[var(--danger)] underline underline-offset-2 decoration-dotted"
        aria-label={t('open')}
      >
        {t('open')}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
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
              background: 'var(--surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: 20,
              zIndex: 50,
              boxShadow: '0 20px 60px -20px rgba(0,0,0,0.3)',
            }}
          >
            {success ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>
                  {t('successTitle')}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
                  {t('successBody')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setSuccess(false);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: 'var(--ink)',
                  }}
                >
                  {t('close')}
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>
                  {t('title')}
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 14 }}>
                  {t('subtitle')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, display: 'block' }}>
                      {t('reasonLabel')}
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value as ReportReason)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 6,
                        fontSize: 13,
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                      }}
                    >
                      <option value="scam">{t('reasons.scam')}</option>
                      <option value="misleading">{t('reasons.misleading')}</option>
                      <option value="inappropriate">{t('reasons.inappropriate')}</option>
                      <option value="spam">{t('reasons.spam')}</option>
                      <option value="unsafe">{t('reasons.unsafe')}</option>
                      <option value="other">{t('reasons.other')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, display: 'block' }}>
                      {t('bodyLabel')}
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={5}
                      placeholder={t('bodyPlaceholder')}
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
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                      {body.length}/20 min
                    </p>
                  </div>
                  {error && <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{error}</p>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
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
                      disabled={pending || body.trim().length < 20}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        background: 'var(--danger)',
                        border: 'none',
                        fontSize: 13,
                        cursor: pending || body.trim().length < 20 ? 'not-allowed' : 'pointer',
                        color: '#fff',
                        fontWeight: 500,
                        opacity: pending || body.trim().length < 20 ? 0.6 : 1,
                      }}
                    >
                      {pending ? t('submitting') : t('submit')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
