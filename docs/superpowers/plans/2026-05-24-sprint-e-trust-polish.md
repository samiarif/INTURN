# Sprint E — Trust & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the trust + legal + observability layer needed before charging anyone money. Closes the production-readiness gaps from the 2026-05-24 audit and scaffolds Stripe behind a feature flag so the billing switch can flip in month 8 per the brief.

**Architecture:** Ten tasks, mostly infrastructure (monitoring, rate-limit-already-done, legal pages, GDPR endpoints) plus optional WhatsApp + Stripe scaffolding. Each task ships independently. Builds on `sprint-d-engagement-layer`.

**Tech Stack:** `@sentry/nextjs` (new) · `cookies-next` or native (cookie banner) · `@vercel/analytics` (new) · `twilio` (new, optional) · `@next/bundle-analyzer` (new, dev only) · `stripe` + `@stripe/stripe-js` (new, scaffolding only). Same Drizzle + Neon + Vitest.

**Out of scope (Phase 1.5 / Phase 2):**
- Active subscription enforcement (Stripe ships off — month 8 flip)
- Multi-currency (defer per brief)
- University portal (defer per brief)
- Notification preferences UI (post-launch refinement)
- Two-factor auth (Clerk supports; defer until first request)

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `package.json` | modify | `@sentry/nextjs`, `@vercel/analytics`, `@next/bundle-analyzer`, `twilio` (opt), `stripe` + `@stripe/stripe-js` |
| `sentry.server.config.ts` | create | Sentry server init |
| `sentry.client.config.ts` | create | Sentry client init |
| `sentry.edge.config.ts` | create | Sentry edge init |
| `next.config.ts` | modify | Wrap with `withSentryConfig` + bundle analyzer |
| `app/[locale]/(marketing)/legal/privacy/page.tsx` | create | Privacy policy (FR + EN via i18n) |
| `app/[locale]/(marketing)/legal/terms/page.tsx` | create | Terms of service |
| `app/[locale]/(marketing)/legal/_layout.tsx` | create | Shared legal page layout |
| `locales/en.json` + `locales/fr.json` | modify | `legal.privacy.*`, `legal.terms.*`, `cookies.*` |
| `components/ui/cookie-banner.tsx` | create | Cookie consent banner (client) |
| `app/[locale]/layout.tsx` | modify | Mount cookie banner |
| `app/api/account/export/route.ts` | create | GDPR data export (JSON dump) |
| `app/api/account/delete/route.ts` | create | GDPR account deletion (intern + company) |
| `app/[locale]/(platform)/settings/page.tsx` | create | Account settings with export + delete buttons |
| `lib/analytics.ts` | create | Vercel Analytics wrapper (server-side track) |
| `app/[locale]/layout.tsx` | modify | Mount `<Analytics />` |
| `lib/sms.ts` | create | Twilio wrapper (optional, behind flag) |
| `modules/notifications/dispatcher.ts` | modify | Trigger SMS for `application.accepted` if intern opted in |
| `modules/workspace/components/workspace-overview-body.tsx` | modify | Per-card Suspense on activity feed |
| `db/schema/index.ts` + new schemas | create | `subscriptions`, `billing_events` tables (scaffolding only) |
| `db/migrations/0009_subscriptions.sql` | create | Stripe scaffolding tables |
| `lib/stripe.ts` | create | Stripe client + checkout-session helper |
| `app/api/billing/checkout/route.ts` | create | Create Stripe Checkout Session (feature-flagged) |
| `app/api/billing/webhook/route.ts` | create | Stripe webhook handler (signed) |
| `app/[locale]/(marketing)/pricing/page.tsx` | create | Pricing page (FR + EN) — Stripe button feature-flagged |
| `lib/flags.ts` | create | Feature flag layer (env-var-driven for now) |
| `modules/workspace/queries.ts` | modify | Wrap supervisor sidebar query — fix the N+1 the audit flagged |

---

## Task 1 — Sentry

**Files:**
- `package.json`
- `sentry.{server,client,edge}.config.ts`
- `next.config.ts`

- [ ] **Step 1: Install + run wizard**

```bash
cd /Users/mac/code/inturn-hub/inturn
npx @sentry/wizard@latest -i nextjs --skip-connect
```

Wizard will:
- create `sentry.*.config.ts` files
- modify `next.config.ts` to wrap with `withSentryConfig`
- create `instrumentation.ts` if needed (Next 16)

Review every change before committing.

