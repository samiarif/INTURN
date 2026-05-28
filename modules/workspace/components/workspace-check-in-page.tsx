import { WeeklyCheckInForm } from './weekly-checkin-form';
import { computeWeekOfTotal } from '../queries';
import type { WorkspaceOverviewData } from '../queries';

export function WorkspaceCheckInPage({ data }: { data: WorkspaceOverviewData }) {
  const start = data.workspace.startDate ? new Date(data.workspace.startDate) : null;
  const { current } = computeWeekOfTotal(start, data.internship?.duration ?? 12);

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px', width: '100%' }}>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 6 }}>
        Week {current} check-in
      </h1>
      <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24 }}>
        Quick summary for {data.supervisors[0]?.firstName ?? 'your supervisor'}. Generate a
        draft from this week&apos;s activity or write it yourself.
      </p>
      <WeeklyCheckInForm workspaceId={data.workspace.id} />
    </div>
  );
}
