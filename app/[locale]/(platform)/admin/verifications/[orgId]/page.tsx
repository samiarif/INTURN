import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getOrganizationDetail } from '@/modules/admin/queries';
import { VerificationActions } from './_actions';
import type { VerificationStatus } from '@/modules/admin/state-machine';
import { StatusPill, toneForVerificationStatus } from '@/components/status-pill';
import { formatDateLong, type FormatLocale } from '@/lib/format-time';

export default async function Page({
  params,
}: {
  params: Promise<{ orgId: string; locale: string }>;
}) {
  const { orgId, locale } = await params;
  const data = await getOrganizationDetail(orgId);
  if (!data) notFound();
  const { organization, owner } = data;
  const status = (organization.verificationStatus ?? 'draft') as VerificationStatus;

  const isPdf = organization.rneUrl?.toLowerCase().endsWith('.pdf') ?? false;

  const [t, tStatus] = await Promise.all([
    getTranslations({ locale, namespace: 'admin.verifications.detail' }),
    getTranslations({ locale, namespace: 'admin.status' }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 md:p-8">
      <div className="mb-2">
        <Link href="/admin/verifications" className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)]">
          {t('back')}
        </Link>
      </div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2 inline-flex items-center gap-3 flex-wrap">
            {organization.name}
            <StatusPill tone={toneForVerificationStatus(status)}>{tStatus(status)}</StatusPill>
          </h1>
          {organization.description && (
            <p className="text-[14px] text-[var(--ink-2)] max-w-prose">{organization.description}</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <section>
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            {t('organization')}
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] space-y-2 text-sm">
            <div className="flex justify-between gap-3"><span className="text-[var(--ink-3)]">{t('slug')}</span><span className="font-mono break-all">{organization.slug}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--ink-3)]">{t('industry')}</span><span>{organization.industry ?? '—'}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--ink-3)]">{t('size')}</span><span>{organization.size ?? '—'}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--ink-3)]">{t('country')}</span><span>{organization.country ?? '—'}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--ink-3)]">{t('city')}</span><span>{organization.city ?? '—'}</span></div>
            {organization.website && (
              <div className="flex justify-between gap-3">
                <span className="text-[var(--ink-3)]">{t('website')}</span>
                <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-600)] hover:text-[var(--brand-700)] break-all">
                  {organization.website} ↗
                </a>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-[var(--ink-3)]">{t('createdOn')}</span>
              <span>{formatDateLong(organization.createdAt, locale as FormatLocale)}</span>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            {t('owner')}
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] space-y-2 text-sm">
            <div className="font-medium">{owner.firstName} {owner.lastName}</div>
            <div className="text-[var(--ink-3)] break-all">{owner.email}</div>
            <div className="text-[12px] text-[var(--ink-3)] font-mono break-all">{owner.clerkId}</div>
          </div>
        </section>
      </div>

      <section className="mb-8">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          {t('rne')}
        </h2>
        {organization.rneUrl ? (
          isPdf ? (
            <div>
              <iframe
                src={organization.rneUrl}
                className="w-full h-[400px] md:h-[600px] border border-[var(--border-color)] rounded-md"
                title={t('rne')}
              />
              <a
                href={organization.rneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[13px] text-[var(--brand-700)] hover:underline"
              >
                {t('openOriginal')}
              </a>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organization.rneUrl}
              alt={t('rne')}
              className="max-w-full h-auto border border-[var(--border-color)] rounded-md"
            />
          )
        ) : (
          <div className="border border-dashed border-[var(--border-color)] rounded-md p-6 text-center text-[var(--ink-3)] text-sm">
            {t('noRne')}
          </div>
        )}
      </section>

      <section className="border-t border-[var(--border-color)] pt-6">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          {t('actions')}
        </h2>
        <VerificationActions orgId={orgId} currentStatus={status} />
      </section>
    </div>
  );
}
