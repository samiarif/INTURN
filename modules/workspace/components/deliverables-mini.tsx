import Link from 'next/link';
import { Package } from 'lucide-react';
import type { Deliverable } from '@/db/schema';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Upcoming',
  submitted: 'In review',
  approved: 'Approved',
  'revision-requested': 'Revise',
};

const STATUS_PILL: Record<string, string> = {
  draft: 'pill-todo',
  submitted: 'pill-review',
  approved: 'pill-done',
  'revision-requested': 'pill-block',
};

function formatDueDate(due: string | Date): string {
  const d = new Date(due);
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  const md = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const daysAway = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  // If due in the next week, show the day name + date; otherwise just date
  if (daysAway >= 0 && daysAway <= 7) return `Due ${day} ${md}`;
  return `Due ${md}`;
}

function buildMeta(d: Deliverable): string {
  const statusKey = d.status ?? 'draft';
  if (statusKey === 'submitted') {
    if (d.submittedAt) {
      const when = new Date(d.submittedAt);
      const md = when.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return `Submitted ${md} · waiting on reviewer`;
    }
    return 'Submitted · waiting on reviewer';
  }
  if (statusKey === 'approved') return 'Approved';
  if (statusKey === 'revision-requested') {
    return d.feedback ? `Changes requested · ${d.feedback.slice(0, 40)}` : 'Changes requested';
  }
  // draft
  if (d.dueDate) return formatDueDate(d.dueDate);
  return 'Upcoming';
}

export function DeliverablesMini({
  deliverables,
  basePath,
}: {
  deliverables: Deliverable[];
  basePath: string;
}) {
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <Package size={16} strokeWidth={2.25} className="ws-hico" />
        <h3>Deliverables</h3>
        <Link href={`${basePath}?tab=deliverables`} className="ws-link">All versions →</Link>
      </div>
      <div className="ws-deliv-list">
        {deliverables.map((d) => {
          const statusKey = d.status ?? 'draft';
          const isSubmitted = ['submitted', 'approved', 'revision-requested'].includes(statusKey);
          return (
            <div key={d.id} className="ws-deliv">
              <div>
                <div className="ws-deliv-name">{d.title}</div>
                <div className="ws-deliv-meta">{buildMeta(d)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`pill ${STATUS_PILL[statusKey] ?? 'pill-todo'}`}>
                  <span className="dot" />
                  {STATUS_LABEL[statusKey] ?? statusKey}
                </span>
                <span className="ws-deliv-ver">{isSubmitted ? `v${d.version}` : '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
