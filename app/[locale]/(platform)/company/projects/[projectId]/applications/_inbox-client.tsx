'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Application, Internship, User, Profile } from '@/db/schema';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

const STATUS_OPTIONS: Array<{ value: 'all' | Application['status']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-[var(--status-info-bg)] text-[var(--status-info-ink)]',
  reviewed: 'bg-[var(--surface-muted)] text-[var(--ink-2)]',
  shortlisted: 'bg-[var(--brand-50)] text-[var(--brand-600)]',
  interview: 'bg-[var(--status-warn-bg)] text-[var(--status-warn-ink)]',
  accepted: 'bg-[var(--status-success-bg)] text-[var(--status-success-ink)]',
  rejected: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-ink)]',
};

type Row = {
  application: Application;
  internship: Internship;
  applicant: User;
  profile: Profile | null;
};

export function InboxClient({ rows, projectId }: { rows: Row[]; projectId: string }) {
  const [statusFilter, setStatusFilter] = useState<'all' | Application['status']>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = statusFilter === 'all' ? rows : rows.filter((r) => r.application.status === statusFilter);

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 4) next.add(id);
    setSelected(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={
                statusFilter === opt.value
                  ? 'px-3 py-1.5 rounded-full text-label bg-[var(--ink)] text-white'
                  : 'px-3 py-1.5 rounded-full text-label bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]'
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        {selected.size >= 2 && (
          <Link
            href={`/company/projects/${projectId}/applications/compare?ids=${Array.from(selected).join(',')}`}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            Compare {selected.size}
            <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          No applications match.
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Applicant</TableHead>
                <TableHead>Internship</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.application.id}
                  data-state={selected.has(r.application.id) ? 'selected' : undefined}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(r.application.id)}
                      disabled={!selected.has(r.application.id) && selected.size >= 4}
                      onChange={() => toggleSelect(r.application.id)}
                      aria-label={`Select ${r.applicant.firstName} ${r.applicant.lastName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-[var(--ink)]">
                      {r.applicant.firstName} {r.applicant.lastName}
                    </div>
                    <div className="text-caption text-[var(--ink-3)]">
                      {r.profile?.university ?? ''} · {r.profile?.yearOfStudy ?? ''}
                    </div>
                  </TableCell>
                  <TableCell>{r.internship.title}</TableCell>
                  <TableCell className="font-mono text-caption text-[var(--ink-3)] whitespace-nowrap">
                    {new Date(r.application.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[r.application.status ?? 'new']}`}>
                      {r.application.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/company/projects/${projectId}/applications/${r.application.id}`}
                      className="inline-flex items-center gap-1 text-[var(--brand-600)] hover:text-[var(--brand-700)]"
                    >
                      Open
                      <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
                    </Link>
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
