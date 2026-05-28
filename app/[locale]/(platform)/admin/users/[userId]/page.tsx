import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getUserDetail } from '@/modules/admin/queries';
import { getSession } from '@/modules/auth/session';
import {
  StatusPill,
  toneForApplicationStatus,
  toneForVerificationStatus,
} from '@/components/status-pill';
import { ToggleSuspendButton } from '../toggle-suspend-button';
import { RoleSelect } from '../role-select';
import type { Role } from '@/modules/admin/users/server-actions';

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const [detail, session, t, locale] = await Promise.all([
    getUserDetail(userId),
    getSession(),
    getTranslations('admin.users'),
    getLocale(),
  ]);

  if (!detail) notFound();

  const { user, profile, organization, applications, workspaces } = detail;
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
  const dateFmt = (d: Date | string) =>
    new Date(d).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US');
  const isSelf = user.id === session?.user.id;

  const roleTone =
    user.role === 'admin' ? 'info' : user.role === 'company' ? 'warn' : 'neutral';
  const roleLabelKey =
    user.role === 'admin'
      ? 'roleSingularAdmin'
      : user.role === 'company'
        ? 'roleSingularCompany'
        : 'roleSingularIntern';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 md:p-8">
      <Link
        href="/admin/users"
        className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)] mb-4 inline-block"
      >
        {t('detailBack')}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">{fullName}</h1>
          <p className="text-[14px] text-[var(--ink-3)] break-all">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            {user.role && <StatusPill tone={roleTone}>{t(roleLabelKey)}</StatusPill>}
            {user.suspendedAt ? (
              <StatusPill tone="danger">{t('statusSuspended')}</StatusPill>
            ) : (
              <StatusPill tone="success">{t('statusActive')}</StatusPill>
            )}
          </div>
        </div>
      </div>

      {/* Admin actions: reuse M5/M6 controls */}
      <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5 mb-4">
        <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
          {t('detailActions')}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <RoleSelect
            userId={user.id}
            role={(user.role as Role | null) ?? null}
            userLabel={user.email}
            isSelf={isSelf}
          />
          {user.role !== 'admin' && (
            <ToggleSuspendButton
              userId={user.id}
              isSuspended={Boolean(user.suspendedAt)}
              userLabel={user.email}
            />
          )}
        </div>
      </section>

      {/* Profile (interns) */}
      {user.role === 'intern' && (
        <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5 mb-4">
          <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
            {t('detailProfile')}
          </h2>
          {profile ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[14px]">
              {profile.headline && (
                <DetailRow label={t('detailHeadline')} value={profile.headline} />
              )}
              {profile.university && (
                <DetailRow label={t('detailUniversity')} value={profile.university} />
              )}
              {profile.fieldOfStudy && (
                <DetailRow label={t('detailField')} value={profile.fieldOfStudy} />
              )}
              {profile.city && <DetailRow label={t('detailCity')} value={profile.city} />}
              {profile.skills && profile.skills.length > 0 && (
                <DetailRow label={t('detailSkills')} value={profile.skills.join(', ')} />
              )}
            </dl>
          ) : (
            <p className="text-[13px] text-[var(--ink-3)]">{t('detailNoProfile')}</p>
          )}
        </section>
      )}

      {/* Organization (companies) */}
      {user.role === 'company' && (
        <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5 mb-4">
          <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
            {t('detailOrg')}
          </h2>
          {organization ? (
            <div>
              <Link
                href={`/admin/verifications/${organization.id}`}
                className="font-semibold hover:text-[var(--brand-700)] hover:underline"
              >
                {organization.name}
              </Link>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[14px] mt-2">
                <div className="flex gap-2 items-center">
                  <dt className="text-[var(--ink-3)] text-[13px]">{t('detailOrgStatus')}</dt>
                  <dd>
                    <StatusPill tone={toneForVerificationStatus(organization.verificationStatus)}>
                      {organization.verificationStatus}
                    </StatusPill>
                  </dd>
                </div>
                {organization.industry && (
                  <DetailRow label={t('detailOrgIndustry')} value={organization.industry} />
                )}
                {organization.city && (
                  <DetailRow label={t('detailCity')} value={organization.city} />
                )}
              </dl>
            </div>
          ) : (
            <p className="text-[13px] text-[var(--ink-3)]">{t('detailNoOrg')}</p>
          )}
        </section>
      )}

      {/* Applications */}
      <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5 mb-4">
        <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
          {t('detailApplications')}
        </h2>
        {applications.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-3)]">{t('detailNoApplications')}</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[var(--ink-3)] border-b border-[var(--border-color)]">
                <th className="py-2 font-medium uppercase tracking-wider text-[11px]">
                  {t('detailColInternship')}
                </th>
                <th className="py-2 font-medium uppercase tracking-wider text-[11px]">
                  {t('detailColStatus')}
                </th>
                <th className="py-2 font-medium uppercase tracking-wider text-[11px]">
                  {t('detailColDate')}
                </th>
              </tr>
            </thead>
            <tbody>
              {applications.map(({ application, internship }) => (
                <tr key={application.id} className="border-b border-[var(--border-color)] last:border-b-0">
                  <td className="py-2 pr-3">
                    {internship ? (
                      <Link
                        href={`/internships/${internship.id}`}
                        className="hover:text-[var(--brand-700)] hover:underline"
                      >
                        {internship.title}
                      </Link>
                    ) : (
                      <span className="text-[var(--ink-4)]">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <StatusPill tone={toneForApplicationStatus(application.status)}>
                      {application.status ?? 'new'}
                    </StatusPill>
                  </td>
                  <td className="py-2 text-[var(--ink-3)] font-mono text-[12px] whitespace-nowrap">
                    {dateFmt(application.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Workspaces */}
      <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5">
        <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
          {t('detailWorkspaces')}
        </h2>
        {workspaces.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-3)]">{t('detailNoWorkspaces')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {workspaces.map(({ workspace, internship }) => (
              <li
                key={workspace.id}
                className="flex items-center justify-between gap-3 text-[14px] border-b border-[var(--border-color)] last:border-b-0 pb-2 last:pb-0"
              >
                <span className="font-medium">{internship?.title ?? '—'}</span>
                <span className="flex items-center gap-2">
                  <StatusPill
                    tone={
                      workspace.status === 'completed'
                        ? 'success'
                        : workspace.status === 'cancelled'
                          ? 'danger'
                          : 'info'
                    }
                  >
                    {workspace.status ?? 'active'}
                  </StatusPill>
                  <span className="text-[12px] text-[var(--ink-3)] font-mono whitespace-nowrap">
                    {dateFmt(workspace.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-[var(--ink-3)] text-[13px] min-w-[110px]">{label}</dt>
      <dd className="text-[var(--ink)]">{value}</dd>
    </div>
  );
}
