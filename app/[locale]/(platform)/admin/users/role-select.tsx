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
  // Accept the full users.role union (includes 'university' for coordinators)
  // but only expose intern|company|admin as selectable options. A 'university'
  // coordinator's row shows the closest selectable default ('intern') in the
  // dropdown, but they can't be accidentally demoted — the admin UI disables
  // self-edits and the server action guards the transition.
  role: Role | 'university' | null;
  userLabel: string;
  isSelf: boolean;
}) {
  const t = useTranslations('admin.users');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Non-selectable roles (university) fall back to 'intern' as the display default.
  const [value, setValue] = useState<Role>(
    role === 'intern' || role === 'company' || role === 'admin' ? role : 'intern',
  );

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
      } catch {
        setValue(prev);
        // setUserRoleAction only throws shouldn't-happen guards (self-edit,
        // invalid role, coordinator-protected) the UI already prevents → generic.
        window.alert(t('errorGeneric'));
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
