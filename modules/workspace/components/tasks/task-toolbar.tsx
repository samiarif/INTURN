'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Task } from '@/db/schema';
import {
  parseFilterParam,
  serializeFilterParam,
  derivePhasesFromTasks,
  type FilterState,
  type SortKey,
} from '@/modules/workspace/utils/task-view-state';

type Props = {
  tasks: Task[];
  enableListAndCalendar: boolean;
};

export function TaskToolbar({ tasks, enableListAndCalendar }: Props) {
  const t = useTranslations('workspace.tasksBoard.toolbar');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const view = params.get('view') ?? 'board';
  const filter = parseFilterParam(params.get('filter'));
  const sort = (params.get('sort') ?? 'due') as SortKey;
  const group = params.get('group') ?? 'status';

  const phases = derivePhasesFromTasks(tasks);

  function patchUrl(updates: Partial<{ view: string; filter: FilterState; sort: SortKey; group: string }>) {
    const next = new URLSearchParams(params);
    if ('view' in updates) {
      if (updates.view && updates.view !== 'board') next.set('view', updates.view);
      else next.delete('view');
    }
    if ('filter' in updates) {
      const s = serializeFilterParam(updates.filter ?? {});
      if (s) next.set('filter', s);
      else next.delete('filter');
    }
    if ('sort' in updates) {
      if (updates.sort && updates.sort !== 'due') next.set('sort', updates.sort);
      else next.delete('sort');
    }
    if ('group' in updates) {
      if (updates.group && updates.group !== 'status') next.set('group', updates.group);
      else next.delete('group');
    }
    router.replace(`${pathname}?${next.toString()}`);
  }

  function togglePhase(p: string) {
    const current = filter.phase ?? [];
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    patchUrl({ filter: { ...filter, phase: next.length > 0 ? next : undefined } });
  }

  function toggleDueThisWeek() {
    patchUrl({ filter: { ...filter, dueIn: filter.dueIn === '7d' ? undefined : '7d' } });
  }

  function clearAll() {
    patchUrl({ filter: {} });
  }

  return (
    <div className="tb-toolbar">
      <div className="tb-view" role="tablist" aria-label={t('viewTabsLabel')}>
        <ViewTab active={view === 'board'} onClick={() => patchUrl({ view: 'board' })}>
          {t('viewBoard')}
        </ViewTab>
        <ViewTab
          active={view === 'list'}
          onClick={() => enableListAndCalendar && patchUrl({ view: 'list' })}
          disabled={!enableListAndCalendar}
          title={!enableListAndCalendar ? t('comingSoon') : undefined}
        >
          {t('viewList')}
        </ViewTab>
        <ViewTab
          active={view === 'calendar'}
          onClick={() => enableListAndCalendar && patchUrl({ view: 'calendar' })}
          disabled={!enableListAndCalendar}
          title={!enableListAndCalendar ? t('comingSoon') : undefined}
        >
          {t('viewCalendar')}
        </ViewTab>
      </div>

      <Chip active={!filter.phase && !filter.dueIn && !filter.status} onClick={clearAll}>
        {t('filterAll')} <span className="num">{tasks.length}</span>
      </Chip>

      <PhaseDropdown phases={phases} selected={filter.phase ?? []} onToggle={togglePhase} label={t('filterPhase')} />

      <Chip active={filter.dueIn === '7d'} onClick={toggleDueThisWeek}>
        {t('filterDueThisWeek')}
      </Chip>

      <div className="tb-spacer" />

      <SortDropdown value={sort} onChange={(v) => patchUrl({ sort: v })} label={t('sort')} t={t} />

      {view === 'board' && (
        <GroupDropdown value={group} onChange={(v) => patchUrl({ group: v })} label={t('group')} t={t} />
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      type="button"
      className={active ? 'active' : ''}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`tb-chip ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

function PhaseDropdown({
  phases,
  selected,
  onToggle,
  label,
}: {
  phases: string[];
  selected: string[];
  onToggle: (p: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  if (phases.length === 0) return null;
  const active = selected.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`tb-chip ${active ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        {active ? `: ${selected.join(', ')}` : ''}
        <span className="caret" />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: 140,
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: 4,
            zIndex: 30,
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
          }}
        >
          {phases.map((p) => {
            const checked = selected.includes(p);
            return (
              <button
                key={p}
                role="menuitemcheckbox"
                aria-checked={checked}
                type="button"
                onClick={() => onToggle(p)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 10px',
                  fontSize: 13,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 4,
                  color: 'var(--ink)',
                }}
              >
                {checked ? '✓ ' : '  '}
                {p}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortDropdown({
  value,
  onChange,
  label,
  t,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
  label: string;
  t: (k: string) => string;
}) {
  return (
    <label className="tb-chip">
      {label}:{' '}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        style={{ background: 'transparent', border: 'none', color: 'var(--ink)', font: 'inherit' }}
      >
        <option value="due">{t('sortDue')}</option>
        <option value="priority">{t('sortPriority')}</option>
        <option value="title">{t('sortTitle')}</option>
        <option value="created">{t('sortCreated')}</option>
      </select>
    </label>
  );
}

function GroupDropdown({
  value,
  onChange,
  label,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  t: (k: string) => string;
}) {
  return (
    <label className="tb-chip">
      {label}:{' '}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: 'transparent', border: 'none', color: 'var(--ink)', font: 'inherit' }}
      >
        <option value="status">{t('groupStatus')}</option>
        <option value="phase">{t('groupPhase')}</option>
      </select>
    </label>
  );
}
