'use client';

// WorkspaceSwitcher — the intern crumb in the supervisor topbar. The trigger
// shows the CURRENT intern's name + a chevron; opening lists every sibling
// workspace under the same project so a supervisor can hop between interns
// without backing out to the command center.
//
// Supervisor-only by construction (the layout never renders this for interns —
// an intern must never navigate into a teammate's workspace).
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SiblingWorkspace } from '../queries';

export function WorkspaceSwitcher({
  currentWorkspaceId,
  siblings,
  locale,
}: {
  currentWorkspaceId: string;
  siblings: SiblingWorkspace[];
  locale: string;
}) {
  const t = useTranslations('workspace.switcher');
  const [open, setOpen] = useState(false);

  const current = siblings.find((s) => s.workspaceId === currentWorkspaceId);
  const currentName = current?.internName ?? '—';

  // `localePrefix: 'as-needed'` — French (default) has no prefix, English is
  // /en. Mirrors CommandCenterFilter's hrefFor.
  const hrefFor = (workspaceId: string) =>
    locale === 'en'
      ? `/en/company/workspaces/${workspaceId}`
      : `/company/workspaces/${workspaceId}`;

  // Nothing to switch between → render the name as a plain bold crumb.
  if (siblings.length <= 1) {
    return <b>{currentName}</b>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={t('switchLabel')}
            className="ws-tb-switcher-trigger"
          />
        }
      >
        <b>{currentName}</b>
        <ChevronDown size={13} strokeWidth={2} aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-0.5 p-1">
        {siblings.map((s) => {
          const isCurrent = s.workspaceId === currentWorkspaceId;
          return (
            <Link
              key={s.workspaceId}
              href={hrefFor(s.workspaceId)}
              onClick={() => setOpen(false)}
              aria-current={isCurrent ? 'true' : undefined}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted aria-[current]:font-medium"
            >
              <Check
                size={14}
                strokeWidth={2}
                className={isCurrent ? 'opacity-100' : 'opacity-0'}
                aria-hidden
              />
              <span className="truncate">{s.internName}</span>
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
