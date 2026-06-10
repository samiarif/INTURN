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

      {/* KPI tiles — intern-dashboard idiom: mono uppercase label + big
          number + faint tinted corner square. Alert tiles trade the tint for
          the danger tokens instead of flooding the whole box. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatTile
          href="/admin/verifications"
          label={t('verificationsPending')}
          value={stats.verificationsPending}
          caption={
            stats.oldestPendingHours !== null
              ? t('oldestPending', { hours: stats.oldestPendingHours })
              : t('verificationsPendingHelp')
          }
          alert={stats.oldestPendingHours !== null && stats.oldestPendingHours >= 24}
          accentClass="bg-[var(--surface-brand-tint)]"
        />
        <StatTile
          href="/admin/verifications?status=verified"
          label={t('companiesVerified')}
          value={stats.companiesVerified}
          caption={t('recentLast30d', { n: stats.companiesVerifiedRecent })}
          captionClass="text-[var(--success)]"
          accentClass="bg-[var(--surface-accent-tint)]"
        />
        <StatTile
          label={t('activeWorkspaces')}
          value={stats.activeWorkspaces}
          caption={t('recentLast30d', { n: stats.activeWorkspacesRecent })}
          captionClass="text-[var(--success)]"
          accentClass="bg-[var(--surface-brand-tint)]"
        />
        <StatTile
          href="/admin/reports?status=open"
          label={t('openReports')}
          value={openReports}
          caption={openReports > 0 ? t('openReportsNeedsTriage') : t('openReportsAllClear')}
          alert={openReports > 0}
          accentClass="bg-[var(--surface-accent-tint)]"
        />
      </div>

      <section>
        <h2 className="flex items-baseline gap-2 text-eyebrow font-mono uppercase text-[var(--brand-700)] mb-3">
          {t('recentOrgs')}
          <span className="text-caption font-mono font-normal normal-case tracking-normal text-[var(--ink-4)]">
            {recent.length}
          </span>
        </h2>
        {recent.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-caption text-[var(--ink-3)]">
            {t('noOrgs')}
          </div>
        ) : (
          <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] shadow-[var(--elev-card)] overflow-hidden">
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

/**
 * KPI tile — mirrors the intern/university dashboard StatTile idiom (mono
 * uppercase eyebrow, big number, faint tinted corner square). `alert` swaps
 * the accents for the danger tokens; linked tiles get the hover affordance.
 */
function StatTile({
  label,
  value,
  caption,
  captionClass,
  accentClass,
  alert = false,
  href,
}: {
  label: string;
  value: number;
  caption: string;
  captionClass?: string;
  accentClass: string;
  alert?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <span
        aria-hidden
        className={`absolute top-3 right-3 w-7 h-7 rounded-md ${
          alert ? 'bg-[var(--status-danger-bg)]' : accentClass
        }`}
      />
      <div className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-1 pr-9">
        {label}
      </div>
      <div className={`text-title ${alert ? 'text-[var(--status-danger-ink)]' : 'text-[var(--ink)]'}`}>
        {value}
      </div>
      <div className={`text-caption mt-1 ${alert ? 'text-[var(--status-danger-ink)]' : (captionClass ?? 'text-[var(--ink-3)]')}`}>
        {caption}
      </div>
    </>
  );

  const frame = `relative overflow-hidden rounded-lg border bg-[var(--surface)] p-4 ${
    alert ? 'border-[var(--status-danger-border)]' : 'border-[var(--border-color)]'
  }`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${frame} block transition-colors hover:bg-[var(--surface-muted)] ${
          alert ? '' : 'hover:border-[var(--border-strong)]'
        }`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={frame}>{inner}</div>;
}
