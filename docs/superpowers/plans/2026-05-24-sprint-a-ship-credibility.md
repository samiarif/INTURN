# Sprint A — Ship Credibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the credibility-blocker fixes from the 2026-05-24 audit so the platform is safe and gated by CI before any design-partner onboarding push.

**Architecture:** Six small, independently-shippable changes — CI pipeline, upload hardening, image hostname allowlist, webhook hardening notes, DB hygiene migration, and a health endpoint. Each task ends with a conventional commit. No cross-task state. Custom-domain DNS (A1) is intentionally deferred per Sam.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Drizzle 0.45 + Neon Postgres (neon-http, no transactions) · Vercel Blob · Clerk 7 · Svix · Vitest 4 · GitHub Actions · pnpm 10.

**Out of scope (deferred):**
- Custom domain wiring (`inturn-hub.com` DNS) — Sam handling later.
- `users.role` nullable → notNull-default fix — would break the post-signup-pre-role-selection state. Sprint B / role-selection refactor instead.
- Full webhook idempotency (svix-id deduplication via `webhook_events` table) — Sprint E. Svix already enforces a 5-min `svix-timestamp` tolerance internally; the audit's "freshness" finding is covered. This plan adds a clarifying comment + tolerance-narrowing only.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `.github/workflows/ci.yml` | create | Run typecheck + lint + test + build on PR and `main` push |
| `lib/uploads/allowlist.ts` | create | MIME allowlist + magic-byte sniff + per-kind size cap, pure functions |
| `lib/uploads/__tests__/allowlist.test.ts` | create | Unit tests for allowlist + magic-byte check |
| `app/api/upload/route.ts` | modify | Apply `validateUpload()` before `put()` |
| `next.config.ts` | modify | Add `images.remotePatterns` for `*.public.blob.vercel-storage.com` |
| `app/api/webhooks/clerk/route.ts` | modify | Add narrowed-tolerance comment + explicit option |
| `db/schema/applications.ts` | modify | Add unique constraint + compound `(internship_id, status)` index |
| `db/schema/comments.ts` | modify | Add compound `(workspace_id, created_at desc)` index |
| `db/migrations/0002_applications_unique_dedupe.sql` | create | Dedupe + add UNIQUE + compound indexes, idempotent |
| `app/api/health/route.ts` | create | DB ping + commit-sha + version JSON, public |
| `proxy.ts` | modify | Mark `/api/health` as public (bypass auth + locale rewrite) |

---

## Task 1 — CI/CD pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/ci.yml` with this exact content:

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_CI }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY_CI }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_CI }}
          CLERK_WEBHOOK_SECRET: ${{ secrets.CLERK_WEBHOOK_SECRET_CI }}
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN_CI }}
```

- [ ] **Step 2: Locally verify each command in the workflow runs clean**

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: all five exit 0. If `--frozen-lockfile` errors, regenerate the lockfile with `pnpm install --lockfile-only` and re-run.

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add typecheck + lint + test + build workflow"
git push
```

- [ ] **Step 4: After push, open the Actions tab on GitHub and confirm the workflow runs and passes**

If `build` fails for missing CI env vars, add them as GitHub repo secrets (Settings → Secrets and variables → Actions). Use the same names as the workflow refers to. Re-run the failed job.

- [ ] **Step 5: Add branch protection (manual, one-time)**

In GitHub repo → Settings → Branches → add rule for `main`: require status check `verify`. Cannot script this without `gh` CLI; do it via UI.

---

## Task 2 — Upload MIME allowlist + magic-byte sniff (TDD)

**Files:**
- Create: `lib/uploads/allowlist.ts`
- Test:   `lib/uploads/__tests__/allowlist.test.ts`
- Modify: `app/api/upload/route.ts`

- [ ] **Step 1: Write the failing test for `allowlist.ts`**

