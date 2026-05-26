'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { issueRecordAction } from '../server-actions';

type Props = {
  workspaceId: string;
  hasActiveRecord: boolean;
  activeRecordToken: string | null;
  locale: string;
};

export function IssueRecordButton({
  workspaceId,
  hasActiveRecord,
  activeRecordToken,
  locale,
}: Props) {
  const t = useTranslations('records.issue');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [review, setReview] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ token: string } | null>(null);

  function submit() {
    setError(null);
    if (review.trim().length < 40) {
      setError(t('minReviewError'));
      return;
    }
    startTransition(async () => {
      const res = await issueRecordAction({
        workspaceId,
        reviewText: review,
        rating,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess({ token: res.shareToken });
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="ws-btn-w"
        onClick={() => {
          setOpen(true);
          setSuccess(null);
        }}
      >
        {hasActiveRecord && activeRecordToken
          ? t('buttonOpen') + ' ↻'
          : t('buttonOpen') + ' →'}
      </button>
    );
  }

  return (
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
          width: 'min(560px, calc(100vw - 32px))',
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
        {success ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--ink)' }}>
              {t('successTitle')}
            </h3>
            <Link
              href={`/${locale}/records/${success.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rec-btn rec-btn-primary"
              style={{ textDecoration: 'none', display: 'inline-flex' }}
            >
              {t('successCta')} ↗
            </Link>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>
              {t('title')}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
              {t('subtitle')}
            </p>

            {hasActiveRecord && <p className="rec-issue-hint">{t('alreadyExistsHint')}</p>}

            <div className="rec-issue-form">
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: 6,
                    display: 'block',
                  }}
                >
                  {t('reviewLabel')}
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={6}
                  placeholder={t('reviewPlaceholder')}
                  className="rec-issue-textarea"
                />
                <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                  {review.length}/40 min
                </p>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: 6,
                    display: 'block',
                  }}
                >
                  {t('ratingLabel')}
                </label>
                <div className="rec-issue-stars" role="radiogroup" aria-label={t('ratingLabel')}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n}/5`}
                      className={`rec-issue-star ${rating !== null && n <= rating ? 'active' : ''}`}
                      onClick={() => setRating(rating === n ? null : n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="rec-issue-error">{error}</p>}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 8,
                }}
              >
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
                  disabled={pending || review.trim().length < 40}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: 'var(--brand-500)',
                    border: 'none',
                    fontSize: 13,
                    cursor: pending || review.trim().length < 40 ? 'not-allowed' : 'pointer',
                    color: '#fff',
                    fontWeight: 500,
                    opacity: pending || review.trim().length < 40 ? 0.6 : 1,
                  }}
                >
                  {pending ? t('saving') : t('submit')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
