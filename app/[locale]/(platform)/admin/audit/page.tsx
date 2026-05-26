import { listRecentAuditLogs } from '@/modules/audit/queries';

function actionStyle(action: string): string {
  if (action.startsWith('report.')) return 'bg-[#FFFBEB] text-[#92400E]';
  if (action.startsWith('org.verification.verified')) return 'bg-[#ECFDF5] text-[#15803D]';
  if (action.startsWith('org.verification.suspended')) return 'bg-[#FEF2F2] text-[#B91C1C]';
  if (action.startsWith('internship.')) return 'bg-[#EFF6FF] text-[#1D4ED8]';
  return 'bg-[var(--surface-muted)] text-[var(--ink-2)]';
}

export default async function Page() {
  const rows = await listRecentAuditLogs(100);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Audit log</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-6">
        Append-only record of admin actions. Last 100 entries.
      </p>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          No audit entries yet.
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-left text-[var(--ink-3)]">
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Time</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Actor</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Action</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ log, actor }) => (
                <tr key={log.id} className="border-b border-[var(--border-color)] last:border-b-0">
                  <td className="px-4 py-3 text-[var(--ink-3)] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{actor?.email ?? 'deleted user'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] uppercase tracking-wider font-mono px-2 py-0.5 rounded ${actionStyle(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-3)] font-mono text-[12px]">
                    {log.targetType}/{log.targetId?.slice(0, 8) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
