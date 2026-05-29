'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import type { Notification } from '@/db/schema';
import { markAsReadAction, markAllAsReadAction } from '@/modules/notifications/actions';

function timeAgo(d: Date | string): string {
  const t = typeof d === 'string' ? new Date(d) : d;
  const diff = Date.now() - t.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return t.toLocaleDateString();
}

export function NotificationBell({
  initialUnread,
  initialItems,
  label,
}: {
  initialUnread: number;
  initialItems: Notification[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function onClickItem(id: string, href: string | null) {
    startTransition(async () => {
      await markAsReadAction(id);
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    if (href) router.push(href);
  }

  function onMarkAll() {
    startTransition(async () => {
      await markAllAsReadAction();
    });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnread(0);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `${label} (${unread} unread)` : label}
        className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--border-strong)] relative"
      >
        <Bell size={17} strokeWidth={2} className="text-[var(--ink-2)]" aria-hidden />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 9,
              background: 'var(--brand-500)',
              color: 'white',
              fontSize: 10,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
            aria-hidden
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label={label}
            style={{
              position: 'absolute',
              right: 0,
              top: '110%',
              width: 340,
              maxHeight: 480,
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.18)',
              zIndex: 50,
            }}
          >
            <div
              style={{
                padding: 12,
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <strong style={{ fontSize: 13 }}>{label}</strong>
              {unread > 0 && (
                <button
                  onClick={onMarkAll}
                  type="button"
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-3)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                  color: 'var(--ink-3)',
                  fontSize: 13,
                }}
              >
                No notifications yet.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((n) => (
                  <li
                    key={n.id}
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <button
                      type="button"
                      onClick={() => onClickItem(n.id, n.href)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: 12,
                        background: n.readAt ? 'transparent' : 'var(--surface-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--ink)',
                      }}
                    >
                      {n.body}
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-3)',
                          marginTop: 4,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {timeAgo(n.createdAt)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
