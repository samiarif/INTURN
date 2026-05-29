// Company Workspaces index (M4) — every active/completed internship workspace
// across the organisations this company user owns. Until now a workspace was
// only reachable from a project-detail link; this is the flat list.
//
// Server component, no client state. Visual style follows the company projects
// index (app/[locale]/(platform)/company/projects/page.tsx) — same .pi-* shell
// tokens — so the two company index screens read as a set.
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { listCompanyWorkspaces } from '@/modules/workspace/queries';

function formatDate(d: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function internName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(' ').trim();
}

/** Two-letter mark from the intern's name. "Sami Ben" → "SB". */
function initialsOf(first: string | null, last: string | null): string {
  const a = (first ?? '').trim()[0] ?? '';
  const b = (last ?? '').trim()[0] ?? '';
  return (a + b).toUpperCase() || '·';
}

const STATUS_PILL: Record<string, string> = {
  active: 'bg-[var(--status-success-bg)] text-[var(--status-success-ink)] border-[color-mix(in_srgb,var(--status-success-ink)_28%,transparent)]',
  completed: 'bg-[var(--surface-muted)] text-[var(--ink-3)] border-[var(--border-color)]',
  cancelled: 'bg-[var(--surface-muted)] text-[var(--ink-4)] border-[var(--border-color)]',
};

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.role !== 'company' && session.role !== 'admin') {
    redirect(`/${session.role}/dashboard`);
  }

  const [t, workspaces] = await Promise.all([
    getTranslations('company.workspaces'),
    listCompanyWorkspaces(session.user.id),
  ]);

  const statusLabel = (status: string | null): string => {
    if (status === 'completed') return t('statusCompleted');
    if (status === 'cancelled') return t('statusCancelled');
    return t('statusActive');
  };

  return (
    <div className="pi-shell">
      {/* =============== Title row =============== */}
      <header className="pi-head">
        <div className="pi-head-main">
          <div className="pi-head-title-row">
            <h1>{t('title')}</h1>
          </div>
          <p className="pi-head-sub">{t('subtitle')}</p>
        </div>
      </header>

      {workspaces.length === 0 ? (
        <div className="pi-empty">
          <p className="font-medium text-[var(--ink-2)] mb-1">{t('emptyTitle')}</p>
          <p className="mb-4">{t('emptyBody')}</p>
          <Link href="/company/projects" className="pi-head-btn inline-flex">
            {t('emptyCta')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mt-2">
          {workspaces.map((w) => {
            const name = internName(w.internFirstName, w.internLastName);
            const start = formatDate(w.startDate);
            const end = formatDate(w.endDate);
            const dates = start && end ? `${start} — ${end}` : (start ?? end ?? t('noDates'));
            return (
              <Link
                key={w.id}
                href={`/company/workspaces/${w.id}`}
                className="group flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3.5 hover:border-[var(--border-strong)] transition-colors"
              >
                <span className="ph-avatar flex-shrink-0">{initialsOf(w.internFirstName, w.internLastName)}</span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-label font-semibold text-[var(--ink)] truncate">
                      {name || w.internshipTitle}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium font-mono uppercase tracking-wider border ${
                        STATUS_PILL[w.status ?? 'active'] ?? STATUS_PILL.active
                      }`}
                    >
                      {w.status === 'active' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-ink)]" />
                      )}
                      {statusLabel(w.status)}
                    </span>
                  </div>
                  <div className="text-caption text-[var(--ink-3)] truncate mt-0.5">
                    {w.projectTitle ?? t('noProject')}
                    <span className="mx-1.5 text-[var(--ink-4)]">·</span>
                    {w.internshipTitle}
                  </div>
                </div>

                <div className="hidden sm:block text-caption font-mono text-[var(--ink-3)] flex-shrink-0">
                  {dates}
                </div>

                <span
                  aria-hidden
                  className="inline-flex items-center gap-1 text-label text-[var(--ink-3)] group-hover:text-[var(--brand-700)] flex-shrink-0"
                >
                  {t('open')}
                  <ArrowRight size={14} strokeWidth={2.25} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
