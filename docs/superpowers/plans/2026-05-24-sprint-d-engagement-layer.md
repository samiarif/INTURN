# Sprint D — Engagement Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the bell icon being a static element. Wire the engagement loop: events → notifications (in-app + email + WhatsApp) → AI-assisted decisions → end-of-internship record. This closes Sprint 6 of `docs/inturn-project-brief.md` and the engagement gaps from the 2026-05-24 audit.

**Architecture:** Eight tasks. Most introduce new domain modules (notifications, AI assistants, records, community, admin moderation). Three tasks (D1 Resend, D5 rate-limit, D7 community) introduce new third-party dependencies. Builds on `sprint-c-i18n-a11y-mobile`.

**Tech Stack:** Resend (transactional email — new) · Upstash Ratelimit (new) · Anthropic SDK 0.98 (already in deps) · `@react-pdf/renderer` (new, for PDFs) · Twilio (new, optional) · existing Drizzle + Neon + Vitest + next-intl.

**Out of scope (defer to Sprint E or later):**
- Sentry (Sprint E)
- Stripe / billing (Sprint E)
- Real-time push (post-Phase 1)
- Notification preferences UI (P2 — defaults are fine for v1)
- WhatsApp two-way (only outbound triggers in v1)

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `package.json` | modify | Add `resend`, `@upstash/ratelimit`, `@upstash/redis`, `@react-pdf/renderer`, optional `twilio` |
| `lib/email.ts` | create | Resend client + low-level send wrapper |
| `lib/email/templates/welcome.ts` | create | Welcome email JSX template |
| `lib/email/templates/application-received.ts` | create | New application notification to company supervisor |
| `lib/email/templates/application-status.ts` | create | Status change notification to applicant intern |
| `lib/email/templates/check-in-reminder.ts` | create | Weekly check-in reminder |
| `lib/email/templates/digest-daily.ts` | create | Daily digest fallback |
| `lib/ratelimit.ts` | create | Upstash Ratelimit factory (per-action + per-user) |
| `db/schema/notifications.ts` | create | New table: in-app notifications |
| `db/schema/index.ts` | modify | Re-export notifications |
| `db/migrations/0005_notifications.sql` | create | notifications table + indexes |
| `modules/notifications/queries.ts` | create | list unread, mark read |
| `modules/notifications/dispatcher.ts` | create | Event → notification routing rules + email triggers |
| `modules/notifications/actions.ts` | create | markAsReadAction, dismissAction |
| `modules/notifications/__tests__/dispatcher.test.ts` | create | Routing logic tests (pure fn) |
| `modules/events/service.ts` | modify | Call dispatcher after recordEvent |
| `app/[locale]/(platform)/_components/notification-bell.tsx` | create | In-app bell drawer (client component) |
| `app/[locale]/(platform)/intern/layout.tsx` + `company/layout.tsx` | modify | Mount the bell |
| `modules/ai/task-clarity.ts` | create | Anthropic call: refine vague task scope |
| `modules/ai/intern-unblocker.ts` | create | Anthropic call: clarifying question from stuck context |
| `modules/ai/__tests__/prompts.test.ts` | create | Prompt builders are pure — testable |
| `app/api/ai/task-clarity/route.ts` | create | Server endpoint with rate limit + role check |
| `app/api/ai/intern-unblocker/route.ts` | create | Same |
| `modules/workspace/components/task-clarity-button.tsx` | create | "Make this clearer?" inline action |
| `modules/workspace/components/stuck-pill.tsx` | modify | Wire to intern-unblocker AI |
| `app/api/upload/route.ts` | modify | Apply rate limit |
| `app/api/webhooks/clerk/route.ts` | modify | Apply rate limit (per IP, lax) |
| `modules/checkins/server-actions.ts` | modify | Apply rate limit on AI draft |
| `modules/records/pdf.tsx` | create | React-PDF document |
| `modules/records/service.ts` | create | generateRecord, shareLink |
| `db/schema/internship-records.ts` | create | Records table: workspace_id, share_token, generated_at, rubric_json |
| `db/migrations/0006_internship_records.sql` | create | records table |
| `app/[locale]/records/[token]/page.tsx` | create | Public shareable record viewer |
| `app/api/records/[recordId]/pdf/route.ts` | create | PDF download |
| `modules/community/feed.ts` | create | Curated intern feed (inturn-published posts only) |
| `db/schema/community-posts.ts` | create | Posts authored by admins |
| `db/schema/listing-discussions.ts` | create | Public discussion threads on internship detail |
| `db/migrations/0007_community.sql` | create | both new tables |
| `app/[locale]/(platform)/intern/feed/page.tsx` | create | Intern community feed |
| `app/[locale]/internships/[slug]/_discussion.tsx` | create | Public Q&A thread on listing |
| `modules/admin/audit-log.ts` | create | Query events table with filters |
| `app/[locale]/(platform)/admin/audit-log/page.tsx` | create | Admin audit log viewer |
| `app/[locale]/(platform)/admin/moderation/page.tsx` | create | Internship moderation queue |
| `app/[locale]/(platform)/admin/reclamations/page.tsx` | create | Reports + reclamations queue |
| `db/schema/reclamations.ts` | create | User-submitted reports |
| `db/migrations/0008_reclamations.sql` | create | reclamations table |
| `modules/reclamations/actions.ts` | create | submitReclamationAction (any signed-in user) |