- [ ] **Step 2: Configure DSN + sample rates**

In each `sentry.*.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? 'development',
  // Tracing
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.2 : 1.0,
  // Profiling (server-only)
  profilesSampleRate: 0.1,
  // Don't send events from local dev
  enabled: process.env.VERCEL_ENV !== undefined,
});
```

Add `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` to Vercel env vars (all environments).

- [ ] **Step 3: Replace the TODO in `error.tsx` files**

In all three error boundaries (root, platform, marketplace) from Sprint B, replace `console.error` with `Sentry.captureException`:

```tsx
'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
// ...
useEffect(() => {
  Sentry.captureException(error);
}, [error]);
```

- [ ] **Step 4: Add Sentry to API routes**

Wrap critical handlers with `Sentry.withScope`:

```typescript
// app/api/upload/route.ts (and others)
export async function POST(req: Request) {
  return Sentry.withScope(async (scope) => {
    scope.setTransactionName('POST /api/upload');
    // ... existing handler
  });
}
```

(Or rely on the auto-instrumentation if the wizard set it up — verify.)

- [ ] **Step 5: Verify**

After deploy: manually trigger an error (visit `/intern/workspaces/<bad-uuid>/timeline`). Confirm in Sentry dashboard the event arrives with correct environment + commit SHA + user context.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml sentry.*.config.ts next.config.ts app/[locale]/error.tsx 'app/[locale]/(platform)/error.tsx' 'app/[locale]/(marketing)/marketplace/error.tsx' instrumentation.ts
git commit -m "feat(observability): Sentry server + client + edge with PII-safe defaults"
```

---

## Task 2 — Privacy + Terms pages

**Files:**
- `app/[locale]/(marketing)/legal/{privacy,terms}/page.tsx`
- `locales/{en,fr}.json` (add `legal` namespace with full text)

Sam: this requires real legal text. Two options:
1. **Adapt a template** (Termly, iubenda, or open-source GDPR templates). Cheaper, faster, but generic.
2. **Brief Tunisian counsel** specialized in tech / data protection. Better; budget probably ~$500 for both docs.

If template route, use [https://termly.io/products/generators/](Termly's generator) — produces SaaS-tailored docs. Replace company name, jurisdiction (Tunisia), data controller email.

- [ ] **Step 1: Get the actual text (out of code; not for the implementer)**

This step is Sam-only. Implementer should write the page scaffolding with placeholder text and a clear `// TODO: legal review` marker.

- [ ] **Step 2: Add namespaces**

`locales/en.json`:

```json
"legal": {
  "privacy": {
    "title": "Privacy Policy",
    "updated": "Last updated: {date}",
    "intro": "Inturn (\"we\", \"our\") operates inturn-hub.com (the \"Service\"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.",
    "sections": [
      { "heading": "Data we collect", "body": "We collect data you provide when signing up (name, email), data Clerk provides (auth identifiers), data you provide in your profile (skills, CV file, university), and data generated by your use of the Service (applications, comments, deliverables, events)." },
      { "heading": "How we use it", "body": "To operate the matching marketplace, run workspaces, generate performance signals, and send transactional notifications. We do not sell personal data." },
      { "heading": "Retention", "body": "Account data: kept while your account exists. Workspace data: kept for the lifetime of the related internship plus 6 years (Tunisian commercial record retention). Event logs: 18 months." },
      { "heading": "Your rights", "body": "Access, export, rectification, deletion. Email hello@inturn-hub.com or use the in-app Account Settings to exercise these." },
      { "heading": "Cookies", "body": "We use a minimal set of strictly necessary cookies (session, auth, theme preference) and an optional analytics cookie. See the cookie banner on first visit." },
      { "heading": "Contact", "body": "hello@inturn-hub.com — Inturn, Tunis, Tunisia." }
    ]
  },
  "terms": {
    "title": "Terms of Service",
    "updated": "Last updated: {date}",
    "intro": "By using inturn-hub.com you agree to these Terms.",
    "sections": [
      { "heading": "Eligibility", "body": "You must be 16 or older. Minors between 16 and 18 must have parental consent if local law requires it." },
      { "heading": "Acceptable use", "body": "No spam, no fraud, no harassment. Companies may only post real internships. Interns may only apply with truthful profiles." },
      { "heading": "Intellectual property", "body": "You retain rights to content you create. By posting, you grant us a non-exclusive license to display and distribute it within the Service." },
      { "heading": "Liability", "body": "Service provided \"as is\". We are not party to the internship contract between intern and company." },
      { "heading": "Termination", "body": "We may suspend accounts that violate these Terms. You may delete your account anytime via Account Settings." },
      { "heading": "Governing law", "body": "Tunisian law. Disputes go to the courts of Tunis." }
    ]
  }
}
```

