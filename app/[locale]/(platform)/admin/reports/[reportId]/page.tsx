import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getReportById } from '@/modules/reports/queries';
import { loadSubject } from '@/modules/reports/subject-loader';
import { sectorKeyFromValue } from '@/modules/internships/sectors';
import { ResolveReportForm } from './resolve-form';
import { SuspendUserButton } from './suspend-user-button';
import type { ReportSubjectType } from '@/modules/reports/server-actions';

const REASON_KEY: Record<string, string> = {
  scam: 'scam',
  misleading: 'misleading',
  inappropriate: 'inappropriate',
  spam: 'spam',
  unsafe: 'unsafe',
  other: 'other',
};

export default async function Page({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const t = await getTranslations('admin.reportDetail');
  const tStatus = await getTranslations('admin.status');
  const tType = await getTranslations('admin.subjectType');
  const tIntStatus = await getTranslations('projectHub.internshipStatusLabel');
  const tSector = await getTranslations('internships.form.sector');
  const locale = await getLocale();
  const row = await getReportById(reportId);
  if (!row) notFound();

  const subject = await loadSubject(row.report.subjectType as ReportSubjectType, row.report.subjectId);
  const reasonLabel = t(`reasons.${REASON_KEY[row.report.reason] ?? 'other'}`);

  // The subject summary is locale-agnostic (loaded without a request locale), so
  // compose its label + detail here. A deleted subject has no name → localized
  // "Deleted {type}". The detail reuses the canonical status maps (admin.status
  // for orgs, projectHub.internshipStatusLabel for internships) so the wording
  // stays in sync with where those statuses appear elsewhere.
  const fr = locale === 'fr';
  const sep = t('metaSep');
  const kv = (key: string, value: string) => `${key}${fr ? ' : ' : ': '}${value}`;
  const subjectLabel = subject.label ?? t(`deleted.${subject.subjectType}`);
  let subjectDetail: string | null = null;
  const d = subject.detail;
  if (d?.kind === 'internship') {
    const sectorKey = sectorKeyFromValue(d.sector);
    const sectorLabel = sectorKey ? tSector(sectorKey) : d.sector;
    subjectDetail = [sectorLabel, kv(t('detailStatus'), tIntStatus(d.status))]
      .filter(Boolean)
      .join(` ${sep} `);
  } else if (d?.kind === 'organization') {
    subjectDetail = [d.place, tStatus(d.verificationStatus)].filter(Boolean).join(` ${sep} `);
  } else if (d?.kind === 'user') {
    subjectDetail = [d.email, kv(t('detailRole'), d.role ? t(`role.${d.role}`) : '—')]
      .filter(Boolean)
      .join(` ${sep} `);
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <Link
        href="/admin/reports"
        className="text-caption text-[var(--ink-3)] hover:text-[var(--ink)] mb-4 inline-flex items-center gap-1.5"
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
        {t('back')}
      </Link>
      <h1 className="text-display font-[family-name:var(--font-display)] mb-1">{t('heading', { id: reportId.slice(0, 8) })}</h1>
      <p className="text-caption text-[var(--ink-3)] mb-6">
        {tType(subject.subjectType)} {t('metaSep')} {reasonLabel} {t('metaSep')}{' '}
        {new Date(row.report.createdAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}
      </p>

      <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5 mb-4">
        <h2 className="text-eyebrow font-mono uppercase text-[var(--brand-700)] mb-2">
          {t('subject')}
        </h2>
        <p className="font-semibold mb-1">{subjectLabel}</p>
        {subjectDetail && <p className="text-caption text-[var(--ink-3)] mb-2">{subjectDetail}</p>}
        {subject.href && (
          <Link
            href={subject.href}
            className="inline-flex items-center gap-1.5 text-caption text-[var(--brand-700)] hover:underline"
          >
            {t('openSubject')}
            <ArrowRight size={14} strokeWidth={2} aria-hidden />
          </Link>
        )}
        {!subject.exists && (
          <p className="text-caption text-[var(--danger)] mt-1">
            {t('subjectGone')}
          </p>
        )}
        {subject.user && subject.user.role !== 'admin' && (
          <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
            <SuspendUserButton
              userId={subject.user.id}
              isSuspended={subject.user.suspended}
              userLabel={subject.user.email}
            />
          </div>
        )}
      </section>

      <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5 mb-4">
        <h2 className="text-eyebrow font-mono uppercase text-[var(--brand-700)] mb-2">
          {t('reportBody')}
        </h2>
        <p className="text-body leading-relaxed whitespace-pre-wrap">{row.report.body}</p>
        <p className="text-caption text-[var(--ink-3)] mt-4">
          {t('reportedBy', { email: row.reporter?.email ?? t('deletedUser') })}
        </p>
      </section>

      {row.report.status !== 'open' && row.report.resolution && (
        <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface-muted)] p-5 mb-4">
          <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-2">
            {t('resolution')} {t('metaSep')} {tStatus(row.report.status as 'open' | 'reviewed' | 'resolved').toLowerCase()}
          </h2>
          <p className="text-body whitespace-pre-wrap">{row.report.resolution}</p>
          {row.report.resolvedAt && (
            <p className="text-caption text-[var(--ink-3)] mt-2">
              {new Date(row.report.resolvedAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}
            </p>
          )}
        </section>
      )}

      <ResolveReportForm
        reportId={reportId}
        status={row.report.status as 'open' | 'reviewed' | 'resolved'}
        subjectType={row.report.subjectType as ReportSubjectType}
        subjectId={row.report.subjectId}
        subjectExists={subject.exists}
      />
    </div>
  );
}
