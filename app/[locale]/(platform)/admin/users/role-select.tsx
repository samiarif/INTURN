'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setUserRoleAction, type Role } from '@/modules/admin/users/server-actions';

const ROLES: Role[] = ['intern', 'company', 'admin'];

/**
 * Per-user role control. Renders a <select> of intern | company | admin.
 * Disabled on the admin's own row (self-lockout guard — also enforced
 * server-side). Confirms before applying any change.
 */
export function RoleSelect({
  userId,
  role,
  userLabel,
  isSelf,
}: {
  userId: string;
  role: Role | null;
  userLabel: string;
  isSelf: boolean;
}) {
  const t = useTranslations('admin.users');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<Role>(role ?? 'intern');

  function onChange(next: Role) {
    if (next === value) return;
    const confirmMsg = t('roleChangeConfirm', {
      email: userLabel,
      from: t(roleKey(value)),
      to: t(roleKey(next)),
    });
    if (!window.confirm(confirmMsg)) return;
    const prev = value;
    setValue(next);
    startTransition(async () => {
      try {
        await setUserRoleAction({ userId, role: next });
        router.refresh();
      } catch (e) {
        setValue(prev);
        const msg = e instanceof Error ? e.message : 'failed';
        window.alert(msg);
      }
    });
  }

  if (isSelf) {
    return (
      <span className="text-caption text-[var(--ink-4)] italic" title={t('roleSelfHint')}>
        {t('roleSelf')}
      </span>
    );
  }

  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="sr-only">{t('roleControlLabel', { email: userLabel })}</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as Role)}
        className="h-8 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[13px] disabled:opacity-60"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {t(roleKey(r))}
          </option>
        ))}
      </select>
    </label>
  );
}

function roleKey(r: Role): 'roleSingularIntern' | 'roleSingularCompany' | 'roleSingularAdmin' {
  return r === 'admin'
    ? 'roleSingularAdmin'
    : r === 'company'
      ? 'roleSingularCompany'
      : 'roleSingularIntern';
}
