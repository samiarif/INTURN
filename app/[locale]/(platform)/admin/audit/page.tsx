import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { listRecentAuditLogs, type AuditLogFilter } from '@/modules/audit/queries';
import { StatusPill, type StatusTone } from '@/components/status-pill';

function toneForAction(action: string): StatusTone {
  if (action.startsWith('report.')) return 'warn';
  if (action.startsWith('org.verification.verified')) return 'success';
  if (action.startsWith('org.verification.suspended')) return 'danger';
  if (action.startsWith('internship.')) return 'info';
  if (action.startsWith('user.delete')) return 'danger';
  return 'neutral';
}

const FILTER_OPTIONS: Array<{ key: string; prefix?: string }> = [
  { key: 'all' },
  { key: 'org', prefix: 'org.' },
  { key: 'report', prefix: 'report.' },
  { key: 'internship', prefix: 'internship.' },
  { key: 'user', prefix: 'user.' },
];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const sp = await searchParams;
  const activeFilter = sp.action ?? 'all';
  const filter: AuditLogFilter = {};
  const matched = FILTER_OPTIONS.find((o) => o.key === activeFilter);
  if (matched?.prefix) filter.actionPrefix = matched.prefix;

  const [rows, t, locale] = await Promise.all([
    listRecentAuditLogs(100, filter),
    getTranslations('admin.audit'),
    getLocale(),
  ]);

  const filterChipLabels: Record<string, string> = {
    all: locale === 'fr' ? 'Toutes' : 'All',
    org: locale === 'fr' ? 'Organisations' : 'Organizations',
    report: locale === 'fr' ? 'Signalements' : 'Reports',
    internship: locale === 'fr' ? 'Stages' : 'Internships',
    user: locale === 'fr' ? 'Utilisateurs' : 'Users',
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-6">{t('subtitle')}</p>

      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {FILTER_OPTIONS.map((o) => (
          <Link
            key={o.key}
            href={o.key === 'all' ? '/admin/audit' : `/admin/audit?action=${o.key}`}
            className={
              activeFilter === o.key
                ? 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--ink)] text-white'
                : 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]'
            }
          >
            {filterChipLabels[o.key]}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('empty')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-left text-[var(--ink-3)]">
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">{t('time')}</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">{t('actor')}</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">{t('action')}</th>
                <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">{t('target')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ log, actor }) => (
                <tr key={log.id} className="border-b border-[var(--border-color)] last:border-b-0">
                  <td className="px-4 py-3 text-[var(--ink-3)] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                  </td>
                  <td className="px-4 py-3">
                    {actor?.email ?? <span className="italic text-[var(--ink-3)]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={toneForAction(log.action)} mono>
                      {log.action}
                    </StatusPill>
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
