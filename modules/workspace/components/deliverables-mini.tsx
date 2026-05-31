import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Package, ArrowRight } from 'lucide-react';
import type { Deliverable } from '@/db/schema';

// Maps the persisted status (stable key — never translate) to a short
// label key under `workspace.deliverables.mini.statusLabel`.
const STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'draft',
  submitted: 'submitted',
  approved: 'approved',
  'revision-requested': 'changesRequested',
};

const STATUS_PILL: Record<string, string> = {
  draft: 'pill-todo',
  submitted: 'pill-review',
  approved: 'pill-done',
  'revision-requested': 'pill-block',
};

// Loose translator handle (messages aren't typed); keys live under
// `workspace.deliverables.mini.meta`.
type MiniT = (key: string, vars?: Record<string, string | number>) => string;

function formatDueDate(due: string | Date, tm: MiniT, locale: string): string {
  const d = new Date(due);
  const day = d.toLocaleDateString(locale, { weekday: 'short' });
  const md = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const daysAway = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  // Within the next week, show weekday + date; otherwise just the date.
  if (daysAway >= 0 && daysAway <= 7) return tm('meta.dueWeekday', { day, md });
  return tm('meta.dueDate', { md });
}

function buildMeta(d: Deliverable, tm: MiniT, locale: string): string {
  const statusKey = d.status ?? 'draft';
  if (statusKey === 'submitted') {
    if (d.submittedAt) {
      const date = new Date(d.submittedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      return tm('meta.submittedWaitingDated', { date });
    }
    return tm('meta.submittedWaiting');
  }
  if (statusKey === 'approved') return tm('meta.approved');
  if (statusKey === 'revision-requested') {
    return d.feedback
      ? tm('meta.changesRequestedFeedback', { feedback: d.feedback.slice(0, 40) })
      : tm('meta.changesRequested');
  }
  // draft
  if (d.dueDate) return formatDueDate(d.dueDate, tm, locale);
  return tm('meta.upcoming');
}

export async function DeliverablesMini({
  deliverables,
  basePath,
}: {
  deliverables: Deliverable[];
  basePath: string;
}) {
  const [t, tm, locale] = await Promise.all([
    getTranslations('workspace.deliverables'),
    getTranslations('workspace.deliverables.mini'),
    getLocale(),
  ]);
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <Package size={16} strokeWidth={2.25} className="ws-hico" />
        <h3>{tm('heading')}</h3>
        <Link href={`${basePath}?tab=deliverables`} className="ws-link">{tm('allVersions')} <ArrowRight size={13} strokeWidth={2.25} aria-hidden /></Link>
      </div>
      <div className="ws-deliv-list">
        {deliverables.map((d) => {
          const statusKey = d.status ?? 'draft';
          const isSubmitted = ['submitted', 'approved', 'revision-requested'].includes(statusKey);
          const labelKey = STATUS_LABEL_KEY[statusKey];
          return (
            <div key={d.id} className="ws-deliv">
              <div>
                <div className="ws-deliv-name">{d.title}</div>
                <div className="ws-deliv-meta">{buildMeta(d, tm, locale)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`pill ${STATUS_PILL[statusKey] ?? 'pill-todo'}`}>
                  <span className="dot" />
                  {labelKey ? tm(`statusLabel.${labelKey}`) : statusKey}
                </span>
                <span className="ws-deliv-ver">
                  {isSubmitted ? t('version', { n: d.version }) : tm('notSubmitted')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
