import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Deliverable } from '@/db/schema';
import { WorkspaceMHead } from './m-head';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceView } from '../types';
import { DelivDetail } from './deliverables-detail';

type DeliverableStatusLite = 'draft' | 'submitted' | 'approved' | 'revision-requested';
type RailStatus = 'review' | 'done' | 'late' | 'todo';

function fmtDateShort(d: Date | string | null, locale: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' }).toUpperCase();
}

function railStatusFor(d: Deliverable, isOverdue: boolean): RailStatus {
  const s = (d.status ?? 'draft') as DeliverableStatusLite;
  if (s === 'submitted' || s === 'revision-requested') return 'review';
  if (s === 'approved') return 'done';
  if (isOverdue) return 'late';
  return 'todo';
}

/* ------------------------------------------------------------------ */
/* Left rail                                                            */
/* ------------------------------------------------------------------ */
async function DelivList({
  items,
  selectedId,
  hrefFor,
  now,
  locale,
}: {
  items: Deliverable[];
  selectedId: string | null;
  hrefFor: (id: string) => string;
  now: number;
  locale: string;
}) {
  const t = await getTranslations('workspace.deliverables.master');
  const approved = items.filter((i) => i.status === 'approved').length;
  const progressPct = items.length === 0 ? 0 : Math.round((approved / items.length) * 100);

  return (
    <aside className="dv-list" aria-label={t('listTitle')}>
      <div className="dv-list-head">
        <h3>{t('listTitle')}</h3>
        <span className="total">{t('uploadCount', { count: approved, total: items.length })}</span>
      </div>
      {items.length === 0 ? (
        <div className="dv-empty">
          <div style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{t('noDeliverables')}</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>{t('noDeliverablesSub')}</div>
        </div>
      ) : (
        items.map((d, idx) => {
          const code = `D${idx + 1}`;
          const due = d.dueDate ? new Date(d.dueDate) : null;
          const isOverdue = !!due && due.getTime() < now && d.status !== 'approved';
          const rail = railStatusFor(d, isOverdue);
          const dueStr = due
            ? t('dueShort', { date: fmtDateShort(due, locale) })
            : '—';
          const sublabel =
            d.status === 'submitted'
              ? `${dueStr} · v${d.version} ${t('statusInReview').toUpperCase()}`
              : d.status === 'revision-requested'
                ? `${dueStr} · v${d.version} ${t('statusChangesRequested').toUpperCase()}`
                : d.status === 'approved'
                  ? `${dueStr} · ${t('statusApproved').toUpperCase()}`
                  : dueStr;
          const isSelected = d.id === selectedId;
          return (
            <Link
              key={d.id}
              href={hrefFor(d.id)}
              className={`dv-li ${isSelected ? 'selected' : ''} ${d.status === 'approved' ? 'done' : ''}`}
              aria-current={isSelected ? 'page' : undefined}
              scroll={false}
            >
              <div className="dv-li-num">{code}</div>
              <div className="dv-li-body">
                <div className="dv-li-name" title={d.title}>
                  {d.title}
                </div>
                <div className="dv-li-meta">{sublabel}</div>
              </div>
              <span className={`dv-li-status ${rail}`} aria-hidden />
            </Link>
          );
        })
      )}
      {items.length > 0 && (
        <div className="dv-list-foot">
          <div className="label">
            <span>{t('progressLabel')}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--ink-2)' }}>{progressPct}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export async function WorkspaceDeliverablesPage({
  data,
  view,
  basePath,
  selectedId: selectedIdParam,
}: {
  data: WorkspaceOverviewData;
  view: WorkspaceView;
  basePath: string;
  selectedId?: string;
}) {
  const items = data.deliverables;
  // Server component; Date.now() runs once per request, which is what we want
  // for "is this overdue?" rail-row decoration.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // Default-select the first submitted/revision-requested item, otherwise the
  // first row, otherwise nothing.
  const preferred =
    items.find((d) => d.status === 'submitted') ??
    items.find((d) => d.status === 'revision-requested') ??
    items[0] ??
    null;
  const selected =
    (selectedIdParam && items.find((d) => d.id === selectedIdParam)) || preferred;
  const selectedIdx = selected ? items.findIndex((d) => d.id === selected.id) : -1;

  const [t, locale] = await Promise.all([
    getTranslations('workspace.deliverables.master'),
    getLocale(),
  ]);

  return (
    <>
      <WorkspaceMHead
        view={view}
        internFirstName={data.intern?.firstName ?? null}
        internLastName={data.intern?.lastName ?? null}
        internshipTitle={data.internship?.title ?? ''}
        startDate={data.workspace.startDate ? new Date(data.workspace.startDate) : null}
        endDate={data.workspace.endDate ? new Date(data.workspace.endDate) : null}
        taskCount={data.tasks.length}
        deliverableCount={data.deliverables.length}
      />
      <div
        className="ws-content"
        style={{ gridTemplateColumns: '1fr', paddingTop: 20, paddingBottom: 40 }}
      >
        <div className="dv-layout">
          <DelivList
            items={items}
            selectedId={selected?.id ?? null}
            hrefFor={(id) => `${basePath}?tab=deliverables&selected=${id}`}
            now={now}
            locale={locale}
          />
          {selected && selectedIdx >= 0 ? (
            <DelivDetail
              deliverable={selected}
              idx={selectedIdx}
              role={view === 'intern' ? 'intern' : 'supervisor'}
              data={data}
              locale={locale}
            />
          ) : (
            <div className="dv-detail">
              <div
                style={{
                  padding: 48,
                  textAlign: 'center',
                  color: 'var(--ink-3)',
                  fontSize: 13,
                }}
              >
                {items.length === 0 ? t('noDeliverables') : t('selectPrompt')}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
