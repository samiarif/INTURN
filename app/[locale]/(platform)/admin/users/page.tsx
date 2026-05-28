import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { listAdminUsers, getAdminUserStats } from '@/modules/admin/users/queries';
import { getSession } from '@/modules/auth/session';
import { StatusPill } from '@/components/status-pill';
import { ToggleSuspendButton } from './toggle-suspend-button';
import { RoleSelect } from './role-select';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const role = sp.role as 'intern' | 'company' | 'admin' | undefined;
  const status = sp.status as 'active' | 'suspended' | undefined;
  const search = sp.q?.trim();

  const [rows, stats, t, locale, session] = await Promise.all([
    listAdminUsers(100, {
      role: role && ['intern', 'company', 'admin'].includes(role) ? role : undefined,
      suspended: status === 'active' || status === 'suspended' ? status : undefined,
      search,
    }),
    getAdminUserStats(),
    getTranslations('admin.users'),
    getLocale(),
    getSession(),
  ]);

  const roleChips: Array<{ key: 'all' | 'intern' | 'company' | 'admin'; label: string; count?: number }> = [
    { key: 'all', label: t('roleAll'), count: stats.total },
    { key: 'intern', label: t('roleIntern'), count: stats.byRole.intern },
    { key: 'company', label: t('roleCompany'), count: stats.byRole.company },
    { key: 'admin', label: t('roleAdmin'), count: stats.byRole.admin },
  ];

  const statusChips: Array<{ key: 'all' | 'active' | 'suspended'; label: string }> = [
    { key: 'all', label: t('statusAny') },
    { key: 'active', label: t('statusActive') },
    { key: 'suspended', label: t('statusSuspended') + ` (${stats.suspended})` },
  ];

  function chipHref(next: Partial<{ role: string; status: string; q: string }>): string {
    const sp = new URLSearchParams();
    const r = next.role ?? role;
    const s = next.status ?? status;
    const q = next.q ?? search;
    if (r && r !== 'all') sp.set('role', r);
    if (s && s !== 'all') sp.set('status', s);
    if (q) sp.set('q', q);
    const qs = sp.toString();
    return `/admin/users${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-6">{t('subtitle')}</p>

      <form action="/admin/users" method="get" className="mb-4 flex items-center gap-2">
        {role && <input type="hidden" name="role" value={role} />}
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder={t('searchPlaceholder')}
          className="flex-1 max-w-md h-9 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
        />
        <button
          type="submit"
          className="h-9 px-3 rounded-md text-sm font-medium bg-[var(--ink)] text-white"
        >
          {t('searchSubmit')}
        </button>
      </form>

      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {roleChips.map((c) => (
          <Link
            key={c.key}
            href={chipHref({ role: c.key })}
            className={
              (role ?? 'all') === c.key
                ? 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--ink)] text-white inline-flex items-center gap-1.5'
                : 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)] inline-flex items-center gap-1.5'
            }
          >
            {c.label}
            {c.count !== undefined && (
              <span className="text-[11px] font-mono opacity-75">{c.count}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {statusChips.map((c) => (
          <Link
            key={c.key}
            href={chipHref({ status: c.key })}
            className={
              (status ?? 'all') === c.key
                ? 'px-3 py-1.5 rounded-full text-[12px] font-medium bg-[var(--ink-2)] text-white'
                : 'px-3 py-1.5 rounded-full text-[12px] font-medium bg-transparent text-[var(--ink-3)] hover:text-[var(--ink)]'
            }
          >
            {c.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('empty')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-md overflow-x-auto bg-[var(--surface)]">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-[var(--surface-muted)] text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('colUser')}</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('colRole')}</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('colExtra')}</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('colJoined')}</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('colStatus')}</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">{t('colRoleControl')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-medium hover:text-[var(--brand-700)] hover:underline"
                    >
                      {(u.firstName ?? '') + ' ' + (u.lastName ?? '') || u.email}
                    </Link>
                    <div className="text-[12px] text-[var(--ink-3)] break-all">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role ? (
                      <StatusPill
                        tone={
                          u.role === 'admin' ? 'info' : u.role === 'company' ? 'warn' : 'neutral'
                        }
                      >
                        {t(`role${u.role.charAt(0).toUpperCase() + u.role.slice(1)}` as
                          | 'roleIntern' | 'roleCompany' | 'roleAdmin')}
                      </StatusPill>
                    ) : (
                      <span className="text-[var(--ink-4)] text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--ink-3)]">
                    {u.role === 'company' && u.orgName
                      ? u.orgName
                      : u.role === 'intern' && u.profile?.university
                        ? u.profile.university
                        : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[var(--ink-3)] whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString(
                      locale === 'fr' ? 'fr-FR' : 'en-US',
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.suspendedAt ? (
                      <StatusPill tone="danger">{t('statusSuspended')}</StatusPill>
                    ) : (
                      <StatusPill tone="success">{t('statusActive')}</StatusPill>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelect
                      userId={u.id}
                      role={u.role}
                      userLabel={u.email}
                      isSelf={u.id === session?.user.id}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'admin' && (
                      <ToggleSuspendButton
                        userId={u.id}
                        isSuspended={Boolean(u.suspendedAt)}
                        userLabel={u.email}
                      />
                    )}
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
