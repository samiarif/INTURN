'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Task } from '@/db/schema';
import { TASK_COLUMNS, type TaskStatus } from '@/modules/tasks/state-machine';
import {
  deleteTaskAction,
  updateTaskAction,
} from '@/modules/tasks/server-actions';
import { setTaskSprintAction } from '@/modules/workspace/sprint-actions';
import { AddTaskModal } from '../add-task-modal';

export type SprintOption = { id: string; name: string };

type Props = {
  task: Task;
  view: 'intern' | 'supervisor';
  sprintOptions?: SprintOption[];
};

type Panel = 'main' | 'due' | 'priority' | 'move' | 'sprint' | null;

export function TaskCardMenu({ task, view, sprintOptions }: Props) {
  const t = useTranslations('workspace.tasksBoard.cardMenu');
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!panel) return;
    function onDocPointer(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPanel(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanel(null);
    }
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  function patch(p: Parameters<typeof updateTaskAction>[1]) {
    startTransition(async () => {
      const res = await updateTaskAction(task.id, p);
      if (res.ok) {
        router.refresh();
        setPanel(null);
      }
    });
  }

  function onDelete() {
    if (!confirm(t('deleteConfirm'))) return;
    startTransition(async () => {
      const res = await deleteTaskAction(task.id);
      if (res.ok) {
        router.refresh();
        setPanel(null);
      }
    });
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="tb-card-menu"
        aria-label={t('triggerLabel')}
        aria-haspopup="menu"
        aria-expanded={panel !== null}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setPanel(panel ? null : 'main')}
      >
        {t('triggerGlyph')}
      </button>
      {panel && (
        <div
          role="menu"
          className="tb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 180,
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
            zIndex: 40,
            padding: 4,
          }}
        >
          {panel === 'main' && (
            <>
              <MenuItem onClick={() => setEditing(true)}>{t('edit')}</MenuItem>
              <MenuItem onClick={() => setPanel('due')}>{t('changeDue')}</MenuItem>
              <MenuItem onClick={() => setPanel('priority')}>{t('changePriority')}</MenuItem>
              <MenuItem onClick={() => setPanel('move')}>{t('moveTo')}</MenuItem>
              {sprintOptions && sprintOptions.length > 0 && (
                <MenuItem onClick={() => setPanel('sprint')}>{t('moveToSprint')}</MenuItem>
              )}
              {view === 'supervisor' && (
                <MenuItem onClick={onDelete} danger>
                  {t('delete')}
                </MenuItem>
              )}
            </>
          )}
          {panel === 'due' && (
            <div style={{ padding: 8 }}>
              <input
                type="date"
                defaultValue={task.dueDate ?? ''}
                onChange={(e) => patch({ dueDate: e.target.value || null })}
                style={{ width: '100%', padding: '6px 8px', fontSize: 13 }}
              />
            </div>
          )}
          {panel === 'priority' && (
            <div style={{ padding: 4 }}>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <MenuItem
                  key={p}
                  onClick={() => patch({ priority: p })}
                  disabled={pending || task.priority === p}
                >
                  {t(`priority.${p}`)}
                </MenuItem>
              ))}
            </div>
          )}
          {panel === 'move' && (
            <div style={{ padding: 4 }}>
              {TASK_COLUMNS.map((c) => (
                <MenuItem
                  key={c.status}
                  onClick={() => patch({ status: c.status as TaskStatus })}
                  disabled={pending || task.status === c.status}
                >
                  {t(`status.${c.status}`)}
                </MenuItem>
              ))}
            </div>
          )}
          {panel === 'sprint' && (() => {
            // sprintOptions is guaranteed non-empty here: this panel is only
            // reachable when the "Move to sprint" item is rendered, which is
            // gated on `sprintOptions && sprintOptions.length > 0`.
            const opts = sprintOptions ?? [];
            return (
              <div style={{ padding: 4 }}>
                {opts.map((s) => (
                  <MenuItem
                    key={s.id}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await setTaskSprintAction({ taskId: task.id, sprintId: s.id });
                        if (res.ok) {
                          router.refresh();
                          setPanel(null);
                        }
                      });
                    }}
                    disabled={pending || task.sprintId === s.id}
                  >
                    {s.name}
                  </MenuItem>
                ))}
                <MenuItem
                  onClick={() => {
                    startTransition(async () => {
                      const res = await setTaskSprintAction({ taskId: task.id, sprintId: null });
                      if (res.ok) {
                        router.refresh();
                        setPanel(null);
                      }
                    });
                  }}
                  disabled={pending || task.sprintId === null}
                >
                  {t('unsorted')}
                </MenuItem>
              </div>
            );
          })()}
        </div>
      )}
      {editing && (
        <AddTaskModal
          workspaceId={task.workspaceId}
          initialStatus={(task.status ?? 'todo') as TaskStatus}
          initialTask={task}
          onClose={() => {
            setEditing(false);
            setPanel(null);
          }}
        />
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        fontSize: 13,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--ink-3)' : danger ? 'var(--danger)' : 'var(--ink)',
        borderRadius: 4,
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget.style.background = 'var(--surface-muted)');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
