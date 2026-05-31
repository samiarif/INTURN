'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Bell } from 'lucide-react';
import type { Notification } from '@/db/schema';
import { formatTimeAgo, type FormatLocale } from '@/lib/format-time';
import { markAsReadAction, markAllAsReadAction } from '@/modules/notifications/actions';

export function NotificationBell({
  initialUnread,
  initialItems,
  label,
}: {
  initialUnread: number;
  initialItems: Notification[];
  label: string;
}) {
  const t = useTranslations('notifications');
  const locale = useLocale() as FormatLocale;
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

  // Render the notification line from its structured `type` + `metadata`, so a
  // FR reader sees French (the stored `body` is written English-only at
  // dispatch time). Mirrors the activity-feed humanizer. Falls back to the
  // stored `body` for legacy rows whose metadata predates the display fields,
  // or any future type not handled here.
  function describe(n: Notification): string {
    const meta = (n.metadata ?? {}) as Record<string, unknown>;
    switch (n.type) {
      case 'application.received':
        // `applicantName` may be empty (invited-but-not-onboarded applicants
        // have no name yet) — fall back to a localized "Someone" at render time,
        // since the stored metadata is locale-agnostic.
        if (meta.internshipTitle)
          return t('item.applicationReceived', {
            name: meta.applicantName ? String(meta.applicantName) : t('item.unknownPerson'),
            title: String(meta.internshipTitle),
          });
        break;
      case 'application.status':
        if (meta.internshipTitle && meta.to)
          return t('item.applicationStatus', {
            title: String(meta.internshipTitle),
            status: t(`status.${String(meta.to)}` as 'status.reviewed'),
          });
        break;
      case 'checkin.due':
        if (meta.internshipTitle)
          return t('item.checkinDue', { title: String(meta.internshipTitle) });
        break;
      case 'nudge':
        return meta.message
          ? t('item.nudge', { message: String(meta.message) })
          : t('item.nudgeNoMessage');
      case 'academicReport.submitted':
        // `studentName` may be empty — localize the fallback at render time.
        if (meta.version != null)
          return t('item.academicReportSubmitted', {
            name: meta.studentName ? String(meta.studentName) : t('item.unknownStudent'),
            version: Number(meta.version),
          });
        break;
      case 'academicReport.approved':
        return t('item.academicReportApproved');
      case 'academicReport.revision.requested':
        return t('item.academicReportRevision');
    }
    return n.body;
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? t('unreadAria', { label, count: unread }) : label}
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
              maxWidth: 'calc(100vw - 24px)',
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
                  {t('markAllRead')}
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
                {t('empty')}
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
                      {describe(n)}
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-3)',
                          marginTop: 4,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {formatTimeAgo(new Date(n.createdAt), locale)}
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
