'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { Deliverable } from '@/db/schema';
import type { DeliverableLinks } from '@/modules/deliverables/dependencies';
import { formatTimeAgo, type FormatLocale } from '@/lib/format-time';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileDrop } from '@/components/file-drop';
import {
  approveDeliverableAction,
  requestRevisionAction,
  submitDeliverableAction,
} from '@/modules/deliverables/server-actions';

const STATUS_LABEL_KEY: Record<
  string,
  'draft' | 'submitted' | 'approved' | 'changesRequested'
> = {
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

// Deliverable status → dot colour for the dependency chips, aligned with the
// status rail elsewhere in the workspace.
function linkStatusColor(status: string): string {
  if (status === 'submitted') return 'var(--brand)';
  if (status === 'approved') return 'var(--success)';
  if (status === 'revision-requested') return 'var(--danger)';
  return 'var(--ink-4)';
}

/**
 * Read-only cross-intern dependency awareness for one deliverable row (client
 * variant — the file is 'use client'; the server pages use
 * DeliverableLinkChips instead). Subtle, muted, never gates. Renders nothing
 * when there are no links.
 */
function DeliverableLinkChipsInline({ links }: { links: DeliverableLinks }) {
  const t = useTranslations('projectHub.dependencies');
  if (links.dependsOn.length === 0 && links.feedsInto.length === 0) return null;

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--ink-3)',
    flexShrink: 0,
  };
  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 8px',
    borderRadius: 99,
    border: '1px solid var(--border-color)',
    background: 'var(--surface-muted)',
    fontSize: 12,
    color: 'var(--ink-2)',
  };

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {links.dependsOn.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={labelStyle}>{t('dependsOn')}</span>
          <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
            {links.dependsOn.map((d) => (
              <span key={d.id} style={chipStyle}>
                <span aria-hidden style={{ lineHeight: 1 }}>{'🔗'}</span>
                <span style={{ color: 'var(--ink)' }}>{d.title}</span>
                <span style={{ color: 'var(--ink-4)' }}>{'·'}</span>
                <span>{d.internName}</span>
                <span
                  aria-hidden
                  title={d.status}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 99,
                    background: linkStatusColor(d.status),
                    flexShrink: 0,
                  }}
                />
              </span>
            ))}
          </span>
        </div>
      )}
      {links.feedsInto.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={labelStyle}>{t('feedsInto')}</span>
          <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
            {links.feedsInto.map((d) => (
              <span key={d.id} style={chipStyle}>
                <span aria-hidden style={{ lineHeight: 1 }}>{'🔗'}</span>
                <span style={{ color: 'var(--ink)' }}>{d.title}</span>
                <span style={{ color: 'var(--ink-4)' }}>{'·'}</span>
                <span>{d.internName}</span>
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

function fmtDate(d: Date | string | null, locale: string): string {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function DeliverableRow({
  deliverable,
  view,
  links,
}: {
  deliverable: Deliverable;
  view: 'intern' | 'supervisor';
  links?: DeliverableLinks | null;
}) {
  const locale = useLocale();
  const t = useTranslations('workspace.deliverables');
  const tStatus = useTranslations('workspace.deliverables.status');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showSubmit, setShowSubmit] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [stagedFile, setStagedFile] = useState<{
    url: string;
    fileName: string;
    contentType: string;
  } | null>(null);

  const status = deliverable.status ?? 'draft';
  const statusKey = STATUS_LABEL_KEY[status] ?? 'draft';

  function submit() {
    if (!stagedFile) return;
    startTransition(async () => {
      await submitDeliverableAction({
        deliverableId: deliverable.id,
        fileUrl: stagedFile.url,
        fileName: stagedFile.fileName,
        fileType: stagedFile.contentType,
      });
      setStagedFile(null);
      setShowSubmit(false);
      router.refresh();
    });
  }

  function approve() {
    startTransition(async () => {
      await approveDeliverableAction({ deliverableId: deliverable.id });
      router.refresh();
    });
  }

  function sendRevision() {
    if (!feedback.trim()) return;
    startTransition(async () => {
      await requestRevisionAction({ deliverableId: deliverable.id, feedback });
      setFeedback('');
      setShowRequest(false);
      router.refresh();
    });
  }

  return (
    <div className="ws-card" id={`deliv-${deliverable.id}`}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
              {deliverable.title}
            </h3>
            <span className={`pill ${STATUS_PILL[status]}`}>
              <span className="dot" />
              {tStatus(statusKey)}
            </span>
            <span
              className="ws-deliv-ver"
              title={t('versionBadge', { n: deliverable.version })}
            >
              {t('version', { n: deliverable.version })}
            </span>
          </div>

          {deliverable.description && (
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
              {deliverable.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--ink-3)', marginBottom: deliverable.fileUrl || deliverable.feedback ? 12 : 0 }}>
            {deliverable.dueDate && (
              <>
                <span>{t('rowDue', { date: fmtDate(deliverable.dueDate, locale) })}</span>
                <span>{t('rowSep')}</span>
              </>
            )}
            {deliverable.submittedAt && (
              <>
                <span>{t('rowSubmitted', { when: formatTimeAgo(deliverable.submittedAt, locale as FormatLocale) })}</span>
                <span>{t('rowSep')}</span>
              </>
            )}
            <span style={{ fontFamily: 'var(--font-mono)' }}>{deliverable.id.slice(0, 8)}</span>
          </div>

          {deliverable.fileUrl && (
            <div style={{ marginBottom: 8 }}>
              <a
                href={deliverable.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  background: 'var(--surface-muted)',
                }}
              >
                {t('fileChip', { name: deliverable.fileName ?? t('fileChipFallback') })}
              </a>
            </div>
          )}

          {deliverable.feedback && status === 'revision-requested' && (
            <div
              style={{
                marginTop: 8,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#7F1D1D',
                fontSize: 13,
                padding: '10px 12px',
                borderRadius: 8,
              }}
            >
              <b>{t('feedbackLabel', { label: tStatus('changesRequested') })}</b> {deliverable.feedback}
            </div>
          )}

          {links ? <DeliverableLinkChipsInline links={links} /> : null}
        </div>
      </div>

      {/* Action footer */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {view === 'intern' && (status === 'draft' || status === 'revision-requested') && (
          <Button
            type="button"
            disabled={pending}
            onClick={() => setShowSubmit((v) => !v)}
            className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
          >
            {showSubmit
              ? t('cancel')
              : status === 'revision-requested'
                ? t('submitRevision')
                : t('submit')}
          </Button>
        )}
        {view === 'supervisor' && status === 'submitted' && (
          <>
            <Button
              type="button"
              disabled={pending}
              onClick={approve}
              className="bg-[#15803D] hover:bg-[#166534] text-white"
            >
              {t('checkLabel', { label: t('approve') })}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setShowRequest((v) => !v)}
            >
              {showRequest ? t('cancel') : t('requestChanges')}
            </Button>
          </>
        )}
        {status === 'approved' && (
          <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>
            {t('checkLabel', { label: tStatus('approved') })}
          </span>
        )}
      </div>

      {showSubmit && (
        <div style={{ marginTop: 14 }}>
          <FileDrop
            kind="deliverable"
            accept=".pdf,image/*,.zip,.fig"
            onUploaded={(r) => setStagedFile({ url: r.url, fileName: r.fileName, contentType: r.contentType })}
            helper={t('fileDropHelper')}
          />
          {stagedFile && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 12px',
                background: 'var(--surface-muted)',
                borderRadius: 6,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span>{t('checkLabel', { label: stagedFile.fileName })}</span>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={submit}
                className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)] ml-auto"
              >
                {pending ? t('sending') : t('sendToSupervisor')}
              </Button>
            </div>
          )}
        </div>
      )}

      {showRequest && (
        <div style={{ marginTop: 14 }}>
          <label htmlFor={`deliv-feedback-${deliverable.id}`} className="sr-only">
            {t('changesPlaceholder')}
          </label>
          <Textarea
            id={`deliv-feedback-${deliverable.id}`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder={t('changesPlaceholder')}
            maxLength={2000}
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              disabled={pending || !feedback.trim()}
              onClick={sendRevision}
              className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
            >
              {pending ? t('sending') : t('submitChanges')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeliverablesList({
  deliverables,
  view,
  linksByDeliverable,
}: {
  deliverables: Deliverable[];
  view: 'intern' | 'supervisor';
  /**
   * Cross-intern dependency awareness per deliverable id (Phase 2). Optional —
   * threaded from the page that loads it (one batched query via
   * getWorkspaceDeliverableLinks). Absent ids simply render no chips.
   */
  linksByDeliverable?: Record<string, DeliverableLinks>;
}) {
  const tm = useTranslations('workspace.deliverables.master');
  if (deliverables.length === 0) {
    return (
      <div className="ws-card" style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--ink-2)', fontWeight: 500, marginBottom: 4 }}>
          {tm('noDeliverables')}
        </p>
        <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>
          {tm('noDeliverablesSub')}
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {deliverables.map((d) => (
        <DeliverableRow
          key={d.id}
          deliverable={d}
          view={view}
          links={linksByDeliverable?.[d.id] ?? null}
        />
      ))}
    </div>
  );
}
