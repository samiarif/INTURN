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

export function DeliverablesMini({ deliverables }: { deliverables: Deliverable[] }) {
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>Deliverables</h3>
        <a className="ws-link">All versions →</a>
      </div>
      <div className="ws-deliv-list">
        {deliverables.map((d) => {
          const statusKey = d.status ?? 'draft';
          const isSubmitted = ['submitted', 'approved', 'revision-requested'].includes(statusKey);
          return (
            <div key={d.id} className="ws-deliv">
              <div>
                <div className="ws-deliv-name">{d.title}</div>
                <div className="ws-deliv-meta">{d.feedback ?? '—'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`pill ${STATUS_PILL[statusKey] ?? 'pill-todo'}`}>
                  <span className="dot" />
                  {STATUS_LABEL[statusKey] ?? statusKey}
                </span>
                <span className="ws-deliv-ver">{isSubmitted ? 'v2' : '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
