import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import type { Deliverable, DeliverableRevision } from '@/db/schema';
import { WorkspaceMHead } from './m-head';
import { DelivReviewBar } from './deliv-review-bar';
import { DelivUploadZone } from './deliv-upload-zone';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceView } from '../types';
import { Avatar } from '@/components/avatar';

type DeliverableStatusLite = 'draft' | 'submitted' | 'approved' | 'revision-requested';
type RailStatus = 'review' | 'done' | 'late' | 'todo';
type PillVariant = 'review' | 'approved' | 'changes' | 'draft';

function fmtDateShort(d: Date | string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
}

function fmtDateLong(d: Date | string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function relativeWhen(d: Date | string | null): string {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function railStatusFor(d: Deliverable, isOverdue: boolean): RailStatus {
  const s = (d.status ?? 'draft') as DeliverableStatusLite;
  if (s === 'submitted' || s === 'revision-requested') return 'review';
  if (s === 'approved') return 'done';
  if (isOverdue) return 'late';
  return 'todo';
}

function pillVariantFor(status: DeliverableStatusLite): PillVariant {
  if (status === 'submitted') return 'review';
  if (status === 'approved') return 'approved';
  if (status === 'revision-requested') return 'changes';
  return 'draft';
}

function pillText(
  variant: PillVariant,
  version: number,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  if (variant === 'review') return `v${version} ${t('statusInReview').toLowerCase()}`;
  if (variant === 'approved') return t('statusApproved');
  if (variant === 'changes') return t('statusChangesRequested');
  return t('statusDraft');
}

function inferFileKind(name: string | null, type: string | null): string {
  const lower = (name ?? '').toLowerCase();
  if (lower.endsWith('.pdf') || (type ?? '').includes('pdf')) return 'pdf';
  if (lower.endsWith('.fig')) return 'fig';
  if (lower.endsWith('.md')) return 'md';
  const dot = lower.lastIndexOf('.');
  if (dot > 0) return lower.slice(dot + 1).slice(0, 4);
  return 'file';
}

function userDisplayName(
  userId: string | null,
  data: WorkspaceOverviewData,
): string {
  if (!userId) return '—';
  if (data.intern?.id === userId)
    return data.intern.firstName ?? data.intern.lastName ?? 'Intern';
  const supervisor = data.supervisors.find((s) => s.id === userId);
  if (supervisor) return supervisor.firstName ?? supervisor.lastName ?? 'Reviewer';
  return 'Member';
}

/* ------------------------------------------------------------------ */
/* Left rail                                                            */
/* ------------------------------------------------------------------ */
async function DelivList({
  items,
  selectedId,
  hrefFor,
  now,
}: {
  items: Deliverable[];
  selectedId: string | null;
  hrefFor: (id: string) => string;
  now: number;
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
            ? t('dueShort', { date: fmtDateShort(due) })
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
/* File row inside a version body                                       */
/* ------------------------------------------------------------------ */
function FileRow({
  fileUrl,
  fileName,
  fileType,
  meta,
}: {
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  meta: string;
}) {
  const kind = inferFileKind(fileName, fileType);
  const knownKinds = new Set(['pdf', 'fig', 'md']);
  const iconKind = knownKinds.has(kind) ? kind : '';
  return (
    <div className="dv-file">
      <div className={`dv-file-icon ${iconKind}`}>{kind.toUpperCase().slice(0, 3)}</div>
      <div style={{ minWidth: 0 }}>
        <div className="dv-file-name">{fileName ?? 'Untitled'}</div>
        <div className="dv-file-meta">{meta}</div>
      </div>
      <div className="dv-file-size" />
      {fileUrl ? (
        <a className="dv-file-act" href={fileUrl} target="_blank" rel="noopener noreferrer">
          Open
        </a>
      ) : (
        <span className="dv-file-act" aria-disabled style={{ opacity: 0.5 }}>
          —
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One version (header + body)                                          */
/* ------------------------------------------------------------------ */
function Version({
  version,
  active,
  authorName,
  whenLabel,
  status,
  note,
  files,
  review,
  belowFiles,
}: {
  version: number;
  active: boolean;
  authorName: string;
  whenLabel: string;
  status: DeliverableStatusLite;
  note: string | null;
  files: Array<{
    fileUrl: string | null;
    fileName: string | null;
    fileType: string | null;
    meta: string;
  }>;
  review: { state: 'approved' | 'changes'; text: string; reviewerName: string; whenLabel: string } | null;
  belowFiles?: ReactNode;
}) {
  const variant = pillVariantFor(status);
  const wrapClass =
    variant === 'review'
      ? 'review'
      : variant === 'approved'
        ? 'approved'
        : variant === 'changes'
          ? 'changes'
          : '';
  const pillText =
    variant === 'review'
      ? 'In review'
      : variant === 'approved'
        ? 'Approved'
        : variant === 'changes'
          ? 'Changes requested'
          : 'Draft';

  return (
    <div className={`dv-version ${wrapClass} ${active ? 'active' : ''}`}>
      <div className="dv-version-head">
        <span className="dv-version-num">v{version}</span>
        <div className="dv-version-by">
          <div className="who">
            Submitted by <b>{authorName}</b>
          </div>
          <div className="when">{whenLabel}</div>
        </div>
        <span className={`dv-version-pill ${variant}`}>
          <span className="dot" />
          {pillText}
        </span>
      </div>
      <div className="dv-version-body">
        {note && (
          <div className="dv-version-note">
            <b>{authorName}&rsquo;s note:</b> &ldquo;{note}&rdquo;
          </div>
        )}
        {files.length > 0 && (
          <div className="dv-files">
            {files.map((f, i) => (
              <FileRow key={i} {...f} />
            ))}
          </div>
        )}
        {review && (
          <div className={`dv-review ${review.state === 'approved' ? 'approved' : ''}`}>
            <Avatar name={review.reviewerName} size="sm" title={review.reviewerName} />
            <div>
              <div className="dv-review-head">
                <span className="pill">
                  {review.state === 'approved' ? 'APPROVED' : 'CHANGES'}
                </span>
                <span>
                  {review.reviewerName} · {review.whenLabel}
                </span>
              </div>
              <div className="dv-review-text">&ldquo;{review.text}&rdquo;</div>
            </div>
          </div>
        )}
        {belowFiles}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail panel                                                         */
/* ------------------------------------------------------------------ */
async function DelivDetail({
  deliverable,
  idx,
  role,
  data,
}: {
  deliverable: Deliverable;
  idx: number;
  role: 'intern' | 'supervisor';
  data: WorkspaceOverviewData;
}) {
  const t = await getTranslations('workspace.deliverables.master');
  const status = (deliverable.status ?? 'draft') as DeliverableStatusLite;
  const variant = pillVariantFor(status);
  const history = (deliverable.revisionHistory ?? []) as DeliverableRevision[];

  const currentVersion = deliverable.version;
  const totalVersions = 1 + history.length;
  const code = `D${idx + 1}`;

  const ownerName = userDisplayName(data.workspace.internId, data);
  const reviewerName = data.supervisors[0]
    ? userDisplayName(data.supervisors[0].id, data)
    : 'Unassigned';

  const submittedRelative =
    deliverable.submittedAt
      ? `${relativeWhen(deliverable.submittedAt)} · ${new Date(deliverable.submittedAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
      : '—';

  // For the supervisor's review-bar copy, show the latest submission note when
  // we have one (intern attached a note during submit and we stored it as an
  // event). We don't currently surface event-derived notes here — keep this
  // simple by showing the *previous* feedback (if it's the latest interaction)
  // or empty otherwise.
  const reviewBarNote = null as string | null;

  // Build the version stack: current row at top + history below.
  type StackVersion = {
    version: number;
    authorName: string;
    whenLabel: string;
    status: DeliverableStatusLite;
    note: string | null;
    files: Array<{
      fileUrl: string | null;
      fileName: string | null;
      fileType: string | null;
      meta: string;
    }>;
    review: { state: 'approved' | 'changes'; text: string; reviewerName: string; whenLabel: string } | null;
    active: boolean;
  };

  const currentStack: StackVersion = {
    version: currentVersion,
    authorName: ownerName,
    whenLabel: submittedRelative,
    status,
    note: null,
    files: deliverable.fileUrl
      ? [
          {
            fileUrl: deliverable.fileUrl,
            fileName: deliverable.fileName,
            fileType: deliverable.fileType,
            meta:
              [
                deliverable.fileType,
                deliverable.submittedAt
                  ? `updated ${fmtDateLong(deliverable.submittedAt)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · '),
          },
        ]
      : [],
    // If the supervisor just requested changes, the current row has feedback
    // attached but no history entry yet — surface it inline on the live row.
    review:
      status === 'revision-requested' && deliverable.feedback
        ? {
            state: 'changes' as const,
            text: deliverable.feedback,
            reviewerName,
            whenLabel: relativeWhen(deliverable.updatedAt),
          }
        : null,
    active: status === 'submitted',
  };

  const historyStack: StackVersion[] = history.map((h) => ({
    version: h.version,
    authorName: userDisplayName(h.submittedBy, data),
    whenLabel: `${relativeWhen(h.submittedAt)} · ${new Date(h.submittedAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
    status: h.status as DeliverableStatusLite,
    note: h.note,
    files: h.fileUrl
      ? [
          {
            fileUrl: h.fileUrl,
            fileName: h.fileName,
            fileType: h.fileType,
            meta: [h.fileType, `version ${h.version}`].filter(Boolean).join(' · '),
          },
        ]
      : [],
    review: h.review
      ? {
          state: h.review.state,
          text: h.review.text,
          reviewerName: userDisplayName(h.review.reviewerId, data),
          whenLabel: relativeWhen(h.review.reviewedAt),
        }
      : null,
    active: false,
  }));

  const stack: StackVersion[] = [currentStack, ...historyStack];

  const dueLabel = deliverable.dueDate ? fmtDateLong(deliverable.dueDate) : null;
  const eyebrowLabel = t('eyebrowRequired');

  return (
    <section className="dv-detail" aria-labelledby={`dv-title-${deliverable.id}`}>
      <div className="dv-detail-head">
        <div className="dv-detail-eyebrow">
          {t('listTitle').slice(0, -1) /* trim trailing 's' for singular */}
          <span className="sep">·</span>
          {code}
          <span className="sep">·</span>
          {eyebrowLabel}
        </div>
        <div className="dv-detail-title-row">
          <h2 className="dv-detail-title" id={`dv-title-${deliverable.id}`}>
            {deliverable.title}
          </h2>
          <span className={`dv-version-pill ${variant}`} style={{ marginTop: 4 }}>
            <span className="dot" />
            {pillText(variant, currentVersion, t)}
          </span>
          <div className="dv-detail-actions">
            <span className="ws-btn ghost tiny" role="button" tabIndex={0} aria-disabled>
              {t('shareLink')}
            </span>
          </div>
        </div>
        <div className="dv-detail-meta">
          {dueLabel ? (
            <span>
              <b>{t('due', { date: dueLabel })}</b>
              {deliverable.status !== 'approved' && deliverable.submittedAt && (
                <> · {t('submittedOnTime')}</>
              )}
            </span>
          ) : (
            <span>—</span>
          )}
          <span className="pip" />
          <span>
            {t('owner')}: <b>{ownerName}</b>
          </span>
          <span className="pip" />
          <span>
            {t('reviewer')}: <b>{reviewerName}</b>
          </span>
          <span className="pip" />
          <span>
            {totalVersions === 1
              ? t('versionsCountOne', { n: totalVersions })
              : t('versionsCount', { n: totalVersions })}
          </span>
        </div>
      </div>

      <div className="dv-detail-tabs">
        <span className="dv-detail-tab active">
          {t('versionsTab')} <span className="count">{totalVersions}</span>
        </span>
        <span className="dv-detail-tab">{t('briefTab')}</span>
        <span className="dv-detail-tab">{t('commentsTab')}</span>
        <span className="dv-detail-tab">{t('activityTab')}</span>
      </div>

      <div className="dv-body">
        {role === 'supervisor' && status === 'submitted' && (
          <DelivReviewBar
            deliverableId={deliverable.id}
            submitterName={ownerName}
            whenLabel={
              deliverable.submittedAt ? relativeWhen(deliverable.submittedAt) : ''
            }
            note={reviewBarNote}
          />
        )}

        {role === 'intern' && status !== 'approved' && (
          <DelivUploadZone
            deliverableId={deliverable.id}
            nextVersion={
              // First-ever submit keeps version=1; any subsequent submit after a
              // changes-request bumps to currentVersion+1.
              status === 'draft' ? currentVersion : currentVersion + 1
            }
          />
        )}

        {stack.map((v) => (
          <Version
            key={`${deliverable.id}-${v.version}-${v.active ? 'cur' : 'hist'}`}
            version={v.version}
            active={v.active}
            authorName={v.authorName}
            whenLabel={v.whenLabel}
            status={v.status}
            note={v.note}
            files={v.files}
            review={v.review}
            belowFiles={
              role === 'intern' && v.active && v.status === 'submitted' ? (
                <div className="dv-waiting">
                  <span className="dot" aria-hidden />
                  <span>{t('supervisorWaitingForReview')}</span>
                </div>
              ) : null
            }
          />
        ))}
      </div>

      {/* Hidden link target lets the page anchor-scroll to the detail on
          small viewports after a list selection. */}
      <a id={`dv-anchor-${deliverable.id}`} aria-hidden />
    </section>
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

  const t = await getTranslations('workspace.deliverables.master');

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
          />
          {selected && selectedIdx >= 0 ? (
            <DelivDetail
              deliverable={selected}
              idx={selectedIdx}
              role={view === 'intern' ? 'intern' : 'supervisor'}
              data={data}
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
