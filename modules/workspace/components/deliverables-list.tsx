'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { Deliverable } from '@/db/schema';
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

function fmtDate(d: Date | string | null, locale: string): string {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function relativeDate(d: Date | string | null): string {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function DeliverableRow({
  deliverable,
  view,
}: {
  deliverable: Deliverable;
  view: 'intern' | 'supervisor';
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
              title={`Version ${deliverable.version}`}
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
                <span>Due {fmtDate(deliverable.dueDate, locale)}</span>
                <span>·</span>
              </>
            )}
            {deliverable.submittedAt && (
              <>
                <span>Submitted {relativeDate(deliverable.submittedAt)}</span>
                <span>·</span>
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
                📎 {deliverable.fileName ?? 'Open file'}
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
              <b>{tStatus('changesRequested')}:</b> {deliverable.feedback}
            </div>
          )}
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
              ? 'Cancel'
              : status === 'revision-requested'
                ? 'Submit revision'
                : 'Submit'}
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
              ✓ {t('approve')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setShowRequest((v) => !v)}
            >
              {showRequest ? 'Cancel' : t('requestChanges')}
            </Button>
          </>
        )}
        {status === 'approved' && (
          <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>
            ✓ {tStatus('approved')}
          </span>
        )}
      </div>

      {showSubmit && (
        <div style={{ marginTop: 14 }}>
          <FileDrop
            kind="deliverable"
            accept=".pdf,image/*,.zip,.fig"
            onUploaded={(r) => setStagedFile({ url: r.url, fileName: r.fileName, contentType: r.contentType })}
            helper="PDF, image, zip or .fig · max 5 MB"
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
              <span>✓ {stagedFile.fileName}</span>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={submit}
                className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)] ml-auto"
              >
                {pending ? 'Sending…' : 'Send to supervisor →'}
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
              {pending ? 'Sending…' : t('submitChanges')}
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
}: {
  deliverables: Deliverable[];
  view: 'intern' | 'supervisor';
}) {
  // Empty-state copy ("No deliverables yet.", subline) is not in the plan
  // namespace and remains English until the namespace expands.
  if (deliverables.length === 0) {
    return (
      <div className="ws-card" style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--ink-2)', fontWeight: 500, marginBottom: 4 }}>
          No deliverables yet.
        </p>
        <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>
          Deliverables get created from the supervisor side as part of the project plan.
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {deliverables.map((d) => (
        <DeliverableRow key={d.id} deliverable={d} view={view} />
      ))}
    </div>
  );
}
