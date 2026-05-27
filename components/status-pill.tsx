import type { ReactNode } from 'react';

/**
 * Shared status pill — used for application status, internship status,
 * verification status, report status, deliverable status, etc.
 *
 * Uses CSS variables (`--status-*-bg` / `--status-*-ink`) so dark mode
 * works automatically. Replaces the per-page STATUS_STYLE color hash
 * tables that were duplicated across ~6 files.
 *
 * Semantic tones:
 *   neutral  — draft, archived, generic
 *   info     — reviewed, in-progress, submitted
 *   warn     — pending, interview, shortlisted, revision-requested
 *   success  — verified, accepted, approved, resolved
 *   danger   — rejected, suspended, closed, open (a report)
 */
export type StatusTone = 'neutral' | 'info' | 'warn' | 'success' | 'danger';

const TONE_STYLE: Record<StatusTone, string> = {
  neutral: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-ink)]',
  info: 'bg-[var(--status-info-bg)] text-[var(--status-info-ink)]',
  warn: 'bg-[var(--status-warn-bg)] text-[var(--status-warn-ink)]',
  success: 'bg-[var(--status-success-bg)] text-[var(--status-success-ink)]',
  danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-ink)]',
};

const SIZE_STYLE = {
  xs: 'text-[10px] px-2 py-0.5',
  sm: 'text-[11px] px-2 py-0.5',
  md: 'text-[12px] px-2.5 py-1',
} as const;

export function StatusPill({
  tone,
  size = 'sm',
  uppercase = true,
  mono = true,
  children,
}: {
  tone: StatusTone;
  size?: keyof typeof SIZE_STYLE;
  uppercase?: boolean;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={
        'inline-flex items-center font-medium rounded ' +
        TONE_STYLE[tone] +
        ' ' +
        SIZE_STYLE[size] +
        (uppercase ? ' uppercase tracking-wider' : '') +
        (mono ? ' font-mono' : '')
      }
    >
      {children}
    </span>
  );
}

/**
 * Map of common status strings to their tone — keeps individual pages
 * from repeating the same tone table.
 */
export function toneForApplicationStatus(s: string | null | undefined): StatusTone {
  switch (s) {
    case 'rejected':
      return 'danger';
    case 'accepted':
      return 'success';
    case 'shortlisted':
    case 'interview':
      return 'warn';
    case 'reviewed':
      return 'info';
    default:
      return 'neutral';
  }
}

export function toneForVerificationStatus(s: string | null | undefined): StatusTone {
  switch (s) {
    case 'verified':
      return 'success';
    case 'pending':
    case 'draft':
      return 'warn';
    case 'suspended':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function toneForReportStatus(s: string | null | undefined): StatusTone {
  switch (s) {
    case 'open':
      return 'danger';
    case 'reviewed':
      return 'warn';
    case 'resolved':
      return 'success';
    default:
      return 'neutral';
  }
}

export function toneForDeliverableStatus(s: string | null | undefined): StatusTone {
  switch (s) {
    case 'approved':
      return 'success';
    case 'submitted':
      return 'info';
    case 'revision-requested':
      return 'warn';
    default:
      return 'neutral';
  }
}