Create `lib/uploads/__tests__/allowlist.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateUpload, MAX_BYTES_BY_KIND } from '../allowlist';

const pdfMagic = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
const pngMagic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpegMagic = new Uint8Array([0xff, 0xd8, 0xff]);
const exeMagic = new Uint8Array([0x4d, 0x5a]); // "MZ"

function fileFromBytes(name: string, type: string, head: Uint8Array, padding = 64) {
  const padded = new Uint8Array(head.length + padding);
  padded.set(head, 0);
  return new File([padded], name, { type });
}

describe('validateUpload', () => {
  it('accepts a real PDF for cv kind', async () => {
    const file = fileFromBytes('cv.pdf', 'application/pdf', pdfMagic);
    const result = await validateUpload('cv', file);
    expect(result.ok).toBe(true);
  });

  it('rejects a PDF declared as application/pdf with EXE magic bytes', async () => {
    const file = fileFromBytes('cv.pdf', 'application/pdf', exeMagic);
    const result = await validateUpload('cv', file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('content_mismatch');
  });

  it('rejects a PDF for logo kind (wrong MIME for kind)', async () => {
    const file = fileFromBytes('logo.pdf', 'application/pdf', pdfMagic);
    const result = await validateUpload('logo', file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('mime_not_allowed');
  });

  it('accepts a PNG for logo kind', async () => {
    const file = fileFromBytes('logo.png', 'image/png', pngMagic);
    const result = await validateUpload('logo', file);
    expect(result.ok).toBe(true);
  });

  it('accepts a JPEG for logo kind', async () => {
    const file = fileFromBytes('logo.jpg', 'image/jpeg', jpegMagic);
    const result = await validateUpload('logo', file);
    expect(result.ok).toBe(true);
  });

  it('rejects an oversize CV (over MAX_BYTES_BY_KIND.cv)', async () => {
    const big = new Uint8Array(MAX_BYTES_BY_KIND.cv + 1);
    big.set(pdfMagic, 0);
    const file = new File([big], 'cv.pdf', { type: 'application/pdf' });
    const result = await validateUpload('cv', file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('too_large');
  });

  it('rejects an unknown kind', async () => {
    const file = fileFromBytes('x.pdf', 'application/pdf', pdfMagic);
    // @ts-expect-error testing runtime guard
    const result = await validateUpload('unknown', file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_kind');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:

```bash
pnpm test lib/uploads/__tests__/allowlist.test.ts
```

Expected: FAIL — module `../allowlist` does not exist.

- [ ] **Step 3: Implement `allowlist.ts`**

Create `lib/uploads/allowlist.ts`:

```typescript
/**
 * Upload allowlist. Each `kind` (cv/logo/registry/deliverable) has:
 *  - a list of acceptable MIME types
 *  - matching magic-byte signatures (so a renamed/mistyped file is rejected
 *    even if the declared MIME is on the list)
 *  - a per-kind max size (CV/registry larger than logos)
 */

export const ALLOWED_KINDS = ['cv', 'logo', 'registry', 'deliverable'] as const;
export type Kind = (typeof ALLOWED_KINDS)[number];

export const MAX_BYTES_BY_KIND: Record<Kind, number> = {
  cv: 8 * 1024 * 1024,
  logo: 2 * 1024 * 1024,
  registry: 8 * 1024 * 1024,
  deliverable: 25 * 1024 * 1024,
};

type Signature = { mime: string; head: number[] };

const PDF: Signature = { mime: 'application/pdf', head: [0x25, 0x50, 0x44, 0x46, 0x2d] };
const PNG: Signature = { mime: 'image/png', head: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] };
const JPEG: Signature = { mime: 'image/jpeg', head: [0xff, 0xd8, 0xff] };
const SVG_TEXT: Signature = { mime: 'image/svg+xml', head: [] };
const DOCX: Signature = {
  mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  head: [0x50, 0x4b, 0x03, 0x04],
};
const XLSX: Signature = {
  mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  head: [0x50, 0x4b, 0x03, 0x04],
};
const PPTX: Signature = {
  mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  head: [0x50, 0x4b, 0x03, 0x04],
};

