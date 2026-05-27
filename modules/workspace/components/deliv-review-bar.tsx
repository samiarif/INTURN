'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/avatar';
import {
  approveDeliverableAction,
  requestRevisionAction,
} from '@/modules/deliverables/server-actions';

/**
 * Supervisor-only review bar pinned at the top of the version stack.
 * Renders the "Yasmine submitted v2" summary + Request changes / Approve & close.
 * Both buttons hit server actions; the request-changes flow opens an inline
 * textarea before sending so the supervisor can spell out what needs to move.
 */
export function DelivReviewBar({
  deliverableId,
  submitterName,
  whenLabel,
  note,
}: {
  deliverableId: string;
  submitterName: string;
  whenLabel: string;
  note: string | null;
}) {
  const router = useRouter();
  const t = useTranslations('workspace.deliverables.master');
  const [pending, startTransition] = useTransition();
  const [showRequest, setShowRequest] = useState(false);
  const [feedback, setFeedback] = useState('');

  function approve() {
    startTransition(async () => {
      await approveDeliverableAction({ deliverableId });
      router.refresh();
    });
  }

  function sendRevision() {
    if (!feedback.trim()) return;
    startTransition(async () => {
      await requestRevisionAction({ deliverableId, feedback });
      setFeedback('');
      setShowRequest(false);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="dv-review-bar">
        <Avatar name={submitterName} size="sm" />
        <div className="who">
          <span className="title">
            {t('submittedBy', { name: submitterName })} · {whenLabel}
          </span>
          {note && <span className="sub">&ldquo;{note}&rdquo;</span>}
        </div>
        <div className="actions">
          <button
            type="button"
            className="dv-btn-changes"
            disabled={pending}
            onClick={() => setShowRequest((v) => !v)}
          >
            {showRequest ? t('cancel') : t('requestChanges')}
          </button>
          <button
            type="button"
            className="dv-btn-approve"
            disabled={pending}
            onClick={approve}
          >
            <span className="check" aria-hidden />
            <span>{t('approveAndClose')}</span>
          </button>
        </div>
      </div>
      {showRequest && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor={`dv-changes-${deliverableId}`} className="sr-only">
            {t('feedbackChangesRequired')}
          </label>
          <Textarea
            id={`dv-changes-${deliverableId}`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder={t('feedbackChangesRequired')}
            maxLength={2000}
          />
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <button
              type="button"
              className="dv-btn-changes"
              disabled={pending}
              onClick={() => {
                setShowRequest(false);
                setFeedback('');
              }}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              className="dv-btn-approve"
              disabled={pending || !feedback.trim()}
              onClick={sendRevision}
              style={{
                background: 'var(--warning)',
                borderColor: 'var(--warning)',
              }}
            >
              {pending ? t('sending') : t('requestChanges')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
