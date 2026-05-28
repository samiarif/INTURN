import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { DeliverableRevision } from '@/db/schema';
import { getDeliverableByShareToken } from '@/modules/deliverables/queries';
import { GradientStar } from '@/components/brand/gradient-star';
import { CopyLinkButton } from '../../records/[token]/copy-link-button';

type DeliverableStatus = 'draft' | 'submitted' | 'approved' | 'revision-requested';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const deliverable = await getDeliverableByShareToken(token);
  if (!deliverable) return { title: 'Inturn — Deliverable' };
  return {
    title: `${deliverable.title} · Inturn`,
    description: 'Shared deliverable on Inturn',
    robots: { index: false, follow: false },
  };
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

type PublicVersion = {
  version: number;
  submittedAt: string | null;
  status: DeliverableStatus;
  fileUrl: string | null;
  fileName: string | null;
  note: string | null;
};

export default async function PublicDeliverablePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const deliverable = await getDeliverableByShareToken(token);
  if (!deliverable) notFound();

  const t = await getTranslations({ locale, namespace: 'deliverables.public' });
  const status = (deliverable.status ?? 'draft') as DeliverableStatus;

  const history: DeliverableRevision[] = Array.isArray(deliverable.revisionHistory)
    ? deliverable.revisionHistory
    : [];

  // Current row = the live "head" version; history holds prior submissions.
  const currentVersion: PublicVersion = {
    version: deliverable.version,
    submittedAt: deliverable.submittedAt ? deliverable.submittedAt.toISOString() : null,
    status,
    fileUrl: deliverable.fileUrl,
    fileName: deliverable.fileName,
    note: null,
  };

  const historyVersions: PublicVersion[] = history.map((h) => ({
    version: h.version,
    submittedAt: h.submittedAt,
    status: h.status as DeliverableStatus,
    fileUrl: h.fileUrl,
    fileName: h.fileName,
    note: h.note,
  }));

  // Newest version first.
  const versions: PublicVersion[] = [currentVersion, ...historyVersions].sort(
    (a, b) => b.version - a.version,
  );

  return (
    <div className="rec-shell">
      <header className="rec-header">
        <Link href={`/${locale}`} className="rec-brand" aria-label="Inturn">
          <GradientStar className="rec-brand-star" />
          <span>inturn</span>
        </Link>
        <div className="rec-stamp" aria-hidden>
          {t('badge')}
        </div>
      </header>

      <main className="rec-main">
        <div className="rec-title-band">
          <p className="rec-eyebrow">{t('eyebrow')}</p>
          <h1 className="rec-title">{deliverable.title}</h1>
          <p className="rec-subtitle">
            <span className={`rec-badge rec-badge-${status}`}>{t(`status.${status}`)}</span>
          </p>
        </div>

        {deliverable.description && (
          <section className="rec-card rec-card-wide">
            <h2 className="rec-section-title">{t('about')}</h2>
            <div className="rec-card-body">
              <p className="rec-description">{deliverable.description}</p>
            </div>
          </section>
        )}

        <section className="rec-card rec-card-wide">
          <h2 className="rec-section-title">{t('versions')}</h2>
          <ul className="rec-deliv-list">
            {versions.map((v) => (
              <li key={`${v.version}-${v.submittedAt ?? 'na'}`} className="rec-deliv">
                <span className="rec-deliv-title">
                  {t('version', { n: v.version })}
                  {v.note ? ` — ${v.note}` : ''}
                </span>
                <span className="rec-value">
                  {v.fileUrl ? (
                    <a
                      href={v.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rec-link"
                    >
                      {v.fileName ?? t('openFile')}
                    </a>
                  ) : (
                    <span className="rec-label">{t('noFile')}</span>
                  )}
                </span>
                <span className={`rec-badge rec-badge-${v.status}`}>{t(`status.${v.status}`)}</span>
                <span className="rec-label">{t('submitted')}: {formatDate(v.submittedAt, locale)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="rec-actions">
          <CopyLinkButton label={t('copyLink')} copiedLabel={t('linkCopied')} />
        </div>
      </main>

      <footer className="rec-footer">
        <p className="rec-verify">{t('verifyBlurb')}</p>
      </footer>
    </div>
  );
}
