'use client';

// TeamClient — the interactive shell for the Team page. Owns the filter pills
// (All / Admins / Supervisors / Interns), the name/email search box, and the
// list/grid toggle. Staff rows and intern rows are derived from props and the
// current filter; the "Add Member" trigger only renders for org managers.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, List as ListIcon, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { canManageOrg } from '@/modules/team/authz';
import type { MemberRole } from '@/db/schema';
import type { OrgIntern } from '@/modules/team/queries';
import { cn } from '@/lib/utils';
import { MemberRow } from './member-row';
import { InternRow } from './intern-row';
import { AddMemberModal } from './add-member-modal';
import type { TeamMember, ProjectLite } from './types';
import { teamStrings } from './strings';

type Filter = 'all' | 'admin' | 'supervisor' | 'intern';
type View = 'list' | 'grid';

function memberDisplayName(m: TeamMember): string {
  return [m.firstName, m.lastName].filter(Boolean).join(' ').trim() || m.email;
}

function internDisplayName(i: OrgIntern): string {
  return [i.firstName, i.lastName].filter(Boolean).join(' ').trim() || i.email;
}

export function TeamClient({
  members,
  interns,
  projects,
  currentUserId,
  role,
  orgId,
  locale,
}: {
  members: TeamMember[];
  interns: OrgIntern[];
  projects: ProjectLite[];
  currentUserId: string;
  role: MemberRole;
  orgId: string;
  locale: string;
}) {
  const t = teamStrings(locale);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('list');

  const canManage = canManageOrg(role);

  // userId -> display name, so an intern's supervisorIds resolve to staff names.
  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.userId) map.set(m.userId, memberDisplayName(m));
    }
    return map;
  }, [members]);

  const q = query.trim().toLowerCase();

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (!q) return true;
      return (
        memberDisplayName(m).toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    });
  }, [members, q]);

  const filteredInterns = useMemo(() => {
    return interns.filter((i) => {
      if (!q) return true;
      return (
        internDisplayName(i).toLowerCase().includes(q) || i.email.toLowerCase().includes(q)
      );
    });
  }, [interns, q]);

  const adminMembers = filteredMembers.filter((m) => m.role === 'admin');
  const supervisorMembers = filteredMembers.filter((m) => m.role === 'supervisor');

  const pills: { key: Filter; label: string }[] = [
    { key: 'all', label: t.pillAll },
    { key: 'admin', label: t.pillAdmin },
    { key: 'supervisor', label: t.pillSupervisor },
    { key: 'intern', label: t.pillIntern },
  ];

  function supervisorNamesFor(intern: OrgIntern): string[] {
    return (intern.supervisorIds ?? [])
      .map((id) => memberNameById.get(id))
      .filter((n): n is string => !!n);
  }

  function renderStaff(rows: TeamMember[]) {
    if (rows.length === 0) {
      return <EmptyState message={t.noStaff} />;
    }
    return (
      <div className={cn(view === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'flex flex-col')}>
        {rows.map((m) => (
          <div
            key={m.id}
            className={cn(
              view === 'grid'
                ? 'rounded-xl border border-border bg-card'
                : 'border-b border-border last:border-b-0',
            )}
          >
            <MemberRow
              member={m}
              currentUserId={currentUserId}
              orgId={orgId}
              projects={projects}
              locale={locale}
            />
          </div>
        ))}
      </div>
    );
  }

  function renderInterns(rows: OrgIntern[]) {
    if (rows.length === 0) {
      return (
        <EmptyState message={t.noInterns}>
          <Link href="/company/projects" className="text-sm font-medium text-primary hover:underline">
            {t.goToProjects}
          </Link>
        </EmptyState>
      );
    }
    return (
      <div className={cn(view === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'flex flex-col')}>
        {rows.map((i) => (
          <div
            key={i.workspaceId}
            className={cn(
              view === 'grid'
                ? 'rounded-xl border border-border bg-card'
                : 'border-b border-border last:border-b-0',
            )}
          >
            <InternRow intern={i} supervisorNames={supervisorNamesFor(i)} locale={locale} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: filter pills · search · view toggle · add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
          {pills.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setFilter(p.key)}
              aria-pressed={filter === p.key}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                filter === p.key
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={15}
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className="w-full pl-8 sm:w-64"
            />
          </div>

          <div className="inline-flex items-center rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              aria-label={t.viewList}
              className={cn(
                'inline-flex size-7 items-center justify-center rounded-md',
                view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ListIcon size={15} strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setView('grid')}
              aria-pressed={view === 'grid'}
              aria-label={t.viewGrid}
              className={cn(
                'inline-flex size-7 items-center justify-center rounded-md',
                view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid size={15} strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          {canManage ? (
            <AddMemberModal orgId={orgId} projects={projects} locale={locale} />
          ) : null}
        </div>
      </div>

      {/* Body, keyed off the active filter. */}
      {filter === 'all' ? (
        <div className="flex flex-col gap-6">
          <Section title={t.sectionStaff} count={filteredMembers.length} countLabel={t.membersCount}>
            {renderStaff(filteredMembers)}
          </Section>
          <Section title={t.sectionInterns} count={filteredInterns.length} countLabel={t.internsCount}>
            {renderInterns(filteredInterns)}
          </Section>
        </div>
      ) : filter === 'admin' ? (
        <Section title={t.pillAdmin} count={adminMembers.length} countLabel={t.membersCount}>
          {renderStaff(adminMembers)}
        </Section>
      ) : filter === 'supervisor' ? (
        <Section title={t.pillSupervisor} count={supervisorMembers.length} countLabel={t.membersCount}>
          {renderStaff(supervisorMembers)}
        </Section>
      ) : (
        <Section title={t.pillIntern} count={filteredInterns.length} countLabel={t.internsCount}>
          {renderInterns(filteredInterns)}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  countLabel,
  children,
}: {
  title: string;
  count: number;
  countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
        {title}
        <span className="text-xs font-normal text-muted-foreground">
          {count} {countLabel}
        </span>
      </h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">{children}</div>
    </section>
  );
}

function EmptyState({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {children}
    </div>
  );
}
