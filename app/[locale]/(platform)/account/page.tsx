import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { requireSession } from '@/modules/auth/session';
import { db } from '@/db';
import { profiles, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DeleteAccountSection } from './delete-account-section';

export default async function Page() {
  const session = await requireSession();
  const t = await getTranslations('account');
  const locale = await getLocale();

  const [profileRow] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1);
  const [orgRow] = session.role === 'company'
    ? await db.select().from(organizations).where(eq(organizations.ownerId, session.user.id)).limit(1)
    : [null];

  const editProfileHref =
    session.role === 'intern'
      ? '/account/edit'
      : session.role === 'company'
        ? '/onboarding/company'
        : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[var(--ink-3)] mb-10">{t('subtitle')}</p>

      <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-6 mb-4">
        <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
          {t('identity')}
        </h2>
        <div className="space-y-2 text-[14px]">
          <Row label={t('email')} value={session.user.email} />
          <Row
            label={t('name')}
            value={
              `${session.user.firstName ?? ''} ${session.user.lastName ?? ''}`.trim() ||
              t('notSet')
            }
          />
          <Row label={t('role')} value={t(`roles.${session.role}` as const)} />
          <Row
            label={t('memberSince')}
            value={new Date(session.user.createdAt).toLocaleDateString(
              locale === 'fr' ? 'fr-FR' : 'en-US',
              { day: '2-digit', month: 'long', year: 'numeric' },
            )}
          />
        </div>
        <p className="text-[12px] text-[var(--ink-3)] mt-4">{t('clerkNote')}</p>
      </section>

      {session.role === 'intern' && profileRow && (
        <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)]">
              {t('profile')}
            </h2>
            {editProfileHref && (
              <Link
                href={editProfileHref}
                className="text-[13px] text-[var(--brand-700)] hover:underline"
              >
                {t('edit')}
              </Link>
            )}
          </div>
          <div className="space-y-2 text-[14px]">
            <Row label={t('university')} value={profileRow.university ?? t('notSet')} />
            <Row label={t('fieldOfStudy')} value={profileRow.fieldOfStudy ?? t('notSet')} />
            <Row label={t('city')} value={profileRow.city ?? t('notSet')} />
            <Row label={t('language')} value={profileRow.preferredLanguage?.toUpperCase() ?? t('notSet')} />
          </div>
        </section>
      )}

      {session.role === 'company' && orgRow && (
        <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)]">
              {t('organization')}
            </h2>
            {editProfileHref && (
              <Link
                href={editProfileHref}
                className="text-[13px] text-[var(--brand-700)] hover:underline"
              >
                {t('edit')}
              </Link>
            )}
          </div>
          <div className="space-y-2 text-[14px]">
            <Row label={t('orgName')} value={orgRow.name} />
            <Row label={t('industry')} value={orgRow.industry ?? t('notSet')} />
            <Row label={t('city')} value={orgRow.city ?? orgRow.country ?? t('notSet')} />
            <Row
              label={t('verificationStatus')}
              value={t(`verification.${orgRow.verificationStatus}` as const)}
            />
          </div>
        </section>
      )}

      <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-6 mb-4">
        <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
          {t('dataAndPrivacy')}
        </h2>
        <p className="text-[13px] text-[var(--ink-3)] mb-4">{t('dataIntro')}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/account/export"
            className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium border border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
            download
          >
            {t('exportData')}
          </a>
          <Link
            href={`/${locale}/privacy`}
            className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            {t('readPrivacy')} →
          </Link>
        </div>
      </section>

      <DeleteAccountSection email={session.user.email} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-[var(--border-color)] pb-1 last:border-b-0">
      <span className="text-[12px] uppercase tracking-wider text-[var(--ink-3)]">{label}</span>
      <span className="text-[var(--ink)] text-right">{value}</span>
    </div>
  );
}