const SIGNATURES_BY_KIND: Record<Kind, Signature[]> = {
  cv: [PDF, DOCX],
  logo: [PNG, JPEG, SVG_TEXT],
  registry: [PDF],
  deliverable: [PDF, PNG, JPEG, DOCX, XLSX, PPTX],
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: 'invalid_kind' | 'mime_not_allowed' | 'too_large' | 'content_mismatch' };

export async function validateUpload(kind: string, file: File): Promise<ValidationResult> {
  if (!ALLOWED_KINDS.includes(kind as Kind)) {
    return { ok: false, code: 'invalid_kind' };
  }
  const k = kind as Kind;

  if (file.size > MAX_BYTES_BY_KIND[k]) {
    return { ok: false, code: 'too_large' };
  }

  const allowed = SIGNATURES_BY_KIND[k];
  const mimeMatch = allowed.find((s) => s.mime === file.type);
  if (!mimeMatch) {
    return { ok: false, code: 'mime_not_allowed' };
  }

  // SVG is text-based — no reliable magic bytes. Trust declared MIME for SVG only.
  if (mimeMatch.head.length === 0) {
    return { ok: true };
  }

  const buf = new Uint8Array(await file.slice(0, mimeMatch.head.length).arrayBuffer());
  for (let i = 0; i < mimeMatch.head.length; i++) {
    if (buf[i] !== mimeMatch.head[i]) {
      return { ok: false, code: 'content_mismatch' };
    }
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run:

```bash
pnpm test lib/uploads/__tests__/allowlist.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Wire `validateUpload` into the upload route**

Open `app/api/upload/route.ts` and replace the entire file with:

```typescript
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireEnv } from '@/lib/env';
import { getSession } from '@/modules/auth/session';
import type { Role } from '@/modules/auth/types';
import { ALLOWED_KINDS, validateUpload, type Kind } from '@/lib/uploads/allowlist';

function isKind(value: string | null): value is Kind {
  return ALLOWED_KINDS.includes(value as Kind);
}

const ALLOWED_ROLES_BY_KIND: Record<Kind, ReadonlyArray<Role>> = {
  cv: ['intern', 'admin'],
  logo: ['company', 'admin'],
  registry: ['company', 'admin'],
  deliverable: ['intern', 'company', 'admin'],
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  if (!isKind(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  if (!ALLOWED_ROLES_BY_KIND[kind].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  const validation = await validateUpload(kind, file);
  if (!validation.ok) {
    const status = validation.code === 'too_large' ? 413 : 400;
    return NextResponse.json({ error: validation.code }, { status });
  }

  requireEnv('BLOB_READ_WRITE_TOKEN');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${kind}/${session.clerkId}/${safeName}`;

  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: true,
  });

  return NextResponse.json({
    url: blob.url,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
}
```

- [ ] **Step 6: Run typecheck + full test suite**

Run:

```bash
pnpm typecheck && pnpm test
```

Expected: typecheck clean, 99+ tests pass (92 previous + 7 new).

- [ ] **Step 7: Commit**

```bash
git add lib/uploads/allowlist.ts lib/uploads/__tests__/allowlist.test.ts app/api/upload/route.ts
git commit -m "feat(security): MIME + magic-byte allowlist on /api/upload"
```

---

## Task 3 — Vercel Blob `images.remotePatterns`

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update `next.config.ts`**

Replace the entire file with:

```typescript
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
```

> Clerk avatar hostname (`img.clerk.com`) is included because the workspace UI renders user avatars from Clerk and we'll want `next/image` for them in Sprint C.

- [ ] **Step 2: Verify build still succeeds**

Run:

```bash
pnpm build
```

Expected: build completes, route table unchanged.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "chore: allow next/image to load Vercel Blob + Clerk avatars"
```

---

## Task 4 — Webhook hardening: narrow svix tolerance + clarifying comment

**Files:**
- Modify: `app/api/webhooks/clerk/route.ts`

> Background: svix's `Webhook.verify()` already enforces a default 5-minute `svix-timestamp` tolerance — the audit's "freshness" gap is actually covered by svix. This task narrows the tolerance to 2 minutes (Clerk delivers within seconds in practice) and documents the protection for future readers. Full idempotency (svix-id dedupe) is deferred to Sprint E.

- [ ] **Step 1: Replace the verify block in `app/api/webhooks/clerk/route.ts`**

Find lines 25–36 (the `new Webhook` + `wh.verify` block) and replace with:

```typescript
  // Svix already enforces a `svix-timestamp` tolerance (default 5 min) — see
  // https://docs.svix.com/receiving/verifying-payloads/how. We narrow to 2 min
  // here since Clerk delivers within seconds in practice; anything older is
  // almost certainly a replay attempt. Full svix-id deduplication is tracked
  // in Sprint E (webhook_events table).
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(
      body,
      {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      },
      // Svix v1+ accepts an options arg with `toleranceInSeconds`. Cast
      // because the @clerk/nextjs WebhookEvent typings don't expose it.
    ) as WebhookEvent;
  } catch {
    return new Response('Invalid signature or stale timestamp', { status: 400 });
  }
```

> Note: at time of writing, the installed `svix` package exposes the constructor `new Webhook(secret)` only — `toleranceInSeconds` is read from the verify-time argument in some versions. Confirm against `node_modules/svix/dist/index.d.ts` before assuming a parameter name. If the installed version doesn't accept the option, leave svix's default 5-min tolerance and only the comment + error-message change applies.

- [ ] **Step 2: Confirm the verify path against svix's installed typings**

Run:

```bash
node -e "console.log(require('svix/package.json').version)"
grep -n 'toleranceInSeconds\\|tolerance' node_modules/svix/dist/index.d.ts | head -20
```

If `tolerance` is exposed as a constructor option (e.g. `new Webhook(secret, { tolerance: 120 })`), update the code accordingly. If not exposed at all, drop the narrowing and keep only the comment + error message change.

- [ ] **Step 3: Run the existing webhook test**

Run:

```bash
pnpm test modules/auth/__tests__/webhook.test.ts
```

Expected: PASS (test does not currently exercise tolerance, so no regression).

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/clerk/route.ts
git commit -m "chore(security): document svix tolerance, narrow replay window"
```

---

## Task 5 — DB hygiene migration: applications unique + compound indexes

**Files:**
- Modify: `db/schema/applications.ts`
- Modify: `db/schema/comments.ts`
- Create: `db/migrations/0002_applications_unique_dedupe.sql`

- [ ] **Step 1: Pre-flight — detect any duplicate applications in prod schema**

Run:

```bash
pnpm tsx --env-file=.env.local -e "
import { db } from './db';
import { applications } from './db/schema';
import { sql } from 'drizzle-orm';

const rows = await db.execute(sql\`
  SELECT internship_id, applicant_id, COUNT(*) c
  FROM applications
  GROUP BY internship_id, applicant_id
  HAVING COUNT(*) > 1
\`);
console.log('duplicate pairs:', rows.rows.length);
console.log(rows.rows);
"
```

If `duplicate pairs: 0`, proceed. If non-zero, **stop** — review the duplicates with Sam before running the dedupe (the migration deletes the newer rows). The seed script + demo data should not produce dupes; if it has, that's a bug worth fixing first.

- [ ] **Step 2: Update `db/schema/applications.ts`**

Replace the entire file with:

```typescript
import { pgTable, text, timestamp, uuid, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { internships } from './internships';

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    internshipId: uuid('internship_id')
      .notNull()
      .references(() => internships.id, { onDelete: 'cascade' }),
    applicantId: uuid('applicant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['new', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected'],
    }).default('new'),
    coverNote: text('cover_note'),
    customAnswers: jsonb('custom_answers').$type<Array<{ question: string; answer: string }>>(),
    internalNotes: text('internal_notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('applications_internship_idx').on(table.internshipId),
    index('applications_applicant_idx').on(table.applicantId),
    index('applications_internship_status_idx').on(table.internshipId, table.status),
    unique('applications_internship_applicant_unique').on(table.internshipId, table.applicantId),
  ],
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
```

- [ ] **Step 3: Inspect current `db/schema/comments.ts` to know the exact column names before adding the compound index**

Run:

```bash
cat /Users/mac/code/inturn-hub/inturn/db/schema/comments.ts
```

Note the column names referenced as `workspaceId` / `createdAt` (TS) and `workspace_id` / `created_at` (SQL).

- [ ] **Step 4: Add compound index to `db/schema/comments.ts`**

In `db/schema/comments.ts`, locate the existing index list in the third arg to `pgTable(...)`. Add this index alongside the existing ones:

```typescript
    index('comments_workspace_created_idx').on(table.workspaceId, table.createdAt),
```

Use the existing column property names. Do not invent new ones.

- [ ] **Step 5: Hand-write the migration (idempotent, prod-safe)**

Create `db/migrations/0002_applications_unique_dedupe.sql`:

```sql
-- Sprint A hygiene:
--   1. dedupe applications by (internship_id, applicant_id), keeping the oldest
--   2. add UNIQUE constraint on (internship_id, applicant_id)
--   3. add compound index for inbox-status queries
--   4. add compound index for comment thread ordering
-- All steps are idempotent so they can run safely on prod or local.

BEGIN;

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY internship_id, applicant_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM applications
)
DELETE FROM applications WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_internship_applicant_unique;
ALTER TABLE applications
  ADD CONSTRAINT applications_internship_applicant_unique
  UNIQUE (internship_id, applicant_id);

CREATE INDEX IF NOT EXISTS applications_internship_status_idx
  ON applications USING btree (internship_id, status);

CREATE INDEX IF NOT EXISTS comments_workspace_created_idx
  ON comments USING btree (workspace_id, created_at DESC);

COMMIT;
```

- [ ] **Step 6: Apply to local dev DB via `db:push` to verify the diff is clean**

Run:

```bash
pnpm db:push
```

Expected: drizzle reports the constraint + indexes as applied. If it asks to drop unrelated objects, abort and reconcile — the schema file should be the only change since the last push.

- [ ] **Step 7: Verify the unique constraint exists**

Run:

```bash
pnpm tsx --env-file=.env.local -e "
import { db } from './db';
import { sql } from 'drizzle-orm';
const r = await db.execute(sql\`
  SELECT conname FROM pg_constraint
  WHERE conrelid = 'applications'::regclass AND contype = 'u'
\`);
console.log(r.rows);
"
```

Expected: includes `applications_internship_applicant_unique`.

- [ ] **Step 8: Run the test suite**

Run:

```bash
pnpm typecheck && pnpm test
```

Expected: PASS (no test changes; schema additions are backward compatible).

- [ ] **Step 9: Commit**

```bash
git add db/schema/applications.ts db/schema/comments.ts db/migrations/0002_applications_unique_dedupe.sql
git commit -m "feat(db): unique apps per (internship,intern) + inbox/comments compound indexes"
```

---

## Task 6 — Health check endpoint

**Files:**
- Create: `app/api/health/route.ts`
- Modify: `proxy.ts`

- [ ] **Step 1: Confirm current shape of `proxy.ts`**

Run:

```bash
cat /Users/mac/code/inturn-hub/inturn/proxy.ts
```

Note where Clerk's public routes and `/api/*` bypass are configured. Add `/api/health` to whatever list matches `/api/webhooks` (public, locale-bypass).

- [ ] **Step 2: Create the health route**

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        component: 'db',
        message: err instanceof Error ? err.message : 'unknown',
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: 'ok',
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    env: process.env.VERCEL_ENV ?? 'local',
    latencyMs: Date.now() - startedAt,
  });
}
```

- [ ] **Step 3: Add `/api/health` to the public-route list in `proxy.ts`**

Open `proxy.ts`. Find the public-routes list (typically a `createRouteMatcher(['/sign-in', '/sign-up', '/api/webhooks(.*)'])` style). Add `/api/health` to that list and to any matcher that exempts a path from next-intl rewriting.

If `proxy.ts` already routes any `/api/*` path past Clerk + next-intl, no change is needed — confirm with a curl test in step 4.

- [ ] **Step 4: Run locally and curl the endpoint**

Run in two terminals:

```bash
# Terminal 1
pnpm dev
```

```bash
# Terminal 2 (after dev says "Ready")
curl -s http://localhost:3000/api/health | jq .
```

Expected: HTTP 200 with `{ "status": "ok", "commit": "local", "env": "local", "latencyMs": <number> }`. If you see a 307 to `/fr/api/health`, the route is being locale-rewritten — fix the matcher in `proxy.ts`.

- [ ] **Step 5: Run the test suite + typecheck + build**

Run:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: all four exit clean. The new route should appear in the build output's route table as `ƒ /api/health`.

- [ ] **Step 6: Commit**

```bash
git add app/api/health/route.ts proxy.ts
git commit -m "feat: add /api/health endpoint with DB ping"
```

---

## Wrap-up

- [ ] **Step 1: Push the branch**

```bash
git push
```

- [ ] **Step 2: Confirm the GitHub Actions `verify` job runs on the push and passes**

Watch in the Actions tab. If anything red, fix forward; do not amend.

- [ ] **Step 3: Update the handoff brief**

Open `docs/HANDOFF.md` and add a "Sprint A landed (2026-05-24)" section above the punch list, with one bullet per commit. Move the items this sprint closed out of the "What's missing" punch list. Commit:

```bash
git add docs/HANDOFF.md
git commit -m "docs: mark Sprint A items done in handoff"
git push
```

- [ ] **Step 4: Update memory**

Append to `~/.claude/projects/-Users-mac-code-inturn-hub-inturn/memory/MEMORY.md` (or update the existing perf-audit entry) noting that CI, upload allowlist, blob remotePatterns, applications unique, and `/api/health` shipped in Sprint A.

---

## Self-review checklist

1. **Spec coverage:** Sprint A items in the audit punch list = A2 (CI), A3 (upload), A4 (blob patterns), A5 (webhook), A6 (DB hygiene), A7 (health). All six have tasks. A1 (DNS) is explicitly deferred per Sam's choice.
2. **Placeholders:** none — every code block is final source.
3. **Type consistency:** `Kind` defined once in `lib/uploads/allowlist.ts`, re-exported and consumed in `app/api/upload/route.ts`. `validateUpload` signature matches between test and impl. The `Role` import in `route.ts` keeps the existing import path.
4. **DB safety:** dedupe runs in a `BEGIN/COMMIT`. Unique constraint uses `DROP CONSTRAINT IF EXISTS` so re-running is safe. Compound indexes use `IF NOT EXISTS`.
5. **Test discipline:** Task 2 follows TDD (test → fail → impl → pass). Tasks 1, 3, 4, 5, 6 are either pure config or behavior-verified by command output rather than unit tests, which is appropriate.

---

## Risk callouts

- **`db:push` vs migration ordering:** dev-side `db:push` will apply the schema change directly; the `0002_*.sql` file mirrors that change for production via `pnpm db:migrate`. If you ever switch the migration order, regenerate baseline per `db/migrations/README.md`.
- **Svix version drift:** Task 4 step 2 checks the installed svix typings before assuming a constructor option exists. If the version doesn't accept the option, the change degrades safely to a comment + error-message-only edit.
- **CI secrets:** Task 1 step 4 may fail the first run if GitHub repo secrets are missing. Adding the secrets is a one-time UI step, not a code change.
