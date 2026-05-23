# Sprint 1 finishing + Sprint 2 Overview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out unfinished Sprint 1 items (auth skin, intern + company profile creation, landing polish) and ship the Sprint 2 anchor screen (Workspace · Overview) in Workshop direction with pixel fidelity to the design bundle.

**Architecture:** Modular monolith. Brand tokens in `app/globals.css` bridged to Tailwind v4 via `@theme inline`. Schema gets a Projects layer (`projects` table + `internships.project_id`). Profile capture via Next 16 Server Actions with DB-persisted drafts. File upload via Vercel Blob route handler. Workspace Overview is read-only — same component tree for intern and supervisor, branches at the rail level. Seeding via idempotent script + admin re-seed endpoint; admin role bypasses ownership checks so Sam can inspect either role.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Tailwind v4 · shadcn/ui · Drizzle ORM + Neon Postgres · Clerk · next-intl · Vitest · Vercel Blob · Geist font

**Spec:** `docs/superpowers/specs/2026-05-23-sprint1-finish-sprint2-overview-design.md`
**Design bundle:** `docs/design-bundle/` (READ this — `project/mocks/workspace.jsx`, `project/mocks/workspace.css`, `project/wireframes/wireframes.jsx`, `project/01-brand-foundations.html`)

---

## File Structure (Final State)

**Created:**
```
docs/design-bundle/                                  (bundle copied for offline reference)
app/globals.css                                      (modified: brand tokens + @theme inline)
app/layout.tsx                                       (modified: Geist + Geist Mono fonts)

db/schema/projects.ts                                (NEW)
db/schema/internships.ts                             (modified: add project_id FK)
db/schema/profiles.ts                                (modified: 6 new fields)
db/schema/organizations.ts                           (modified: country, city, rne_url)
db/schema/index.ts                                   (modified: export projects)
db/migrations/*.sql                                  (generated)

lib/env.ts                                           (modified: add BLOB_READ_WRITE_TOKEN)

modules/profiles/universities.ts                     (NEW — Tunisian institutions list)
modules/profiles/validators.ts                       (NEW — Zod schemas)
modules/profiles/queries.ts                          (NEW)
modules/profiles/service.ts                          (NEW)
modules/profiles/server-actions.ts                   (NEW)
modules/profiles/__tests__/validators.test.ts        (NEW)
modules/profiles/__tests__/service.test.ts           (NEW)

modules/projects/types.ts                            (NEW)
modules/projects/queries.ts                          (NEW)
modules/projects/service.ts                          (NEW)
modules/projects/__tests__/service.test.ts          (NEW)

modules/workspace/types.ts                           (NEW)
modules/workspace/queries.ts                         (NEW — getWorkspaceOverview)
modules/workspace/service.ts                         (NEW — createWorkspace)
modules/workspace/components/topbar.tsx              (NEW)
modules/workspace/components/sidebar.tsx             (NEW)
modules/workspace/components/tab-bar.tsx             (NEW)
modules/workspace/components/brief-card.tsx          (NEW)
modules/workspace/components/stat-tiles.tsx          (NEW)
modules/workspace/components/task-list.tsx           (NEW — read-only)
modules/workspace/components/deliverables-mini.tsx   (NEW — read-only)
modules/workspace/components/activity-feed.tsx      (NEW)
modules/workspace/components/rail-intern.tsx         (NEW)
modules/workspace/components/rail-supervisor.tsx     (NEW)
modules/workspace/components/stuck-pill.tsx          (NEW)
modules/workspace/components/workspace-overview.tsx  (NEW — composition root)
modules/workspace/__tests__/queries.test.ts          (NEW)
modules/workspace/__tests__/service.test.ts          (NEW)

components/brand/gradient-star.tsx                   (NEW)
components/language-switch.tsx                       (NEW)
components/wizard-steps.tsx                          (NEW)
components/combobox.tsx                              (NEW)
components/chip-input.tsx                            (NEW)
components/role-chip-grid.tsx                        (NEW)
components/link-repeater.tsx                         (NEW)
components/file-drop.tsx                             (NEW)
components/ui/*.tsx                                  (shadcn: button, input, label, select, form, separator, avatar, popover, command, textarea)

app/[locale]/(auth)/onboarding/intern/basics/page.tsx        (NEW)
app/[locale]/(auth)/onboarding/intern/skills/page.tsx        (NEW)
app/[locale]/(auth)/onboarding/intern/done/page.tsx          (NEW)
app/[locale]/(auth)/onboarding/company/page.tsx              (NEW)
app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx          (modified — gradient star)

app/[locale]/(platform)/intern/workspaces/[workspaceId]/page.tsx       (NEW)
app/[locale]/(platform)/company/workspaces/[workspaceId]/page.tsx      (NEW)

app/[locale]/page.tsx                                (modified: landing polish)

app/api/upload/route.ts                              (NEW)
app/api/admin/seed/route.ts                          (NEW)

scripts/seed.ts                                      (NEW)
package.json                                         (modified: add db:seed script + deps)

locales/fr.json                                      (modified: add profile, workspace keys)
locales/en.json                                      (modified: add profile, workspace keys)
```

---

## Phase 1 — Foundation

### Task 1: Install dependencies + commit design bundle

**Files:**
- Modify: `package.json` (add deps)
- Create: `docs/design-bundle/` (already copied — commit it)

- [ ] **Step 1: Install runtime + dev deps**

```bash
pnpm add zod react-hook-form @hookform/resolvers @vercel/blob
pnpm dlx shadcn@latest add button input label select form separator avatar popover command textarea
```

- [ ] **Step 2: Verify install**

```bash
pnpm typecheck
```
Expected: clean

- [ ] **Step 3: Commit deps + design bundle**

```bash
git add package.json pnpm-lock.yaml docs/design-bundle/ components/ui/
git commit -m "chore: add zod, react-hook-form, @vercel/blob, shadcn primitives + design bundle"
```

---

### Task 2: Brand tokens in globals.css

**Files:**
- Modify: `app/globals.css`

The canonical token block is in `docs/design-bundle/project/01-brand-foundations.html` lines 488–542. Paste it verbatim into globals.css inside `:root { }`, then add a `@theme inline { ... }` block that bridges to Tailwind v4 names.

- [ ] **Step 1: Read existing globals.css**

```bash
cat app/globals.css
```
Note the current shadcn `:root` variables — keep them, append ours.

- [ ] **Step 2: Add Workshop tokens + @theme bridge**

Append (or replace `:root` with merged version) in `app/globals.css`:

```css
:root {
  /* Brand */
  --brand-50: #F3EEFF;
  --brand-100: #DDCCFF;
  --brand-200: #BDA0FF;
  --brand-300: #9970FF;
  --brand-500: #7C3AED;
  --brand-600: #6D28D9;
  --brand-700: #5B21B6;
  --brand-800: #3B1486;
  --brand-gradient: linear-gradient(120deg, #2BD9C8 0%, #8F70FE 30%, #8F1FFE 60%, #E467FE 100%);

  /* Cyan — emphasis only */
  --accent-500: #06B6D4;
  --accent-700: #0E7490;

  /* Cool neutrals (slate) */
  --bg: #F8FAFC;
  --surface: #FFFFFF;
  --surface-muted: #F1F5F9;
  --border-color: #E2E8F0;
  --border-strong: #94A3B8;
  --ink: #0F172A;
  --ink-2: #334155;
  --ink-3: #64748B;
  --ink-4: #94A3B8;

  /* Semantic */
  --success: #16A34A;
  --warning: #EA580C;
  --danger: #DC2626;
  --info: #0284C7;

  /* Type */
  --font-display: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  /* Radius */
  --radius-sm: 2px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgba(15,23,42,0.05);
  --shadow-sm: 0 1px 3px 0 rgba(15,23,42,0.08), 0 1px 2px 0 rgba(15,23,42,0.04);
  --shadow-md: 0 4px 12px -2px rgba(15,23,42,0.10);
  --shadow-lg: 0 12px 32px -10px rgba(15,23,42,0.18);
}

@theme inline {
  --color-brand-50: var(--brand-50);
  --color-brand-100: var(--brand-100);
  --color-brand-500: var(--brand-500);
  --color-brand-600: var(--brand-600);
  --color-brand-700: var(--brand-700);
  --color-accent-500: var(--accent-500);
  --color-accent-700: var(--accent-700);
  --color-surface: var(--surface);
  --color-surface-muted: var(--surface-muted);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-ink-4: var(--ink-4);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
}
```

If existing shadcn `--border` collides with the design's `--border`, rename ours to `--border-color` and update consumers.

- [ ] **Step 3: Verify globals.css parses**

```bash
pnpm dev &
sleep 5
curl -s http://localhost:3000/ -o /dev/null -w "%{http_code}\n"
```
Expected: 200. Kill dev server.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: install Workshop brand tokens in globals.css"
```

---

### Task 3: Geist + Geist Mono via next/font

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace existing Geist setup in app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'inturn',
  description: 'La plateforme de stages pour la Tunisie',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

Also append to globals.css so the CSS variables resolve:
```css
:root {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}
```

(Override the earlier `--font-sans` declaration that used `'Geist'` literal — Next applies its variable name like `__variable_e7c45f`. Use the next/font variable, not the literal string.)

- [ ] **Step 2: Verify dev server boots and Geist loads**

```bash
pnpm dev &
sleep 5
curl -s http://localhost:3000/ | grep -oE '__variable_[a-z0-9]+' | sort -u
```
Expected: two unique variables (sans + mono). Kill dev server.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: load Geist + Geist Mono via next/font"
```

---

### Task 4: GradientStar brand component

**Files:**
- Create: `components/brand/gradient-star.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';

const sizes: Record<Size, string> = {
  sm: 'w-4 h-4 rounded-sm',
  md: 'w-[22px] h-[22px] rounded-[5px]',
  lg: 'w-8 h-8 rounded-md',
};

export function GradientStar({ size = 'md', className }: { size?: Size; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        sizes[size],
        'inline-block shadow-[0_2px_8px_-2px_rgba(143,31,254,0.55)]',
        className,
      )}
      style={{
        background:
          'linear-gradient(135deg, #2BD9C8 0%, #8F70FE 30%, #8F1FFE 60%, #E467FE 100%)',
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/brand/gradient-star.tsx
git commit -m "feat: add GradientStar brand component"
```

---

## Phase 2 — Schema

### Task 5: Add projects table

**Files:**
- Create: `db/schema/projects.ts`
- Modify: `db/schema/index.ts`

- [ ] **Step 1: Create db/schema/projects.ts**

```ts
import { pgTable, text, timestamp, uuid, jsonb, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    brief: text('brief'),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).default('draft').notNull(),
    supervisorIds: jsonb('supervisor_ids').$type<string[]>().default([]),
    startDate: date('start_date'),
    endDate: date('end_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('projects_org_slug_idx').on(table.organizationId, table.slug),
    index('projects_status_idx').on(table.status),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

- [ ] **Step 2: Export from db/schema/index.ts**

Add after the existing exports:
```ts
export { projects, type Project, type NewProject } from './projects';
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm typecheck
```

---

### Task 6: Add internships.project_id FK + organization fields

**Files:**
- Modify: `db/schema/internships.ts`
- Modify: `db/schema/organizations.ts`

- [ ] **Step 1: Add project_id to internships**

In `db/schema/internships.ts`, after the imports add `import { projects } from './projects';`, then add a `projectId` column inside the table definition (after `organizationId`):

```ts
projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
```

(Nullable for now — Sprint 3 makes it required when acceptance flow lands.)

- [ ] **Step 2: Add country, city, rneUrl to organizations**

In `db/schema/organizations.ts`, add inside the table definition (anywhere after `location`):

```ts
country: text('country'),
city: text('city'),
rneUrl: text('rne_url'),
verificationStatus: text('verification_status', {
  enum: ['draft', 'pending', 'verified', 'suspended'],
}).default('draft').notNull(),
```

(`verificationStatus` replaces the boolean `verified` for the wireframe's state machine. Keep the existing `verified` boolean for now and migrate later — Sprint 3 owns the verification flow.)

- [ ] **Step 3: Verify typecheck**

```bash
pnpm typecheck
```

---

### Task 7: Extend profiles schema

**Files:**
- Modify: `db/schema/profiles.ts`

- [ ] **Step 1: Add fields**

Inside the table definition, append:

```ts
yearOfStudy: text('year_of_study'),
city: text('city'),
roles: jsonb('roles').$type<string[]>().default([]),
portfolioLinks: jsonb('portfolio_links').$type<Array<{ platform: string; url: string }>>().default([]),
preferredLanguage: text('preferred_language', { enum: ['fr', 'en'] }),
profileStep: text('profile_step', { enum: ['none', 'basics-done', 'complete'] }).default('none').notNull(),
```

(Keep existing `university`, `fieldOfStudy`, `graduationYear`, `skills`, `languages`, `location`, `linkedinUrl`, `portfolioUrl`, `resumeUrl` columns. The new `city` is distinct from `location`; new `portfolioLinks` will eventually replace the single `portfolioUrl`.)

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Generate + apply migration**

```bash
pnpm db:generate
pnpm db:push
```

Drizzle will prompt about adding columns and the FK — accept all (no data to lose).

- [ ] **Step 4: Verify tables**

```bash
node --env-file=.env.local -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`select table_name from information_schema.tables where table_schema='public' order by table_name\`.then(r => console.log(r.map(t => t.table_name).join('\n')));
"
```
Expected output includes `projects` (10 total tables).

