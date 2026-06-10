// RolePill — a tiny rounded-full badge for an org member's role, with an
// optional "pending invite" chip. No hooks, so it renders fine in both
// server and client components.
import { Crown } from 'lucide-react';
import type { MemberRole } from '@/db/schema';
import { cn } from '@/lib/utils';
import { teamStrings } from './strings';

// Mirrors the shared <StatusPill> look (components/status-pill.tsx): flat
// rounded chip, mono uppercase 11px, token-driven tints that flip in dark mode.
const PILL_BASE =
  'inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider';

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

  // Owner/admin read as brand (they run the org); supervisor is neutral chrome.
  const roleClasses =
    role === 'supervisor'
      ? 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-ink)]'
      : 'bg-brand-50 text-brand-700';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(PILL_BASE, roleClasses)}>
        {role === 'owner' ? <Crown size={12} strokeWidth={1.75} aria-hidden /> : null}
        {label}
      </span>
      {pending ? (
        <span className={cn(PILL_BASE, 'bg-[var(--status-warn-bg)] text-[var(--status-warn-ink)]')}>
          {t.pendingInvite}
        </span>
      ) : null}
    </span>
  );
}
