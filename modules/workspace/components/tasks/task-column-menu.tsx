'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { TaskStatus } from '@/modules/tasks/state-machine';

type Props = {
  status: TaskStatus;
  onAddClick: () => void;
};

export function TaskColumnMenu({ status, onAddClick }: Props) {
  const t = useTranslations('workspace.tasksBoard.columnMenu');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [sortPanel, setSortPanel] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSortPanel(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setSortPanel(false);
      }
    }
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pushParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function focusColumn() {
    const existing = params.get('filter');
    if (existing === `status:${status}`) {
      pushParam('filter', null);
    } else {
      pushParam('filter', `status:${status}`);
    }
    setOpen(false);
  }

  function sortColumn(key: 'due' | 'priority' | 'title' | 'created') {
    pushParam('columnSort', key);
    setOpen(false);
    setSortPanel(false);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="menu"
        aria-label={t('triggerLabel', { status })}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open && (
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
          {!sortPanel ? (
            <>
              <Item onClick={() => { onAddClick(); setOpen(false); }}>{t('addHere')}</Item>
              <Item onClick={focusColumn}>{t('focus')}</Item>
              <Item onClick={() => setSortPanel(true)}>{t('sortWithin')}</Item>
            </>
          ) : (
            <>
              {(['due', 'priority', 'title', 'created'] as const).map((k) => (
                <Item key={k} onClick={() => sortColumn(k)}>
                  {t(`sort.${k}`)}
                </Item>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Item({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        fontSize: 13,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--ink)',
        borderRadius: 4,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-muted)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}
