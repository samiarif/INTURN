'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Task } from '@/db/schema';
import { TaskCardMenu } from './task-card-menu';
import type { SortKey } from '@/modules/workspace/utils/task-view-state';

type Props = {
  tasks: Task[];
  view: 'intern' | 'supervisor';
};

const COLUMNS: Array<{ key: SortKey | 'phase' | 'status' | 'priority'; tk: string }> = [
  { key: 'title',    tk: 'header.title' },
  { key: 'status',   tk: 'header.status' },
  { key: 'phase',    tk: 'header.phase' },
  { key: 'due',      tk: 'header.due' },
  { key: 'priority', tk: 'header.priority' },
  { key: 'created',  tk: 'header.created' },
];

export function TasksListView({ tasks, view }: Props) {
  const t = useTranslations('workspace.tasksBoard.list');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sort = params.get('sort') ?? 'due';

  function setSort(k: string) {
    const next = new URLSearchParams(params);
    if (k === 'due') next.delete('sort');
    else next.set('sort', k);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function phaseOf(tk: Task): string {
    if (!tk.tag) return '—';
    const idx = tk.tag.indexOf('-');
    return idx > 0 ? tk.tag.slice(0, idx) : '—';
  }

  function formatRelative(d: Date): string {
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400_000);
    if (days < 1) return t('relativeToday');
    if (days < 7) return t('relativeDays', { n: days });
    return d.toLocaleDateString();
  }

  return (
    <div className="ws-col-main">
      <table className="tb-list" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <caption className="sr-only">{t('caption')}</caption>
        <thead>
          <tr>
            {COLUMNS.map((c) => {
              const isSortable = ['title', 'due', 'priority', 'created'].includes(c.key);
              const isActive = isSortable && sort === c.key;
              return (
                <th key={c.key} scope="col" style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--border-color)', fontSize: 12, fontWeight: 600 }}>
                  {isSortable ? (
                    <button
                      type="button"
                      onClick={() => setSort(c.key)}
                      aria-label={t(c.tk)}
                      style={{ background: 'transparent', border: 0, padding: 0, font: 'inherit', cursor: 'pointer', color: 'var(--ink)' }}
                    >
                      {t(c.tk)} {isActive ? '↑' : ''}
                    </button>
                  ) : (
                    t(c.tk)
                  )}
                </th>
              );
            })}
            <th scope="col" aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((tk) => (
            <tr key={tk.id} tabIndex={0} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: 8 }}>
                {tk.tag && <span className="tb-card-tag" style={{ marginRight: 8 }}>{tk.tag}</span>}
                {tk.title}
              </td>
              <td style={{ padding: 8 }}>{tk.status ?? 'todo'}</td>
              <td style={{ padding: 8 }}>{phaseOf(tk)}</td>
              <td style={{ padding: 8 }}>{tk.dueDate ?? '—'}</td>
              <td style={{ padding: 8 }}>{tk.priority ?? 'medium'}</td>
              <td style={{ padding: 8 }}>{formatRelative(tk.createdAt)}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>
                <TaskCardMenu task={tk} view={view} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <p style={{ padding: 16, color: 'var(--ink-3)', textAlign: 'center' }}>{t('empty')}</p>
      )}
    </div>
  );
}
