'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Application, Internship, User, Profile } from '@/db/schema';
import { formatDateShort, type FormatLocale } from '@/lib/format-time';
import { Avatar } from '@/components/avatar';
import { StatusPill, toneForApplicationStatus } from '@/components/status-pill';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

const STATUS_OPTIONS: Array<'all' | Application['status']> = [
  'all',
  'new',
  'reviewed',
  'shortlisted',
  'interview',
  'accepted',
  'rejected',
];

type Row = {
  application: Application;
  internship: Internship;
  applicant: User;
  profile: Profile | null;
};

export function InboxClient({ rows, projectId }: { rows: Row[]; projectId: string }) {
  const t = useTranslations('applications');
  const locale = useLocale() as FormatLocale;
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
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div className="inline-flex items-center gap-1 flex-wrap rounded-lg border border-[var(--border-color)] bg-[var(--surface-muted)] p-0.5">
          {STATUS_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              aria-pressed={statusFilter === value}
              className={
                statusFilter === value
                  ? 'rounded-md px-3 py-1 text-sm font-medium bg-brand-50 text-brand-700 transition-colors'
                  : 'rounded-md px-3 py-1 text-sm font-medium text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors'
              }
            >
              {value === 'all' ? t('inbox.filterAll') : t(`status.${value}`)}
            </button>
          ))}
        </div>
        {selected.size >= 2 && (
          <Link
            href={`/company/projects/${projectId}/applications/compare?ids=${Array.from(selected).join(',')}`}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            {t('inbox.compare', { count: selected.size })}
            <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('inbox.empty')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] shadow-[var(--elev-card)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t('inbox.colApplicant')}</TableHead>
                <TableHead>{t('inbox.colInternship')}</TableHead>
                <TableHead>{t('inbox.colApplied')}</TableHead>
                <TableHead>{t('inbox.colStatus')}</TableHead>
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
                      aria-label={t('inbox.selectLabel', { name: `${r.applicant.firstName} ${r.applicant.lastName}` })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={`${r.applicant.firstName} ${r.applicant.lastName}`}
                        email={r.applicant.email}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-[var(--ink)]">
                          {r.applicant.firstName} {r.applicant.lastName}
                        </div>
                        <div className="text-caption text-[var(--ink-3)]">
                          {t('inboxMeta', {
                            university: r.profile?.university ?? '',
                            year: r.profile?.yearOfStudy ?? '',
                          })}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{r.internship.title}</TableCell>
                  <TableCell className="font-mono text-caption text-[var(--ink-3)] whitespace-nowrap">
                    {formatDateShort(new Date(r.application.createdAt), locale)}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={toneForApplicationStatus(r.application.status)}>
                      {t(`status.${r.application.status ?? 'new'}`)}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/company/projects/${projectId}/applications/${r.application.id}`}
                      className="inline-flex items-center gap-1 text-label text-[var(--brand-600)] hover:text-[var(--brand-700)] transition-colors"
                    >
                      {t('inbox.open')}
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