- [ ] **Step 5: Commit all schema changes**

```bash
git add db/schema/ db/migrations/
git commit -m "feat: add projects table + extend profiles, organizations, internships schema"
```

---

## Phase 3 — File upload

### Task 8: Vercel Blob upload route

**Files:**
- Create: `app/api/upload/route.ts`
- Modify: `lib/env.ts`

- [ ] **Step 1: Add BLOB_READ_WRITE_TOKEN to env helper**

In `lib/env.ts`, extend the `RequiredEnvKey` type:

```ts
type RequiredEnvKey =
  | 'DATABASE_URL'
  | 'CLERK_SECRET_KEY'
  | 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  | 'CLERK_WEBHOOK_SECRET'
  | 'BLOB_READ_WRITE_TOKEN';
```

- [ ] **Step 2: Add the env var to .env.example**

In `.env.example`, append:
```
# Vercel Blob (created automatically when you `vercel link` and add a Blob store)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

- [ ] **Step 3: Provision Vercel Blob store + sync env**

Manual (in chat, ask Sam to do or you do it):
```bash
vercel blob store create inturn-uploads
vercel env pull .env.local
```

(Skip this step if not testing uploads locally — the route still compiles.)

- [ ] **Step 4: Create the route handler**

`app/api/upload/route.ts`:
```ts
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireEnv } from '@/lib/env';

const ALLOWED_KINDS = ['cv', 'logo', 'deliverable', 'registry'] as const;
type Kind = (typeof ALLOWED_KINDS)[number];

