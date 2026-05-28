import { getTranslations } from 'next-intl/server';
import type { Deliverable, DeliverableRevision } from '@/db/schema';
import { Avatar } from '@/components/avatar';
import { DelivReviewBar } from './deliv-review-bar';
import { DelivUploadZone } from './deliv-upload-zone';
import { ShareLinkButton } from './share-link-button';
import type { WorkspaceOverviewData } from '../queries';

function fmtDateLong(d: Date | string | null, locale: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

type DeliverableStatusLite = 'draft' | 'submitted' | 'approved' | 'revision-requested';
type PillVariant = 'review' | 'approved' | 'changes' | 'draft';

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

function inferFileKind(name: string | null, type: string | null): string {
  const lower = (name ?? '').toLowerCase();
  if (lower.endsWith('.pdf') || (type ?? '').includes('pdf')) return 'pdf';
  if (lower.endsWith('.fig')) return 'fig';
  if (lower.endsWith('.md')) return 'md';
  const dot = lower.lastIndexOf('.');
  if (dot > 0) return lower.slice(dot + 1).slice(0, 4);
  return 'file';
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
  belowFiles?: React.ReactNode;
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
  const pill =
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
          {pill}
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
export async function DelivDetail({
  deliverable,
  idx,
  role,
  data,
  locale,
}: {
  deliverable: Deliverable;
  idx: number;
  role: 'intern' | 'supervisor';
  data: WorkspaceOverviewData;
  locale: string;
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
      ? `${relativeWhen(deliverable.submittedAt)} · ${new Date(deliverable.submittedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
      : '—';

  const reviewBarNote = null as string | null;

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
                  ? `updated ${fmtDateLong(deliverable.submittedAt, locale)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · '),
          },
        ]
      : [],
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
    whenLabel: `${relativeWhen(h.submittedAt)} · ${new Date(h.submittedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
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

  const dueLabel = deliverable.dueDate ? fmtDateLong(deliverable.dueDate, locale) : null;
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
            <ShareLinkButton
              deliverableId={deliverable.id}
              existingToken={deliverable.shareToken}
            />
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
