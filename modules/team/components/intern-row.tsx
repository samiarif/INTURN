// InternRow — one active intern in the roster. Read-only: avatar + identity,
// a meta line (internship · project), the supervising staff, an "Active" pill,
// and a link into the intern's workspace. No hooks, so it renders inside the
// client TeamClient without needing its own `'use client'`.
//
// TODO(team): wire end-internship once a server action exists (the only
// workspace server action today is scheduleCheckInAction; there's no safe
// end/complete action to call from here yet).
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { OrgIntern } from '@/modules/team/queries';
import { teamStrings } from './strings';

function internInitials(intern: OrgIntern): string {
  const first = intern.firstName?.trim()?.[0] ?? '';
  const last = intern.lastName?.trim()?.[0] ?? '';
  const fromName = (first + last).toUpperCase();
  if (fromName) return fromName;
  return intern.email.slice(0, 2).toUpperCase();
}

function internName(intern: OrgIntern): string {
  const full = [intern.firstName, intern.lastName].filter(Boolean).join(' ').trim();
  return full || intern.email;
}

export function InternRow({
  intern,
  supervisorNames,
  locale,
}: {
  intern: OrgIntern;
  supervisorNames: string[];
  locale: string;
}) {
  const t = teamStrings(locale);
  const name = internName(intern);
  const meta = intern.projectName
    ? `${intern.internshipTitle} · ${intern.projectName}`
    : intern.internshipTitle;
  const supervisorLine =
    supervisorNames.length > 0 ? `${t.supervisedBy} ${supervisorNames.join(', ')}` : t.noSupervisors;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar size="sm">
        {intern.imageUrl ? <AvatarImage src={intern.imageUrl} alt={name} /> : null}
        <AvatarFallback>{internInitials(intern)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            {t.statusActive}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
        <p className="truncate text-xs text-muted-foreground">{supervisorLine}</p>
      </div>

      <Link
        href={`/company/workspaces/${intern.workspaceId}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-muted"
      >
        <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
        {t.openWorkspace}
      </Link>
    </div>
  );
}
