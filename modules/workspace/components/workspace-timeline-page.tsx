import { WorkspaceMHead } from './m-head';
import { getWorkspaceTimeline, type TimelineRow } from '../queries';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceView } from '../types';

function fmtDay(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function groupByDay(rows: TimelineRow[]): Array<{ day: string; rows: TimelineRow[] }> {
  const map = new Map<string, TimelineRow[]>();
  for (const r of rows) {
    const key = r.at.toISOString().slice(0, 10);
    const bucket = map.get(key) ?? [];
    bucket.push(r);
    map.set(key, bucket);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, rows]) => ({ day, rows }));
}

export async function WorkspaceTimelinePage({
  data,
  view,
  basePath,
}: {
  data: WorkspaceOverviewData;
  view: WorkspaceView;
  basePath: string;
}) {
  const rows = await getWorkspaceTimeline(data.workspace.id);
  const grouped = groupByDay(rows);

  return (
    <>
      <WorkspaceMHead
        view={view}
        basePath={basePath}
        activeTab="timeline"
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
        style={{ gridTemplateColumns: '1fr', paddingTop: 20, paddingBottom: 40, maxWidth: 760, margin: '0 auto', width: '100%' }}
      >
        {rows.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center">
            <p className="text-[var(--ink-2)] font-medium">Nothing on the timeline yet.</p>
            <p className="text-[var(--ink-3)] text-sm mt-1">Tasks, deliverables, and check-ins will appear here as they happen.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ day, rows }) => (
              <section key={day}>
                <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--ink-3)] mb-2">
                  {fmtDay(new Date(day))}
                </h3>
                <ul className="space-y-2 border-l-2 border-[var(--border-color)] pl-4">
                  {rows.map((r) => (
                    <li key={r.id} className="text-sm text-[var(--ink-2)]">
                      {r.kind === 'milestone' ? (
                        <span className="font-medium text-[var(--ink)]">{r.label}</span>
                      ) : (
                        <span>
                          <span className="font-medium text-[var(--ink)]">{r.type}</span>
                          <span className="text-[var(--ink-3)]"> · {r.at.toLocaleTimeString()}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
