import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAdminStats, listRecentOrganizations } from '@/modules/admin/queries';
import { countOpenReports } from '@/modules/reports/queries';
import { StatusPill, toneForVerificationStatus } from '@/components/status-pill';

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
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-8">{t('subtitle')}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Link
          href="/admin/verifications"
          className={`block border rounded-lg p-5 hover:border-[var(--border-strong)] ${
            stats.oldestPendingHours !== null && stats.oldestPendingHours >= 24
              ? 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]'
              : 'border-[var(--border-color)] bg-[var(--surface)]'
          }`}
        >
          <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-2">
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
          <div className="text-[12px] text-[var(--ink-3)] mt-1">
            {stats.oldestPendingHours !== null
              ? t('oldestPending', { hours: stats.oldestPendingHours })
              : t('verificationsPendingHelp')}
          </div>
        </Link>
        <Link
          href="/admin/verifications?status=verified"
          className="block border border-[var(--border-color)] rounded-lg p-5 bg-[var(--surface)] hover:border-[var(--border-strong)]"
        >
          <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-2">
            {t('companiesVerified')}
          </div>
          <div className="text-3xl font-semibold tracking-tight">{stats.companiesVerified}</div>
          <div className="text-[12px] text-[var(--success)] mt-1">
            {t('recentLast30d', { n: stats.companiesVerifiedRecent })}
          </div>
        </Link>
        <div className="border border-[var(--border-color)] rounded-lg p-5 bg-[var(--surface)]">
          <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-2">
            {t('activeWorkspaces')}
          </div>
          <div className="text-3xl font-semibold tracking-tight">{stats.activeWorkspaces}</div>
          <div className="text-[12px] text-[var(--success)] mt-1">
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
          <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-2">
            {t('openReports')}
          </div>
          <div className={`text-3xl font-semibold tracking-tight ${openReports > 0 ? 'text-[var(--status-danger-ink)]' : ''}`}>
            {openReports}
          </div>
          <div className="text-[12px] text-[var(--ink-3)] mt-1">
            {openReports > 0 ? t('openReportsNeedsTriage') : t('openReportsAllClear')}
          </div>
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">{t('recentOrgs')}</h2>
        {recent.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
            {t('noOrgs')}
          </div>
        ) : (
          <div className="border border-[var(--border-color)] rounded-md overflow-x-auto bg-[var(--surface)]">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-[var(--surface-muted)] text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('company')}</th>
                  <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('owner')}</th>
                  <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('status')}</th>
                  <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('created')}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(({ organization, owner }) => (
                  <tr key={organization.id} className="border-t border-[var(--border-color)]">
                    <td className="px-4 py-3 font-medium">{organization.name}</td>
                    <td className="px-4 py-3 text-[13px]">{owner.email}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={toneForVerificationStatus(organization.verificationStatus)}>
                        {tStatus(
                          (organization.verificationStatus ?? 'draft') as
                            | 'draft' | 'pending' | 'verified' | 'suspended',
                        )}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[var(--ink-3)]">
                      {new Date(organization.createdAt).toLocaleDateString(
                        locale === 'fr' ? 'fr-FR' : 'en-US',
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/verifications/${organization.id}`} className="text-[var(--brand-600)] hover:text-[var(--brand-700)] text-sm">
                        {t('open')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
