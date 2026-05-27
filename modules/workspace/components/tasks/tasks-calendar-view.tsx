'use client';

import { useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import type { Task } from '@/db/schema';

type Props = {
  tasks: Task[];
  view: 'intern' | 'supervisor';
};

function parseMonthParam(raw: string | null): { year: number; month: number } {
  if (raw) {
    const m = /^(\d{4})-(\d{2})$/.exec(raw);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]) - 1;
      if (month >= 0 && month <= 11) return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function TasksCalendarView({ tasks, view: _view }: Props) {
  const t = useTranslations('workspace.tasksBoard.calendar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { year, month } = parseMonthParam(params.get('month'));

  function setMonth(y: number, m: number) {
    const next = new URLSearchParams(params);
    const now = new Date();
    if (y === now.getFullYear() && m === now.getMonth()) next.delete('month');
    else next.set('month', `${y}-${pad(m + 1)}`);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getFullYear(), d.getMonth());
  }

  function today() {
    const now = new Date();
    setMonth(now.getFullYear(), now.getMonth());
  }

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month]);

  const dayNames = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2026, 0, i + 4); // 2026-01-04 was a Sunday
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
  }, [locale]);

  const monthLabel = useMemo(() => {
    return new Date(year, month, 1).toLocaleDateString(locale, { year: 'numeric', month: 'long' });
  }, [locale, year, month]);

  function cellTasks(cellDate: Date): Task[] {
    const iso = `${cellDate.getFullYear()}-${pad(cellDate.getMonth() + 1)}-${pad(cellDate.getDate())}`;
    return tasks.filter((tk) => tk.dueDate === iso);
  }

  const undated = tasks.filter((tk) => !tk.dueDate).length;

  const isCurrentMonth = (d: Date) => d.getMonth() === month;
  const isToday = (d: Date) => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  return (
    <div className="ws-col-main">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{monthLabel}</h3>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => shift(-1)} aria-label={t('prevMonth')}>←</button>
        <button type="button" onClick={today}>{t('today')}</button>
        <button type="button" onClick={() => shift(1)} aria-label={t('nextMonth')}>→</button>
      </div>

      {undated > 0 && (
        <p style={{ padding: '6px 12px', fontSize: 12, color: 'var(--ink-3)' }}>
          {t('undatedBanner', { n: undated })}
        </p>
      )}

      <div role="grid" aria-label={monthLabel} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border-color)', border: '1px solid var(--border-color)' }}>
        {dayNames.map((n) => (
          <div key={n} role="columnheader" style={{ padding: 6, background: 'var(--surface)', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
            {n}
          </div>
        ))}
        {cells.map((d, i) => {
          const cTasks = cellTasks(d);
          const dim = !isCurrentMonth(d);
          const ring = isToday(d);
          return (
            <div
              key={i}
              role="gridcell"
              style={{
                minHeight: 84,
                background: 'var(--surface)',
                padding: 4,
                opacity: dim ? 0.5 : 1,
                outline: ring ? '2px solid var(--brand-500)' : 'none',
                outlineOffset: -2,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 2 }}>{d.getDate()}</div>
              {cTasks.slice(0, 3).map((tk) => (
                <div key={tk.id} style={{ fontSize: 11, padding: '2px 4px', borderRadius: 3, background: 'var(--surface-muted)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  ● {tk.title}
                </div>
              ))}
              {cTasks.length > 3 && (
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>+{cTasks.length - 3} {t('more')}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
