import Link from 'next/link';
import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { listOrganizationsByVerification } from '@/modules/admin/queries';
import { StatusPill, toneForVerificationStatus } from '@/components/status-pill';
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
      <PageHeader title={t('title')} description={t('subtitle')} className="mb-6" />
      <FilterChips
        className="mb-6"
        activeKey={statusFilter}
        items={(['pending', 'verified', 'suspended', 'all'] as const).map((s) => ({
          key: s,
          label: filterLabels[s],
          href: `/admin/verifications?status=${s}`,
        }))}
      />
      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-caption text-[var(--ink-3)]">
          {t('empty')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-hidden">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('company')}</TableHead>
                <TableHead>{t('owner')}</TableHead>
                <TableHead>{t('rne')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ organization, owner }) => (
                <TableRow key={organization.id}>
                  <TableCell>
                    <div className="font-medium text-[var(--ink)]">{organization.name}</div>
                    <div className="text-caption text-[var(--ink-3)]">{organization.city ?? organization.country ?? '—'}</div>
                  </TableCell>
                  <TableCell>
                    <div>{owner.firstName} {owner.lastName}</div>
                    <div className="text-caption text-[var(--ink-3)]">{owner.email}</div>
                  </TableCell>
                  <TableCell>
                    {organization.rneUrl ? (
                      <Check size={15} strokeWidth={2.5} className="text-[var(--success)]" aria-label="RNE provided" />
                    ) : (
                      <span className="text-caption text-[var(--ink-4)]">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={toneForVerificationStatus(organization.verificationStatus)}>
                      {tStatus(
                        (organization.verificationStatus ?? 'draft') as
                          | 'draft' | 'pending' | 'verified' | 'suspended',
                      )}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/verifications/${organization.id}`}
                      className="text-label text-[var(--brand-600)] hover:text-[var(--brand-700)]"
                    >
                      {t('review')}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