---

## Task 1 — Resend integration + email templates

**Files:**
- modify `package.json`
- create `lib/email.ts`
- create 5 template files

- [ ] **Step 1: Install Resend**

```bash
cd /Users/mac/code/inturn-hub/inturn
pnpm add resend
```

- [ ] **Step 2: Add `RESEND_API_KEY` to `.env.example` + `lib/env.ts`**

In `.env.example`:
```
RESEND_API_KEY=re_xxx
EMAIL_FROM="Inturn <hello@inturn-hub.com>"
EMAIL_REPLY_TO=hello@inturn-hub.com
```

In `lib/env.ts`, extend `RequiredEnvKey`:
```typescript
type RequiredEnvKey =
  | 'DATABASE_URL'
  | 'CLERK_SECRET_KEY'
  | 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  | 'CLERK_WEBHOOK_SECRET'
  | 'BLOB_READ_WRITE_TOKEN'
  | 'RESEND_API_KEY'
  | 'EMAIL_FROM';
```

- [ ] **Step 3: Create `lib/email.ts`**

```typescript
import { Resend } from 'resend';
import { requireEnv } from './env';

let _client: Resend | null = null;
function client(): Resend {
  if (!_client) _client = new Resend(requireEnv('RESEND_API_KEY'));
  return _client;
}

export type EmailPayload = {
  to: string | string[];
  subject: string;
  /** Plain-text fallback for clients that don't render HTML. */
  text: string;
  html: string;
  /** Optional reply-to override. */
  replyTo?: string;
  /** Tags for analytics in Resend dashboard. */
  tags?: Array<{ name: string; value: string }>;
};

/**
 * Send a transactional email. Throws on network error.
 *
 * In CI / test, set RESEND_API_KEY=test-mode to short-circuit and just log.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ id: string } | null> {
  const key = requireEnv('RESEND_API_KEY');
  if (key === 'test-mode') {
    console.log('[email/test-mode] would send:', payload.subject, 'to', payload.to);
    return null;
  }

  const from = requireEnv('EMAIL_FROM');
  const replyTo = payload.replyTo ?? process.env.EMAIL_REPLY_TO;

  const result = await client().emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo,
    tags: payload.tags,
  });

  if (result.error) {
    throw new Error(`[email] send failed: ${result.error.message}`);
  }
  return { id: result.data!.id };
}
```

- [ ] **Step 4: Create template helpers**

`lib/email/templates/_layout.ts` (shared HTML shell):

```typescript
export function emailLayout({ title, bodyHtml, ctaLabel, ctaHref }: {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}): { html: string; text: string } {
  const cta = ctaLabel && ctaHref
    ? `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:#4F46E5;border-radius:6px;"><a href="${ctaHref}" style="display:inline-block;padding:12px 24px;color:white;text-decoration:none;font-weight:600;font-family:system-ui,sans-serif;">${ctaLabel}</a></td></tr></table>`
    : '';

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:24px;background:#F9FAFB;font-family:system-ui,sans-serif;color:#111827;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:8px;padding:32px;">
    <div style="font-weight:700;font-size:18px;margin-bottom:24px;">Inturn</div>
    ${bodyHtml}
    ${cta}
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0 16px;">
    <div style="font-size:12px;color:#6B7280;">Inturn · Tunisia · <a href="https://inturn-hub.com" style="color:#6B7280;">inturn-hub.com</a></div>
  </div>
</body></html>`;

  const text = `${title}\n\n${stripHtml(bodyHtml)}${ctaHref ? `\n\n${ctaLabel}: ${ctaHref}` : ''}\n\n— Inturn`;
  return { html, text };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
```

`lib/email/templates/welcome.ts`:

```typescript
import { emailLayout } from './_layout';

export function welcomeTemplate({
  firstName,
  locale,
}: { firstName: string; locale: 'fr' | 'en' }) {
  const fr = locale === 'fr';
  const title = fr ? `Bienvenue sur Inturn, ${firstName}` : `Welcome to Inturn, ${firstName}`;
  const body = fr
    ? `<p>Bonjour ${firstName},</p><p>Votre compte est créé. Complétez votre profil en deux minutes pour postuler aux stages publiés par les entreprises tunisiennes.</p>`
    : `<p>Hi ${firstName},</p><p>Your account is set up. Complete your profile in two minutes to start applying to internships from Tunisian companies.</p>`;
  const cta = fr ? 'Compléter mon profil' : 'Complete my profile';
  return {
    ...emailLayout({
      title,
      bodyHtml: body,
      ctaLabel: cta,
      ctaHref: `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding/intern/basics`,
    }),
    subject: title,
  };
}
```

