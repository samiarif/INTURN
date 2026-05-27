import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { listReportsByStatus } from '@/modules/reports/queries';
import { StatusPill, toneForReportStatus } from '@/components/status-pill';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter = (sp.status ?? 'open') as 'open' | 'reviewed' | 'resolved' | 'all';
  const statuses =
    filter === 'all' ? (['open', 'reviewed', 'resolved'] as const) : ([filter] as const);
  const [rows, t, tStatus, tReason, locale] = await Promise.all([
    listReportsByStatus([...statuses]),
    getTranslations('admin.reports'),
    getTranslations('admin.status'),
    getTranslations('admin.reasons'),
    getLocale(),
  ]);

  const filterLabels: Record<'open' | 'reviewed' | 'resolved' | 'all', string> = {
    open: t('filterOpen'),
    reviewed: t('filterReviewed'),
    resolved: t('filterResolved'),
    all: t('filterAll'),
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-6">{t('subtitle')}</p>
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
            {filterLabels[s]}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('empty')}
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
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <StatusPill tone={toneForReportStatus(report.status)}>
                        {tStatus(report.status as 'open' | 'reviewed' | 'resolved')}
                      </StatusPill>
                      <span className="text-[11px] uppercase tracking-wider font-mono text-[var(--ink-3)]">
                        {report.subjectType} ·{' '}
                        {tReason(
                          report.reason as
                            | 'scam' | 'misleading' | 'inappropriate' | 'spam' | 'unsafe' | 'other',
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ink)] line-clamp-2 mb-1">{report.body}</p>
                    <p className="text-[12px] text-[var(--ink-3)]">
                      {t('reportedBy', { email: reporter?.email ?? t('deletedUser') })} ·{' '}
                      {new Date(report.createdAt).toLocaleString(
                        locale === 'fr' ? 'fr-FR' : 'en-US',
                      )}
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