French equivalent in `locales/fr.json` — translate each block. (Skip the full text here; structurally identical.)

- [ ] **Step 3: Render**

`app/[locale]/(marketing)/legal/privacy/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.privacy' });
  return { title: `${t('title')} — Inturn`, description: t('intro') };
}

export default async function Page() {
  const t = await getTranslations('legal.privacy');
  const sections = t.raw('sections') as Array<{ heading: string; body: string }>;
  return (
    <article className="max-w-3xl mx-auto px-6 py-12 prose">
      <h1>{t('title')}</h1>
      <p className="text-sm text-[var(--ink-3)]">{t('updated', { date: '2026-05-24' })}</p>
      <p>{t('intro')}</p>
      {sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          <p>{s.body}</p>
        </section>
      ))}
    </article>
  );
}
```

Same shape for terms.

- [ ] **Step 4: Add footer links**

In `app/[locale]/page.tsx` (landing footer), the `Privacy` link should resolve to `/legal/privacy`. Add a `Terms` link too.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(legal): privacy + terms pages (FR + EN, scaffolding text)"
```

---

## Task 3 — Cookie banner + consent storage

**Files:**
- `components/ui/cookie-banner.tsx`
- `app/[locale]/layout.tsx`
- `locales/{en,fr}.json` (`cookies` namespace)

- [ ] **Step 1: Add `cookies` namespace**

```json
"cookies": {
  "title": "We use cookies",
  "body": "We use strictly necessary cookies for the app to work, plus an optional analytics cookie. Read our {privacyLink}.",
  "privacyLink": "privacy policy",
  "accept": "Accept all",
  "reject": "Necessary only",
  "manage": "Manage"
}
```

French equivalent.

- [ ] **Step 2: Banner component**

`components/ui/cookie-banner.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const COOKIE_KEY = 'inturn-consent';

function getConsent(): 'all' | 'necessary' | null {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_KEY}=`));
  if (!cookie) return null;
  const v = cookie.split('=')[1];
  return v === 'all' || v === 'necessary' ? v : null;
}

function setConsent(value: 'all' | 'necessary') {
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function CookieBanner() {
  const t = useTranslations('cookies');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setShow(true);
  }, []);

  if (!show) return null;

  function accept(value: 'all' | 'necessary') {
    setConsent(value);
    setShow(false);
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-md bg-[var(--surface)] border border-[var(--border-color)] rounded-lg shadow-lg p-4 z-50"
    >
      <h3 className="font-semibold text-[var(--ink)] mb-1">{t('title')}</h3>
      <p className="text-sm text-[var(--ink-2)] mb-3">
        {t.rich('body', {
          privacyLink: (chunks) => <Link href="/legal/privacy" className="underline">{chunks}</Link>,
        })}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => accept('all')}
          className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
        >
          {t('accept')}
        </button>
        <button
          type="button"
          onClick={() => accept('necessary')}
          className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium border border-[var(--border-color)] hover:border-[var(--border-strong)]"
        >
          {t('reject')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Mount in root layout**

In `app/[locale]/layout.tsx`, near the end of body:

```tsx
import { CookieBanner } from '@/components/ui/cookie-banner';
// ...
<body>
  {children}
  <CookieBanner />
</body>
```

- [ ] **Step 4: Gate Vercel Analytics on consent**

In Task 5 (analytics setup), only mount `<Analytics />` when consent === 'all'. Implementer should remember.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(legal): cookie consent banner (necessary + all options)"
```

---

## Task 4 — GDPR delete + export endpoints

**Files:**
- `app/api/account/export/route.ts`
- `app/api/account/delete/route.ts`
- `app/[locale]/(platform)/settings/page.tsx`

- [ ] **Step 1: Export route**