`lib/email/templates/application-received.ts`:

```typescript
import { emailLayout } from './_layout';

export function applicationReceivedTemplate({
  supervisorName,
  internshipTitle,
  applicantName,
  applicationId,
  locale,
}: {
  supervisorName: string;
  internshipTitle: string;
  applicantName: string;
  applicationId: string;
  locale: 'fr' | 'en';
}) {
  const fr = locale === 'fr';
  const title = fr
    ? `Nouvelle candidature — ${internshipTitle}`
    : `New application — ${internshipTitle}`;
  const body = fr
    ? `<p>Bonjour ${supervisorName},</p><p><strong>${applicantName}</strong> vient de postuler à <strong>${internshipTitle}</strong>.</p>`
    : `<p>Hi ${supervisorName},</p><p><strong>${applicantName}</strong> just applied to <strong>${internshipTitle}</strong>.</p>`;
  return {
    ...emailLayout({
      title,
      bodyHtml: body,
      ctaLabel: fr ? 'Voir la candidature' : 'Review application',
      ctaHref: `${process.env.NEXT_PUBLIC_BASE_URL}/company/applications/${applicationId}`,
    }),
    subject: title,
  };
}
```

`lib/email/templates/application-status.ts`:

```typescript
import { emailLayout } from './_layout';

const STATUS_FR: Record<string, string> = {
  shortlisted: 'présélectionnée',
  interview: 'invitée à un entretien',
  accepted: 'acceptée',
  rejected: 'non retenue',
};
const STATUS_EN: Record<string, string> = {
  shortlisted: 'shortlisted',
  interview: 'invited to interview',
  accepted: 'accepted',
  rejected: 'declined',
};

export function applicationStatusTemplate({
  applicantName,
  internshipTitle,
  status,
  applicationId,
  locale,
}: {
  applicantName: string;
  internshipTitle: string;
  status: 'shortlisted' | 'interview' | 'accepted' | 'rejected';
  applicationId: string;
  locale: 'fr' | 'en';
}) {
  const fr = locale === 'fr';
  const statusLabel = (fr ? STATUS_FR : STATUS_EN)[status];
  const title = fr
    ? `Votre candidature à ${internshipTitle} a été ${statusLabel}`
    : `Your application to ${internshipTitle} was ${statusLabel}`;
  const body = fr
    ? `<p>Bonjour ${applicantName},</p><p>L'entreprise a mis à jour votre candidature à <strong>${internshipTitle}</strong>. Statut : <strong>${statusLabel}</strong>.</p>`
    : `<p>Hi ${applicantName},</p><p>The company updated your application to <strong>${internshipTitle}</strong>. Status: <strong>${statusLabel}</strong>.</p>`;
  return {
    ...emailLayout({
      title,
      bodyHtml: body,
      ctaLabel: fr ? 'Voir la candidature' : 'View application',
      ctaHref: `${process.env.NEXT_PUBLIC_BASE_URL}/intern/applications/${applicationId}`,
    }),
    subject: title,
  };
}
```

`lib/email/templates/check-in-reminder.ts` + `digest-daily.ts` — same pattern. Skim brief for tone.

- [ ] **Step 5: Smoke test**

Set `RESEND_API_KEY=test-mode` in `.env.local`. Run:

```bash
pnpm tsx --env-file=.env.local -e "
  import { sendEmail } from './lib/email';
  import { welcomeTemplate } from './lib/email/templates/welcome';
  const tpl = welcomeTemplate({ firstName: 'Yasmine', locale: 'fr' });
  await sendEmail({ to: 'test@example.com', subject: tpl.subject, html: tpl.html, text: tpl.text });
"
```

Should log `[email/test-mode] would send:` line.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example lib/env.ts lib/email.ts lib/email/templates/
git commit -m "feat(email): Resend integration + 5 transactional templates (FR + EN)"
```

---

## Task 2 — Notification dispatcher + in-app bell + email triggers

**Files:**
- create `db/schema/notifications.ts` + migration `0005`
- create `modules/notifications/{queries,dispatcher,actions}.ts` + test
- modify `modules/events/service.ts` to call dispatcher
- create `app/[locale]/(platform)/_components/notification-bell.tsx`
- modify platform layouts to mount bell

- [ ] **Step 1: Schema**

`db/schema/notifications.ts`:

```typescript
import { pgTable, text, timestamp, uuid, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    /** Plain-text body, already i18n'd by the dispatcher. */
    body: text('body').notNull(),
    /** Optional href the bell item links to. */
    href: text('href'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('notifications_recipient_created_idx').on(table.recipientId, sql`created_at DESC`),
    index('notifications_recipient_unread_idx')
      .on(table.recipientId)
      .where(sql`read_at IS NULL`),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
```

Re-export from `db/schema/index.ts`. Write migration `db/migrations/0005_notifications.sql` (idempotent).

- [ ] **Step 2: Dispatcher rules**

