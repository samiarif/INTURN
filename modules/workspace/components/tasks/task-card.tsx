'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLocale, useTranslations } from 'next-intl';
import type { Task } from '@/db/schema';
import { Avatar } from '@/components/avatar';
import { TaskCardMenu } from './task-card-menu';
import type { TaskStatus } from '@/modules/tasks/state-machine';

type TaskWithMeta = Task & {
  needsReview?: boolean;
  comments?: number;
  attachments?: number;
};

// Maps a tag prefix to its visual kind, which doubles as both the CSS modifier
// (`.tb-card-label.design`/`.research`) and the i18n key suffix
// (`card.tagLabel.design`/`.research`). The displayed label text is localized at
// render time, not stored here.
const TAG_KIND_BY_PREFIX: Record<string, 'design' | 'research'> = {
  BA: 'design',
  UX: 'research',
};

function deriveTagKind(tag: string | null): 'design' | 'research' | null {
  if (!tag) return null;
  const prefix = tag.split('-')[0];
  return TAG_KIND_BY_PREFIX[prefix] ?? null;
}

export type DueInfo =
  | { kind: 'closed'; urgent: false; overdue: false }
  | { kind: 'review'; urgent: false; overdue: false }
  | { kind: 'none'; urgent: false; overdue: false }
  | { kind: 'overdue'; days: number; urgent: true; overdue: true }
  | { kind: 'dueSoon'; days: number; weekday: string; urgent: true; overdue: false }
  | { kind: 'dueLater'; date: string; urgent: false; overdue: false };

export function formatDue(task: Task, locale: string): DueInfo {
  if (task.status === 'done') return { kind: 'closed', urgent: false, overdue: false };
  if (task.status === 'review') return { kind: 'review', urgent: false, overdue: false };
  if (!task.dueDate) return { kind: 'none', urgent: false, overdue: false };
  const due = new Date(task.dueDate);
  const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { kind: 'overdue', days: -days, urgent: true, overdue: true };
  if (days <= 3) {
    const weekday = due.toLocaleDateString(locale, { weekday: 'short' });
    return { kind: 'dueSoon', days, weekday, urgent: true, overdue: false };
  }
  return {
    kind: 'dueLater',
    date: due.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    urgent: false,
    overdue: false,
  };
}

export type TaskCardProps = {
  task: TaskWithMeta;
  status: TaskStatus;
  view: 'intern' | 'supervisor';
  internName: string;
  renderDue: (d: DueInfo) => string;
  /** Localized "S{n}" sprint chip. Set only on the sprint-aware Tasks path. */
  sprintBadge?: string;
};

export function SortableTaskCard({
  task,
  status,
  view,
  internName,
  renderDue,
  sprintBadge,
}: TaskCardProps) {
  const locale = useLocale();
  const t = useTranslations('workspace.tasksBoard');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { columnId: status } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const due = formatDue(task, locale);
  const tagKind = deriveTagKind(task.tag);
  const showNeedsReview = view === 'supervisor' && status === 'review';
  const cardClass = [
    'tb-card',
    due.urgent && 'urgent',
    due.overdue && 'overdue',
    showNeedsReview && 'needs-review',
    status === 'done' && 'done',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      id={`task-${task.id}`}
      className={cardClass}
      style={style}
      {...attributes}
      {...listeners}
      aria-roledescription={t('card.roleDescription')}
    >
      <div className="tb-card-top">
        {sprintBadge && <span className="tb-card-label sprint">{sprintBadge}</span>}
        {task.tag && <span className="tb-card-tag">{task.tag}</span>}
        {tagKind && <span className={`tb-card-label ${tagKind}`}>{t(`card.tagLabel.${tagKind}`)}</span>}
        <TaskCardMenu task={task} view={view} />
      </div>
      <div className="tb-card-title">{task.title}</div>
      {task.description && <div className="tb-card-sub">{task.description}</div>}
      <div className="tb-card-foot">
        <span
          className={`tb-card-due ${due.urgent ? 'urgent' : ''} ${due.overdue ? 'overdue' : ''} ${status === 'done' ? 'good' : ''}`}
        >
          {status === 'done' ? <span className="ico-check" /> : <span className="cal" />}
          <span>{renderDue(due)}</span>
        </span>
        <Avatar name={internName} size="xs" title={internName} />
      </div>
    </div>
  );
}