`app/api/account/export/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/modules/auth/session';
import { db } from '@/db';
import {
  users,
  profiles,
  applications,
  workspaces,
  internshipBookmarks,
  events,
  comments,
  deliverables,
  notifications,
} from '@/db/schema';
import { eq, or } from 'drizzle-orm';

export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const [
    user,
    profile,
    myApplications,
    myWorkspaces,
    myBookmarks,
    myEvents,
    myComments,
    myDeliverables,
    myNotifications,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)),
    db.select().from(profiles).where(eq(profiles.userId, userId)),
    db.select().from(applications).where(eq(applications.applicantId, userId)),
    db.select().from(workspaces).where(eq(workspaces.internId, userId)),
    db.select().from(internshipBookmarks).where(eq(internshipBookmarks.internId, userId)),
    db.select().from(events).where(eq(events.actorId, userId)),
    db.select().from(comments).where(eq(comments.authorId, userId)),
    db.select().from(deliverables).where(eq(deliverables.submittedBy, userId)),
    db.select().from(notifications).where(eq(notifications.recipientId, userId)),
  ]);

  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      user: user[0],
      profile: profile[0],
      applications: myApplications,
      workspaces: myWorkspaces,
      bookmarks: myBookmarks,
      events: myEvents,
      comments: myComments,
      deliverables: myDeliverables,
      notifications: myNotifications,
    },
    {
      headers: {
        'Content-Disposition': `attachment; filename="inturn-export-${userId}.json"`,
      },
    },
  );
}
```

- [ ] **Step 2: Delete route**

`app/api/account/delete/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { requireSession } from '@/modules/auth/session';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const session = await requireSession();

  // ON DELETE CASCADE on FK constraints will tear down profile, applications,
  // bookmarks, comments, workspaces (if intern's), notifications, etc.
  // Events authored by this user keep actorId NULL (FK is nullable).
  await db.delete(users).where(eq(users.id, session.user.id));

  // Delete the Clerk user too.
  const clerk = await clerkClient();
  await clerk.users.deleteUser(session.clerkId);

  return NextResponse.json({ ok: true });
}
```

> Audit the FK cascade behavior: confirm every reference to `users.id` either CASCADEs or SET NULL. If any are RESTRICT, the delete will fail.

- [ ] **Step 3: Settings page UI**

`app/[locale]/(platform)/settings/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [confirming, setConfirming] = useState(false);

  async function onExport() {
    window.location.href = '/api/account/export';
  }

  async function onDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const res = await fetch('/api/account/delete', { method: 'POST' });
    if (res.ok) window.location.href = '/';
    else alert('Delete failed. Contact support.');
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">{t('title')}</h1>

      <section className="border border-[var(--border-color)] rounded-lg p-6 mb-4">
        <h2 className="font-semibold mb-2">{t('export.title')}</h2>
        <p className="text-sm text-[var(--ink-2)] mb-4">{t('export.body')}</p>
        <button onClick={onExport} className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium border border-[var(--border-color)]">
          {t('export.cta')}
        </button>
      </section>

      <section className="border border-[var(--border-color)] rounded-lg p-6">
        <h2 className="font-semibold mb-2 text-red-600">{t('delete.title')}</h2>
        <p className="text-sm text-[var(--ink-2)] mb-4">{t('delete.body')}</p>
        <button
          onClick={onDelete}
          className={`inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium ${
            confirming ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-red-300 text-red-600 hover:bg-red-50'
          }`}
        >
          {confirming ? t('delete.confirm') : t('delete.cta')}
        </button>
      </section>
    </div>
  );
}
```

Add `settings` namespace to locale JSONs.

- [ ] **Step 4: Verify**

Sign in as a new test user → /settings → click Export → JSON file downloads with their data. Click Delete → confirms → click again → account gone, redirected home.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(gdpr): account export + delete with Clerk teardown"
```

---

## Task 5 — Vercel Analytics (consent-gated)

**Files:**
- `package.json`
- `lib/analytics.ts`
- `app/[locale]/layout.tsx`

- [ ] **Step 1: Install**

```bash
pnpm add @vercel/analytics
```

- [ ] **Step 2: Consent-gated mount**

In `app/[locale]/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/react';
import { cookies } from 'next/headers';

// inside layout:
const consent = (await cookies()).get('inturn-consent')?.value;
return (
  <html ...>
    <body>
      {children}
      {consent === 'all' && <Analytics />}
    </body>
  </html>
);
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(analytics): Vercel Analytics gated by cookie consent"
```

---

## Task 6 — Bundle analyzer in CI

**Files:**
- `package.json`
- `next.config.ts`

- [ ] **Step 1: Install + wire**

```bash
pnpm add -D @next/bundle-analyzer
```

In `next.config.ts`:

```typescript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// at export:
export default withBundleAnalyzer(withSentryConfig(withNextIntl(nextConfig), { /* ... */ }));
```

- [ ] **Step 2: Add npm script**

```json
"analyze": "ANALYZE=true pnpm build"
```

- [ ] **Step 3: Optional — CI size budget**

Add a CI step that fails if bundle exceeds N KB. Defer if scope creep.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: @next/bundle-analyzer for bundle inspection"
```