`modules/notifications/dispatcher.ts`:

```typescript
import { db } from '@/db';
import { notifications, users, organizations, applications, internships, projects, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { applicationReceivedTemplate } from '@/lib/email/templates/application-received';
import { applicationStatusTemplate } from '@/lib/email/templates/application-status';

/**
 * Route an event to notifications + emails. Called by recordEvent after
 * inserting the event row. Best-effort: failures are logged, not thrown.
 *
 * Add new rules as new events ship.
 */
export async function dispatchNotificationsFor(event: {
  type: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
}): Promise<void> {
  try {
    switch (event.type) {
      case 'application.created':
        await onApplicationCreated(event);
        break;
      case 'application.statusChanged':
        await onApplicationStatusChanged(event);
        break;
      case 'checkin.due':
        await onCheckinDue(event);
        break;
      // Add new cases as needed.
    }
  } catch (err) {
    console.error('[notifications/dispatcher] failed for', event.type, err);
  }
}

async function onApplicationCreated(event: { targetId: string | null; metadata: Record<string, unknown> | null }) {
  if (!event.targetId) return;
  // Look up the application + internship + supervisor.
  const [row] = await db
    .select({
      app: applications,
      internship: internships,
      projectSupervisorIds: projects.supervisorIds,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .leftJoin(projects, eq(projects.id, internships.projectId))
    .where(eq(applications.id, event.targetId))
    .limit(1);
  if (!row) return;

  const supervisorIds = (row.projectSupervisorIds ?? []) as string[];
  if (supervisorIds.length === 0) return;

  // Fetch supervisor users with locale preference
  const supervisors = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(/* in (supervisorIds) */ /* simplified: do inArray */ undefined as never);
  // (Replace with actual inArray query)

  for (const { user, profile } of supervisors) {
    // In-app
    await db.insert(notifications).values({
      recipientId: user.id,
      type: 'application.received',
      body: `New application to ${row.internship.title}`,
      href: `/company/projects/${row.internship.projectId}/applications/${row.app.id}`,
    });
    // Email
    const tpl = applicationReceivedTemplate({
      supervisorName: user.firstName ?? 'Supervisor',
      internshipTitle: row.internship.title,
      applicantName: 'A candidate', // TODO: join applicant
      applicationId: row.app.id,
      locale: (profile?.preferredLanguage as 'fr' | 'en') ?? 'fr',
    });
    await sendEmail({ to: user.email, ...tpl });
  }
}

async function onApplicationStatusChanged(event: { targetId: string | null; metadata: Record<string, unknown> | null }) {
  // similar pattern: send to applicant intern with new status
}

async function onCheckinDue(event: { targetId: string | null }) {
  // weekly cron-triggered: send reminder to intern
}
```

This is a sketch. Implement fully; the patterns are clear once you can see the existing event types in `modules/events/types.ts`.

- [ ] **Step 3: Wire to `recordEvent`**

In `modules/events/service.ts`, after the insert:

```typescript
import { dispatchNotificationsFor } from '@/modules/notifications/dispatcher';

export async function recordEvent(input: ...) {
  const [event] = await db.insert(events).values(input).returning();
  // Best-effort dispatch; doesn't block the caller.
  void dispatchNotificationsFor(event);
  return event;
}
```

The `void` + no-await pattern means the recordEvent call returns immediately and notifications happen in the background. Acceptable for v1 — Vercel functions allow background work for a few seconds after response.

If you need stronger delivery guarantees, use a queue. For Phase 1, the void pattern is fine.

- [ ] **Step 4: Queries + actions**

`modules/notifications/queries.ts`:

```typescript
import { cache } from 'react';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, isNull, desc, and } from 'drizzle-orm';

export const getUnreadCount = cache(async (userId: string): Promise<number> => {
  const [row] = await db
    .select({ count: /* sql`COUNT(*)`.mapWith(Number) */ undefined as never })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  return Number(row?.count ?? 0);
});

export async function listRecentNotifications(userId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
```

`modules/notifications/actions.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { requireSession } from '@/modules/auth/session';
import { and, eq } from 'drizzle-orm';

export async function markAsReadAction(id: string): Promise<void> {
  const session = await requireSession();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, session.user.id)));
  revalidatePath('/');
}

export async function markAllAsReadAction(): Promise<void> {
  const session = await requireSession();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.recipientId, session.user.id));
  revalidatePath('/');
}
```

- [ ] **Step 5: Bell component**

