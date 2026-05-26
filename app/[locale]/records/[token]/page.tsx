import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { findRecordByShareToken } from '@/modules/records/queries';
import { GradientStar } from '@/components/brand/gradient-star';
import { CopyLinkButton } from './copy-link-button';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const record = await findRecordByShareToken(token);
  if (!record) return { title: 'Inturn — Record' };
  return {
    title: `${record.snapshot.intern.name} · ${record.snapshot.internship.title} · Inturn`,
    description: `Internship record issued by ${record.snapshot.organization.name}`,
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

export default async function PublicRecordPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const record = await findRecordByShareToken(token);
  if (!record) notFound();

  const t = await getTranslations({ locale, namespace: 'records' });
  const snap = record.snapshot;
  const approved = snap.deliverables.filter((d) => d.status === 'approved').length;

  return (
    <div className="rec-shell">
      <header className="rec-header">
        <Link href={`/${locale}`} className="rec-brand" aria-label="Inturn">
          <GradientStar className="rec-brand-star" />
          <span>inturn</span>
        </Link>
        <div className="rec-stamp" aria-hidden>
          {t('verified')}
        </div>
      </header>

      <main className="rec-main">
        <div className="rec-title-band">
          <p className="rec-eyebrow">{t('eyebrow')}</p>
          <h1 className="rec-title">{t('title')}</h1>
          <p className="rec-subtitle">{t('subtitle')}</p>
        </div>

        <section className="rec-grid">
          <article className="rec-card">
            <h2 className="rec-section-title">{t('intern')}</h2>
            <div className="rec-card-body">
              <Row label={t('name')} value={snap.intern.name} />
              <Row label={t('email')} value={snap.intern.email} />
              {snap.intern.university && <Row label={t('university')} value={snap.intern.university} />}
              {snap.intern.fieldOfStudy && (
                <Row label={t('fieldOfStudy')} value={snap.intern.fieldOfStudy} />
              )}
            </div>
          </article>

          <article className="rec-card">
            <h2 className="rec-section-title">{t('organization')}</h2>
            <div className="rec-card-body">
              <Row label={t('name')} value={snap.organization.name} />
              {snap.organization.location && (
                <Row label={t('location')} value={snap.organization.location} />
              )}
              {snap.organization.website && (
                <Row
                  label={t('website')}
                  value={
                    <a
                      href={snap.organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rec-link"
                    >
                      {snap.organization.website}
                    </a>
                  }
                />
              )}
            </div>
          </article>
        </section>

        <section className="rec-card rec-card-wide">
          <h2 className="rec-section-title">{t('internship')}</h2>
          <div className="rec-card-body">
            <Row label={t('title2')} value={snap.internship.title} />
            {snap.internship.sector && <Row label={t('sector')} value={snap.internship.sector} />}
            {snap.internship.duration != null && (
              <Row label={t('duration')} value={`${snap.internship.duration} ${t('weeks')}`} />
            )}
            {(snap.internship.startDate || snap.internship.endDate) && (
              <Row
                label={t('period')}
                value={`${formatDate(snap.internship.startDate, locale)} → ${formatDate(snap.internship.endDate, locale)}`}
              />
            )}
            {snap.internship.description && (
              <p className="rec-description">{snap.internship.description}</p>
            )}
          </div>
        </section>

        <section className="rec-stats">
          <div className="rec-stat">
            <p className="rec-stat-label">{t('statsTasks')}</p>
            <p className="rec-stat-value">
              {snap.taskStats.done} <span>{t('of')} {snap.taskStats.total}</span>
            </p>
          </div>
          <div className="rec-stat rec-stat-positive">
            <p className="rec-stat-label">{t('statsDeliv')}</p>
            <p className="rec-stat-value">
              {approved} <span>{t('of')} {snap.deliverables.length}</span>
            </p>
          </div>
        </section>

        {snap.deliverables.length > 0 && (
          <section className="rec-card rec-card-wide">
            <h2 className="rec-section-title">{t('deliverables')}</h2>
            <ul className="rec-deliv-list">
              {snap.deliverables.map((d, idx) => (
                <li key={idx} className="rec-deliv">
                  <span className="rec-deliv-title">{d.title}</span>
                  <span className={`rec-badge rec-badge-${d.status}`}>{t(`status.${d.status}` as 'status.draft' | 'status.submitted' | 'status.approved' | 'status.revision-requested')}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rec-review">
          <h2 className="rec-section-title">{t('review')}</h2>
          <blockquote className="rec-review-text">{snap.signature.reviewText}</blockquote>
          <div className="rec-signature">
            <div>
              <p className="rec-label">{t('supervisor')}</p>
              <p className="rec-supervisor">{snap.supervisor.name}</p>
              <p className="rec-signed">
                {t('signedOn')} {formatDate(snap.signature.signedAt, locale)}
              </p>
            </div>
            {snap.signature.rating && (
              <div>
                <p className="rec-label">{t('rating')}</p>
                <p className="rec-rating">
                  {'★'.repeat(snap.signature.rating)}
                  <span className="rec-rating-empty">{'★'.repeat(5 - snap.signature.rating)}</span>
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="rec-actions">
          <a className="rec-btn rec-btn-primary" href={`/api/records/${record.id}/pdf`}>
            {t('downloadPdf')}
          </a>
          <CopyLinkButton label={t('shareLink')} copiedLabel={t('linkCopied')} />
        </div>
      </main>

      <footer className="rec-footer">
        <p>
          {t('issuedBy')} <strong>{snap.organization.name}</strong> ·{' '}
          {formatDate(snap.signature.signedAt, locale)}
        </p>
        <p className="rec-verify">{t('verifyBlurb')}</p>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rec-row">
      <span className="rec-label">{label}</span>
      <span className="rec-value">{value}</span>
    </div>
  );
}
