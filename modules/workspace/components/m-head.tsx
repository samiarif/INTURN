import { getLocale, getTranslations } from 'next-intl/server';
import { WorkspaceTabBar } from './tab-bar';
import { MHeadActions } from './m-head-actions';

function formatDateRange(start: Date | null, end: Date | null, locale: string): string {
  if (!start || !end) return '';
  const fmt = (d: Date) =>
    d
      .toLocaleDateString(locale, { day: 'numeric', month: 'short' })
      .toUpperCase()
      .replace(/\s/g, ' ');
  return `${fmt(start)} — ${fmt(end)}`;
}

export async function WorkspaceMHead({
  view,
  workspaceId,
  internFirstName,
  internLastName,
  internshipTitle,
  startDate,
  endDate,
  taskCount,
  deliverableCount,
}: {
  view: 'intern' | 'supervisor';
  workspaceId: string;
  internFirstName: string | null;
  internLastName: string | null;
  internshipTitle: string;
  startDate: Date | null;
  endDate: Date | null;
  taskCount: number;
  deliverableCount: number;
}) {
  const locale = await getLocale();
  const t = await getTranslations('workspace.topbar');

  const title =
    view === 'intern'
      ? t('welcomeBack', { name: internFirstName ?? '' })
      : t('headTitleSupervisor', {
          name: `${internFirstName ?? ''} ${internLastName ?? ''}`.trim(),
          project: internshipTitle.split('—')[0]?.trim() ?? '',
        });

  const range = formatDateRange(startDate, endDate, locale);

  return (
    <div className="ws-mhead">
      <div className="ws-mhead-title-row">
        <h1 className="ws-mhead-title">{title}</h1>
        <span className="ws-mhead-badge live">
          <span className="ws-live-dot" aria-hidden />
          {t('activeBadge')}
        </span>
        {range && (
          <span className="ws-mhead-badge mono" style={{ fontFamily: 'var(--font-mono)' }}>
            {range}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <MHeadActions view={view} workspaceId={workspaceId} />
        </div>
      </div>
      <WorkspaceTabBar
        tasksCount={taskCount}
        deliverablesCount={deliverableCount}
        activityNew={view === 'supervisor' ? 3 : undefined}
        commentsNew={view === 'supervisor' ? 1 : undefined}
      />
    </div>
  );
}