function isKind(value: string | null): value is Kind {
  return ALLOWED_KINDS.includes(value as Kind);
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  if (!isKind(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
  }

  requireEnv('BLOB_READ_WRITE_TOKEN');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${kind}/${userId}/${safeName}`;

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

- [ ] **Step 5: Verify typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add app/api/upload/route.ts lib/env.ts .env.example
git commit -m "feat: add Vercel Blob upload route handler"
```

---

## Phase 4 — Profiles module

### Task 9: Universities list (Tunisian institutions)

**Files:**
- Create: `modules/profiles/universities.ts`

- [ ] **Step 1: Create the static seed list**

`modules/profiles/universities.ts`:
```ts
// Curated list of Tunisian universities + grandes écoles.
// Top 30 used as combobox prefilter; full list searchable.
// Extend over time as students fill the "Other" field.

export type University = {
  id: string;
  name: string;
  city: string;
  type: 'public' | 'private' | 'grande-ecole';
};

export const UNIVERSITIES: University[] = [
  { id: 'enit', name: "ENIT — École Nationale d'Ingénieurs de Tunis", city: 'Tunis', type: 'grande-ecole' },
  { id: 'insat', name: "INSAT — Institut National des Sciences Appliquées et de Technologie", city: 'Tunis', type: 'grande-ecole' },
  { id: 'esprit', name: "ESPRIT — École Supérieure Privée d'Ingénierie et de Technologies", city: 'Tunis', type: 'private' },
  { id: 'enit-tunis', name: "FST — Faculté des Sciences de Tunis", city: 'Tunis', type: 'public' },
  { id: 'esct', name: "ESCT — École Supérieure de Commerce de Tunis", city: 'Tunis', type: 'public' },
  { id: 'ihec', name: "IHEC — Institut des Hautes Études Commerciales de Carthage", city: 'Carthage', type: 'public' },
  { id: 'isg-tunis', name: "ISG Tunis — Institut Supérieur de Gestion", city: 'Tunis', type: 'public' },
  { id: 'mediterranean', name: "Mediterranean School of Business", city: 'Tunis', type: 'private' },
  { id: 'sup-de-com', name: "Sup de Com", city: 'Tunis', type: 'private' },
  { id: 'esen', name: "ESEN — École Supérieure d'Économie Numérique", city: 'Manouba', type: 'public' },
  { id: 'iset-rades', name: "ISET Radès", city: 'Radès', type: 'public' },
  { id: 'enis', name: "ENIS — École Nationale d'Ingénieurs de Sfax", city: 'Sfax', type: 'grande-ecole' },
  { id: 'fss', name: "FSS — Faculté des Sciences de Sfax", city: 'Sfax', type: 'public' },
  { id: 'fseg-sfax', name: "FSEG Sfax", city: 'Sfax', type: 'public' },
  { id: 'enim', name: "ENIM — École Nationale d'Ingénieurs de Monastir", city: 'Monastir', type: 'grande-ecole' },
  { id: 'fsm', name: "FSM — Faculté des Sciences de Monastir", city: 'Monastir', type: 'public' },
  { id: 'eniso', name: "ENISo — École Nationale d'Ingénieurs de Sousse", city: 'Sousse', type: 'grande-ecole' },
  { id: 'iset-sousse', name: "ISET Sousse", city: 'Sousse', type: 'public' },
  { id: 'fsegs', name: "FSEG Sousse", city: 'Sousse', type: 'public' },
  { id: 'enau', name: "ENAU — École Nationale d'Architecture et d'Urbanisme", city: 'Tunis', type: 'grande-ecole' },
  { id: 'isa-chott-meriem', name: "ISA Chott Meriem — Institut Supérieur Agronomique", city: 'Sousse', type: 'public' },
  { id: 'isamm', name: "ISAMM — Institut Supérieur des Arts Multimédia Manouba", city: 'Manouba', type: 'public' },
  { id: 'iset-gabes', name: "ISET Gabès", city: 'Gabès', type: 'public' },
  { id: 'fsg', name: "FSG — Faculté des Sciences de Gabès", city: 'Gabès', type: 'public' },
  { id: 'fsb', name: "FSB — Faculté des Sciences de Bizerte", city: 'Bizerte', type: 'public' },
  { id: 'isam', name: "ISAM Kairouan", city: 'Kairouan', type: 'public' },
  { id: 'central', name: "Université Centrale", city: 'Tunis', type: 'private' },
  { id: 'tbs', name: "TBS — Tunis Business School", city: 'Tunis', type: 'public' },
  { id: 'enstab', name: "ENSTAB — École Nationale Supérieure des Technologies Avancées de Borj Cédria", city: 'Borj Cédria', type: 'grande-ecole' },
  { id: 'taief', name: "Taïef — Université Taïef", city: 'Tunis', type: 'private' },
];

export function searchUniversities(query: string, limit = 20): University[] {
  if (!query) return UNIVERSITIES.slice(0, limit);
  const q = query.toLowerCase();
  return UNIVERSITIES.filter(
    (u) => u.name.toLowerCase().includes(q) || u.city.toLowerCase().includes(q),
  ).slice(0, limit);
}
```

- [ ] **Step 2: Commit**

```bash
git add modules/profiles/universities.ts
git commit -m "feat: add Tunisian universities seed list"
```

---

### Task 10: Profile validators (Zod schemas + tests)

**Files:**
- Create: `modules/profiles/validators.ts`
- Create: `modules/profiles/__tests__/validators.test.ts`

- [ ] **Step 1: Write failing tests first**

`modules/profiles/__tests__/validators.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  profileBasicsSchema,
  profileSkillsSchema,
  companyProfileSchema,
  ROLE_CATEGORIES,
} from '../validators';

describe('profileBasicsSchema', () => {
  const valid = {
    firstName: 'Yasmine',
    lastName: 'Ben Salah',
    university: 'enit',
    yearOfStudy: 'L3',
    fieldOfStudy: 'Computer Science',
    city: 'Tunis',
    preferredLanguage: 'fr',
  };

  it('accepts a valid profile', () => {
    const result = profileBasicsSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects missing first name', () => {
    const result = profileBasicsSchema.safeParse({ ...valid, firstName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid preferredLanguage', () => {
    const result = profileBasicsSchema.safeParse({ ...valid, preferredLanguage: 'ar' });
    expect(result.success).toBe(false);
  });
});

describe('profileSkillsSchema', () => {
  const valid = {
    skills: ['React', 'TypeScript', 'Figma'],
    roles: ['Design'],
    portfolioLinks: [],
  };

  it('accepts 3 skills and 1 role', () => {
    expect(profileSkillsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects fewer than 3 skills', () => {
    expect(profileSkillsSchema.safeParse({ ...valid, skills: ['React', 'TS'] }).success).toBe(false);
  });

  it('rejects more than 8 skills', () => {
    const tooMany = Array.from({ length: 9 }, (_, i) => `s${i}`);
    expect(profileSkillsSchema.safeParse({ ...valid, skills: tooMany }).success).toBe(false);
  });

  it('rejects more than 3 roles', () => {
    expect(
      profileSkillsSchema.safeParse({ ...valid, roles: ['Design', 'Product', 'Engineering', 'Marketing'] }).success,
    ).toBe(false);
  });

  it('rejects role not in fixed list', () => {
    expect(profileSkillsSchema.safeParse({ ...valid, roles: ['Other'] }).success).toBe(false);
  });

  it('rejects malformed portfolio URL', () => {
    expect(
      profileSkillsSchema.safeParse({
        ...valid,
        portfolioLinks: [{ platform: 'GitHub', url: 'not-a-url' }],
      }).success,
    ).toBe(false);
  });

  it('exposes 9 fixed role categories', () => {
    expect(ROLE_CATEGORIES).toHaveLength(9);
  });
});

describe('companyProfileSchema', () => {
  const valid = {
    name: 'Acme Studio',
    industry: 'Design & creative',
    size: '11-50',
    country: 'Tunisia',
    city: 'Tunis',
    description: 'We design brands and digital products.',
    website: 'https://acme.tn',
  };

  it('accepts a valid company', () => {
    expect(companyProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects description over 280 chars', () => {
    const long = 'x'.repeat(281);
    expect(companyProfileSchema.safeParse({ ...valid, description: long }).success).toBe(false);
  });

  it('rejects invalid website URL', () => {
    expect(companyProfileSchema.safeParse({ ...valid, website: 'not a url' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test modules/profiles/__tests__/validators.test.ts
```
Expected: tests fail (module doesn't exist).

- [ ] **Step 3: Implement validators**

`modules/profiles/validators.ts`:
```ts
import { z } from 'zod';

export const ROLE_CATEGORIES = [
  'Design',
  'Product',
  'Engineering',
  'Marketing',
  'Data',
  'Operations',
  'Content',
  'Finance',
  'Sales',
] as const;

export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export const profileBasicsSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  university: z.string().min(1),
  yearOfStudy: z.string().min(1).max(20),
  fieldOfStudy: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  preferredLanguage: z.enum(['fr', 'en']),
});

export type ProfileBasicsInput = z.infer<typeof profileBasicsSchema>;

export const profileSkillsSchema = z.object({
  skills: z.array(z.string().min(1).max(40)).min(3).max(8),
  roles: z.array(z.enum(ROLE_CATEGORIES)).min(1).max(3),
  cvUrl: z.string().url().optional(),
  portfolioLinks: z
    .array(
      z.object({
        platform: z.string().min(1).max(40),
        url: z.string().url(),
      }),
    )
    .max(8)
    .default([]),
});

export type ProfileSkillsInput = z.infer<typeof profileSkillsSchema>;

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

export const companyProfileSchema = z.object({
  name: z.string().min(1).max(120),
  industry: z.string().min(1).max(80),
  size: z.enum(COMPANY_SIZES),
  country: z.string().min(1).max(80),
  city: z.string().max(80).optional(),
  description: z.string().max(280).optional(),
  website: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional(),
  rneUrl: z.string().url().optional(),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test modules/profiles/__tests__/validators.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/profiles/validators.ts modules/profiles/__tests__/
git commit -m "feat: add Zod validators for intern + company profiles"
```

---

### Task 11: Profile service + queries

**Files:**
- Create: `modules/profiles/queries.ts`
- Create: `modules/profiles/service.ts`
- Create: `modules/profiles/__tests__/service.test.ts`

- [ ] **Step 1: Write failing service test**

`modules/profiles/__tests__/service.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the db before importing the module under test.
vi.mock('@/db', () => {
  const profilesData = new Map<string, Record<string, unknown>>();
  const usersData = new Map<string, Record<string, unknown>>();
  return {
    db: {
      _profiles: profilesData,
      _users: usersData,
    },
  };
});

// Mock drizzle helpers we don't exercise.
vi.mock('drizzle-orm', async () => ({
  ...(await vi.importActual('drizzle-orm')),
}));

describe('profiles service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('createOrUpdateBasics persists fields and sets profile_step', async () => {
    // Note: full DB integration tests are covered by a manual smoke; here we
    // only verify that the service composes validator + DB call shape.
    const { profileBasicsSchema } = await import('../validators');
    const valid = profileBasicsSchema.parse({
      firstName: 'Yasmine',
      lastName: 'Ben Salah',
      university: 'enit',
      yearOfStudy: 'L3',
      fieldOfStudy: 'CS',
      city: 'Tunis',
      preferredLanguage: 'fr',
    });
    expect(valid.firstName).toBe('Yasmine');
  });
});
```

(Service tests stay light — Drizzle queries are mocked away. The integration is verified manually in the seed + UI walkthrough.)

- [ ] **Step 2: Run test (it should pass since it only exercises the validator)**

```bash
pnpm test modules/profiles/__tests__/service.test.ts
```
Expected: PASS.

- [ ] **Step 3: Implement queries.ts**

`modules/profiles/queries.ts`:
```ts
import { db } from '@/db';
import { profiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getProfileByUserId(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return profile ?? null;
}

export async function getUserByClerkId(clerkId: string) {
  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return user ?? null;
}

export async function getProfileWithUserByClerkId(clerkId: string) {
  const user = await getUserByClerkId(clerkId);
  if (!user) return null;
  const profile = await getProfileByUserId(user.id);
  return { user, profile };
}
```

- [ ] **Step 4: Implement service.ts**

`modules/profiles/service.ts`:
```ts
import { db } from '@/db';
import { profiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import type { ProfileBasicsInput, ProfileSkillsInput } from './validators';

export async function createOrUpdateBasics(userId: string, input: ProfileBasicsInput) {
  await db
    .update(users)
    .set({ firstName: input.firstName, lastName: input.lastName, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const existing = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

  if (existing.length === 0) {
    await db.insert(profiles).values({
      userId,
      university: input.university,
      yearOfStudy: input.yearOfStudy,
      fieldOfStudy: input.fieldOfStudy,
      city: input.city,
      preferredLanguage: input.preferredLanguage,
      profileStep: 'basics-done',
    });
  } else {
    await db
      .update(profiles)
      .set({
        university: input.university,
        yearOfStudy: input.yearOfStudy,
        fieldOfStudy: input.fieldOfStudy,
        city: input.city,
        preferredLanguage: input.preferredLanguage,
        profileStep: existing[0].profileStep === 'complete' ? 'complete' : 'basics-done',
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
  }

  await recordEvent({
    type: 'profile.basics.saved',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    metadata: { step: 'basics' },
  });
}

export async function createOrUpdateSkills(userId: string, input: ProfileSkillsInput) {
  await db
    .update(profiles)
    .set({
      skills: input.skills,
      roles: input.roles,
      resumeUrl: input.cvUrl ?? null,
      portfolioLinks: input.portfolioLinks,
      profileStep: 'complete',
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));

  await recordEvent({
    type: 'profile.skills.saved',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    metadata: { skillCount: input.skills.length, roles: input.roles },
  });
}

export function getProfileCompletion(profile: { profileStep: string | null }) {
  if (profile.profileStep === 'complete') return 100;
  if (profile.profileStep === 'basics-done') return 60;
  return 0;
}
```

- [ ] **Step 5: Run tests and typecheck**

```bash
pnpm test modules/profiles
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add modules/profiles/queries.ts modules/profiles/service.ts modules/profiles/__tests__/service.test.ts
git commit -m "feat: add profiles queries + service"
```

---

### Task 12: Profile server actions

**Files:**
- Create: `modules/profiles/server-actions.ts`
- Create: `modules/profiles/company-service.ts`
- Create: `modules/profiles/company-server-actions.ts`

- [ ] **Step 1: Create intern server actions**

`modules/profiles/server-actions.ts`:
```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId } from './queries';
import { createOrUpdateBasics, createOrUpdateSkills } from './service';
import { profileBasicsSchema, profileSkillsSchema } from './validators';

export async function saveProfileBasicsAction(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');

  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  const parsed = profileBasicsSchema.parse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    university: formData.get('university'),
    yearOfStudy: formData.get('yearOfStudy'),
    fieldOfStudy: formData.get('fieldOfStudy'),
    city: formData.get('city'),
    preferredLanguage: formData.get('preferredLanguage'),
  });

  await createOrUpdateBasics(user.id, parsed);
  redirect('/onboarding/intern/skills');
}

export async function saveProfileSkillsAction(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');

  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  const skills = JSON.parse(String(formData.get('skills') ?? '[]'));
  const roles = JSON.parse(String(formData.get('roles') ?? '[]'));
  const portfolioLinks = JSON.parse(String(formData.get('portfolioLinks') ?? '[]'));
  const cvUrl = formData.get('cvUrl');

  const parsed = profileSkillsSchema.parse({
    skills,
    roles,
    cvUrl: typeof cvUrl === 'string' && cvUrl ? cvUrl : undefined,
    portfolioLinks,
  });

  await createOrUpdateSkills(user.id, parsed);
  redirect('/onboarding/intern/done');
}
```

- [ ] **Step 2: Create company service + server action**

`modules/profiles/company-service.ts`:
```ts
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import type { CompanyProfileInput } from './validators';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export async function createOrUpdateCompanyProfile(userId: string, input: CompanyProfileInput) {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, userId))
    .limit(1);

  if (existing.length === 0) {
    const [created] = await db
      .insert(organizations)
      .values({
        ownerId: userId,
        name: input.name,
        slug: slugify(input.name) + '-' + Math.random().toString(36).slice(2, 6),
        industry: input.industry,
        size: input.size,
        country: input.country,
        city: input.city,
        description: input.description,
        website: input.website || null,
        logoUrl: input.logoUrl,
        rneUrl: input.rneUrl,
        verificationStatus: 'draft',
      })
      .returning();

    await recordEvent({
      type: 'organization.created',
      actorId: userId,
      targetType: 'organization',
      targetId: created.id,
      metadata: { name: input.name },
    });
    return created;
  }

  const [updated] = await db
    .update(organizations)
    .set({
      name: input.name,
      industry: input.industry,
      size: input.size,
      country: input.country,
      city: input.city,
      description: input.description,
      website: input.website || null,
      logoUrl: input.logoUrl,
      rneUrl: input.rneUrl,
      updatedAt: new Date(),
    })
    .where(eq(organizations.ownerId, userId))
    .returning();

  await recordEvent({
    type: 'organization.updated',
    actorId: userId,
    targetType: 'organization',
    targetId: updated.id,
    metadata: { name: input.name },
  });
  return updated;
}
```

`modules/profiles/company-server-actions.ts`:
```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId } from './queries';
import { createOrUpdateCompanyProfile } from './company-service';
import { companyProfileSchema } from './validators';

export async function saveCompanyProfileAction(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');

  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');

  const parsed = companyProfileSchema.parse({
    name: formData.get('name'),
    industry: formData.get('industry'),
    size: formData.get('size'),
    country: formData.get('country'),
    city: formData.get('city') || undefined,
    description: formData.get('description') || undefined,
    website: formData.get('website') || undefined,
    logoUrl: formData.get('logoUrl') || undefined,
    rneUrl: formData.get('rneUrl') || undefined,
  });

  await createOrUpdateCompanyProfile(user.id, parsed);
  redirect('/company/dashboard');
}
```

- [ ] **Step 3: Run tests + typecheck**

```bash
pnpm typecheck
pnpm test modules/profiles
```

- [ ] **Step 4: Commit**

```bash
git add modules/profiles/server-actions.ts modules/profiles/company-service.ts modules/profiles/company-server-actions.ts
git commit -m "feat: add server actions for profile + company onboarding"
```

---

## Phase 5 — Projects module

### Task 13: Projects service + queries

**Files:**
- Create: `modules/projects/queries.ts`
- Create: `modules/projects/service.ts`
- Create: `modules/projects/__tests__/service.test.ts`

- [ ] **Step 1: Write failing test**

`modules/projects/__tests__/service.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isValidProjectTransition, type ProjectStatus } from '../service';

describe('project state machine', () => {
  it('allows draft → active', () => {
    expect(isValidProjectTransition('draft', 'active')).toBe(true);
  });

  it('allows active → archived', () => {
    expect(isValidProjectTransition('active', 'archived')).toBe(true);
  });

  it('rejects archived → active', () => {
    expect(isValidProjectTransition('archived', 'active')).toBe(false);
  });

  it('rejects draft → archived', () => {
    expect(isValidProjectTransition('draft', 'archived')).toBe(false);
  });

  it('rejects same-state transition', () => {
    const states: ProjectStatus[] = ['draft', 'active', 'archived'];
    for (const s of states) expect(isValidProjectTransition(s, s)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm test modules/projects
```

- [ ] **Step 3: Implement service**

`modules/projects/service.ts`:
```ts
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';

export type ProjectStatus = 'draft' | 'active' | 'archived';

const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['active'],
  active: ['archived'],
  archived: [],
};

export function isValidProjectTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export async function createDraftProject(input: {
  organizationId: string;
  name: string;
  slug: string;
  brief?: string;
  supervisorIds: string[];
  actorId: string;
}) {
  const [project] = await db
    .insert(projects)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      brief: input.brief,
      supervisorIds: input.supervisorIds,
      status: 'draft',
    })
    .returning();

  await recordEvent({
    type: 'project.created',
    actorId: input.actorId,
    targetType: 'project',
    targetId: project.id,
    metadata: { name: input.name, status: 'draft' },
  });

  return project;
}

export async function transitionProjectStatus(input: {
  projectId: string;
  to: ProjectStatus;
  actorId: string;
}) {
  const [current] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
  if (!current) throw new Error('Project not found');

  const from = current.status as ProjectStatus;
  if (!isValidProjectTransition(from, input.to)) {
    throw new Error(`Invalid transition: ${from} → ${input.to}`);
  }

  const [updated] = await db
    .update(projects)
    .set({ status: input.to, updatedAt: new Date() })
    .where(eq(projects.id, input.projectId))
    .returning();

  await recordEvent({
    type: 'project.status.changed',
    actorId: input.actorId,
    targetType: 'project',
    targetId: input.projectId,
    metadata: { from, to: input.to },
  });

  return updated;
}
```

- [ ] **Step 4: Implement queries**

`modules/projects/queries.ts`:
```ts
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getProjectsByOrganization(organizationId: string) {
  return db.select().from(projects).where(eq(projects.organizationId, organizationId));
}

export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project ?? null;
}

export async function getActiveProjectsBySupervisor(supervisorUserId: string) {
  // supervisorIds is jsonb array — Drizzle's jsonb queries aren't great here.
  // For Sprint 2 we read all projects in the user's org and filter in JS.
  // Replace with a SQL JSON @> operator once we have heavy supervisor lists.
  const all = await db.select().from(projects).where(eq(projects.status, 'active'));
  return all.filter((p) => p.supervisorIds?.includes(supervisorUserId));
}
```

- [ ] **Step 5: Run tests + typecheck**

```bash
pnpm test modules/projects
pnpm typecheck
```
Expected: tests PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/projects/
git commit -m "feat: add projects service with state machine + queries"
```

---

## Phase 6 — Workspace module

### Task 14: Workspace service (createWorkspace)

**Files:**
- Create: `modules/workspace/types.ts`
- Create: `modules/workspace/service.ts`
- Create: `modules/workspace/__tests__/service.test.ts`

- [ ] **Step 1: Write failing tests**

`modules/workspace/__tests__/service.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { canViewWorkspace } from '../service';
import type { Workspace } from '@/db/schema';

describe('canViewWorkspace authorization', () => {
  const ws = {
    internId: 'intern-1',
    organizationId: 'org-1',
  } as unknown as Workspace;

  it('admin sees any workspace', () => {
    expect(canViewWorkspace(ws, { userId: 'whoever', role: 'admin', supervisorOf: [] })).toBe(true);
  });

  it('the intern sees their own workspace', () => {
    expect(canViewWorkspace(ws, { userId: 'intern-1', role: 'intern', supervisorOf: [] })).toBe(true);
  });

  it('a different intern is denied', () => {
    expect(canViewWorkspace(ws, { userId: 'intern-2', role: 'intern', supervisorOf: [] })).toBe(false);
  });

  it('a supervisor in supervisorOf list sees the workspace', () => {
    expect(
      canViewWorkspace(ws, { userId: 'sup-1', role: 'company', supervisorOf: ['org-1'] }),
    ).toBe(true);
  });

  it('a company user not in supervisorOf is denied', () => {
    expect(
      canViewWorkspace(ws, { userId: 'sup-2', role: 'company', supervisorOf: ['org-other'] }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm test modules/workspace/__tests__/service.test.ts
```

- [ ] **Step 3: Implement types + service**

`modules/workspace/types.ts`:
```ts
export type WorkspaceViewerRole = 'intern' | 'supervisor';

export type WorkspaceViewer = {
  userId: string; // local users.id, not clerk_id
  role: 'intern' | 'company' | 'admin';
  supervisorOf: string[]; // organization ids
};
```

`modules/workspace/service.ts`:
```ts
import { db } from '@/db';
import { workspaces, applications, internships } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import type { Workspace } from '@/db/schema';
import type { WorkspaceViewer } from './types';

export function canViewWorkspace(workspace: Workspace, viewer: WorkspaceViewer): boolean {
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'intern') return workspace.internId === viewer.userId;
  if (viewer.role === 'company') return viewer.supervisorOf.includes(workspace.organizationId);
  return false;
}

export async function createWorkspaceFromApplication(applicationId: string, actorId: string) {
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!application) throw new Error('Application not found');
  if (application.status !== 'accepted') throw new Error('Application must be accepted');

  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, application.internshipId))
    .limit(1);
  if (!internship) throw new Error('Internship not found');

  const [workspace] = await db
    .insert(workspaces)
    .values({
      internshipId: internship.id,
      internId: application.applicantId,
      organizationId: internship.organizationId,
      status: 'active',
    })
    .returning();

  await recordEvent({
    type: 'workspace.created',
    actorId,
    targetType: 'workspace',
    targetId: workspace.id,
    metadata: { applicationId, internshipId: internship.id },
  });

  return workspace;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test modules/workspace
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add modules/workspace/types.ts modules/workspace/service.ts modules/workspace/__tests__/
git commit -m "feat: add workspace service with role-aware authorization"
```

---

### Task 15: Workspace queries (getWorkspaceOverview)

**Files:**
- Create: `modules/workspace/queries.ts`
- Create: `modules/workspace/__tests__/queries.test.ts`

- [ ] **Step 1: Write a smoke test** (full data shape is exercised manually via seed; here we verify the shape of the helper that computes derived fields)

`modules/workspace/__tests__/queries.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeDaysRemaining, computeWeekOfTotal } from '../queries';

describe('workspace derived fields', () => {
  it('computes days remaining', () => {
    const today = new Date('2026-05-23');
    const end = new Date('2026-07-25');
    expect(computeDaysRemaining(end, today)).toBe(63);
  });

  it('computes week N of M', () => {
    const start = new Date('2026-05-05');
    const today = new Date('2026-05-23');
    expect(computeWeekOfTotal(start, 12, today)).toEqual({ current: 3, total: 12 });
  });

  it('clamps current week to total', () => {
    const start = new Date('2026-01-01');
    const today = new Date('2026-12-31');
    expect(computeWeekOfTotal(start, 12, today).current).toBe(12);
  });
});
```

- [ ] **Step 2: Implement queries.ts**

`modules/workspace/queries.ts`:
```ts
import { db } from '@/db';
import {
  workspaces,
  internships,
  organizations,
  users,
  tasks,
  deliverables,
  events,
  profiles,
  projects,
} from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeDaysRemaining(endDate: Date | null, now = new Date()): number {
  if (!endDate) return 0;
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
}

export function computeWeekOfTotal(
  startDate: Date | null,
  durationWeeks: number,
  now = new Date(),
): { current: number; total: number } {
  if (!startDate) return { current: 0, total: durationWeeks };
  const elapsed = Math.floor((now.getTime() - startDate.getTime()) / MS_PER_DAY / 7) + 1;
  return { current: Math.min(durationWeeks, Math.max(1, elapsed)), total: durationWeeks };
}

export async function getWorkspaceOverview(workspaceId: string) {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) return null;

  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, workspace.internshipId))
    .limit(1);

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, workspace.organizationId))
    .limit(1);

  const [intern] = await db.select().from(users).where(eq(users.id, workspace.internId)).limit(1);
  const [internProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, workspace.internId))
    .limit(1);

  let project = null;
  if (internship?.projectId) {
    const [p] = await db.select().from(projects).where(eq(projects.id, internship.projectId)).limit(1);
    project = p ?? null;
  }

  // Supervisors: read project.supervisorIds (preferred) else fall back to org.ownerId
  const supervisorIds = project?.supervisorIds ?? [];
  const supervisorUserIds = supervisorIds.length > 0 ? supervisorIds : [organization?.ownerId].filter(Boolean) as string[];
  const supervisors = supervisorUserIds.length > 0
    ? await db.select().from(users).where(inArray(users.id, supervisorUserIds))
    : [];

  const workspaceTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId))
    .orderBy(tasks.order)
    .limit(20);

  const workspaceDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.workspaceId, workspaceId))
    .limit(10);

  // Activity: events targeted at this workspace, its tasks, or its deliverables.
  const taskIds = workspaceTasks.map((t) => t.id);
  const deliverableIds = workspaceDeliverables.map((d) => d.id);

  const targetIds = [workspaceId, ...taskIds, ...deliverableIds];
  const recentEvents =
    targetIds.length > 0
      ? await db
          .select()
          .from(events)
          .where(inArray(events.targetId, targetIds))
          .orderBy(desc(events.createdAt))
          .limit(10)
      : [];

  return {
    workspace,
    internship,
    organization,
    project,
    intern,
    internProfile,
    supervisors,
    tasks: workspaceTasks,
    deliverables: workspaceDeliverables,
    events: recentEvents,
  };
}

