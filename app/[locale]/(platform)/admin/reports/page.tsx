import Link from 'next/link';
import { listReportsByStatus } from '@/modules/reports/queries';

const REASON_LABEL: Record<string, string> = {
  scam: 'Scam',
  misleading: 'Misleading',
  inappropriate: 'Inappropriate',
  spam: 'Spam',
  unsafe: 'Unsafe',
  other: 'Other',
};

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-[#FEF2F2] text-[#B91C1C]',
  reviewed: 'bg-[#FFFBEB] text-[#92400E]',
  resolved: 'bg-[#ECFDF5] text-[#15803D]',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter = (sp.status ?? 'open') as 'open' | 'reviewed' | 'resolved' | 'all';
  const statuses =
    filter === 'all' ? (['open', 'reviewed', 'resolved'] as const) : ([filter] as const);
  const rows = await listReportsByStatus([...statuses]);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Reports</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-6">
        Reclamations submitted by interns. Triage open reports to keep the marketplace clean.
      </p>
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {(['open', 'reviewed', 'resolved', 'all'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/reports?status=${s}`}
            className={
              filter === s
                ? 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--ink)] text-white'
                : 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]'
            }
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          No reports in this state.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ report, reporter }) => (
            <li
              key={report.id}
              className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] hover:border-[var(--border-strong)]"
            >
              <Link href={`/admin/reports/${report.id}`} className="block p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-[11px] uppercase tracking-wider font-mono px-2 py-0.5 rounded ${STATUS_STYLE[report.status]}`}
                      >
                        {report.status}
                      </span>
                      <span className="text-[11px] uppercase tracking-wider font-mono text-[var(--ink-3)]">
                        {report.subjectType} · {REASON_LABEL[report.reason]}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ink)] line-clamp-2 mb-1">{report.body}</p>
                    <p className="text-[12px] text-[var(--ink-3)]">
                      Reported by {reporter?.email ?? 'deleted user'} ·{' '}
                      {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