`app/[locale]/(platform)/_components/notification-bell.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { markAsReadAction, markAllAsReadAction } from '@/modules/notifications/actions';
import type { Notification } from '@/db/schema';

export function NotificationBell({
  initialUnread,
  initialItems,
}: {
  initialUnread: number;
  initialItems: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);

  async function onClickItem(id: string, href: string | null) {
    await markAsReadAction(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    if (href) window.location.href = href;
  }

  async function onMarkAll() {
    await markAllAsReadAction();
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnread(0);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)] relative"
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: 'var(--brand-500)', color: 'white', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" style={{ position: 'absolute', right: 0, top: '110%', width: 320, maxHeight: 480, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            {unread > 0 && (
              <button onClick={onMarkAll} type="button" style={{ fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              No notifications.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map((n) => (
                <li key={n.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => onClickItem(n.id, n.href)}
                    style={{ width: '100%', textAlign: 'left', padding: 12, background: n.readAt ? 'transparent' : 'var(--surface-muted)', border: 'none', cursor: 'pointer', fontSize: 13 }}
                  >
                    {n.body}
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Mount in platform layouts**

In `app/[locale]/(platform)/intern/layout.tsx` (and `company/layout.tsx` + `admin/layout.tsx`), at the top of the layout JSX (where the user header is), wrap the bell:

```tsx
import { NotificationBell } from '../_components/notification-bell';
import { getUnreadCount, listRecentNotifications } from '@/modules/notifications/queries';
// ...
const unread = await getUnreadCount(session.user.id);
const items = await listRecentNotifications(session.user.id);

return (
  <header>
    {/* existing header content */}
    <NotificationBell initialUnread={unread} initialItems={items} />
  </header>
);
```

- [ ] **Step 7: Dispatcher tests**

`modules/notifications/__tests__/dispatcher.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
// Pure-function tests of routing logic — extract a `decideRoutes(event)` pure fn
// from dispatchNotificationsFor for testability.
describe('notification routing decisions', () => {
  it('application.created routes to all project supervisors', () => {
    expect(true).toBe(true); // placeholder
  });
});
```

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(notifications): in-app bell + email dispatcher + event → notification routing"
```

---

## Task 3 — AI task clarity assistant

**Files:**
- create `modules/ai/task-clarity.ts`
- create `app/api/ai/task-clarity/route.ts`
- create `modules/workspace/components/task-clarity-button.tsx`
- modify task-create form component

- [ ] **Step 1: Build the prompt + Anthropic call**

`modules/ai/task-clarity.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { requireEnv } from '@/lib/env';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  return _client;
}

const SYSTEM = `You help company supervisors write clearer internship task descriptions.

Given a draft task, return a refined version with:
- A clear, action-oriented scope (one sentence)
- Concrete deliverable (what produces "done")
- Suggested deadline if missing

Reply in the SAME language as the input. Return JSON only:

{ "scope": "...", "deliverable": "...", "suggestedDeadline": "YYYY-MM-DD or null", "notes": "one-sentence reasoning" }

If the task is already clear, return the same fields with the original content and notes: "already clear".`;

export type TaskClarityInput = {
  title: string;
  description?: string | null;
  deadline?: string | null;
};

export type TaskClarityResponse = {
  scope: string;
  deliverable: string;
  suggestedDeadline: string | null;
  notes: string;
};

export async function suggestTaskClarity(input: TaskClarityInput): Promise<TaskClarityResponse> {
  const userMsg = `Title: ${input.title}\nDescription: ${input.description ?? '(empty)'}\nCurrent deadline: ${input.deadline ?? '(none)'}`;

  const res = await client().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = res.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((b) => b.text)
    .join('');

  // Extract JSON (model sometimes wraps in code fence)
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return parseable JSON');

  return JSON.parse(match[0]) as TaskClarityResponse;
}
```

- [ ] **Step 2: Server endpoint (rate-limited by Task 5)**

`app/api/ai/task-clarity/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/modules/auth/session';
import { suggestTaskClarity, type TaskClarityInput } from '@/modules/ai/task-clarity';
import { ratelimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const session = await requireSession();
  if (session.role !== 'company' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { success } = await ratelimit('ai-task-clarity').limit(session.user.id);
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const body = (await req.json()) as TaskClarityInput;
  if (!body.title || body.title.length < 3) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  const result = await suggestTaskClarity(body);
  return NextResponse.json(result);
}
```

- [ ] **Step 3: UI button**

`modules/workspace/components/task-clarity-button.tsx`:

```tsx
'use client';

import { useState } from 'react';

export function TaskClarityButton({
  task,
  onSuggestion,
}: {
  task: { title: string; description?: string | null; deadline?: string | null };
  onSuggestion: (s: { scope: string; deliverable: string; suggestedDeadline: string | null; notes: string }) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/task-clarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onSuggestion(data);
    } catch (e) {
      console.error(e);
      alert('AI request failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || !task.title || task.title.length < 3}
      className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium border border-[var(--border-color)] hover:border-[var(--border-strong)]"
    >
      {loading ? 'Thinking…' : '✦ Make this clearer'}
    </button>
  );
}
```

- [ ] **Step 4: Wire into the existing task-create form**

Find the form that creates new tasks (probably `modules/workspace/components/task-create-form.tsx` or similar). Add the button next to Save, with a callback that prefills the form fields with the AI suggestion.