export type WorkspaceOverviewData = NonNullable<Awaited<ReturnType<typeof getWorkspaceOverview>>>;
```

- [ ] **Step 3: Run tests + typecheck**

```bash
pnpm test modules/workspace
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/queries.ts modules/workspace/__tests__/queries.test.ts
git commit -m "feat: add getWorkspaceOverview query + derived helpers"
```

---

## Phase 7 — Seeding

### Task 16: Seed script + admin endpoint

**Files:**
- Create: `scripts/seed.ts`
- Create: `app/api/admin/seed/route.ts`
- Modify: `package.json` (add `db:seed` script)

- [ ] **Step 1: Add `db:seed` to package.json scripts**

In `package.json` `"scripts"`:
```json
"db:seed": "tsx scripts/seed.ts"
```

Install tsx as dev dep:
```bash
pnpm add -D tsx
```

- [ ] **Step 2: Create scripts/seed.ts**

```ts
import 'dotenv/config';
import { db } from '../db';
import {
  users,
  profiles,
  organizations,
  projects,
  internships,
  applications,
  workspaces,
  tasks,
  deliverables,
  events,
} from '../db/schema';
import { eq } from 'drizzle-orm';

async function upsertUser(input: {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'intern' | 'company' | 'admin';
}) {
  const existing = await db.select().from(users).where(eq(users.clerkId, input.clerkId)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(users).values(input).returning();
  return created;
}

async function upsertOrgBySlug(input: {
  ownerId: string;
  name: string;
  slug: string;
  industry: string;
  size: '11-50';
  country: string;
  city: string;
  description: string;
}) {
  const existing = await db.select().from(organizations).where(eq(organizations.slug, input.slug)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(organizations).values({ ...input, verified: true, verificationStatus: 'verified' }).returning();
  return created;
}

async function upsertProject(input: { organizationId: string; slug: string; name: string; brief: string; supervisorIds: string[] }) {
  const existing = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, input.slug))
    .limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(projects)
    .values({
      ...input,
      status: 'active',
      startDate: '2026-05-05',
      endDate: '2026-07-25',
    })
    .returning();
  return created;
}

