import type { WorkspaceOverviewData } from '../queries';
import { ScheduleCheckInButton } from './schedule-check-in';
import { IssueRecordButton } from '@/modules/records/components/issue-record-button';
import { findActiveRecordByWorkspace } from '@/modules/records/queries';
import { getLocale } from 'next-intl/server';
import { type FormatLocale } from '@/lib/format-time';
import { getPulse } from '@/modules/pulse/engine';
import { PulseCard } from '@/modules/pulse/components/pulse-card';
import { RefreshPulseButton } from '@/modules/pulse/components/refresh-pulse-button';

export async function RailSupervisor({ data }: { data: WorkspaceOverviewData }) {
  const locale = (await getLocale()) as FormatLocale;
  const [activeRecord, pulse] = await Promise.all([
    findActiveRecordByWorkspace(data.workspace.id),
    getPulse(data.workspace.id, locale),
  ]);
  // Show "Issue record" once the supervisor has anything to sign off on —
  // i.e. at least one deliverable has been submitted. (Hidden until then so
  // it doesn't add noise on day 1 of the internship.)
  const hasSubmittedDeliverables = data.deliverables.some(
    (d) => d.status === 'submitted' || d.status === 'approved',
  );

  // "This week" — review-pending deliverables + tasks in review
  const pendingReviews = data.deliverables
    .filter((d) => d.status === 'submitted')
    .slice(0, 2);
  const tasksInReview = data.tasks.filter((t) => t.status === 'review').slice(0, 2);

  // Today's date for the "This week · 30 May" eyebrow
  const today = new Date();
  const thisWeekLabel = `This week · ${today.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  })}`;

  return (
    <>
      {/* Pulse — the AI co-supervisor read. Replaces the old heuristic
          "Performance signal" + "Quiet flag" blocks. Null when there are no
          signals yet (e.g. brand-new workspace). */}
      {pulse && (
        <PulseCard
          pulse={pulse}
          refresh={<RefreshPulseButton workspaceId={data.workspace.id} />}
        />
      )}

      <div className="ws-rail-cta">
        <h4>Need a sync?</h4>
        <p>Schedule a check-in. Inturn generates the link and adds it to the timeline.</p>
        <ScheduleCheckInButton workspaceId={data.workspace.id} />
      </div>

      {hasSubmittedDeliverables && (
        <div className="ws-rail-cta">
          <h4>Wrap-up</h4>
          <p>
            Issue the end-of-internship record. Snapshots deliverables, your review, and a
            rating. Generates a shareable PDF for the intern.
          </p>
          <IssueRecordButton
            workspaceId={data.workspace.id}
            hasActiveRecord={Boolean(activeRecord)}
            activeRecordToken={activeRecord?.shareToken ?? null}
            locale={locale}
          />
        </div>
      )}

      <div className="ws-rail-quick">
        <h4>{thisWeekLabel}</h4>
        <ul>
          {pendingReviews.length === 0 && tasksInReview.length === 0 ? (
            <li>
              <span className="dot" />
              Nothing waiting on you
            </li>
          ) : (
            <>
              {pendingReviews.map((d) => (
                <li key={d.id} className="urgent">
                  <span className="dot" />
                  Review {d.title}
                </li>
              ))}
              {tasksInReview.map((t) => (
                <li key={t.id} className="next">
                  <span className="dot" />
                  Annotate {t.title}
                </li>
              ))}
            </>
          )}
        </ul>
      </div>
    </>
  );
}
