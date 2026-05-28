import { getTranslations } from 'next-intl/server';
import type { Deliverable, DeliverableRevision } from '@/db/schema';
import { Avatar } from '@/components/avatar';
import { DelivReviewBar } from './deliv-review-bar';
import { DelivUploadZone } from './deliv-upload-zone';
import { ShareLinkButton } from './share-link-button';
import { DelivDetailTabs } from './deliverables-detail-tabs';
import type { CommentWithAuthor } from '@/modules/comments/queries';
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

type StatusKey =
  | 'statusInReview'
  | 'statusApproved'
  | 'statusChangesRequested'
  | 'statusDraft';

function statusKeyFor(status: DeliverableStatusLite): StatusKey {
  if (status === 'submitted') return 'statusInReview';
  if (status === 'approved') return 'statusApproved';
  if (status === 'revision-requested') return 'statusChangesRequested';
  return 'statusDraft';
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
  comments,
  currentUserId,
}: {
  deliverable: Deliverable;
  idx: number;
  role: 'intern' | 'supervisor';
  data: WorkspaceOverviewData;
  locale: string;
  comments: CommentWithAuthor[];
  currentUserId: string;
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

  // ── Brief: deliverable.description, augmented by the internship's
  // deliverable spec (defined at creation) matched by title. ──────────
  const specEntry =
    data.internship?.deliverables?.find(
      (d) => d.name.trim().toLowerCase() === deliverable.title.trim().toLowerCase(),
    ) ?? null;
  const briefText = deliverable.description ?? specEntry?.description ?? null;
  const briefDueWeek = specEntry?.dueWeek ?? null;

  // ── Activity: revision history rendered as a timeline. ──────────────
  type ActivityRow = {
    version: number;
    authorName: string;
    when: string;
    status: DeliverableStatusLite;
    note: string | null;
    review: { state: 'approved' | 'changes'; text: string; reviewerName: string } | null;
  };
  const activityRows: ActivityRow[] = stack
    .map((v) => ({
      version: v.version,
      authorName: v.authorName,
      when: v.whenLabel,
      status: v.status,
      note: v.note,
      review: v.review
        ? { state: v.review.state, text: v.review.text, reviewerName: v.review.reviewerName }
        : null,
    }))
    .sort((a, b) => b.version - a.version);

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

      <DelivDetailTabs
        versionsCount={totalVersions}
        commentsCount={comments.length}
        workspaceId={data.workspace.id}
        deliverableId={deliverable.id}
        currentUserId={currentUserId}
        commentsPlaceholder={t('commentsPlaceholder')}
        commentsEmpty={t('commentsEmpty')}
        versions={
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
                nextVersion={status === 'draft' ? currentVersion : currentVersion + 1}
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
        }
        brief={
          <div className="dv-body">
            {briefText ? (
              <div className="dv-brief">
                {briefDueWeek !== null && (
                  <div className="dv-brief-meta">{t('briefDueWeek', { n: briefDueWeek })}</div>
                )}
                <p className="dv-brief-text">{briefText}</p>
              </div>
            ) : (
              <div className="dv-tab-empty">{t('briefEmpty')}</div>
            )}
          </div>
        }
        activity={
          <div className="dv-body">
            {activityRows.length === 0 ? (
              <div className="dv-tab-empty">{t('activityEmpty')}</div>
            ) : (
              <ol className="dv-activity">
                {activityRows.map((row) => (
                  <li key={`act-${deliverable.id}-${row.version}`} className="dv-activity-item">
                    <span className="dv-activity-dot" aria-hidden />
                    <div className="dv-activity-body">
                      <div className="dv-activity-head">
                        <b>v{row.version}</b> · {t(statusKeyFor(row.status))}
                      </div>
                      <div className="dv-activity-meta">
                        {t('submittedBy', { name: row.authorName })} · {row.when}
                      </div>
                      {row.note && (
                        <div className="dv-activity-note">&ldquo;{row.note}&rdquo;</div>
                      )}
                      {row.review && (
                        <div className="dv-activity-review">
                          <span className="pill">
                            {row.review.state === 'approved'
                              ? t('statusApproved')
                              : t('statusChangesRequested')}
                          </span>
                          <span>
                            {row.review.reviewerName}: &ldquo;{row.review.text}&rdquo;
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        }
        comments={comments}
      />

      {/* Hidden link target lets the page anchor-scroll to the detail on
          small viewports after a list selection. */}
      <a id={`dv-anchor-${deliverable.id}`} aria-hidden />
    </section>
  );
}
