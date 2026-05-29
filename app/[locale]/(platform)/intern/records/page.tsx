import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight, ExternalLink, Star } from 'lucide-react';
import { requireSession } from '@/modules/auth/session';
import { listRecordsForIntern } from '@/modules/records/queries';

export default async function InternRecordsPage() {
  const session = await requireSession();
  if (session.role !== 'intern' && session.role !== 'admin') redirect('/');

  const [rows, t, locale] = await Promise.all([
    listRecordsForIntern(session.user.id),
    getTranslations('records'),
    getLocale(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-display font-[family-name:var(--font-display)] text-[var(--ink)] mb-2">
        {t('eyebrow')}
      </h1>
      <p className="text-body text-[var(--ink-3)] mb-8">
        {locale === 'fr'
          ? 'Vos attestations de fin de stage. Partagez le lien avec de futurs recruteurs.'
          : 'Your end-of-internship records. Share the link with future employers.'}
      </p>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center">
          <p className="text-[var(--ink-2)] font-medium mb-1">
            {locale === 'fr' ? 'Aucune attestation pour l’instant' : 'No records yet'}
          </p>
          <p className="text-[var(--ink-3)] text-sm mb-4">
            {locale === 'fr'
              ? 'Vous recevrez votre première attestation lorsque votre superviseur validera votre stage.'
              : 'You will receive your first record when a supervisor signs off on your internship.'}
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            {locale === 'fr' ? 'Parcourir les stages' : 'Browse internships'}
            <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className="border border-[var(--border-color)] rounded-lg p-5 bg-[var(--surface)] hover:border-[var(--brand-500)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-eyebrow uppercase text-[var(--brand-700)] font-mono mb-1">
                    {r.snapshot.organization.name}
                  </p>
                  <h2
                    className="text-heading font-[family-name:var(--font-display)] mb-1 truncate"
                    title={r.snapshot.internship.title}
                  >
                    {r.snapshot.internship.title}
                  </h2>
                  <p className="text-caption text-[var(--ink-3)]">
                    {new Date(r.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {r.snapshot.signature.rating && (
                  <div
                    className="flex items-center gap-0.5 text-amber-500 whitespace-nowrap"
                    aria-label={`${r.snapshot.signature.rating}/5`}
                  >
                    {Array.from({ length: r.snapshot.signature.rating }).map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" strokeWidth={0} aria-hidden />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Link
                  href={`/${locale}/records/${r.shareToken}`}
                  className="inline-flex items-center gap-1.5 justify-center h-9 px-3 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
                >
                  {t('shareLink')}
                  <ExternalLink size={14} strokeWidth={2.25} aria-hidden />
                </Link>
                <a
                  href={`/api/records/${r.id}/pdf`}
                  className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium border border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
                >
                  {t('downloadPdf')}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