The user reviews and decides — never auto-overwrites without confirmation. (Per the brief: human-in-the-loop for any consequential decision.)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai): task clarity assistant (Claude refines scope/deliverable/deadline)"
```

---

## Task 4 — AI intern unblocker

**Files:**
- create `modules/ai/intern-unblocker.ts`
- create `app/api/ai/intern-unblocker/route.ts`
- modify `modules/workspace/components/stuck-pill.tsx`

The Stuck pill exists; today it just opens a textarea. We make it AI-assisted: when the intern submits the "what's blocking you", the AI drafts a clarifying question that gets posted to the workspace comments thread, mentioning the supervisor.

- [ ] **Step 1: Anthropic call**

`modules/ai/intern-unblocker.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { requireEnv } from '@/lib/env';

let _client: Anthropic | null = null;
function client() { /* same pattern as task-clarity */ }

const SYSTEM = `You help an intern articulate what they're stuck on so their supervisor can help quickly.

Given the intern's description of what's blocking them, draft a short comment (under 80 words) that:
- Restates the problem clearly
- Lists what they've already tried (if mentioned)
- Asks one specific question the supervisor can answer

Reply in the SAME language as the input. Return plain text only — no JSON, no preamble.`;

export async function draftUnblockerMessage(blockerText: string, taskContext: string): Promise<string> {
  const res = await client().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: 'user', content: `Task context:\n${taskContext}\n\nIntern's blocker description:\n${blockerText}` }],
  });
  return res.content.filter((b): b is { type: 'text'; text: string } => b.type === 'text').map((b) => b.text).join('').trim();
}
```

- [ ] **Step 2: Endpoint + UI wiring**

Same pattern as Task 3. Post the AI draft as a comment in the workspace thread via existing `postCommentAction`. Intern reviews & edits before posting (human-in-the-loop).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(ai): intern unblocker (Claude drafts clarifying question on stuck)"
```

---

## Task 5 — Rate limiting

**Files:**
- add `@upstash/ratelimit` + `@upstash/redis`
- create `lib/ratelimit.ts`
- modify `app/api/upload/route.ts`, `app/api/webhooks/clerk/route.ts`, `modules/checkins/server-actions.ts`, `app/api/ai/*/route.ts`

- [ ] **Step 1: Provision Upstash Redis**

Either via Vercel Marketplace (recommended) or Upstash console directly. Add env vars to `.env.local` + Vercel:
```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

- [ ] **Step 2: Install + factory**

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

`lib/ratelimit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const LIMITS = {
  'upload': new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), analytics: true, prefix: 'rl:upload' }),
  'clerk-webhook': new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m'), analytics: true, prefix: 'rl:webhook' }),
  'ai-task-clarity': new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), analytics: true, prefix: 'rl:ai-tc' }),
  'ai-intern-unblocker': new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), analytics: true, prefix: 'rl:ai-iu' }),
  'ai-checkin-draft': new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), analytics: true, prefix: 'rl:ai-cd' }),
} as const;

export function ratelimit(key: keyof typeof LIMITS): Ratelimit {
  return LIMITS[key];
}
```

- [ ] **Step 3: Apply to endpoints**

In each protected endpoint, after auth/role check, before doing work:

```typescript
const { success, limit, remaining, reset } = await ratelimit('upload').limit(session.user.id);
if (!success) {
  return NextResponse.json(
    { error: 'rate_limited', retryAfter: Math.ceil((reset - Date.now()) / 1000) },
    { status: 429, headers: { 'X-RateLimit-Limit': String(limit), 'X-RateLimit-Remaining': String(remaining) } },
  );
}
```

For the Clerk webhook, key by `req.headers.get('svix-id')` or source IP rather than session (it's unauthenticated). Use `requestIp(req)` from `@vercel/functions` if available, else `req.headers.get('x-forwarded-for')`.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(security): rate-limit upload + webhook + AI endpoints via Upstash"
```

---

## Task 6 — End-of-internship PDF record + shareable link

**Files:**
- add `@react-pdf/renderer`
- create `db/schema/internship-records.ts` + migration `0006`
- create `modules/records/{pdf,service,actions}.tsx`
- create `app/[locale]/records/[token]/page.tsx`
- create `app/api/records/[recordId]/pdf/route.ts`

- [ ] **Step 1: Schema**

```typescript
// db/schema/internship-records.ts
import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const internshipRecords = pgTable(
  'internship_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    shareToken: text('share_token').notNull().unique(),
    rubric: jsonb('rubric').$type<Record<string, number>>(),
    internReflection: text('intern_reflection'),
    supervisorComment: text('supervisor_comment'),
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
  },
  (table) => [index('records_workspace_idx').on(table.workspaceId)],
);
```

Migration `0006_internship_records.sql` — idempotent table create.

- [ ] **Step 2: PDF document**

