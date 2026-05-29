// RolePill — a tiny rounded-full badge for an org member's role, with an
// optional "pending invite" chip. No hooks, so it renders fine in both
// server and client components.
import { Crown } from 'lucide-react';
import type { MemberRole } from '@/db/schema';
import { cn } from '@/lib/utils';
import { teamStrings } from './strings';

const PILL_BASE =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

export function RolePill({
  role,
  locale,
  pending = false,
}: {
  role: MemberRole;
  locale: string;
  pending?: boolean;
}) {
  const t = teamStrings(locale);

  const label =
    role === 'owner' ? t.roleOwner : role === 'admin' ? t.roleAdmin : t.roleSupervisor;

  const roleClasses =
    role === 'owner'
      ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100'
      : role === 'admin'
        ? 'bg-muted text-foreground'
        : 'bg-muted text-muted-foreground';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(PILL_BASE, roleClasses)}>
        {role === 'owner' ? <Crown size={12} strokeWidth={1.75} aria-hidden /> : null}
        {label}
      </span>
      {pending ? (
        <span className={cn(PILL_BASE, 'bg-warning/10 text-warning')}>{t.pendingInvite}</span>
      ) : null}
    </span>
  );
}
