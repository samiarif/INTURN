'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  generateWeeklyCheckInDraftAction,
  submitWeeklyCheckInAction,
} from '@/modules/checkins/server-actions';

export function WeeklyCheckInForm({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations('workspace.checkIn');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [generating, startGenerating] = useTransition();
  const [shipped, setShipped] = useState('');
  const [stuck, setStuck] = useState('');
  const [next, setNext] = useState('');
  const [source, setSource] = useState<'ai' | 'template' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generateDraft() {
    setError(null);
    startGenerating(async () => {
      try {
        const draft = await generateWeeklyCheckInDraftAction({ workspaceId });
        setShipped(draft.shipped);
        setStuck(draft.stuck);
        setNext(draft.next);
        setSource(draft.source);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate draft');
      }
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await submitWeeklyCheckInAction({ workspaceId, shipped, stuck, next });
        setSubmitted(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send');
      }
    });
  }

  // Strings without plan-vetted FR translations (sent confirmation,
  // template-draft notice, "Sending…", "Drafting…", "Send to supervisor →")
  // stay English until the namespace expands.
  if (submitted) {
    return (
      <div className="ws-card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>✓</div>
        <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Check-in sent</h3>
        <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>
          Your supervisor will see this in the timeline and dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="ws-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{t('title')}</h2>
        <button
          type="button"
          onClick={generateDraft}
          disabled={generating}
          className="ws-btn ghost tiny"
        >
          {generating ? 'Drafting…' : source === 'ai' ? `${t('regenerate')} ✨` : 'Generate draft ✨'}
        </button>
      </div>
      {source && (
        <div
          style={{
            fontSize: 12,
            color: source === 'ai' ? 'var(--brand-600)' : 'var(--ink-3)',
            marginBottom: 16,
            padding: '6px 10px',
            background: source === 'ai' ? 'var(--brand-50)' : 'var(--surface-muted)',
            borderRadius: 6,
            border: `1px solid ${source === 'ai' ? 'var(--brand-100)' : 'var(--border-color)'}`,
          }}
        >
          {source === 'ai'
            ? `✨ ${t('draftedByAi')}`
            : 'Template draft (no AI key configured). Edit anything before sending.'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--ink-3)',
              marginBottom: 6,
            }}
          >
            ✓ {t('shipped')}
          </label>
          <Textarea
            value={shipped}
            onChange={(e) => setShipped(e.target.value)}
            rows={4}
            placeholder={t('shippedPlaceholder')}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--ink-3)',
              marginBottom: 6,
            }}
          >
            ⚠ {t('stuck')}
          </label>
          <Textarea
            value={stuck}
            onChange={(e) => setStuck(e.target.value)}
            rows={3}
            placeholder={t('stuckPlaceholder')}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--ink-3)',
              marginBottom: 6,
            }}
          >
            → {t('next')}
          </label>
          <Textarea
            value={next}
            onChange={(e) => setNext(e.target.value)}
            rows={3}
            placeholder={t('nextPlaceholder')}
          />
        </div>
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || (!shipped && !stuck && !next)}
            className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
          >
            {pending ? 'Sending…' : t('submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