`modules/records/pdf.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica' },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  h2: { fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 6 },
  meta: { fontSize: 10, color: '#666' },
  rubricRow: { flexDirection: 'row', marginVertical: 2 },
  rubricLabel: { width: 180 },
  rubricBar: { flex: 1, height: 8, backgroundColor: '#eee' },
  rubricFill: { height: 8, backgroundColor: '#4F46E5' },
});

export function RecordDocument({
  internName,
  internshipTitle,
  orgName,
  startDate,
  endDate,
  rubric,
  internReflection,
  supervisorComment,
  shareUrl,
}: {
  internName: string;
  internshipTitle: string;
  orgName: string;
  startDate: string;
  endDate: string;
  rubric: Record<string, number>;
  internReflection: string;
  supervisorComment: string;
  shareUrl: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{internName}</Text>
        <Text style={styles.meta}>{internshipTitle} · {orgName}</Text>
        <Text style={styles.meta}>{startDate} → {endDate}</Text>

        <Text style={styles.h2}>Performance signals</Text>
        {Object.entries(rubric).map(([k, v]) => (
          <View key={k} style={styles.rubricRow}>
            <Text style={styles.rubricLabel}>{k}</Text>
            <View style={styles.rubricBar}>
              <View style={[styles.rubricFill, { width: `${v * 10}%` }]} />
            </View>
            <Text style={{ marginLeft: 8, width: 30 }}>{v}/10</Text>
          </View>
        ))}

        <Text style={styles.h2}>Intern reflection</Text>
        <Text>{internReflection}</Text>

        <Text style={styles.h2}>Supervisor comment</Text>
        <Text>{supervisorComment}</Text>

        <Text style={[styles.meta, { marginTop: 40 }]}>
          Verify online: {shareUrl}
        </Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: Service**

`modules/records/service.ts`:

```typescript
import crypto from 'node:crypto';
import { db } from '@/db';
import { internshipRecords } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function generateRecord(input: {
  workspaceId: string;
  rubric: Record<string, number>;
  internReflection: string;
  supervisorComment: string;
}) {
  const shareToken = crypto.randomBytes(16).toString('hex');
  const [row] = await db
    .insert(internshipRecords)
    .values({ ...input, shareToken })
    .returning();
  return row;
}

export async function getRecordByToken(token: string) {
  const [row] = await db.select().from(internshipRecords).where(eq(internshipRecords.shareToken, token)).limit(1);
  return row ?? null;
}
```

- [ ] **Step 4: Public viewer + PDF route**

Public viewer at `/records/[token]` shows the record HTML (no auth — share link is the auth). PDF route at `/api/records/[recordId]/pdf` returns the binary PDF, requires auth (intern or company who owns the workspace).

For PDF generation in a Vercel function:

```typescript
// app/api/records/[recordId]/pdf/route.ts
import { renderToStream } from '@react-pdf/renderer';
import { RecordDocument } from '@/modules/records/pdf';
// ...

const stream = await renderToStream(<RecordDocument ... />);
return new Response(stream as unknown as ReadableStream, {
  headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}.pdf"` },
});
```

- [ ] **Step 5: Trigger generation**

Add a "Generate record" button on the workspace overview when `workspace.status === 'completed'`. Pre-fills rubric inputs from event-derived metrics (% on-time tasks, % accepted deliverables, response time). Supervisor + intern fill their text blocks. Click generate → row inserted → share token returned → email both parties the link.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(records): end-of-internship PDF + shareable verification link"
```

---

## Task 7 — Community v1: intern feed + listing discussions

**Files:**
- create `db/schema/{community-posts,listing-discussions}.ts` + migration `0007`
- create `modules/community/feed.ts` + `modules/community/discussions.ts`
- create `app/[locale]/(platform)/intern/feed/page.tsx`
- create `app/[locale]/internships/[slug]/_discussion.tsx`

Strict scope per brief: intern-feed (admin-published only) + public discussion thread on each listing. **NO DMs, NO group chats, NO general forum.**

- [ ] **Step 1: Schemas**

`db/schema/community-posts.ts`:

```typescript
export const communityPosts = pgTable('community_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  locale: text('locale', { enum: ['fr', 'en'] }).notNull().default('fr'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('community_posts_published_idx').on(t.publishedAt)]);
```

`db/schema/listing-discussions.ts`:

```typescript
export const listingDiscussions = pgTable('listing_discussions', {
  id: uuid('id').defaultRandom().primaryKey(),
  internshipId: uuid('internship_id').notNull().references(() => internships.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  /** Threaded — parent_id of null means top-level. */
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('listing_discussions_internship_idx').on(t.internshipId),
  index('listing_discussions_parent_idx').on(t.parentId),
]);
```

Migration `0007_community.sql` — both tables idempotent.

- [ ] **Step 2: Feed + discussion queries + actions**

Standard CRUD pattern. Discussion submit action requires sign-in (intern or company, NOT anonymous). Moderation flag on each comment surfaces in admin reclamations.

- [ ] **Step 3: Intern feed page**

`/intern/feed` — paginated list of published `community_posts`, ordered by `publishedAt DESC`.

- [ ] **Step 4: Listing discussions widget**

