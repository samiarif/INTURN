import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { listOrganizationsByVerification } from '@/modules/admin/queries';
import { StatusPill, toneForVerificationStatus } from '@/components/status-pill';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = (sp.status ?? 'pending') as 'pending' | 'all' | 'verified' | 'suspended';
  const statuses =
    statusFilter === 'all'
      ? (['draft', 'pending', 'verified', 'suspended'] as const)
      : statusFilter === 'pending'
        ? (['draft', 'pending'] as const)
        : ([statusFilter] as const);
  const [rows, t, tStatus] = await Promise.all([
    listOrganizationsByVerification([...statuses]),
    getTranslations('admin.verifications'),
    getTranslations('admin.status'),
  ]);

  const filterLabels: Record<'pending' | 'verified' | 'suspended' | 'all', string> = {
    pending: t('filterPending'),
    verified: t('filterVerified'),
    suspended: t('filterSuspended'),
    all: t('filterAll'),
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-6">{t('subtitle')}</p>
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {(['pending', 'verified', 'suspended', 'all'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/verifications?status=${s}`}
            className={
              statusFilter === s
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
        <div className="border border-[var(--border-color)] rounded-md overflow-x-auto bg-[var(--surface)]">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-[var(--surface-muted)] text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('company')}</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('owner')}</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('rne')}</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('status')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ organization, owner }) => (
                <tr key={organization.id} className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{organization.name}</div>
                    <div className="text-[12px] text-[var(--ink-3)]">{organization.city ?? organization.country ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[13px]">{owner.firstName} {owner.lastName}</div>
                    <div className="text-[12px] text-[var(--ink-3)]">{owner.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {organization.rneUrl ? (
                      <span className="text-[var(--success)] text-[12px]">✓</span>
                    ) : (
                      <span className="text-[var(--ink-4)] text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={toneForVerificationStatus(organization.verificationStatus)}>
                      {tStatus(
                        (organization.verificationStatus ?? 'draft') as
                          | 'draft' | 'pending' | 'verified' | 'suspended',
                      )}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/verifications/${organization.id}`}
                      className="text-[var(--brand-600)] hover:text-[var(--brand-700)] text-sm"
                    >
                      {t('review')}
                    </Link>
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
