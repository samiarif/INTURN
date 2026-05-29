import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAdminStats, listRecentOrganizations } from '@/modules/admin/queries';
import { countOpenReports } from '@/modules/reports/queries';
import { StatusPill, toneForVerificationStatus } from '@/components/status-pill';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function Page() {
  const [stats, recent, openReports, t, tStatus, locale] = await Promise.all([
    getAdminStats(),
    listRecentOrganizations(10),
    countOpenReports(),
    getTranslations('admin.dashboard'),
    getTranslations('admin.status'),
    getLocale(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <PageHeader title={t('title')} description={t('subtitle')} className="mb-8" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Link
          href="/admin/verifications"
          className={`block border rounded-lg p-5 hover:border-[var(--border-strong)] ${
            stats.oldestPendingHours !== null && stats.oldestPendingHours >= 24
              ? 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]'
              : 'border-[var(--border-color)] bg-[var(--surface)]'
          }`}
        >
          <div className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-2">
            {t('verificationsPending')}
          </div>
          <div
            className={`text-3xl font-semibold tracking-tight ${
              stats.oldestPendingHours !== null && stats.oldestPendingHours >= 24
                ? 'text-[var(--status-danger-ink)]'
                : ''
            }`}
          >
            {stats.verificationsPending}
          </div>
          <div className="text-caption text-[var(--ink-3)] mt-1">
            {stats.oldestPendingHours !== null
              ? t('oldestPending', { hours: stats.oldestPendingHours })
              : t('verificationsPendingHelp')}
          </div>
        </Link>
        <Link
          href="/admin/verifications?status=verified"
          className="block border border-[var(--border-color)] rounded-lg p-5 bg-[var(--surface)] hover:border-[var(--border-strong)]"
        >
          <div className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-2">
            {t('companiesVerified')}
          </div>
          <div className="text-3xl font-semibold tracking-tight">{stats.companiesVerified}</div>
          <div className="text-caption text-[var(--success)] mt-1">
            {t('recentLast30d', { n: stats.companiesVerifiedRecent })}
          </div>
        </Link>
        <div className="border border-[var(--border-color)] rounded-lg p-5 bg-[var(--surface)]">
          <div className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-2">
            {t('activeWorkspaces')}
          </div>
          <div className="text-3xl font-semibold tracking-tight">{stats.activeWorkspaces}</div>
          <div className="text-caption text-[var(--success)] mt-1">
            {t('recentLast30d', { n: stats.activeWorkspacesRecent })}
          </div>
        </div>
        <Link
          href="/admin/reports?status=open"
          className={`block border rounded-lg p-5 hover:border-[var(--border-strong)] ${
            openReports > 0
              ? 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]'
              : 'border-[var(--border-color)] bg-[var(--surface)]'
          }`}
        >
          <div className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-2">
            {t('openReports')}
          </div>
          <div className={`text-3xl font-semibold tracking-tight ${openReports > 0 ? 'text-[var(--status-danger-ink)]' : ''}`}>
            {openReports}
          </div>
          <div className="text-caption text-[var(--ink-3)] mt-1">
            {openReports > 0 ? t('openReportsNeedsTriage') : t('openReportsAllClear')}
          </div>
        </Link>
      </div>

      <section>
        <h2 className="text-heading mb-4">{t('recentOrgs')}</h2>
        {recent.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-caption text-[var(--ink-3)]">
            {t('noOrgs')}
          </div>
        ) : (
          <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-hidden">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('company')}</TableHead>
                  <TableHead>{t('owner')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map(({ organization, owner }) => (
                  <TableRow key={organization.id}>
                    <TableCell className="font-medium text-[var(--ink)]">{organization.name}</TableCell>
                    <TableCell className="text-caption text-[var(--ink-3)]">{owner.email}</TableCell>
                    <TableCell>
                      <StatusPill tone={toneForVerificationStatus(organization.verificationStatus)}>
                        {tStatus(
                          (organization.verificationStatus ?? 'draft') as
                            | 'draft' | 'pending' | 'verified' | 'suspended',
                        )}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="font-mono text-caption text-[var(--ink-3)]">
                      {new Date(organization.createdAt).toLocaleDateString(
                        locale === 'fr' ? 'fr-FR' : 'en-US',
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/verifications/${organization.id}`} className="text-label text-[var(--brand-600)] hover:text-[var(--brand-700)]">
                        {t('open')}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
