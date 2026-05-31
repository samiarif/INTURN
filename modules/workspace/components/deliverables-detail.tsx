import { getTranslations } from 'next-intl/server';
import type { Deliverable, DeliverableRevision } from '@/db/schema';
import { formatTimeAgo, type FormatLocale } from '@/lib/format-time';
import { Avatar } from '@/components/avatar';
import { DelivReviewBar } from './deliv-review-bar';
import { DelivUploadZone } from './deliv-upload-zone';
import { ShareLinkButton } from './share-link-button';
import { DelivDetailTabs } from './deliverables-detail-tabs';
import { DeliverableLinkChips } from './deliverable-link-chips';
import type { CommentWithAuthor } from '@/modules/comments/queries';
import type { DeliverableLinks } from '@/modules/deliverables/dependencies';
import type { WorkspaceOverviewData } from '../queries';

function fmtDateLong(d: Date | string | null, locale: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

type DeliverableStatusLite = 'draft' | 'submitted' | 'approved' | 'revision-requested';
type PillVariant = 'review' | 'approved' | 'changes' | 'draft';

// Localized "time ago" via the shared formatter. Returns '' for a null date
// so callers can compose it into `<relative> · <absolute date>` strings.
function relativeWhen(d: Date | string | null, locale: string): string {
  if (!d) return '';
  return formatTimeAgo(d, locale as FormatLocale);
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
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  if (!userId) return '—';
  if (data.intern?.id === userId)
    return data.intern.firstName ?? data.intern.lastName ?? t('nameFallbackIntern');
  const supervisor = data.supervisors.find((s) => s.id === userId);
  if (supervisor)
    return supervisor.firstName ?? supervisor.lastName ?? t('nameFallbackReviewer');
  return t('nameFallbackMember');
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
async function FileRow({
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
  const t = await getTranslations('workspace.deliverables.master');
  const kind = inferFileKind(fileName, fileType);
  const knownKinds = new Set(['pdf', 'fig', 'md']);
  const iconKind = knownKinds.has(kind) ? kind : '';
  return (
    <div className="dv-file">
      <div className={`dv-file-icon ${iconKind}`}>{kind.toUpperCase().slice(0, 3)}</div>
      <div style={{ minWidth: 0 }}>
        <div className="dv-file-name">{fileName ?? t('fileUntitled')}</div>
        <div className="dv-file-meta">{meta}</div>
      </div>
      <div className="dv-file-size" />
      {fileUrl ? (
        <a className="dv-file-act" href={fileUrl} target="_blank" rel="noopener noreferrer">
          {t('openFile')}
        </a>
      ) : (
        <span className="dv-file-act" aria-disabled style={{ opacity: 0.5 }}>
          {t('emptyDash')}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One version (header + body)                                          */
/* ------------------------------------------------------------------ */
async function Version({
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
  const t = await getTranslations('workspace.deliverables.master');
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
      ? t('statusInReview')
      : variant === 'approved'
        ? t('statusApproved')
        : variant === 'changes'
          ? t('statusChangesRequested')
          : t('statusDraft');

  return (
    <div className={`dv-version ${wrapClass} ${active ? 'active' : ''}`}>
      <div className="dv-version-head">
        <span className="dv-version-num">{t('version', { n: version })}</span>
        <div className="dv-version-by">
          <div className="who">
            {t.rich('submittedByName', {
              name: authorName,
              b: (chunks) => <b>{chunks}</b>,
            })}
          </div>
          {/* whenLabel is a localized relative-time string built upstream
              by the detail component (formatTimeAgo). */}
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
            {t.rich('versionNote', {
              name: authorName,
              note,
              b: (chunks) => <b>{chunks}</b>,
            })}
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
                  {review.state === 'approved' ? t('approvedPill') : t('changesPill')}
                </span>
                <span>
                  {t('reviewerWhen', { name: review.reviewerName, when: review.whenLabel })}
                </span>
              </div>
              <div className="dv-review-text">{t('quotedNote', { note: review.text })}</div>
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
  links,
}: {
  deliverable: Deliverable;
  idx: number;
  role: 'intern' | 'supervisor';
  data: WorkspaceOverviewData;
  locale: string;
  comments: CommentWithAuthor[];
  currentUserId: string;
  /** Cross-intern dependency awareness (depends-on / feeds-into). Optional. */
  links?: DeliverableLinks | null;
}) {
  const t = await getTranslations('workspace.deliverables.master');
  const status = (deliverable.status ?? 'draft') as DeliverableStatusLite;
  const variant = pillVariantFor(status);
  const history = (deliverable.revisionHistory ?? []) as DeliverableRevision[];

  const currentVersion = deliverable.version;
  const totalVersions = 1 + history.length;
  const code = `D${idx + 1}`;

  const ownerName = userDisplayName(data.workspace.internId, data, t);
  const reviewerName = data.supervisors[0]
    ? userDisplayName(data.supervisors[0].id, data, t)
    : t('unassignedReviewer');

  const submittedRelative =
    deliverable.submittedAt
      ? `${relativeWhen(deliverable.submittedAt, locale)} · ${new Date(deliverable.submittedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
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
                  ? t('fileUpdated', { date: fmtDateLong(deliverable.submittedAt, locale) })
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
            whenLabel: relativeWhen(deliverable.updatedAt, locale),
          }
        : null,
    active: status === 'submitted',
  };

  const historyStack: StackVersion[] = history.map((h) => ({
    version: h.version,
    authorName: userDisplayName(h.submittedBy, data, t),
    whenLabel: `${relativeWhen(h.submittedAt, locale)} · ${new Date(h.submittedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
    status: h.status as DeliverableStatusLite,
    note: h.note,
    files: h.fileUrl
      ? [
          {
            fileUrl: h.fileUrl,
            fileName: h.fileName,
            fileType: h.fileType,
            meta: [h.fileType, t('version', { n: h.version })].filter(Boolean).join(' · '),
          },
        ]
      : [],
    review: h.review
      ? {
          state: h.review.state,
          text: h.review.text,
          reviewerName: userDisplayName(h.review.reviewerId, data, t),
          whenLabel: relativeWhen(h.review.reviewedAt, locale),
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
          {t('detailEyebrowSingular')}
          <span className="sep">{t('detailSep')}</span>
          {code}
          <span className="sep">{t('detailSep')}</span>
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
                <>{t('submittedOnTimeSuffix')}</>
              )}
            </span>
          ) : (
            <span>{t('emptyDash')}</span>
          )}
          <span className="pip" />
          <span>
            {t.rich('ownerLine', { name: ownerName, b: (chunks) => <b>{chunks}</b> })}
          </span>
          <span className="pip" />
          <span>
            {t.rich('reviewerLine', { name: reviewerName, b: (chunks) => <b>{chunks}</b> })}
          </span>
          <span className="pip" />
          <span>
            {totalVersions === 1
              ? t('versionsCountOne', { n: totalVersions })
              : t('versionsCount', { n: totalVersions })}
          </span>
        </div>
        {links ? (
          <div style={{ marginTop: 10 }}>
            <DeliverableLinkChips links={links} />
          </div>
        ) : null}
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
                  deliverable.submittedAt ? relativeWhen(deliverable.submittedAt, locale) : ''
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
                        {t.rich('activityHead', {
                          n: row.version,
                          status: t(statusKeyFor(row.status)),
                          b: (chunks) => <b>{chunks}</b>,
                        })}
                      </div>
                      {/* row.when is a localized relative-time string
                          (formatTimeAgo via relativeWhen). */}
                      <div className="dv-activity-meta">
                        {t('submittedByWhen', { name: row.authorName, when: row.when })}
                      </div>
                      {row.note && (
                        <div className="dv-activity-note">{t('quotedNote', { note: row.note })}</div>
                      )}
                      {row.review && (
                        <div className="dv-activity-review">
                          <span className="pill">
                            {row.review.state === 'approved'
                              ? t('statusApproved')
                              : t('statusChangesRequested')}
                          </span>
                          <span>
                            {t('reviewerQuoted', { name: row.review.reviewerName, text: row.review.text })}
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