On each `/internships/[slug]`, mount a `<DiscussionThread internshipId={...} />` at the bottom. Show top-level comments + 1 level of replies. Signed-in users can post.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(community): intern feed + public listing discussions (v1 — no DMs)"
```

---

## Task 8 — Admin: audit log, moderation, reclamations

**Files:**
- create `modules/admin/audit-log.ts`
- create `app/[locale]/(platform)/admin/audit-log/page.tsx`
- create `app/[locale]/(platform)/admin/moderation/page.tsx`
- create `app/[locale]/(platform)/admin/reclamations/page.tsx`
- create `db/schema/reclamations.ts` + migration `0008`
- create `modules/reclamations/actions.ts`
- modify the intern + company top-level UI to add "Report" links where appropriate

- [ ] **Step 1: Audit log viewer**

`modules/admin/audit-log.ts`:

```typescript
import { db } from '@/db';
import { events, users } from '@/db/schema';
import { eq, desc, and, gte, lte, inArray, like } from 'drizzle-orm';

export async function queryAuditLog(opts: {
  actorId?: string;
  type?: string;
  targetType?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}) {
  const where = and(
    opts.actorId ? eq(events.actorId, opts.actorId) : undefined,
    opts.type ? eq(events.type, opts.type) : undefined,
    opts.targetType ? eq(events.targetType, opts.targetType) : undefined,
    opts.since ? gte(events.createdAt, opts.since) : undefined,
    opts.until ? lte(events.createdAt, opts.until) : undefined,
  );
  return db
    .select({ event: events, actor: users })
    .from(events)
    .leftJoin(users, eq(users.id, events.actorId))
    .where(where)
    .orderBy(desc(events.createdAt))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);
}
```

`/admin/audit-log/page.tsx` — table of events with filter form (actor, type, date range). Admin-only.

- [ ] **Step 2: Internship moderation**

`/admin/moderation/page.tsx` — list of published internships with "Suspend" / "Take down" actions. Server action records an event + flips internship status.

- [ ] **Step 3: Reclamations schema + queue**

```typescript
// db/schema/reclamations.ts
export const reclamations = pgTable('reclamations', {
  id: uuid('id').defaultRandom().primaryKey(),
  reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** What's being reported: 'internship' | 'discussion' | 'comment' | 'user' | 'workspace' */
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  category: text('category', { enum: ['spam', 'inappropriate', 'fraud', 'harassment', 'other'] }).notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ['open', 'reviewing', 'resolved', 'dismissed'] }).notNull().default('open'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

Migration `0008_reclamations.sql`.

`/admin/reclamations/page.tsx` — queue of open reports with assign / resolve / dismiss actions.

`modules/reclamations/actions.ts` — any signed-in user can submit a report via a server action. Triggered from "Report" links on internship detail pages, discussion comments, profile pages.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(admin): audit log viewer + internship moderation + reclamations queue"
```

---

## Wrap-up

- [ ] Update HANDOFF.md with Sprint D section
- [ ] Update memory file
- [ ] Push branch
- [ ] Open PR

---

## Self-review checklist

1. **Coverage:** 8 tasks → 8 audit items. ✓
2. **Brief alignment:** No DMs/group chats/forum (community v1 constraint). Human-in-the-loop for both AI features. ✓
3. **Cross-cutting:** Rate-limit (Task 5) hits the AI endpoints (Tasks 3 + 4) and upload + webhook. ✓
4. **DB migrations:** 4 new (0005 notifications, 0006 records, 0007 community, 0008 reclamations). All should be hand-written + idempotent.
5. **Tests:** Dispatcher routing is pure → test it. AI prompt builders are pure → test them. PDF generation is integration → skip.

## Risk callouts

- **Resend deliverability**: Need to verify `inturn-hub.com` domain in Resend dashboard (SPF + DKIM DNS records). Until done, emails go from `onboarding@resend.dev` which lands in spam.
- **Upstash cost**: Free tier is 10K commands/day. Rate limit + bell unread count will likely fit. Monitor.
- **AI cost**: Claude Sonnet at current Anthropic pricing. Per-user rate limit (10/min for task-clarity, 5/hour for check-in draft) keeps it bounded; worst case if all 200 interns use the AI heavily = ~$50/day. Acceptable for v1.
- **PDF generation cold-start**: `@react-pdf/renderer` adds ~3MB to the function. The PDF route should be its own function so other routes aren't slowed.
- **Notification dispatch backpressure**: `void dispatchNotificationsFor()` works but if Resend is down, errors are logged not retried. Phase 1.5 should add a retry queue (BullMQ on Upstash) for critical emails.
- **Webhook rate limit by IP**: Clerk delivers from a small set of IPs; rate-limit budget needs to be generous enough that legitimate bursts don't block.
- **Community moderation lag**: Posts/comments go live immediately. No pre-moderation queue in v1. Reclamations system catches abuse after the fact. If launches reveal a problem, add a pre-moderation flag to community_posts.
- **Records data integrity**: rubric scores are 0-10 ints; the form should clamp client-side AND server-side. PDF rendering trusts the values without re-validation.