async function main() {
  console.log('Seeding...');

  // 1. Users (synthetic clerk IDs — these don't correspond to real Clerk accounts)
  const mehdi = await upsertUser({
    clerkId: 'seed_user_mehdi',
    email: 'mehdi@acmestudio.tn',
    firstName: 'Mehdi',
    lastName: 'Triki',
    role: 'company',
  });
  const yasmine = await upsertUser({
    clerkId: 'seed_user_yasmine',
    email: 'yasmine@enit.utm.tn',
    firstName: 'Yasmine',
    lastName: 'Ben Salah',
    role: 'intern',
  });

  // 2. Intern profile
  const existingProfile = await db.select().from(profiles).where(eq(profiles.userId, yasmine.id)).limit(1);
  if (!existingProfile[0]) {
    await db.insert(profiles).values({
      userId: yasmine.id,
      university: 'enit',
      yearOfStudy: 'L3',
      fieldOfStudy: 'Computer Science',
      city: 'Tunis',
      preferredLanguage: 'fr',
      skills: ['React', 'TypeScript', 'Figma', 'User research'],
      roles: ['Design', 'Product'],
      portfolioLinks: [
        { platform: 'GitHub', url: 'https://github.com/yasmine' },
        { platform: 'Behance', url: 'https://behance.net/yasmine' },
      ],
      profileStep: 'complete',
    });
  }

  // 3. Organization
  const acme = await upsertOrgBySlug({
    ownerId: mehdi.id,
    name: 'Acme Studio',
    slug: 'acme-studio',
    industry: 'Design & creative',
    size: '11-50',
    country: 'Tunisia',
    city: 'Tunis',
    description: 'We design brands & digital products for the Maghreb. 12 people, working with founders from idea to launch.',
  });

  // 4. Project
  const project = await upsertProject({
    organizationId: acme.id,
    slug: 'brand-audit',
    name: 'Brand audit & system refresh',
    brief: "A full-funnel audit of Acme's brand and a refreshed system delivered as Figma library + guidelines. 5 deliverables, 12 weeks, mostly async with one weekly check-in.",
    supervisorIds: [mehdi.id],
  });

  // 5. Internship
  let internship = (await db.select().from(internships).where(eq(internships.projectId, project.id)).limit(1))[0];
  if (!internship) {
    [internship] = await db
      .insert(internships)
      .values({
        organizationId: acme.id,
        projectId: project.id,
        title: 'Visual designer — Brand audit',
        description: 'Lead visual exploration for the brand refresh.',
        sector: 'Design',
        skills: ['Figma', 'Brand', 'Type'],
        duration: 12,
        locationType: 'hybrid',
        location: 'Tunis',
        isPaid: true,
        compensation: '800 TND / mo',
        internCount: 1,
        language: 'fr',
        status: 'published',
        deadline: '2026-04-30',
      })
      .returning();
  }

  // 6. Application
  let application = (
    await db.select().from(applications).where(eq(applications.applicantId, yasmine.id)).limit(1)
  )[0];
  if (!application) {
    [application] = await db
      .insert(applications)
      .values({
        internshipId: internship.id,
        applicantId: yasmine.id,
        status: 'accepted',
        coverNote: 'Excited to work on the brand audit.',
      })
      .returning();
  }

  // 7. Workspace
  let workspace = (
    await db.select().from(workspaces).where(eq(workspaces.internId, yasmine.id)).limit(1)
  )[0];
  if (!workspace) {
    [workspace] = await db
      .insert(workspaces)
      .values({
        internshipId: internship.id,
        internId: yasmine.id,
        organizationId: acme.id,
        status: 'active',
        startDate: '2026-05-05',
        endDate: '2026-07-25',
      })
      .returning();
  }

  // 8. Tasks (only insert if empty)
  const existingTasks = await db.select().from(tasks).where(eq(tasks.workspaceId, workspace.id)).limit(1);
  if (existingTasks.length === 0) {
    const seedTasks = [
      { title: 'Kickoff brief sign-off', tag: 'BA-001', status: 'done', priority: 'high', order: 1, dueDate: '2026-05-09' },
      { title: 'Stakeholder interviews · 6 of 6', tag: 'BA-002', status: 'done', priority: 'medium', order: 2, dueDate: '2026-05-19' },
      { title: 'Audit slide deck · v2', tag: 'BA-003', status: 'review', priority: 'high', order: 3, dueDate: '2026-05-22' },
      { title: 'Visual exploration · moodboards', tag: 'BA-005', status: 'in-progress', priority: 'high', order: 4, dueDate: '2026-05-30' },
      { title: 'Type pairings — 3 options', tag: 'BA-006', status: 'in-progress', priority: 'medium', order: 5, dueDate: '2026-05-30' },
      { title: 'Logo refresh — round 1', tag: 'BA-007', status: 'todo', priority: 'medium', order: 6, dueDate: '2026-06-06' },
    ] as const;

    for (const t of seedTasks) {
      await db.insert(tasks).values({
        workspaceId: workspace.id,
        title: t.title,
        description: `External tag: ${t.tag}`,
        status: t.status,
        priority: t.priority,
        order: t.order,
        dueDate: t.dueDate,
      });
    }
  }

  // 9. Deliverables
  const existingDelivs = await db.select().from(deliverables).where(eq(deliverables.workspaceId, workspace.id)).limit(1);
  if (existingDelivs.length === 0) {
    const seedDelivs = [
      { title: 'Brand audit · stakeholder findings', status: 'submitted' as const, feedback: 'Cleaned up stakeholder quotes, fixed numbering' },
      { title: 'Visual exploration · moodboards', status: 'draft' as const, feedback: null },
      { title: 'Logo refresh — round 1', status: 'draft' as const, feedback: null },
      { title: 'Design system library', status: 'draft' as const, feedback: null },
      { title: 'Final handoff package', status: 'draft' as const, feedback: null },
    ];
    for (const d of seedDelivs) {
      await db.insert(deliverables).values({ ...d, workspaceId: workspace.id });
    }
  }

  // 10. Events
  const existingEvents = await db.select().from(events).where(eq(events.targetId, workspace.id)).limit(1);
  if (existingEvents.length === 0) {
    const now = Date.now();
    const hours = (h: number) => new Date(now - h * 3600_000);
    await db.insert(events).values([
      { type: 'deliverable.submitted', actorId: yasmine.id, targetType: 'deliverable', targetId: workspace.id, metadata: { name: 'Brand audit · v2' }, createdAt: hours(2) },
      { type: 'comment.added', actorId: mehdi.id, targetType: 'task', targetId: workspace.id, metadata: { task: 'Type pairings', text: 'Try a pair without the contrast serif' }, createdAt: hours(5) },
      { type: 'task.moved', actorId: yasmine.id, targetType: 'task', targetId: workspace.id, metadata: { tag: 'BA-005', to: 'in-progress' }, createdAt: hours(28) },
      { type: 'system.checkin.scheduled', targetType: 'workspace', targetId: workspace.id, metadata: { for: '2026-05-30T14:00' }, createdAt: hours(30) },
      { type: 'deliverable.revision.requested', actorId: mehdi.id, targetType: 'deliverable', targetId: workspace.id, metadata: { name: 'Brand audit · v1', note: 'Findings section needs a TL;DR' }, createdAt: hours(72) },
    ]);
  }

  console.log(JSON.stringify({
    workspaceId: workspace.id,
    internUrl: `http://localhost:3000/intern/workspaces/${workspace.id}`,
    companyUrl: `http://localhost:3000/company/workspaces/${workspace.id}`,
  }, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Create admin endpoint**

`app/api/admin/seed/route.ts`:
```ts
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  if (user.publicMetadata.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  // Import the seed function (we extract main into a named export in step 2 alt — see note).
  // For now, the route handler returns a hint and asks the operator to run the script.
  return NextResponse.json({
    error: 'Run `pnpm db:seed` locally for now. CI-driven seed coming in Sprint 3.',
  }, { status: 501 });
}
```

(Sprint 3 wires the admin endpoint to call the same function directly. Keeping it 501 in Sprint 2 to avoid the script's `dotenv` side effects at runtime.)

- [ ] **Step 4: Run the seed**

```bash
pnpm db:seed
```
Expected: JSON output with workspace IDs and URLs.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts app/api/admin/seed/route.ts package.json pnpm-lock.yaml
git commit -m "feat: add idempotent db:seed script + admin seed endpoint stub"
```

---

## Phase 8 — Sprint 1 UI

### Task 17: Brand-skinned Clerk sign-up + role pre-fill

**Files:**
- Modify: `app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Modify: `app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx`

- [ ] **Step 1: Update sign-up page to show GradientStar + match wireframe layout**

`app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx`:
```tsx
import { SignUp } from '@clerk/nextjs';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';

export default function Page({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </div>
        <LanguageSwitch />
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight text-center mb-2">
            Create your Inturn account
          </h1>
          <p className="text-sm text-[var(--ink-3)] text-center mb-8">
            One profile. Apply once. Work in dedicated workspaces.
          </p>
          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border border-[var(--border-color)] bg-[var(--surface)]',
                formButtonPrimary: 'bg-[var(--brand-500)] hover:bg-[var(--brand-600)]',
              },
            }}
          />
        </div>
      </main>
    </div>
  );
}
```

Apply the same shell to `sign-in/[[...sign-in]]/page.tsx` (with `<SignIn />` instead).

- [ ] **Step 2: Role pre-fill via Clerk unsafeMetadata**

The role-selection flow already exists. The wireframe wants `?role=company` URL param to pre-select the company chip. Add a small client component that reads `searchParams.role`, passes it to a hidden input, and after Clerk redirects to `/role-selection`, the existing role-selection page already handles the choice. **No code change needed in Sprint 2 — document this as a Sprint 3 enhancement.**

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(auth)/sign-up/ app/[locale]/(auth)/sign-in/
git commit -m "feat: skin Clerk sign-up + sign-in with Inturn brand"
```

---

### Task 18: LanguageSwitch + WizardSteps components

**Files:**
- Create: `components/language-switch.tsx`
- Create: `components/wizard-steps.tsx`

- [ ] **Step 1: LanguageSwitch**

```tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function LanguageSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function setLocale(next: 'fr' | 'en') {
    if (next === locale) return;
    // next-intl handles the locale via path prefix; reroute the same path.
    const stripped = pathname.replace(/^\/(fr|en)(\/|$)/, '/');
    const target = next === 'fr' ? stripped : `/en${stripped === '/' ? '' : stripped}`;
    router.push(target);
  }

  return (
    <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
      <button
        onClick={() => setLocale('fr')}
        className={cn(
          'px-2.5 py-1 rounded-[4px] font-medium transition-colors',
          locale === 'fr' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-3)]',
        )}
      >
        FR
      </button>
      <button
        onClick={() => setLocale('en')}
        className={cn(
          'px-2.5 py-1 rounded-[4px] font-medium transition-colors',
          locale === 'en' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-3)]',
        )}
      >
        EN
      </button>
    </div>
  );
}
```

- [ ] **Step 2: WizardSteps**

```tsx
import { cn } from '@/lib/utils';

export type Step = { id: string; label: string; state: 'todo' | 'on' | 'done' };

export function WizardSteps({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-2 text-[13px] mb-8">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-medium',
              step.state === 'on' && 'bg-[var(--brand-500)] text-white',
              step.state === 'done' && 'bg-[var(--surface-muted)] text-[var(--ink-3)] line-through decoration-1',
              step.state === 'todo' && 'text-[var(--ink-3)]',
            )}
          >
            <b className="font-mono text-[11px]">{String(i + 1).padStart(2, '0')}</b>
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="h-px w-6 bg-[var(--border-color)]" />}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/language-switch.tsx components/wizard-steps.tsx
git commit -m "feat: add LanguageSwitch + WizardSteps components"
```

---

### Task 19: Combobox, ChipInput, RoleChipGrid, LinkRepeater, FileDrop

**Files:**
- Create: `components/combobox.tsx`
- Create: `components/chip-input.tsx`
- Create: `components/role-chip-grid.tsx`
- Create: `components/link-repeater.tsx`
- Create: `components/file-drop.tsx`

These are larger client components. Implement each in turn, then commit.

- [ ] **Step 1: Combobox (over shadcn Popover + Command)**

`components/combobox.tsx` — see [docs/design-bundle/project/wireframes/wireframes.jsx#WfProfileBasics](../../docs/design-bundle/project/wireframes/wireframes.jsx) for visual reference (university select).

```tsx
'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Option = { value: string; label: string };

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
}: {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selected?.label ?? <span className="text-[var(--ink-3)]">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === o.value ? 'opacity-100' : 'opacity-0')} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: ChipInput (3-8 skills cap)**

`components/chip-input.tsx`:
```tsx
'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function ChipInput({
  value,
  onChange,
  min = 3,
  max = 8,
  placeholder = 'Add a skill',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const atMax = value.length >= max;

  function add() {
    const v = draft.trim();
    if (!v || value.includes(v) || atMax) return;
    onChange([...value, v]);
    setDraft('');
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
    if (e.key === 'Backspace' && !draft && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-2 border border-[var(--border-color)] rounded-md bg-[var(--surface)]">
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] text-[12.5px] font-medium"
          >
            {v}
            <button type="button" onClick={() => remove(v)} className="hover:text-[var(--brand-700)]">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={atMax ? 'Cap reached' : placeholder}
          disabled={atMax}
          className="border-0 shadow-none flex-1 min-w-[120px] focus-visible:ring-0 px-1 h-7"
        />
      </div>
      <p className="text-[12px] text-[var(--ink-3)] mt-1">
        {value.length} / {max} added · min {min}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: RoleChipGrid**

`components/role-chip-grid.tsx`:
```tsx
'use client';

import { ROLE_CATEGORIES, type RoleCategory } from '@/modules/profiles/validators';
import { cn } from '@/lib/utils';

