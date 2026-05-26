'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createTaskAction } from '@/modules/tasks/server-actions';

type Props = {
  workspaceId: string;
  initialStatus: 'todo' | 'in-progress' | 'review' | 'done';
  onClose: () => void;
};

type ClarityResponse = {
  scope: string;
  deliverable: string;
  suggestedDeadline: string | null;
  notes: string;
};

export function AddTaskModal({ workspaceId, initialStatus, onClose }: Props) {
  const t = useTranslations('workspace.addTask');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // AI clarity state
  const [drafting, setDrafting] = useState(false);
  const [clarity, setClarity] = useState<ClarityResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  async function askAi() {
    if (title.trim().length < 3) {
      setAiError(t('errorTitleMin'));
      return;
    }
    setDrafting(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/task-clarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description.trim() || null,
          deadline: dueDate || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setAiError(j.error === 'rate_limited' ? t('rateLimited') : t('aiFailed'));
        return;
      }
      const j = (await res.json()) as ClarityResponse;
      setClarity(j);
    } catch {
      setAiError(t('networkError'));
    } finally {
      setDrafting(false);
    }
  }

  function applyClarity() {
    if (!clarity) return;
    setTitle(clarity.scope);
    setDescription(clarity.deliverable);
    if (clarity.suggestedDeadline) setDueDate(clarity.suggestedDeadline);
    setClarity(null);
  }

  function submit() {
    setError(null);
    if (title.trim().length < 3) {
      setError(t('errorTitleMin'));
      return;
    }
    startTransition(async () => {
      const res = await createTaskAction({
        workspaceId,
        title,
        description: description.trim() || null,
        priority,
        dueDate: dueDate || null,
      });
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
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
          {t('title')}
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16 }}>
          {t('subtitle', { status: initialStatus })}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
              {t('titleLabel')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                fontSize: 14,
                background: 'var(--surface)',
                color: 'var(--ink)',
              }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
              {t('descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('descriptionPlaceholder')}
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

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                {t('priorityLabel')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
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
                <option value="low">{t('priorityLow')}</option>
                <option value="medium">{t('priorityMedium')}</option>
                <option value="high">{t('priorityHigh')}</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                {t('dueDateLabel')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  fontSize: 13,
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>

          {/* AI Clarity panel */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'var(--brand-50, rgba(0,112,243,0.05))',
              border: '1px solid var(--brand-100, rgba(0,112,243,0.15))',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 0.06,
                  textTransform: 'uppercase',
                  color: 'var(--brand-700)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ✦ {t('aiPanelTitle')}
              </div>
              <button
                type="button"
                onClick={askAi}
                disabled={drafting || title.trim().length < 3}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'var(--brand-500)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: drafting || title.trim().length < 3 ? 'not-allowed' : 'pointer',
                  opacity: drafting || title.trim().length < 3 ? 0.5 : 1,
                }}
              >
                {drafting ? t('aiDrafting') : t('aiCta')}
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: 0 }}>{t('aiHelp')}</p>
            {aiError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{aiError}</p>}

            {clarity && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink)' }}>
                <div style={{ marginBottom: 6 }}>
                  <strong>{t('aiScope')}</strong> {clarity.scope}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <strong>{t('aiDeliverable')}</strong> {clarity.deliverable}
                </div>
                {clarity.suggestedDeadline && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>{t('aiDeadline')}</strong> {clarity.suggestedDeadline}
                  </div>
                )}
                <div
                  style={{
                    marginBottom: 8,
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    fontStyle: 'italic',
                  }}
                >
                  {clarity.notes}
                </div>
                <button
                  type="button"
                  onClick={applyClarity}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--brand-500)',
                    background: 'transparent',
                    color: 'var(--brand-700)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {t('aiApply')}
                </button>
              </div>
            )}
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
              disabled={pending || title.trim().length < 3}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                background: 'var(--brand-500)',
                border: 'none',
                fontSize: 13,
                cursor: pending || title.trim().length < 3 ? 'not-allowed' : 'pointer',
                color: '#fff',
                fontWeight: 500,
                opacity: pending || title.trim().length < 3 ? 0.6 : 1,
              }}
            >
              {pending ? t('saving') : t('submit')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
