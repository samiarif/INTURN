'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addCommentAction } from '@/modules/comments/server-actions';

type Props = {
  label: string;
  title: string;
  placeholder: string;
  sendLabel: string;
  cancelLabel: string;
  draftBadgeLabel: string;
  regenerateLabel: string;
  workspaceId?: string;
};

/**
 * Stuck pill — bottom-left floating button on intern workspace views.
 *
 * Click opens a popover with:
 *  - Textarea for the intern to describe what's blocking them
 *  - "Ask AI for a draft" button → /api/ai/intern-unblocker returns a polished
 *    clarifying message (intern reviews / edits before sending)
 *  - "Send to supervisor" posts the (edited) text as a workspace comment
 *
 * Human-in-the-loop per the brief: AI suggests, intern decides.
 */
export function StuckPillClient(props: Props) {
  const [open, setOpen] = useState(false);
  const [blocker, setBlocker] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const text = draft ?? blocker;

  async function onDraft() {
    if (blocker.trim().length < 10) return;
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/intern-unblocker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockerText: blocker, taskContext: '' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error === 'rate_limited' ? 'Too many requests. Wait a moment.' : 'AI failed');
      } else {
        const j = (await res.json()) as { draft: string };
        setDraft(j.draft);
      }
    } catch {
      setError('Network error');
    } finally {
      setDrafting(false);
    }
  }

  async function onSend() {
    if (!props.workspaceId || text.trim().length < 5) return;
    const workspaceId = props.workspaceId;
    startTransition(async () => {
      await addCommentAction({ workspaceId, body: `[STUCK] ${text}` });
      setOpen(false);
      setBlocker('');
      setDraft(null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ws-stuck"
        aria-label={props.label}
      >
        <span className="pulse" />
        <span>{props.label}</span>
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
            aria-label={props.title}
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(540px, calc(100vw - 32px))',
              background: 'var(--surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: 20,
              zIndex: 50,
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
              {props.title}
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 14 }}>
              {props.placeholder}
            </p>
            <textarea
              value={blocker}
              onChange={(e) => {
                setBlocker(e.target.value);
                setDraft(null);
              }}
              rows={5}
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
              placeholder={props.placeholder}
            />

            {draft && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'var(--brand-50)',
                  border: '1px solid var(--brand-100)',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10.5,
                    letterSpacing: 0.06,
                    textTransform: 'uppercase',
                    color: 'var(--brand-700)',
                    marginBottom: 6,
                  }}
                >
                  ✦ {props.draftBadgeLabel}
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 8,
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    color: 'var(--ink)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            )}

            {error && (
              <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>{error}</p>
            )}

            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setBlocker('');
                  setDraft(null);
                  setError(null);
                }}
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
                {props.cancelLabel}
              </button>
              <button
                type="button"
                onClick={onDraft}
                disabled={drafting || blocker.trim().length < 10}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-color)',
                  fontSize: 13,
                  cursor: drafting || blocker.trim().length < 10 ? 'not-allowed' : 'pointer',
                  color: 'var(--ink)',
                  opacity: drafting || blocker.trim().length < 10 ? 0.6 : 1,
                }}
              >
                {drafting ? 'Drafting…' : draft ? props.regenerateLabel : '✦ AI draft'}
              </button>
              <button
                type="button"
                onClick={onSend}
                disabled={text.trim().length < 5 || !props.workspaceId}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: 'var(--brand-500)',
                  border: 'none',
                  fontSize: 13,
                  cursor: text.trim().length < 5 ? 'not-allowed' : 'pointer',
                  color: '#fff',
                  fontWeight: 500,
                  opacity: text.trim().length < 5 ? 0.6 : 1,
                }}
              >
                {props.sendLabel}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