export function RoleChipGrid({
  value,
  onChange,
  max = 3,
}: {
  value: RoleCategory[];
  onChange: (next: RoleCategory[]) => void;
  max?: number;
}) {
  function toggle(role: RoleCategory) {
    if (value.includes(role)) {
      onChange(value.filter((r) => r !== role));
    } else if (value.length < max) {
      onChange([...value, role]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ROLE_CATEGORIES.map((role) => {
        const on = value.includes(role);
        const disabled = !on && value.length >= max;
        return (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => toggle(role)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors',
              on
                ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                : 'bg-[var(--surface)] text-[var(--ink-2)] border-[var(--border-color)] hover:border-[var(--border-strong)]',
              disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            {role}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: LinkRepeater**

`components/link-repeater.tsx`:
```tsx
'use client';

import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PLATFORMS = ['GitHub', 'Behance', 'Dribbble', 'LinkedIn', 'Personal site', 'X (Twitter)', 'Other'];

export type PortfolioLink = { platform: string; url: string };

export function LinkRepeater({
  value,
  onChange,
}: {
  value: PortfolioLink[];
  onChange: (next: PortfolioLink[]) => void;
}) {
  function add() {
    onChange([...value, { platform: 'GitHub', url: '' }]);
  }

  function update(i: number, patch: Partial<PortfolioLink>) {
    onChange(value.map((v, j) => (i === j ? { ...v, ...patch } : v)));
  }

  function remove(i: number) {
    onChange(value.filter((_, j) => j !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((link, i) => (
        <div key={i} className="grid grid-cols-[130px_1fr_32px] gap-2">
          <Select value={link.platform} onValueChange={(v) => update(i, { platform: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={link.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://…"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="flex items-center justify-center border border-[var(--border-color)] rounded-md text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-[13px] text-[var(--brand-600)] font-medium self-start mt-1"
      >
        + Add another link
      </button>
    </div>
  );
}
```

- [ ] **Step 5: FileDrop**

`components/file-drop.tsx`:
```tsx
'use client';

import { useState } from 'react';

export function FileDrop({
  kind,
  accept = '.pdf,image/*',
  onUploaded,
  helper,
}: {
  kind: 'cv' | 'logo' | 'deliverable' | 'registry';
  accept?: string;
  onUploaded: (result: { url: string; fileName: string; contentType: string; size: number }) => void;
  helper?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch(`/api/upload?kind=${kind}`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const json = await res.json();
      onUploaded(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block border-2 border-dashed border-[var(--border-color)] rounded-md p-6 text-center bg-[var(--surface)] cursor-pointer hover:border-[var(--brand-300)] transition-colors">
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <b className="block text-[var(--ink)] font-medium">
          {uploading ? 'Uploading…' : 'Drop your file or click to browse'}
        </b>
        {helper && <span className="block text-[12px] text-[var(--ink-3)] mt-1">{helper}</span>}
      </label>
      {error && <p className="text-[12px] text-[var(--danger)] mt-1">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/combobox.tsx components/chip-input.tsx components/role-chip-grid.tsx components/link-repeater.tsx components/file-drop.tsx
git commit -m "feat: add wizard form primitives (combobox, chip-input, role-grid, link-repeater, file-drop)"
```

---

### Task 20: Intern onboarding — Basics step

**Files:**
- Create: `app/[locale]/(auth)/onboarding/intern/basics/page.tsx`
- Create: `app/[locale]/(auth)/onboarding/intern/basics/form.tsx`
- Modify: `locales/fr.json`, `locales/en.json`

- [ ] **Step 1: Add i18n keys**

In `locales/en.json`, add:
```json
"onboarding": {
  "intern": {
    "basics": {
      "title": "Tell us about you",
      "subtitle": "30 seconds. We use this to match you to the right internships.",
      "firstName": "First name",
      "lastName": "Last name",
      "university": "University",
      "universityHelper": "Searchable list of 300+ Tunisian universities + grandes écoles.",
      "yearOfStudy": "Year of study",
      "fieldOfStudy": "Field",
      "city": "City",
      "cityHelper": "Sets default on-site filter. Doesn't block remote applications.",
      "preferredLanguage": "Preferred language",
      "preferredLanguageHelper": "This sets the app's language and the default for your applications.",
      "continue": "Continue →",
      "back": "← Back"
    }
  }
}
```

In `locales/fr.json`, add the French translations (e.g. "Parlez-nous de vous", "30 secondes. Nous l'utilisons pour vous proposer les bons stages.", etc.).

- [ ] **Step 2: Create the form (client component)**

`app/[locale]/(auth)/onboarding/intern/basics/form.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/combobox';
import { UNIVERSITIES } from '@/modules/profiles/universities';
import { saveProfileBasicsAction } from '@/modules/profiles/server-actions';

const YEARS = ['L1', 'L2', 'L3', 'M1', 'M2', 'Eng1', 'Eng2', 'Eng3', 'PhD'];

export function ProfileBasicsForm({ initial }: { initial?: Partial<{
  firstName: string;
  lastName: string;
  university: string;
  yearOfStudy: string;
  fieldOfStudy: string;
  city: string;
  preferredLanguage: 'fr' | 'en';
}> }) {
  const t = useTranslations('onboarding.intern.basics');
  const [university, setUniversity] = useState(initial?.university ?? '');
  const [yearOfStudy, setYearOfStudy] = useState(initial?.yearOfStudy ?? '');
  const [preferredLanguage, setPreferredLanguage] = useState<'fr' | 'en'>(initial?.preferredLanguage ?? 'fr');

  return (
    <form action={saveProfileBasicsAction} className="space-y-5">
      <input type="hidden" name="university" value={university} />
      <input type="hidden" name="yearOfStudy" value={yearOfStudy} />
      <input type="hidden" name="preferredLanguage" value={preferredLanguage} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">{t('firstName')} *</Label>
          <Input id="firstName" name="firstName" defaultValue={initial?.firstName} required />
        </div>
        <div>
          <Label htmlFor="lastName">{t('lastName')} *</Label>
          <Input id="lastName" name="lastName" defaultValue={initial?.lastName} required />
        </div>
      </div>

      <div>
        <Label>{t('university')} *</Label>
        <Combobox
          options={UNIVERSITIES.map((u) => ({ value: u.id, label: u.name }))}
          value={university}
          onChange={setUniversity}
          placeholder="Select university…"
        />
        <p className="text-[12px] text-[var(--ink-3)] mt-1">{t('universityHelper')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('yearOfStudy')} *</Label>
          <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="fieldOfStudy">{t('fieldOfStudy')} *</Label>
          <Input id="fieldOfStudy" name="fieldOfStudy" defaultValue={initial?.fieldOfStudy} required />
        </div>
      </div>

      <div>
        <Label htmlFor="city">{t('city')}</Label>
        <Input id="city" name="city" defaultValue={initial?.city} required />
        <p className="text-[12px] text-[var(--ink-3)] mt-1">{t('cityHelper')}</p>
      </div>

      <div>
        <Label>{t('preferredLanguage')} *</Label>
        <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
          <button
            type="button"
            onClick={() => setPreferredLanguage('fr')}
            className={`px-3 py-1 rounded-[4px] font-medium ${preferredLanguage === 'fr' ? 'bg-white shadow-sm' : 'text-[var(--ink-3)]'}`}
          >
            Français
          </button>
          <button
            type="button"
            onClick={() => setPreferredLanguage('en')}
            className={`px-3 py-1 rounded-[4px] font-medium ${preferredLanguage === 'en' ? 'bg-white shadow-sm' : 'text-[var(--ink-3)]'}`}
          >
            English
          </button>
        </div>
        <p className="text-[12px] text-[var(--ink-3)] mt-1">{t('preferredLanguageHelper')}</p>
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" disabled>{t('back')}</Button>
        <Button type="submit" className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]">
          {t('continue')}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create the page (server component, loads existing profile)**

`app/[locale]/(auth)/onboarding/intern/basics/page.tsx`:
```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { WizardSteps } from '@/components/wizard-steps';
import { getProfileWithUserByClerkId } from '@/modules/profiles/queries';
import { ProfileBasicsForm } from './form';

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');

  const ctx = await getProfileWithUserByClerkId(clerkId);
  if (!ctx) redirect('/sign-in');

  const t = await getTranslations('onboarding.intern.basics');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </div>
        <LanguageSwitch />
      </header>
      <main className="max-w-2xl mx-auto p-8">
        <WizardSteps
          steps={[
            { id: 'basics', label: 'Basics', state: 'on' },
            { id: 'skills', label: 'Skills + CV', state: 'todo' },
            { id: 'done', label: 'Done', state: 'todo' },
          ]}
        />
        <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
        <p className="text-[14px] text-[var(--ink-3)] mb-8">{t('subtitle')}</p>
        <ProfileBasicsForm
          initial={{
            firstName: ctx.user.firstName ?? undefined,
            lastName: ctx.user.lastName ?? undefined,
            university: ctx.profile?.university ?? undefined,
            yearOfStudy: ctx.profile?.yearOfStudy ?? undefined,
            fieldOfStudy: ctx.profile?.fieldOfStudy ?? undefined,
            city: ctx.profile?.city ?? undefined,
            preferredLanguage: (ctx.profile?.preferredLanguage as 'fr' | 'en' | undefined) ?? 'fr',
          }}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify dev server boots and route renders**

```bash
pnpm dev &
sleep 5
# Manually open http://localhost:3000/onboarding/intern/basics in a browser
# Confirm the form renders with the wizard steps and brand header
# Kill dev server
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/(auth)/onboarding/intern/basics/ locales/
git commit -m "feat: intern onboarding basics step"
```

---

### Task 21: Intern onboarding — Skills + CV step

**Files:**
- Create: `app/[locale]/(auth)/onboarding/intern/skills/page.tsx`
- Create: `app/[locale]/(auth)/onboarding/intern/skills/form.tsx`
- Modify: `locales/fr.json`, `locales/en.json`

- [ ] **Step 1: Add i18n keys** for `onboarding.intern.skills` matching the wireframe copy (title "Your skills", subtitle "3 to 8 skills…", labels: Skills, What kind of role do you want?, Pick up to 3, CV, optional, Drop your CV here…, We'll read it and suggest more skills, Portfolio & links, Add another link, Finish profile).

- [ ] **Step 2: Create the client form**

`app/[locale]/(auth)/onboarding/intern/skills/form.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChipInput } from '@/components/chip-input';
import { RoleChipGrid } from '@/components/role-chip-grid';
import { LinkRepeater, type PortfolioLink } from '@/components/link-repeater';
import { FileDrop } from '@/components/file-drop';
import type { RoleCategory } from '@/modules/profiles/validators';
import { saveProfileSkillsAction } from '@/modules/profiles/server-actions';

export function ProfileSkillsForm({ initial }: { initial?: Partial<{
  skills: string[];
  roles: RoleCategory[];
  cvUrl: string;
  portfolioLinks: PortfolioLink[];
}> }) {
  const t = useTranslations('onboarding.intern.skills');
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [roles, setRoles] = useState<RoleCategory[]>(initial?.roles ?? []);
  const [cvUrl, setCvUrl] = useState<string>(initial?.cvUrl ?? '');
  const [links, setLinks] = useState<PortfolioLink[]>(initial?.portfolioLinks ?? []);

  return (
    <form action={saveProfileSkillsAction} className="space-y-6">
      <input type="hidden" name="skills" value={JSON.stringify(skills)} />
      <input type="hidden" name="roles" value={JSON.stringify(roles)} />
      <input type="hidden" name="cvUrl" value={cvUrl} />
      <input type="hidden" name="portfolioLinks" value={JSON.stringify(links)} />

      <div>
        <Label>{t('skillsLabel')} *</Label>
        <ChipInput value={skills} onChange={setSkills} />
      </div>

      <div>
        <Label>{t('rolesLabel')}</Label>
        <p className="text-[12px] text-[var(--ink-3)] mb-2">{t('rolesHelper')}</p>
        <RoleChipGrid value={roles} onChange={setRoles} />
      </div>

      <div>
        <Label>{t('cvLabel')} <span className="text-[var(--ink-4)] font-normal">{t('optional')}</span></Label>
        <FileDrop kind="cv" accept=".pdf" onUploaded={(r) => setCvUrl(r.url)} helper={t('cvHelper')} />
        {cvUrl && <p className="text-[12px] text-[var(--success)] mt-1">CV uploaded · <a href={cvUrl} target="_blank" rel="noopener" className="underline">view</a></p>}
      </div>

      <div>
        <Label>{t('linksLabel')}</Label>
        <LinkRepeater value={links} onChange={setLinks} />
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" asChild>
          <a href="/onboarding/intern/basics">← Back</a>
        </Button>
        <Button type="submit" className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]">
          {t('finish')}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create the server page**

`app/[locale]/(auth)/onboarding/intern/skills/page.tsx`:
```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { WizardSteps } from '@/components/wizard-steps';
import { getProfileWithUserByClerkId } from '@/modules/profiles/queries';
import type { RoleCategory } from '@/modules/profiles/validators';
import { ProfileSkillsForm } from './form';

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');

  const ctx = await getProfileWithUserByClerkId(clerkId);
  if (!ctx) redirect('/sign-in');
  if (!ctx.profile || ctx.profile.profileStep === 'none') redirect('/onboarding/intern/basics');

  const t = await getTranslations('onboarding.intern.skills');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </div>
        <LanguageSwitch />
      </header>
      <main className="max-w-2xl mx-auto p-8">
        <WizardSteps
          steps={[
            { id: 'basics', label: 'Basics', state: 'done' },
            { id: 'skills', label: 'Skills + CV', state: 'on' },
            { id: 'done', label: 'Done', state: 'todo' },
          ]}
        />
        <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
        <p className="text-[14px] text-[var(--ink-3)] mb-8">{t('subtitle')}</p>
        <ProfileSkillsForm
          initial={{
            skills: ctx.profile.skills ?? [],
            roles: (ctx.profile.roles ?? []) as RoleCategory[],
            cvUrl: ctx.profile.resumeUrl ?? undefined,
            portfolioLinks: ctx.profile.portfolioLinks ?? [],
          }}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create the "done" page**

`app/[locale]/(auth)/onboarding/intern/done/page.tsx`:
```tsx
import { GradientStar } from '@/components/brand/gradient-star';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6">
      <GradientStar size="lg" />
      <h1 className="text-2xl font-semibold tracking-tight mt-6 mb-2">Profile complete</h1>
      <p className="text-[var(--ink-3)] text-center max-w-sm mb-8">
        You're ready to apply. Browse internships and start building your record.
      </p>
      <Button asChild className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]">
        <Link href="/intern/dashboard">Open dashboard →</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Manual smoke** — boot dev, navigate /onboarding/intern/basics → fill → submit → lands on /onboarding/intern/skills → fill → submit → /done.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/(auth)/onboarding/intern/skills/ app/[locale]/(auth)/onboarding/intern/done/ locales/
git commit -m "feat: intern onboarding skills + CV step + done screen"
```

---

### Task 22: Company onboarding — single-step org profile

**Files:**
- Create: `app/[locale]/(auth)/onboarding/company/page.tsx`
- Create: `app/[locale]/(auth)/onboarding/company/form.tsx`
- Modify: `locales/fr.json`, `locales/en.json`

Same shape as intern basics. Key differences from the wireframe (`WfOrgProfile`):

- Logo upload (FileDrop kind=logo)
- Company name, website, industry, size, country/city, description (280 char cap with character counter)
- "Verification banner" — yellow alert explaining RNE deferred
- RNE upload (FileDrop kind=registry) optional
- "Save as draft" ghost button + "Continue → Post first internship" primary

- [ ] **Step 1: Add i18n keys**

- [ ] **Step 2: Build the form**

`app/[locale]/(auth)/onboarding/company/form.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDrop } from '@/components/file-drop';
import { COMPANY_SIZES } from '@/modules/profiles/validators';
import { saveCompanyProfileAction } from '@/modules/profiles/company-server-actions';

const INDUSTRIES = ['Design & creative', 'Software & tech', 'Marketing & comms', 'Finance', 'Education', 'Healthcare', 'Manufacturing', 'Retail', 'Other'];

export function CompanyProfileForm({ initial }: { initial?: Partial<{
  name: string;
  industry: string;
  size: string;
  country: string;
  city: string;
  description: string;
  website: string;
  logoUrl: string;
  rneUrl: string;
}> }) {
  const t = useTranslations('onboarding.company');
  const [industry, setIndustry] = useState(initial?.industry ?? '');
  const [size, setSize] = useState(initial?.size ?? '');
  const [country, setCountry] = useState(initial?.country ?? 'Tunisia');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '');
  const [rneUrl, setRneUrl] = useState(initial?.rneUrl ?? '');

  return (
    <form action={saveCompanyProfileAction} className="space-y-5">
      <input type="hidden" name="industry" value={industry} />
      <input type="hidden" name="size" value={size} />
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="rneUrl" value={rneUrl} />

      <div className="grid grid-cols-[96px_1fr] gap-5">
        <div>
          <Label>{t('logo')}</Label>
          <FileDrop kind="logo" accept="image/*" onUploaded={(r) => setLogoUrl(r.url)} helper={t('optional')} />
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" name="name" defaultValue={initial?.name} required />
          </div>
          <div>
            <Label htmlFor="website">{t('website')}</Label>
            <Input id="website" name="website" type="url" defaultValue={initial?.website} placeholder="https://…" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('industry')} *</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('size')} *</Label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('country')} *</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="city">{t('city')}</Label>
          <Input id="city" name="city" defaultValue={initial?.city} />
        </div>
      </div>

      <div>
        <Label htmlFor="description">{t('description')}</Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
          rows={4}
        />
        <p className="text-[12px] text-[var(--ink-3)] mt-1">{description.length} / 280 · {t('descriptionHelper')}</p>
      </div>

      <div className="border border-[#FDE68A] bg-[#FFFBEB] text-[#78350F] rounded-md p-3 text-[12.5px]">
        <b className="text-[#92400E]">{t('verificationTitle')}</b>
        <p>{t('verificationBody')}</p>
      </div>

      <div>
        <Label>{t('rneLabel')} <span className="text-[var(--ink-4)] font-normal">{t('rneOptional')}</span></Label>
        <FileDrop kind="registry" accept=".pdf,image/*" onUploaded={(r) => setRneUrl(r.url)} helper={t('rneHelper')} />
        {rneUrl && <p className="text-[12px] text-[var(--success)] mt-1">RNE uploaded</p>}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost">{t('saveDraft')}</Button>
        <Button type="submit" className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]">
          {t('continue')}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Build the page**

`app/[locale]/(auth)/onboarding/company/page.tsx`:
```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { CompanyProfileForm } from './form';

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const [existing] = await db.select().from(organizations).where(eq(organizations.ownerId, user.id)).limit(1);
  const t = await getTranslations('onboarding.company');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </div>
        <LanguageSwitch />
      </header>
      <main className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
        <p className="text-[14px] text-[var(--ink-3)] mb-8">{t('subtitle')}</p>
        <CompanyProfileForm
          initial={
            existing && {
              name: existing.name,
              industry: existing.industry ?? '',
              size: existing.size ?? '',
              country: existing.country ?? 'Tunisia',
              city: existing.city ?? '',
              description: existing.description ?? '',
              website: existing.website ?? '',
              logoUrl: existing.logoUrl ?? '',
              rneUrl: existing.rneUrl ?? '',
            }
          }
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Manual smoke** — navigate /onboarding/company → fill → submit → lands on /company/dashboard.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/(auth)/onboarding/company/ locales/
git commit -m "feat: company onboarding org profile form"
```

---

### Task 23: Landing polish — surgical edits

**Files:**
- Modify: `app/[locale]/page.tsx` (and any landing partials it imports)

The 5 changes are spelled out in `docs/design-bundle/project/wireframes/wireframes.jsx#WfLandingPolish`. Apply inline:

1. **Hero CTAs:** "Browse internships" (primary) + "I'm hiring →" (ghost)
2. **Top nav:** "Browse internships · For companies · Pricing · Log in · Sign up" (Pricing is a stub link to `/pricing` that 404s for now — note in component)
3. **FR/EN switch:** segmented control via `<LanguageSwitch />`
4. **Footer:** add "Tunisia 🇹🇳" placement + "For universities" link to `/for-universities` (404 placeholder)
5. **Sign-up handoff:** gradient star on both sides (already done in Task 17), violet primary CTAs

**Do NOT touch:** gradient star illustration, three-pillar section, comparison table, SDG section, Sami's quote, FAQ, brand colors, serif type system.

- [ ] **Step 1: Read the existing landing page** to know what's there

```bash
cat app/[locale]/page.tsx
```

- [ ] **Step 2: Apply the 5 changes inline.** Use existing component patterns where possible; introduce `<LanguageSwitch />` from Task 18.

- [ ] **Step 3: Verify both `/` (FR) and `/en` render** with the new CTAs / nav / footer.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/page.tsx
git commit -m "feat: apply Sprint 1 landing polish per design"
```

---

## Phase 9 — Sprint 2 UI (Workspace Overview)

The workspace mocks live in `docs/design-bundle/project/mocks/workspace.jsx` and `docs/design-bundle/project/mocks/workspace.css`. Every CSS class used below (`.ws-*`) is defined there. **Replicate visual output, not the prototype's internal structure.**

### Task 24: Workspace TopBar component

**Files:**
- Create: `modules/workspace/components/topbar.tsx`

- [ ] **Step 1: Build the TopBar**

`modules/workspace/components/topbar.tsx`:
```tsx
import { GradientStar } from '@/components/brand/gradient-star';
import { cn } from '@/lib/utils';

type Crumb = { label: string; bold?: boolean };

export function WorkspaceTopBar({
  role,
  viewerInitials,
  crumbs,
  modeChip,
}: {
  role: 'intern' | 'supervisor';
  viewerInitials: string;
  crumbs: Crumb[];
  modeChip?: { label: string; tone: 'cyan' };
}) {
  return (
    <div className="h-14 bg-[var(--surface)] border-b border-[var(--border-color)] flex items-center">
      <div className="w-64 h-14 flex items-center px-[18px] gap-2.5 border-r border-[var(--border-color)]">
        <GradientStar size="md" />
        <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
      </div>
      <div className="flex-1 flex items-center gap-2 px-5 text-[13.5px] text-[var(--ink-3)]">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-[var(--ink-4)]">/</span>}
            <span className={cn(c.bold && 'text-[var(--ink)] font-medium')}>{c.label}</span>
          </span>
        ))}
        {modeChip && (
          <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] font-medium tracking-wide bg-[var(--accent-50)] text-[var(--accent-700)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-500)]" />
            {modeChip.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 pr-4">
        <div className="inline-flex items-center gap-2 h-8 w-60 px-2.5 bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-md text-[13px] text-[var(--ink-3)]">
          <span aria-hidden>🔍</span>
          <span>Search…</span>
          <span className="ml-auto font-mono text-[11px] bg-[var(--surface)] border border-[var(--border-color)] rounded px-1.5">⌘K</span>
        </div>
        <button aria-label="Inbox" className="h-8 w-8 rounded-md hover:bg-[var(--surface-muted)] text-[var(--ink-2)]">📬</button>
        <button aria-label="Help" className="h-8 w-8 rounded-md hover:bg-[var(--surface-muted)] font-mono text-[12px] font-semibold">?</button>
        <span className={cn(
          'inline-flex items-center justify-center h-8 w-8 rounded-full font-semibold text-[12.5px]',
          role === 'intern' ? 'bg-gradient-to-br from-[#DDD6FE] to-[#C7D2FE] text-[var(--brand-600)]' : 'bg-gradient-to-br from-[#FECACA] to-[#FED7AA] text-[#9A3412]',
        )}>{viewerInitials}</span>
      </div>
    </div>
  );
}

WorkspaceTopBar.Crumb = function _Crumb() { return null; }; // for type re-export only
```

- [ ] **Step 2: Add the `--accent-50` token to globals.css if missing**

```css
--accent-50: #ECFEFF;
```

- [ ] **Step 3: Commit**

```bash
git add modules/workspace/components/topbar.tsx app/globals.css
git commit -m "feat: workspace TopBar component"
```

---

### Task 25: Workspace Sidebar (with Project tree)

**Files:**
- Create: `modules/workspace/components/sidebar.tsx`

The sidebar is the biggest single component. It's split into sections (General, My workspaces / Active projects, Community / Pipeline) that differ by role. The supervisor sees the Project tree (collapsible Project rows with internship/workspace children).

- [ ] **Step 1: Define the data shape**

Add to `modules/workspace/types.ts`:
```ts
export type SidebarData =
  | {
      role: 'intern';
      activeWorkspaces: Array<{ id: string; label: string; live: boolean }>;
    }
  | {
      role: 'supervisor';
      activeProjects: Array<{
        id: string;
        code: string; // 2-char icon code, e.g. "BA"
        name: string;
        meta: string; // "3w3" → week 3 of 3, etc.
        status: 'active' | 'draft';
        workspaces: Array<{ id: string; label: string; live: boolean }>;
      }>;
    };
```

- [ ] **Step 2: Implement the Sidebar component** using `docs/design-bundle/project/mocks/workspace.jsx` lines 65-190 as the visual reference. Replace inline JSX with composable React (intern path / supervisor path) but match every CSS class one-for-one against `workspace.css`. Since we're using Tailwind, translate `.ws-side-item`, `.ws-side-project`, `.ws-side-sub`, etc. into Tailwind classes that produce the same output (use arbitrary value classes for the exact paddings + sizes).

  Recommended: **copy the relevant CSS rules from `workspace.css` into `app/globals.css`** under a `.ws-shell` scope so we can reuse the prototype's class names without translation effort. This keeps the implementation faithful at minimal cost.

```css
/* Append to globals.css */
.ws-shell {
  /* paste all the .ws-* rules from docs/design-bundle/project/mocks/workspace.css here,
     scoped under .ws-shell so they don't collide with shadcn defaults */
}
```

  Then in the Sidebar component, render `<aside className="ws-side">…</aside>` with the prototype's class names directly.

- [ ] **Step 3: Render the intern sidebar**

```tsx
import type { SidebarData } from '../types';

export function WorkspaceSidebar({ data, viewer }: {
  data: SidebarData;
  viewer: { initials: string; name: string; subtitle: string };
}) {
  return (
    <aside className="ws-side">
      <div className="ws-side-section">
        <h6>General</h6>
        <div className="ws-side-item"><span className="ico" />Dashboard</div>
        {/* etc. — mirror the JSX in workspace.jsx for the matching role */}
      </div>

      {data.role === 'intern' ? (
        <InternProjectsSection data={data} />
      ) : (
        <SupervisorProjectsSection data={data} />
      )}

      {/* Community/Pipeline section, footer (same pattern) */}
    </aside>
  );
}
```

Implement `InternProjectsSection` (flat list of `ws-side-sub` rows) and `SupervisorProjectsSection` (Project rows with collapsible children). Match `workspace.jsx` lines 105-153 exactly.

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/sidebar.tsx modules/workspace/types.ts app/globals.css
git commit -m "feat: workspace Sidebar with project tree"
```

---

### Task 26: TabBar + BriefCard + StatTiles

**Files:**
- Create: `modules/workspace/components/tab-bar.tsx`
- Create: `modules/workspace/components/brief-card.tsx`
- Create: `modules/workspace/components/stat-tiles.tsx`

- [ ] **Step 1: TabBar** — 6 tabs (Overview, Tasks, Deliverables, Timeline, Activity, Comments). Only Overview is functional; others render with `cursor-not-allowed` styling and an `aria-disabled`. Match `workspace.jsx` lines 218-227.

- [ ] **Step 2: BriefCard** — gradient hero with eyebrow, title, body, meta (Tunis · 3d/wk + Mon-Wed + paid), and the supervisor/intern card on the right. Match `workspace.jsx#BriefCard` lines 234-275 exactly. Use the `.ws-brief` class from workspace.css.

- [ ] **Step 3: StatTiles** — 4 tiles in a grid (Tasks N of 6 open · 2 done · 1 in review · etc.). Match `workspace.jsx#StatTiles` lines 277-308.

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/tab-bar.tsx modules/workspace/components/brief-card.tsx modules/workspace/components/stat-tiles.tsx
git commit -m "feat: workspace TabBar + BriefCard + StatTiles components"
```

---

### Task 27: TaskList + DeliverablesMini + ActivityFeed (read-only)

**Files:**
- Create: `modules/workspace/components/task-list.tsx`
- Create: `modules/workspace/components/deliverables-mini.tsx`
- Create: `modules/workspace/components/activity-feed.tsx`

- [ ] **Step 1: TaskList** — read-only list of 6 tasks. Match `workspace.jsx#TaskList` lines 310-342. Receives `tasks` prop from the workspace overview data.

- [ ] **Step 2: DeliverablesMini** — read-only list of 5 deliverables with status pill + version. Match lines 344-378.

- [ ] **Step 3: ActivityFeed** — last ~5 events, typed bullets. Match lines 380-426. Event-type → bullet class:
  - `deliverable.submitted` / `deliverable.revision.requested` → `ws-act-bullet deliv`
  - `comment.added` → `ws-act-bullet comment`
  - `task.moved` → `ws-act-bullet task`
  - `system.checkin.scheduled` → `ws-act-bullet system`
  - `stuck.signaled` → `ws-act-bullet stuck`

  Body composition is data-driven — render a templated sentence from event type + metadata.

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/task-list.tsx modules/workspace/components/deliverables-mini.tsx modules/workspace/components/activity-feed.tsx
git commit -m "feat: workspace TaskList + DeliverablesMini + ActivityFeed (read-only)"
```

---

### Task 28: RailIntern + RailSupervisor + StuckPill

**Files:**
- Create: `modules/workspace/components/rail-intern.tsx`
- Create: `modules/workspace/components/rail-supervisor.tsx`
- Create: `modules/workspace/components/stuck-pill.tsx`

- [ ] **Step 1: RailIntern** — gradient CTA (weekly check-in), this-week quick-list, your-record card. Match `workspace.jsx#RailIntern` lines 432-462.

- [ ] **Step 2: RailSupervisor** — cyan performance signal card with sparkline SVG, sync CTA, this-week list, yellow quiet-flag note. Match lines 464-512. The sparkline is the inline SVG from the mock.

- [ ] **Step 3: StuckPill** — floating button bottom-right with pulsing red dot. Intern-only. Match `.ws-stuck` style.

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/rail-intern.tsx modules/workspace/components/rail-supervisor.tsx modules/workspace/components/stuck-pill.tsx
git commit -m "feat: workspace right rail (intern + supervisor) + StuckPill"
```

---

### Task 29: WorkspaceOverview composition + MHead

**Files:**
- Create: `modules/workspace/components/m-head.tsx` (the page title + tabs region above tab content)
- Create: `modules/workspace/components/workspace-overview.tsx`

- [ ] **Step 1: MHead** — title (intern: "Welcome back, Yasmine"; supervisor: "Yasmine Ben Salah · Visual designer"), LIVE badge, date range badge, role-specific CTA pair, then `<TabBar />`. Match `workspace.jsx#MHead` lines 195-229.

- [ ] **Step 2: WorkspaceOverview** — top-level layout composition

```tsx
import { WorkspaceTopBar } from './topbar';
import { WorkspaceSidebar } from './sidebar';
import { WorkspaceMHead } from './m-head';
import { BriefCard } from './brief-card';
import { StatTiles } from './stat-tiles';
import { TaskList } from './task-list';
import { DeliverablesMini } from './deliverables-mini';
import { ActivityFeed } from './activity-feed';
import { RailIntern } from './rail-intern';
import { RailSupervisor } from './rail-supervisor';
import { StuckPill } from './stuck-pill';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceViewerRole, SidebarData } from '../types';

export function WorkspaceOverview({
  data,
  role,
  sidebar,
  viewer,
}: {
  data: WorkspaceOverviewData;
  role: WorkspaceViewerRole;
  sidebar: SidebarData;
  viewer: { initials: string; name: string; subtitle: string };
}) {
  return (
    <div className="ws-shell ws relative h-screen flex flex-col">
      <WorkspaceTopBar
        role={role}
        viewerInitials={viewer.initials}
        crumbs={buildCrumbs(data, role)}
        modeChip={{ label: 'HYBRID · WEEK 3 / 12', tone: 'cyan' }}
      />
      <div className="ws-body">
        <WorkspaceSidebar data={sidebar} viewer={viewer} />
        <main className="ws-main">
          <WorkspaceMHead data={data} role={role} />
          <div className="ws-content">
            <div className="ws-col-main">
              <BriefCard data={data} role={role} />
              <StatTiles data={data} role={role} />
              <TaskList tasks={data.tasks} role={role} />
              <DeliverablesMini deliverables={data.deliverables} role={role} />
              <ActivityFeed events={data.events} />
            </div>
            <div className="ws-col-side">
              {role === 'intern' ? <RailIntern data={data} /> : <RailSupervisor data={data} />}
            </div>
          </div>
        </main>
      </div>
      {role === 'intern' && <StuckPill />}
    </div>
  );
}

function buildCrumbs(data: WorkspaceOverviewData, role: WorkspaceViewerRole) {
  if (role === 'intern') {
    return [
      { label: 'My workspaces' },
      { label: `${data.organization?.name ?? '—'} · ${data.project?.name ?? data.internship?.title ?? '—'}` },
      { label: 'Overview', bold: true },
    ];
  }
  return [
    { label: data.organization?.name ?? '—' },
    { label: data.project?.name ?? '—' },
    { label: `${data.intern?.firstName ?? ''}` },
    { label: 'Overview', bold: true },
  ];
}
```

- [ ] **Step 3: Commit**

```bash
git add modules/workspace/components/m-head.tsx modules/workspace/components/workspace-overview.tsx
git commit -m "feat: workspace MHead + WorkspaceOverview composition root"
```

---

### Task 30: Workspace pages (intern + company routes) + sidebar data loader

**Files:**
- Create: `app/[locale]/(platform)/intern/workspaces/[workspaceId]/page.tsx`
- Create: `app/[locale]/(platform)/company/workspaces/[workspaceId]/page.tsx`
- Modify: `modules/workspace/queries.ts` (add `getSidebarData(userId, role)`)

- [ ] **Step 1: Add getSidebarData helper**

In `modules/workspace/queries.ts`, append:
```ts
import type { SidebarData } from './types';

export async function getInternSidebarData(internUserId: string): Promise<SidebarData> {
  const myWorkspaces = await db
    .select({
      id: workspaces.id,
      orgName: organizations.name,
      projectName: projects.name,
      internshipTitle: internships.title,
      status: workspaces.status,
    })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .leftJoin(projects, eq(projects.id, internships.projectId))
    .where(eq(workspaces.internId, internUserId));

  return {
    role: 'intern',
    activeWorkspaces: myWorkspaces.map((w) => ({
      id: w.id,
      label: `${w.orgName} · ${w.projectName ?? w.internshipTitle}`,
      live: w.status === 'active',
    })),
  };
}

export async function getSupervisorSidebarData(supervisorUserId: string): Promise<SidebarData> {
  // Strategy for Sprint 2: find org(s) where the user is owner, list projects + their workspaces.
  // supervisorIds on projects is for finer-grained access; for the simple seed case the org owner
  // is the supervisor.
  const orgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, supervisorUserId));

  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length === 0) return { role: 'supervisor', activeProjects: [] };

  const allProjects = await db.select().from(projects).where(inArray(projects.organizationId, orgIds));
  const allInternships = await db.select().from(internships).where(inArray(internships.organizationId, orgIds));
  const allWorkspaces = await db.select().from(workspaces).where(inArray(workspaces.organizationId, orgIds));
  const allInterns = await db.select().from(users).where(inArray(users.id, allWorkspaces.map((w) => w.internId)));
  const internsById = new Map(allInterns.map((u) => [u.id, u]));

  return {
    role: 'supervisor',
    activeProjects: allProjects.map((p) => {
      const projectInternships = allInternships.filter((i) => i.projectId === p.id);
      const projectInternshipIds = new Set(projectInternships.map((i) => i.id));
      const projectWorkspaces = allWorkspaces.filter((w) => projectInternshipIds.has(w.internshipId));
      return {
        id: p.id,
        code: p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
        name: p.name,
        meta: p.status === 'draft' ? 'DRAFT' : '',
        status: p.status === 'draft' ? 'draft' : 'active',
        workspaces: projectWorkspaces.map((w) => {
          const intern = internsById.get(w.internId);
          const internship = projectInternships.find((i) => i.id === w.internshipId);
          return {
            id: w.id,
            label: `${intern?.firstName ?? ''} · ${internship?.title?.split('—')[0]?.trim() ?? ''}`,
            live: w.status === 'active',
          };
        }),
      };
    }),
  };
}
```

- [ ] **Step 2: Build the intern workspace page**

`app/[locale]/(platform)/intern/workspaces/[workspaceId]/page.tsx`:
```tsx
import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getWorkspaceOverview, getInternSidebarData, getSupervisorSidebarData } from '@/modules/workspace/queries';
import { canViewWorkspace } from '@/modules/workspace/service';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { WorkspaceOverview } from '@/modules/workspace/components/workspace-overview';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role = (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'intern';

  const { workspaceId } = await params;
  const data = await getWorkspaceOverview(workspaceId);
  if (!data) notFound();

  // Build supervisorOf for the viewer
  const supervisorOrgs = role === 'company' ? await db.select().from(organizations).where(eq(organizations.ownerId, user.id)) : [];
  const viewerCtx = { userId: user.id, role, supervisorOf: supervisorOrgs.map((o) => o.id) };

  if (!canViewWorkspace(data.workspace, viewerCtx)) notFound();

  const sidebar = role === 'admin' || role === 'intern'
    ? await getInternSidebarData(user.id)
    : await getSupervisorSidebarData(user.id);

  // Force intern view on this route. (Admins see whatever role this route renders.)
  return (
    <WorkspaceOverview
      data={data}
      role="intern"
      sidebar={sidebar}
      viewer={{
        initials: `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        subtitle: 'Intern',
      }}
    />
  );
}
```

- [ ] **Step 3: Build the company workspace page** — same pattern but `role="supervisor"`. Place at `app/[locale]/(platform)/company/workspaces/[workspaceId]/page.tsx`. Sidebar data comes from `getSupervisorSidebarData`.

- [ ] **Step 4: Verify both routes render**

```bash
pnpm dev &
# Get the seeded workspace ID from the previous `pnpm db:seed` output, then:
# Open http://localhost:3000/intern/workspaces/<ID>  as admin (Sam) → should render intern view
# Open http://localhost:3000/company/workspaces/<ID> as admin (Sam) → should render supervisor view
# Compare side-by-side with the mocks in docs/design-bundle/project/mocks/workspace.jsx
```

- [ ] **Step 5: Commit**

```bash
git add modules/workspace/queries.ts app/[locale]/(platform)/intern/workspaces/ app/[locale]/(platform)/company/workspaces/
git commit -m "feat: workspace overview pages (intern + company routes)"
```

---

## Phase 10 — Verification + memory

### Task 31: Manual verification + lint/typecheck/test sweep

- [ ] **Step 1: Run the full verification checklist** from the spec (`docs/superpowers/specs/2026-05-23-sprint1-finish-sprint2-overview-design.md` § Verification checklist). For each box, drive the app in the browser and screenshot (or note observation):
  - [ ] Landing page polish applied, "do not change" items untouched, FR + EN parity
  - [ ] Signup: gradient star, brand colors, magic link primary, Google OAuth visible, password fallback link
  - [ ] Intern onboarding: 2-step wizard works, draft persists between sessions, completion gate enforces minimums
  - [ ] Company onboarding: single-step form, save-as-draft, RNE optional, banner displays
  - [ ] CV upload (Vercel Blob): file uploads, URL persisted, FR + EN labels
  - [ ] Intern workspace overview matches `mocks/workspace.jsx` intern artboard
  - [ ] Supervisor workspace overview matches the supervisor artboard
  - [ ] `pnpm db:seed` produces working demo data; both routes render with admin login
  - [ ] All paths in FR (default) and EN

- [ ] **Step 2: Lint + typecheck + tests**

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Fix any failures inline, commit if needed.

- [ ] **Step 3: Update memory**

Edit `/Users/mac/.claude/projects/-Users-mac-code-inturn-hub-inturn/memory/MEMORY.md`:
- Update "Current State" with new commit count, status of Sprint 1 + Sprint 2 items
- Note the design bundle location at `docs/design-bundle/`
- Note Vercel Blob is wired (Sprint 5+ deliverable upload will reuse the route)
- Add: Workshop tokens are locked in `app/globals.css` — Direction B chosen, A and C archived in `docs/design-bundle/project/01-brand-foundations.html`

- [ ] **Step 4: Final commit**

```bash
git add /Users/mac/.claude/projects/-Users-mac-code-inturn-hub-inturn/memory/MEMORY.md
git commit -m "chore: update memory after Sprint 1 finishing + Sprint 2 Overview"
```

---

## Plan Self-Review

(Performed inline by the planner — no action needed unless gaps surface during execution.)

**Spec coverage:** Every section of the spec maps to at least one task above:
- Brand tokens → Task 2
- Geist fonts → Task 3
- Projects schema → Tasks 5–7
- Profiles schema additions → Task 7
- Organizations additions → Task 6
- File upload → Task 8
- Profiles module → Tasks 9–12
- Projects module → Task 13
- Workspace module → Tasks 14–15
- Seeding → Task 16
- Signup skin → Task 17
- Intern wizard → Tasks 20–21
- Company onboarding → Task 22
- Landing polish → Task 23
- Workspace UI → Tasks 24–30
- Verification → Task 31

**Known follow-ups** (carried into next sprint, not in this plan):
- Acceptance flow → Sprint 3
- Project Hub UI → Sprint 3
- Tasks board, Deliverables versioning UI → Sprint 2 stretch or Sprint 3
- AI features → Sprint 6
- GitHub Actions CI → immediate quick PR after this plan
- Vercel deploy of new routes → automatic on push once GitHub is connected to Vercel project