---

## Task 7 — Twilio WhatsApp (optional)

**Files:**
- `package.json` (`twilio` optional)
- `lib/sms.ts`
- modify `modules/notifications/dispatcher.ts` to send WhatsApp for `application.accepted`
- modify intern profile to capture phone + opt-in

- [ ] **Step 1: Install + env**

```bash
pnpm add twilio
```

Add to `.env.example`:
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ENABLE_WHATSAPP=false
```

- [ ] **Step 2: Wrapper**

`lib/sms.ts`:

```typescript
import twilio from 'twilio';

let _client: ReturnType<typeof twilio> | null = null;
function client() {
  if (!_client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

export async function sendWhatsApp({ to, body }: { to: string; body: string }) {
  if (process.env.ENABLE_WHATSAPP !== 'true') {
    console.log('[sms/disabled] would send to', to, body);
    return null;
  }
  const c = client();
  if (!c) throw new Error('Twilio not configured');
  return c.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${to}`,
    body,
  });
}
```

- [ ] **Step 3: Dispatcher hook**

In `modules/notifications/dispatcher.ts`, in `onApplicationStatusChanged` when status === 'accepted', fetch the intern's phone from profile (add `whatsapp_opt_in` column to profiles via small migration) and call `sendWhatsApp`.

- [ ] **Step 4: Profile UI for opt-in**

In onboarding/profile edit, add a checkbox: "Send me WhatsApp updates for accepted applications and check-in reminders".

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(whatsapp): Twilio WhatsApp on application.accepted (opt-in)"
```

---

## Task 8 — Per-card Suspense on activity feed

**Files:**
- `modules/workspace/components/workspace-overview-body.tsx`

The Sprint A perf pass put a single Suspense around the whole overview body. Activity feed is the slowest single query. Wrap it separately.

- [ ] **Step 1: Split into a child component**

Already roughly factored. In `workspace-overview-body.tsx`, find the ActivityFeed render and wrap:

```tsx
import { Suspense } from 'react';

<Suspense fallback={<ActivitySkeleton />}>
  <ActivityFeed workspaceId={workspaceId} />
</Suspense>
```

The ActivityFeed component should be an async server component that does its own query.

- [ ] **Step 2: Commit**

```bash
git commit -m "perf(workspace): per-card Suspense around activity feed"
```

---

## Task 9 — Stripe scaffolding (feature-flagged, off by default)

**Files:**
- `package.json`
- `lib/{stripe,flags}.ts`
- `db/schema/{subscriptions,billing-events}.ts` + migration `0009`
- `app/api/billing/{checkout,webhook}/route.ts`
- `app/[locale]/(marketing)/pricing/page.tsx`

Per the brief: "Start charging in month 8 even if pricing is wrong." We scaffold now, flip the flag later.

- [ ] **Step 1: Install + env**

```bash
pnpm add stripe @stripe/stripe-js
```

`.env.example`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
ENABLE_BILLING=false
```

- [ ] **Step 2: Flag layer**

`lib/flags.ts`:

```typescript
export const flags = {
  billing: process.env.ENABLE_BILLING === 'true',
  whatsapp: process.env.ENABLE_WHATSAPP === 'true',
} as const;
```

- [ ] **Step 3: Schemas**

```typescript
// db/schema/subscriptions.ts
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  plan: text('plan', { enum: ['starter', 'growth', 'enterprise'] }).notNull(),
  status: text('status', { enum: ['active', 'trialing', 'past_due', 'cancelled'] }).notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// db/schema/billing-events.ts
export const billingEvents = pgTable('billing_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripeEventId: text('stripe_event_id').notNull().unique(), // idempotency
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
});
```

Migration `0009_subscriptions.sql` idempotent.

- [ ] **Step 4: Stripe client + checkout**

`lib/stripe.ts`:

```typescript
import Stripe from 'stripe';
import { requireEnv } from './env';

let _client: Stripe | null = null;
export function stripe(): Stripe {
  if (!_client) _client = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  return _client;
}
```

`app/api/billing/checkout/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/modules/auth/session';
import { stripe } from '@/lib/stripe';
import { flags } from '@/lib/flags';

export async function POST(req: Request) {
  if (!flags.billing) return NextResponse.json({ error: 'Billing not enabled' }, { status: 403 });
  const session = await requireSession();
  if (session.role !== 'company') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { priceId } = (await req.json()) as { priceId: string };
  const cs = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: session.user.email,
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/company/dashboard?subscribed=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
    client_reference_id: session.user.id,
  });

  return NextResponse.json({ url: cs.url });
}
```

- [ ] **Step 5: Webhook**

`app/api/billing/webhook/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { requireEnv } from '@/lib/env';
import { db } from '@/db';
import { billingEvents, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get('stripe-signature') ?? '';
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, requireEnv('STRIPE_WEBHOOK_SECRET'));
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  // Idempotency
  try {
    await db.insert(billingEvents).values({ stripeEventId: event.id, type: event.type, payload: event.data });
  } catch {
    return new Response('Duplicate', { status: 200 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // upsert into subscriptions
      break;
  }

  return new Response('OK', { status: 200 });
}
```

- [ ] **Step 6: Pricing page (FR + EN)**

`app/[locale]/(marketing)/pricing/page.tsx` — three tiers, copy-stubbed:
- Starter (free): 1 internship at a time
- Growth (TND 90/mo): up to 5 simultaneous internships
- Enterprise (custom): unlimited + SLA + onboarding

The "Subscribe" button is disabled if `flags.billing === false`, instead shows "Coming soon — contact hello@inturn-hub.com".

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(billing): Stripe scaffolding + pricing page (flag-gated, off by default)"
```

---

## Task 10 — Misc DB cleanup (sidebar cache + supervisor N+1)

**Files:**
- `modules/workspace/queries.ts` — already cached in Sprint B perf hotfix. Confirm.
- `modules/workspace/queries.ts` `getActiveProjectsBySupervisor` — already filters via SQL after Sprint A. Confirm.
- Audit any remaining N+1 surfaces.

- [ ] **Step 1: Audit applications inbox**

The applications inbox (`app/[locale]/(platform)/company/projects/[projectId]/applications/page.tsx`) loads applications + applicant profile data. Check if there's an N+1 (separate query per row to get applicant name).

If so, refactor to a single join.

- [ ] **Step 2: Audit activity feed actor resolution**

Activity feed events have `actorId`. If the feed renders one user lookup per event, batch them via `inArray`.

- [ ] **Step 3: Commit**

```bash
git commit -m "perf: fix remaining N+1s in applications inbox + activity feed"
```

---

## Wrap-up

- [ ] HANDOFF.md updated
- [ ] Memory updated
- [ ] Branch pushed
- [ ] PR opened

---

## Self-review checklist

1. **Coverage:** 10 tasks → all P0/P1 production-readiness items from audit covered. ✓
2. **Stripe off:** `ENABLE_BILLING=false` by default; checkout returns 403. Pricing page shows "Coming soon" message. ✓
3. **GDPR:** delete + export work end-to-end, including Clerk teardown. ✓
4. **Sentry PII:** confirm `Sentry.init` has `sendDefaultPii: false` or actively scrubs email / IP. The wizard's default is conservative — verify.
5. **Cookie consent gates analytics:** Vercel Analytics only mounts when consent === 'all'.

## Risk callouts

- **Sentry quota**: free tier is 5K errors/month. Set sample rates conservatively in production.
- **Legal text liability**: scaffolded text is a starting point, NOT legal advice. Sam should get review before launch in Tunisia.
- **Stripe Tunisia**: Stripe doesn't operate in Tunisia. May need Paddle, Lemon Squeezy, or local TND processor. Scaffolding is provider-agnostic enough that swap is feasible.
- **GDPR delete cascade**: depends on existing FK constraints being CASCADE or SET NULL. If any are RESTRICT (e.g. applications → users via applicantId), delete will fail. Audit before shipping.
- **Whatsapp opt-in flow**: requires Twilio WhatsApp Business approval (can take weeks). Don't gate launch on this.
- **Bundle analyzer in CI**: produces a HTML report. CI doesn't surface it well; consider uploading to S3 or Vercel comment.
- **Subscriptions schema vs Clerk**: Clerk has `clerkUserId`; subscriptions belong to `organization`. If an org has multiple owners (currently rare), the subscription is org-scoped, not user-scoped. Schema reflects this correctly.
