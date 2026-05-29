import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { listAdminUsers, getAdminUserStats } from '@/modules/admin/users/queries';
import { getSession } from '@/modules/auth/session';
import { StatusPill } from '@/components/status-pill';
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
      <PageHeader title={t('title')} description={t('subtitle')} className="mb-6" />

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
          className="h-9 px-3 rounded-md text-label font-medium bg-[var(--ink)] text-[var(--surface)]"
        >
          {t('searchSubmit')}
        </button>
      </form>

      <FilterChips
        className="mb-2"
        activeKey={role ?? 'all'}
        items={roleChips.map((c) => ({
          key: c.key,
          label: c.label,
          count: c.count,
          href: chipHref({ role: c.key }),
        }))}
      />

      <FilterChips
        variant="ghost"
        className="mb-6"
        activeKey={status ?? 'all'}
        items={statusChips.map((c) => ({
          key: c.key,
          label: c.label,
          href: chipHref({ status: c.key }),
        }))}
      />

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('empty')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-hidden">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('colUser')}</TableHead>
                <TableHead>{t('colRole')}</TableHead>
                <TableHead>{t('colExtra')}</TableHead>
                <TableHead>{t('colJoined')}</TableHead>
                <TableHead>{t('colStatus')}</TableHead>
                <TableHead>{t('colRoleControl')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-medium text-[var(--ink)] hover:text-[var(--brand-700)] hover:underline"
                    >
                      {(u.firstName ?? '') + ' ' + (u.lastName ?? '') || u.email}
                    </Link>
                    <div className="text-caption text-[var(--ink-3)] break-all">{u.email}</div>
                  </TableCell>
                  <TableCell>
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
                      <span className="text-caption text-[var(--ink-4)]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-caption text-[var(--ink-3)]">
                    {u.role === 'company' && u.orgName
                      ? u.orgName
                      : u.role === 'intern' && u.profile?.university
                        ? u.profile.university
                        : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-caption text-[var(--ink-3)] whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString(
                      locale === 'fr' ? 'fr-FR' : 'en-US',
                    )}
                  </TableCell>
                  <TableCell>
                    {u.suspendedAt ? (
                      <StatusPill tone="danger">{t('statusSuspended')}</StatusPill>
                    ) : (
                      <StatusPill tone="success">{t('statusActive')}</StatusPill>
                    )}
                  </TableCell>
                  <TableCell>
                    <RoleSelect
                      userId={u.id}
                      role={u.role}
                      userLabel={u.email}
                      isSelf={u.id === session?.user.id}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {u.role !== 'admin' && (
                      <ToggleSuspendButton
                        userId={u.id}
                        isSuspended={Boolean(u.suspendedAt)}
                        userLabel={u.email}
                      />
                    )}
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
