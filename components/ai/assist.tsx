'use client';

/**
 * Inline AI assist primitives for the smart manual creation flow.
 *
 * Every assist is **draft -> you accept/edit -> never auto-commit**. These are
 * presentational pieces; the host form owns the committed list/state and only
 * feeds accepted items in. Styling lives in app/globals.css (.sc-* classes).
 *
 * The ✦ spark is a CSS gradient brand mark (not an emoji / not an icon font),
 * matching the approved design prototype.
 *
 * Generic chrome labels (Thinking / Assisted / Add / Add all / Added / Dismiss /
 * Use this / Keep mine / Reformulated) self-localize from the `assist` namespace
 * in locales/*.json — every primitive runs inside the locale layout's
 * NextIntlClientProvider. Per-assist strings (button label + hint, suggest-panel
 * title, variant chips) are passed by the host form. All localized labels remain
 * overridable via props so the primitives stay reusable.
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------- hook ---- */

/** The five assists Sam picked. Mirrored server-side by the API route. */
export type AssistKind =
  | 'reformulate'
  | 'goals'
  | 'phases'
  | 'deliverables'
  | 'questions';

export type AssistErrorCode = 'rate_limited' | 'ai_failed' | 'network';

export type AssistState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; code: AssistErrorCode; retryAfter?: number };

/**
 * Drives one assist's lifecycle (idle -> loading -> ready | error) against the
 * single `/api/ai/project-assist` endpoint. Errors are returned as codes so the
 * host form can localize them; on any failure the form keeps the user's input
 * untouched (graceful degradation — an assist never blocks the form).
 */
export function useAssist<T>(kind: AssistKind) {
  const [state, setState] = useState<AssistState<T>>({ status: 'idle' });

  const run = useCallback(
    async (payload: Record<string, unknown>): Promise<T | null> => {
      setState({ status: 'loading' });
      try {
        const res = await fetch('/api/ai/project-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, ...payload }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as {
            error?: string;
            retryAfter?: number;
          };
          const code: AssistErrorCode =
            j.error === 'rate_limited' ? 'rate_limited' : 'ai_failed';
          setState({ status: 'error', code, retryAfter: j.retryAfter });
          return null;
        }
        const data = (await res.json()) as T;
        setState({ status: 'ready', data });
        return data;
      } catch {
        setState({ status: 'error', code: 'network' });
        return null;
      }
    },
    [kind],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, run, reset } as const;
}

/* --------------------------------------------------------- presentational - */

/** The ✦ gradient brand mark. Decorative. */
export function Spark({ className }: { className?: string }) {
  return <span className={cn('sc-spark', className)} aria-hidden="true" />;
}

/** ✦ Assist pill button (sits in a field's label row). */
export function AssistButton({
  label,
  onClick,
  loading = false,
  disabled = false,
  title,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="sc-assist"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-busy={loading || undefined}
    >
      <Spark />
      {label}
    </button>
  );
}

/** Shimmer shown while an assist is drafting. */
export function AssistThinking({ label }: { label?: string }) {
  const t = useTranslations('assist');
  return (
    <div className="sc-thinking" role="status" aria-live="polite">
      <Spark />
      <span>{label ?? t('thinking')}</span>
      <span className="sc-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/** Green "Assisted" tag shown next to a field after a draft is accepted. */
export function AssistedTag({ label }: { label?: string }) {
  const t = useTranslations('assist');
  return <span className="sc-assisted">{label ?? t('assisted')}</span>;
}

/* ------------------------------------------------------- suggest panel ---- */

export type SuggestDraft = {
  /** Primary line (e.g. goal text, deliverable name, question). */
  t: string;
  /** Optional secondary line (e.g. deliverable description). */
  d?: string;
  /** Optional mono meta line (e.g. "Due · week 4"). */
  meta?: string;
};

/**
 * Draft list for "Suggest N …" assists. The host form decides what `Add` does
 * (push into its own committed state), tracks which drafts are `used`, and
 * whether there's still `room` to add more (respecting the form's limits).
 */
export function SuggestDraftPanel({
  title = 'Suggestions',
  drafts,
  used,
  canAddMore,
  onAdd,
  onAddAll,
  onDismiss,
  addLabel,
  addAllLabel,
  addedLabel,
  dismissLabel,
}: {
  /** Per-assist heading — the host form passes a localized string. */
  title?: string;
  drafts: SuggestDraft[];
  /** Parallel to `drafts`: which have been accepted. */
  used: boolean[];
  /** Form has room for at least one more item under its limit. */
  canAddMore: boolean;
  onAdd: (index: number) => void;
  onAddAll: () => void;
  onDismiss: () => void;
  addLabel?: string;
  addAllLabel?: string;
  addedLabel?: string;
  dismissLabel?: string;
}) {
  const t = useTranslations('assist');
  const anyAddable = canAddMore && used.some((u) => !u);
  return (
    <div className="sc-suggest">
      <div className="sc-suggest-head">
        <Spark />
        {title}
        <button type="button" className="sc-dismiss" onClick={onDismiss}>
          {dismissLabel ?? t('dismiss')}
        </button>
      </div>
      {drafts.map((d, i) => (
        <div key={i} className={cn('sc-draft', used[i] && 'used')}>
          <div className="body">
            <div className="t">{d.t}</div>
            {d.d ? <div className="d">{d.d}</div> : null}
            {d.meta ? <div className="meta">{d.meta}</div> : null}
          </div>
          <button
            type="button"
            className="add"
            onClick={() => onAdd(i)}
            disabled={used[i] || !canAddMore}
          >
            {used[i] ? (addedLabel ?? t('added')) : (addLabel ?? t('add'))}
          </button>
        </div>
      ))}
      <div className="sc-suggest-actions">
        <button
          type="button"
          className="sc-assist"
          onClick={onAddAll}
          disabled={!anyAddable}
        >
          <Spark />
          {addAllLabel ?? t('addAll')}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- reformulate ------ */

export type ReformVariant = {
  key: string;
  label: string;
  text: string;
};

/**
 * Reformulate panel for the description field: shows the selected variant's
 * text with variant chips (Balanced / Shorter / Warmer). "Use this" hands the
 * selected text back to the form; "Keep mine" dismisses without changing input.
 */
export function ReformulatePanel({
  title,
  variants,
  selected,
  onSelect,
  onUse,
  onDismiss,
  useLabel,
  keepLabel,
}: {
  title?: string;
  variants: ReformVariant[];
  selected: string;
  onSelect: (key: string) => void;
  /** Called with the currently selected variant's text. */
  onUse: (text: string) => void;
  onDismiss: () => void;
  useLabel?: string;
  keepLabel?: string;
}) {
  const t = useTranslations('assist');
  const current = variants.find((v) => v.key === selected) ?? variants[0];
  return (
    <div className="sc-reform">
      <div className="sc-reform-head">
        <Spark />
        {title ?? t('reformulated')}
        <button type="button" className="sc-dismiss" onClick={onDismiss}>
          {keepLabel ?? t('keepMine')}
        </button>
      </div>
      <div className="sc-reform-body">
        <div className="sc-reform-new">{current?.text}</div>
        <div className="sc-variants">
          {variants.map((v) => (
            <button
              key={v.key}
              type="button"
              className={cn('sc-variant', v.key === selected && 'on')}
              onClick={() => onSelect(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="sc-reform-actions">
          <button
            type="button"
            className="sc-assist"
            onClick={() => current && onUse(current.text)}
          >
            <Spark />
            {useLabel ?? t('useThis')}
          </button>
        </div>
      </div>
    </div>
  );
}
