import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { listAuditLogPage, type AuditLogFilter } from '@/modules/audit/queries';
import { StatusPill, type StatusTone } from '@/components/status-pill';
import { PageHeader } from '@/components/ui/page-header';
import { FilterChips } from '@/components/ui/filter-chips';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 50;

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
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const activeFilter = sp.action ?? 'all';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const filter: AuditLogFilter = {};
  const matched = FILTER_OPTIONS.find((o) => o.key === activeFilter);
  if (matched?.prefix) filter.actionPrefix = matched.prefix;

  const [result, t, locale] = await Promise.all([
    listAuditLogPage(page, PAGE_SIZE, filter),
    getTranslations('admin.audit'),
    getLocale(),
  ]);
  const { rows, hasMore } = result;

  // Pagination + export hrefs carry the active action filter.
  const pageHref = (p: number): string => {
    const params = new URLSearchParams();
    if (activeFilter !== 'all') params.set('action', activeFilter);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/admin/audit${qs ? `?${qs}` : ''}`;
  };
  const exportHref =
    activeFilter !== 'all'
      ? `/api/admin/audit/export?action=${activeFilter}`
      : '/api/admin/audit/export';

  const filterChipLabels: Record<string, string> = {
    all: locale === 'fr' ? 'Toutes' : 'All',
    org: locale === 'fr' ? 'Organisations' : 'Organizations',
    report: locale === 'fr' ? 'Signalements' : 'Reports',
    internship: locale === 'fr' ? 'Stages' : 'Internships',
    user: locale === 'fr' ? 'Utilisateurs' : 'Users',
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        className="mb-6"
        actions={
          <a
            href={exportHref}
            download
            className="shrink-0 h-9 px-3 inline-flex items-center rounded-md text-label font-medium border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
          >
            {t('exportCsv')}
          </a>
        }
      />

      <FilterChips
        className="mb-6"
        activeKey={activeFilter}
        items={FILTER_OPTIONS.map((o) => ({
          key: o.key,
          label: filterChipLabels[o.key],
          href: o.key === 'all' ? '/admin/audit' : `/admin/audit?action=${o.key}`,
        }))}
      />

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('empty')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-hidden">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('time')}</TableHead>
                <TableHead>{t('actor')}</TableHead>
                <TableHead>{t('action')}</TableHead>
                <TableHead>{t('target')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ log, actor }) => (
                <TableRow key={log.id}>
                  <TableCell className="text-caption text-[var(--ink-3)] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                  </TableCell>
                  <TableCell>
                    {actor?.email ?? <span className="italic text-[var(--ink-3)]">—</span>}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={toneForAction(log.action)} mono>
                      {log.action}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="font-mono text-caption text-[var(--ink-3)]">
                    {log.targetType}/{log.targetId?.slice(0, 8) ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between mt-6 text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="text-[var(--brand-600)] hover:text-[var(--brand-700)]"
            >
              {t('previous')}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[var(--ink-3)]">{t('page', { n: page })}</span>
          {hasMore ? (
            <Link
              href={pageHref(page + 1)}
              className="text-[var(--brand-600)] hover:text-[var(--brand-700)]"
            >
              {t('next')}
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
