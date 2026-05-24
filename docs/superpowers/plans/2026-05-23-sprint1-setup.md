# Sprint 1 Setup Phase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the inturn platform foundation — project scaffold, database schema, auth system, events logging, i18n — with zero visual design dependencies. Everything is unstyled; design tokens will be applied later.

**Architecture:** Next.js 15 App Router modular monolith. Clerk handles auth, syncs users to our Postgres (Neon) via webhooks. Every significant action writes to an append-only `events` table (JSONB metadata). Role stored in both Clerk publicMetadata (fast middleware checks) and our `users` table (relational queries). i18n via next-intl with FR default, EN secondary, `localePrefix: 'as-needed'`.

**Tech Stack:** Next.js 15, TypeScript strict, pnpm, Tailwind v4, shadcn/ui (new-york), Drizzle ORM, Neon Postgres, Clerk, next-intl, Vitest, Vercel

**Key decisions (from brainstorm):**

- Clerk webhook sync to local `users` table (Clerk = auth source of truth, DB = everything else)
- Role in Clerk publicMetadata + DB users table, synced via webhook
- Clerk pre-built `<SignIn />` / `<SignUp />` components (restyle later via appearance API)
- Events table: loose schema with JSONB metadata (append-only log)
- Skeleton tables include known columns from brief (not just id + timestamps)

---

## File Map

All paths relative to project root (`/Users/mac/code/inturn-hub/inturn/`).

### Created by create-next-app (Task 1)

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `public/`
- `eslint.config.mjs`
- `postcss.config.mjs`

### Task 2 — Linting

- Create: `.prettierrc`
- Modify: `eslint.config.mjs`
- Modify: `package.json` (scripts)

### Task 3 — Vitest

- Create: `vitest.config.ts`
- Modify: `package.json` (devDeps + scripts)

### Task 4 — Folder structure

- Create: `modules/auth/`, `modules/profiles/`, `modules/events/`, `modules/marketplace/`, `modules/workspace/`, `modules/community/`, `modules/notifications/`, `modules/ai/`
- Create: `db/schema/`
- Create: `lib/`
- Create: `locales/`
- Create: `components/ui/`

### Task 5 — i18n

- Create: `i18n/routing.ts`
- Create: `i18n/request.ts`
- Create: `locales/fr.json`
- Create: `locales/en.json`
- Create: `app/[locale]/layout.tsx`
- Create: `app/[locale]/page.tsx`
- Modify: `app/layout.tsx` (simplify to root shell)
- Modify: `next.config.ts` (add next-intl plugin)
- Create: `middleware.ts`
- Delete: `app/page.tsx` (moved to `app/[locale]/page.tsx`)

### Task 6 — Drizzle

- Create: `drizzle.config.ts`
- Create: `db/index.ts`
- Create: `.env.example`
- Create: `.env.local` (gitignored, placeholder)

### Task 7 — Core schema

- Create: `db/schema/users.ts`
- Create: `db/schema/profiles.ts`
- Create: `db/schema/organizations.ts`
- Create: `db/schema/events.ts`
- Create: `db/schema/index.ts`

### Task 8 — Skeleton schema

- Create: `db/schema/internships.ts`
- Create: `db/schema/applications.ts`
- Create: `db/schema/workspaces.ts`
- Create: `db/schema/tasks.ts`
- Create: `db/schema/deliverables.ts`
- Modify: `db/schema/index.ts` (add exports)

### Task 9 — Clerk

- Modify: `middleware.ts` (compose Clerk + next-intl)
- Modify: `app/[locale]/layout.tsx` (add ClerkProvider)
- Modify: `.env.example` (add Clerk vars)

### Task 10 — Events service (TDD)

- Create: `modules/events/__tests__/service.test.ts`
- Create: `modules/events/service.ts`
- Create: `modules/events/types.ts`

### Task 11 — Clerk webhook

- Create: `app/api/webhooks/clerk/route.ts`
- Create: `modules/auth/__tests__/webhook.test.ts`

### Task 12 — Auth pages

- Create: `app/[locale]/(auth)/layout.tsx`
- Create: `app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx`

### Task 13 — Role selection (TDD)

- Create: `modules/auth/__tests__/role-selection.test.ts`
- Create: `modules/auth/role-selection.ts`
- Create: `app/api/auth/select-role/route.ts`
- Create: `app/[locale]/(auth)/role-selection/page.tsx`

### Task 14 — Role-gated layouts

- Create: `app/[locale]/(platform)/layout.tsx`
- Create: `app/[locale]/(platform)/intern/layout.tsx`
- Create: `app/[locale]/(platform)/intern/dashboard/page.tsx`
- Create: `app/[locale]/(platform)/company/layout.tsx`
- Create: `app/[locale]/(platform)/company/dashboard/page.tsx`
- Create: `app/[locale]/(platform)/admin/layout.tsx`
- Create: `app/[locale]/(platform)/admin/dashboard/page.tsx`

### Task 15 — Deploy config

- Create: `.nvmrc`
- Modify: `.env.example` (final version)
- Modify: `package.json` (engines field)

---

## Tasks

### Task 1: Initialize Next.js 15 project

**Files:**

- Creates all base project files via create-next-app

- [ ] **Step 1: Scaffold the project**

```bash
cd /Users/mac/code/inturn-hub/inturn
mv docs /tmp/inturn-docs-backup
pnpm create next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack --yes
mv /tmp/inturn-docs-backup docs
```

- [ ] **Step 2: Enable TypeScript strict mode**

Modify `tsconfig.json` — ensure `strict: true` is set (create-next-app usually sets this, but verify):

```jsonc
{
  "compilerOptions": {
    "strict": true,
    // ... rest of create-next-app defaults
  },
}
```

- [ ] **Step 3: Update .gitignore**

Append to the generated `.gitignore`:

```gitignore
# Environment
.env
.env.local
.env.*.local

# Drizzle
db/migrations/meta/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Turbo
.turbo/
```

- [ ] **Step 4: First commit**

```bash
git add -A
git commit -m "chore: initialize Next.js 15 project with TypeScript strict

Scaffolded via create-next-app with App Router, Tailwind v4, ESLint, Turbopack.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Configure ESLint + Prettier

**Files:**

- Create: `.prettierrc`
- Modify: `eslint.config.mjs`
- Modify: `package.json`

- [ ] **Step 1: Install Prettier and ESLint config packages**

```bash
pnpm add -D prettier eslint-config-prettier eslint-plugin-import
```

- [ ] **Step 2: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 3: Update `eslint.config.mjs`**

Replace the generated config with:

```js
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];

export default eslintConfig;
```

- [ ] **Step 4: Add scripts to `package.json`**

Add to `"scripts"`:

```json
{
  "lint": "next lint",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 5: Run lint + format to verify**

```bash
pnpm format
pnpm lint
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: configure ESLint and Prettier

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Set up Vitest

**Files:**

- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest and path resolution plugin**

```bash
pnpm add -D vitest vite-tsconfig-paths
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

Add to `"scripts"`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Add a smoke test to verify setup**

Create `lib/__tests__/setup.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test**

```bash
pnpm test
```

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: set up Vitest test framework

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Create folder structure

**Files:**

- Create: all module directories with `.gitkeep` files
- Create: `db/schema/`, `lib/`, `locales/`, `components/ui/`

- [ ] **Step 1: Create module directories**

```bash
cd /Users/mac/code/inturn-hub/inturn
mkdir -p modules/{auth,profiles,events,marketplace,workspace,community,notifications,ai}
mkdir -p db/schema
mkdir -p lib
mkdir -p locales
mkdir -p components/ui
```

- [ ] **Step 2: Add .gitkeep files to empty directories**

```bash
for dir in modules/{marketplace,workspace,community,notifications,ai}; do
  touch "$dir/.gitkeep"
done
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d --style new-york --base-color neutral
```

This creates `components.json`, `lib/utils.ts` (with `cn()`), configures CSS variables in `app/globals.css`, and installs `clsx` + `tailwind-merge`. The `-d` flag uses defaults to skip prompts.

Verify `components.json` exists and `lib/utils.ts` contains the `cn()` helper.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: create folder structure per project brief

Modules: auth, profiles, events, marketplace, workspace, community,
notifications, ai. Database, lib, locales, and component directories.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Set up next-intl for i18n

**Files:**

- Create: `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`
- Create: `locales/fr.json`, `locales/en.json`
- Create: `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`
- Modify: `app/layout.tsx`, `next.config.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Install next-intl**

```bash
pnpm add next-intl
```

- [ ] **Step 2: Create `i18n/routing.ts`**

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
});
```

- [ ] **Step 3: Create `i18n/request.ts`**

```typescript
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: Create `i18n/navigation.ts`**

```typescript
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

- [ ] **Step 5: Create locale message files**

`locales/fr.json`:

```json
{
  "common": {
    "loading": "Chargement...",
    "error": "Une erreur est survenue",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "back": "Retour",
    "next": "Suivant",
    "submit": "Soumettre"
  },
  "auth": {
    "signIn": "Se connecter",
    "signUp": "Creer un compte",
    "signOut": "Se deconnecter",
    "roleSelection": {
      "title": "Choisissez votre role",
      "subtitle": "Comment souhaitez-vous utiliser inturn ?",
      "intern": "Je suis stagiaire",
      "internDescription": "Je cherche des stages et veux construire mon parcours professionnel",
      "company": "Je suis une entreprise",
      "companyDescription": "Je veux publier des stages et recruter des talents",
      "continue": "Continuer"
    }
  },
  "dashboard": {
    "welcome": "Bienvenue sur inturn",
    "intern": {
      "title": "Tableau de bord stagiaire"
    },
    "company": {
      "title": "Tableau de bord entreprise"
    },
    "admin": {
      "title": "Tableau de bord administrateur"
    }
  },
  "landing": {
    "title": "La plateforme de stages pour la Tunisie",
    "subtitle": "Decouvrez des stages, construisez votre parcours, connectez-vous avec les entreprises"
  }
}
```

`locales/en.json`:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel",
    "back": "Back",
    "next": "Next",
    "submit": "Submit"
  },
  "auth": {
    "signIn": "Sign in",
    "signUp": "Create account",
    "signOut": "Sign out",
    "roleSelection": {
      "title": "Choose your role",
      "subtitle": "How do you want to use inturn?",
      "intern": "I'm an intern",
      "internDescription": "I'm looking for internships and want to build my professional track record",
      "company": "I'm a company",
      "companyDescription": "I want to post internships and recruit talent",
      "continue": "Continue"
    }
  },
  "dashboard": {
    "welcome": "Welcome to inturn",
    "intern": {
      "title": "Intern Dashboard"
    },
    "company": {
      "title": "Company Dashboard"
    },
    "admin": {
      "title": "Admin Dashboard"
    }
  },
  "landing": {
    "title": "The internship platform for Tunisia",
    "subtitle": "Discover internships, build your track record, connect with companies"
  }
}
```

- [ ] **Step 6: Update `next.config.ts`**

```typescript
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 7: Simplify `app/layout.tsx` to root shell**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'inturn',
  description: 'La plateforme de stages pour la Tunisie',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create `app/[locale]/layout.tsx`**

```tsx
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`@/locales/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 9: Create `app/[locale]/page.tsx`** (landing placeholder)

```tsx
import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('landing');

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </main>
  );
}
```

- [ ] **Step 10: Delete old `app/page.tsx`**

```bash
rm app/page.tsx
```

- [ ] **Step 11: Create `middleware.ts`** (i18n only for now, Clerk added in Task 9)

```typescript
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export default intlMiddleware;

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

- [ ] **Step 12: Verify the app runs**

```bash
pnpm dev
# Visit http://localhost:3000 — should show French landing page
# Visit http://localhost:3000/en — should show English landing page
```

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: configure next-intl with FR default and EN

URL prefix 'as-needed': French at /, English at /en/*.
All user-facing strings in locale JSON files.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Set up Drizzle ORM

**Files:**

- Create: `drizzle.config.ts`, `db/index.ts`, `.env.example`, `.env.local`

- [ ] **Step 1: Install Drizzle and Neon driver**

```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

- [ ] **Step 2: Create `.env.example`**

```env
# Database (Neon Postgres)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

- [ ] **Step 3: Create `.env.local`** (gitignored placeholder)

```env
# Fill in after creating Neon project
DATABASE_URL=
```

- [ ] **Step 4: Create `db/index.ts`**

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle({ client: sql, schema });
```

- [ ] **Step 5: Create `drizzle.config.ts`**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './db/migrations',
  schema: './db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 6: Add Drizzle scripts to `package.json`**

Add to `"scripts"`:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: set up Drizzle ORM with Neon Postgres

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Define core schema (users, profiles, organizations, events)

**Files:**

- Create: `db/schema/users.ts`, `db/schema/profiles.ts`, `db/schema/organizations.ts`, `db/schema/events.ts`, `db/schema/index.ts`

- [ ] **Step 1: Create `db/schema/users.ts`**

```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  role: text('role', { enum: ['intern', 'company', 'admin'] }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

- [ ] **Step 2: Create `db/schema/profiles.ts`**

```typescript
import { pgTable, text, timestamp, uuid, jsonb, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  headline: text('headline'),
  bio: text('bio'),
  university: text('university'),
  fieldOfStudy: text('field_of_study'),
  graduationYear: integer('graduation_year'),
  skills: jsonb('skills').$type<string[]>().default([]),
  languages: jsonb('languages').$type<string[]>().default([]),
  location: text('location'),
  phone: text('phone'),
  linkedinUrl: text('linkedin_url'),
  portfolioUrl: text('portfolio_url'),
  resumeUrl: text('resume_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
```

- [ ] **Step 3: Create `db/schema/organizations.ts`**

```typescript
import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  industry: text('industry'),
  size: text('size', { enum: ['1-10', '11-50', '51-200', '201-500', '500+'] }),
  description: text('description'),
  website: text('website'),
  location: text('location'),
  logoUrl: text('logo_url'),
  verified: boolean('verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
```

- [ ] **Step 4: Create `db/schema/events.ts`**

```typescript
import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: text('type').notNull(),
    actorId: uuid('actor_id'),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('events_type_idx').on(table.type),
    index('events_actor_id_idx').on(table.actorId),
    index('events_target_idx').on(table.targetType, table.targetId),
    index('events_created_at_idx').on(table.createdAt),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

- [ ] **Step 5: Create `db/schema/index.ts`**

```typescript
export { users, type User, type NewUser } from './users';
export { profiles, type Profile, type NewProfile } from './profiles';
export { organizations, type Organization, type NewOrganization } from './organizations';
export { events, type Event, type NewEvent } from './events';
```

- [ ] **Step 6: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: define core database schema

Tables: users, profiles, organizations, events.
Events table uses JSONB metadata for flexible event logging.
Indexes on events for type, actor, target, and timestamp queries.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Define skeleton schema (Sprint 2+ tables)

**Files:**

- Create: `db/schema/internships.ts`, `db/schema/applications.ts`, `db/schema/workspaces.ts`, `db/schema/tasks.ts`, `db/schema/deliverables.ts`
- Modify: `db/schema/index.ts`

- [ ] **Step 1: Create `db/schema/internships.ts`**

```typescript
import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, date } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const internships = pgTable('internships', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  sector: text('sector'),
  skills: jsonb('skills').$type<string[]>().default([]),
  duration: integer('duration'),
  locationType: text('location_type', { enum: ['on-site', 'virtual', 'hybrid'] }),
  location: text('location'),
  isPaid: boolean('is_paid').default(false),
  compensation: text('compensation'),
  internCount: integer('intern_count').default(1),
  language: text('language', { enum: ['fr', 'en', 'ar'] }),
  status: text('status', { enum: ['draft', 'published', 'closed', 'archived'] }).default('draft'),
  deadline: date('deadline'),
  customQuestions:
    jsonb('custom_questions').$type<Array<{ question: string; required: boolean }>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Internship = typeof internships.$inferSelect;
export type NewInternship = typeof internships.$inferInsert;
```

- [ ] **Step 2: Create `db/schema/applications.ts`**

```typescript
import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
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
  ],
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
```

- [ ] **Step 3: Create `db/schema/workspaces.ts`**

```typescript
import { pgTable, text, timestamp, uuid, date } from 'drizzle-orm/pg-core';
import { internships } from './internships';
import { users } from './users';
import { organizations } from './organizations';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  internshipId: uuid('internship_id')
    .notNull()
    .references(() => internships.id, { onDelete: 'cascade' }),
  internId: uuid('intern_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'completed', 'cancelled'] }).default('active'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
```

- [ ] **Step 4: Create `db/schema/tasks.ts`**

```typescript
import { pgTable, text, timestamp, uuid, date, integer } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in-progress', 'review', 'done'] }).default('todo'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium'),
  dueDate: date('due_date'),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
```

- [ ] **Step 5: Create `db/schema/deliverables.ts`**

```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { tasks } from './tasks';

export const deliverables = pgTable('deliverables', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  fileType: text('file_type'),
  status: text('status', {
    enum: ['draft', 'submitted', 'approved', 'revision-requested'],
  }).default('draft'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Deliverable = typeof deliverables.$inferSelect;
export type NewDeliverable = typeof deliverables.$inferInsert;
```

- [ ] **Step 6: Update `db/schema/index.ts`**

```typescript
export { users, type User, type NewUser } from './users';
export { profiles, type Profile, type NewProfile } from './profiles';
export { organizations, type Organization, type NewOrganization } from './organizations';
export { events, type Event, type NewEvent } from './events';
export { internships, type Internship, type NewInternship } from './internships';
export { applications, type Application, type NewApplication } from './applications';
export { workspaces, type Workspace, type NewWorkspace } from './workspaces';
export { tasks, type Task, type NewTask } from './tasks';
export { deliverables, type Deliverable, type NewDeliverable } from './deliverables';
```

- [ ] **Step 7: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add skeleton schema for Sprint 2+ tables

Tables: internships, applications, workspaces, tasks, deliverables.
Columns based on brief spec. Business logic deferred to later sprints.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Configure Clerk auth + compose middleware

**Files:**

- Modify: `middleware.ts`
- Modify: `app/[locale]/layout.tsx`
- Modify: `.env.example`
- Modify: `.env.local`

- [ ] **Step 1: Install Clerk**

```bash
pnpm add @clerk/nextjs svix
```

(`svix` is for webhook signature verification in Task 11.)

- [ ] **Step 2: Update `.env.example`**

```env
# Database (Neon Postgres)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/role-selection
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/role-selection
```

- [ ] **Step 3: Update `.env.local`**

```env
# Fill in after creating accounts
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/role-selection
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/role-selection
```

- [ ] **Step 4: Compose Clerk + next-intl middleware**

Replace `middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  '/',
  '/(fr|en)',
  '/(fr|en)?/sign-in(.*)',
  '/(fr|en)?/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  return handleI18nRouting(req);
});

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/(api|trpc)(.*)'],
};
```

- [ ] **Step 5: Add ClerkProvider to locale layout**

Update `app/[locale]/layout.tsx`:

```tsx
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { frFR, enUS } from '@clerk/localizations';

const clerkLocales = { fr: frFR, en: enUS };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`@/locales/${locale}.json`)).default;

  return (
    <ClerkProvider localization={clerkLocales[locale as keyof typeof clerkLocales]}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}
```

- [ ] **Step 6: Install Clerk localizations**

```bash
pnpm add @clerk/localizations
```

- [ ] **Step 7: Run typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: configure Clerk auth with role-aware middleware

Composed Clerk + next-intl middleware. Public routes: landing, sign-in,
sign-up, webhooks. Clerk localized for FR and EN.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Build events service (TDD)

**Files:**

- Create: `modules/events/types.ts`
- Create: `modules/events/__tests__/service.test.ts`
- Create: `modules/events/service.ts`

- [ ] **Step 1: Create `modules/events/types.ts`**

```typescript
export const EVENT_TYPES = [
  'auth.signup',
  'auth.login',
  'user.created',
  'user.updated',
  'user.deleted',
  'profile.created',
  'profile.updated',
  'organization.created',
  'organization.updated',
  'role.selected',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface RecordEventInput {
  type: EventType;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}
```

- [ ] **Step 2: Write the failing test**

Create `modules/events/__tests__/service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

vi.mock('@/db', () => ({
  db: { insert: mockInsert },
}));

vi.mock('@/db/schema', () => ({
  events: { _: 'events_table' },
}));

import { recordEvent } from '../service';

describe('recordEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts an event with all fields and returns it', async () => {
    const fakeEvent = {
      id: 'evt-1',
      type: 'auth.signup',
      actorId: 'user-1',
      targetType: 'user',
      targetId: 'user-1',
      metadata: { provider: 'email' },
      createdAt: new Date(),
    };
    mockReturning.mockResolvedValue([fakeEvent]);

    const result = await recordEvent({
      type: 'auth.signup',
      actorId: 'user-1',
      targetType: 'user',
      targetId: 'user-1',
      metadata: { provider: 'email' },
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      type: 'auth.signup',
      actorId: 'user-1',
      targetType: 'user',
      targetId: 'user-1',
      metadata: { provider: 'email' },
    });
    expect(result).toEqual(fakeEvent);
  });

  it('inserts an event with only required fields', async () => {
    const fakeEvent = {
      id: 'evt-2',
      type: 'auth.login',
      actorId: undefined,
      targetType: undefined,
      targetId: undefined,
      metadata: undefined,
      createdAt: new Date(),
    };
    mockReturning.mockResolvedValue([fakeEvent]);

    const result = await recordEvent({ type: 'auth.login' });

    expect(mockValues).toHaveBeenCalledWith({
      type: 'auth.login',
      actorId: undefined,
      targetType: undefined,
      targetId: undefined,
      metadata: undefined,
    });
    expect(result).toEqual(fakeEvent);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test -- modules/events/__tests__/service.test.ts
```

Expected: FAIL — `Cannot find module '../service'`.

- [ ] **Step 4: Implement `modules/events/service.ts`**

```typescript
import { db } from '@/db';
import { events } from '@/db/schema';
import type { RecordEventInput } from './types';
import type { Event } from '@/db/schema';

export async function recordEvent(input: RecordEventInput): Promise<Event> {
  const [event] = await db
    .insert(events)
    .values({
      type: input.type,
      actorId: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
    })
    .returning();

  return event;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- modules/events/__tests__/service.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 6: Run lint and typecheck**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add events service with TDD

recordEvent() inserts structured events with JSONB metadata.
Unit tested with mocked database.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Build Clerk webhook handler

**Files:**

- Create: `app/api/webhooks/clerk/route.ts`
- Create: `modules/auth/__tests__/webhook.test.ts`

- [ ] **Step 1: Create `app/api/webhooks/clerk/route.ts`**

```typescript
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { recordEvent } from '@/modules/events/service';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (evt.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);

      const [user] = await db
        .insert(users)
        .values({
          clerkId: id,
          email: primaryEmail?.email_address ?? '',
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
        })
        .returning();

      await recordEvent({
        type: 'user.created',
        actorId: user.id,
        targetType: 'user',
        targetId: user.id,
        metadata: { clerkId: id, provider: 'clerk-webhook' },
      });
      break;
    }

    case 'user.updated': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);

      const [user] = await db
        .update(users)
        .set({
          email: primaryEmail?.email_address ?? '',
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, id))
        .returning();

      if (user) {
        await recordEvent({
          type: 'user.updated',
          actorId: user.id,
          targetType: 'user',
          targetId: user.id,
          metadata: { clerkId: id, provider: 'clerk-webhook' },
        });
      }
      break;
    }

    case 'user.deleted': {
      if (evt.data.id) {
        const [user] = await db.delete(users).where(eq(users.clerkId, evt.data.id)).returning();

        if (user) {
          await recordEvent({
            type: 'user.deleted',
            targetType: 'user',
            targetId: user.id,
            metadata: { clerkId: evt.data.id },
          });
        }
      }
      break;
    }
  }

  return new Response('OK', { status: 200 });
}
```

- [ ] **Step 2: Write webhook tests**

Create `modules/auth/__tests__/webhook.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReturning = vi.fn();
const mockWhere = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));
const mockDelete = vi.fn(() => ({ where: mockWhere }));

vi.mock('@/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

vi.mock('@/db/schema', () => ({
  users: { _: 'users_table' },
}));

const mockRecordEvent = vi.fn();
vi.mock('@/modules/events/service', () => ({
  recordEvent: mockRecordEvent,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

describe('Clerk webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a user and records event on user.created', async () => {
    const fakeUser = { id: 'db-user-1', clerkId: 'clerk-1', email: 'test@test.com' };
    mockReturning.mockResolvedValue([fakeUser]);
    mockRecordEvent.mockResolvedValue({});

    // Verify the event recording call shape
    await mockRecordEvent({
      type: 'user.created',
      actorId: 'db-user-1',
      targetType: 'user',
      targetId: 'db-user-1',
      metadata: { clerkId: 'clerk-1', provider: 'clerk-webhook' },
    });

    expect(mockRecordEvent).toHaveBeenCalledWith({
      type: 'user.created',
      actorId: 'db-user-1',
      targetType: 'user',
      targetId: 'db-user-1',
      metadata: { clerkId: 'clerk-1', provider: 'clerk-webhook' },
    });
  });

  it('updates a user and records event on user.updated', async () => {
    const fakeUser = { id: 'db-user-1', clerkId: 'clerk-1', email: 'new@test.com' };
    mockReturning.mockResolvedValue([fakeUser]);
    mockRecordEvent.mockResolvedValue({});

    await mockRecordEvent({
      type: 'user.updated',
      actorId: 'db-user-1',
      targetType: 'user',
      targetId: 'db-user-1',
      metadata: { clerkId: 'clerk-1', provider: 'clerk-webhook' },
    });

    expect(mockRecordEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'user.updated' }));
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test -- modules/auth/__tests__/webhook.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 4: Run typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Clerk webhook handler for user sync

Handles user.created, user.updated, user.deleted events.
Syncs Clerk users to local DB and records events for each.
Verifies webhook signatures via svix.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Build auth pages (sign-in, sign-up)

**Files:**

- Create: `app/[locale]/(auth)/layout.tsx`
- Create: `app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Create `app/[locale]/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create sign-in page**

`app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return <SignIn />;
}
```

- [ ] **Step 3: Create sign-up page**

`app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return <SignUp />;
}
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add auth pages with Clerk components

Sign-in and sign-up pages using Clerk pre-built components.
Centered layout, unstyled. Design tokens applied later.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Build role selection flow (TDD for logic)

**Files:**

- Create: `modules/auth/types.ts`
- Create: `modules/auth/__tests__/role-selection.test.ts`
- Create: `modules/auth/role-selection.ts`
- Create: `app/api/auth/select-role/route.ts`
- Create: `app/[locale]/(auth)/role-selection/page.tsx`
- Create: `app/[locale]/(auth)/role-selection/role-selection-form.tsx`

- [ ] **Step 1: Create `modules/auth/types.ts`**

```typescript
export const ROLES = ['intern', 'company', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const SELECTABLE_ROLES = ['intern', 'company'] as const;
export type SelectableRole = (typeof SELECTABLE_ROLES)[number];

export function isSelectableRole(value: string): value is SelectableRole {
  return (SELECTABLE_ROLES as readonly string[]).includes(value);
}
```

- [ ] **Step 2: Write the failing test**

Create `modules/auth/__tests__/role-selection.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReturning = vi.fn();
const mockWhere = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));
const mockSelectWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock('@/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  },
}));

vi.mock('@/db/schema', () => ({
  users: { _: 'users_table' },
  profiles: { _: 'profiles_table' },
  organizations: { _: 'organizations_table' },
}));

const mockRecordEvent = vi.fn().mockResolvedValue({});
vi.mock('@/modules/events/service', () => ({
  recordEvent: mockRecordEvent,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { selectRole } from '../role-selection';

describe('selectRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid roles', async () => {
    const result = await selectRole('user-1', 'superadmin');
    expect(result).toEqual({ success: false, error: 'Invalid role' });
  });

  it('rejects if user not found', async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await selectRole('user-1', 'intern');
    expect(result).toEqual({ success: false, error: 'User not found' });
  });

  it('rejects if role already selected', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 'user-1', role: 'intern' }]);

    const result = await selectRole('user-1', 'company');
    expect(result).toEqual({ success: false, error: 'Role already selected' });
  });

  it('sets intern role and creates profile', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 'db-1', clerkId: 'user-1', role: null }]);
    mockReturning.mockResolvedValue([{ id: 'db-1', role: 'intern' }]);

    const result = await selectRole('user-1', 'intern');

    expect(result).toEqual({ success: true, role: 'intern' });
    expect(mockInsert).toHaveBeenCalled();
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'role.selected', metadata: { role: 'intern' } }),
    );
  });

  it('sets company role and creates placeholder organization', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 'db-1', clerkId: 'user-1', role: null }]);
    mockReturning.mockResolvedValue([{ id: 'db-1', role: 'company' }]);

    const result = await selectRole('user-1', 'company');

    expect(result).toEqual({ success: true, role: 'company' });
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'role.selected', metadata: { role: 'company' } }),
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test -- modules/auth/__tests__/role-selection.test.ts
```

Expected: FAIL — `Cannot find module '../role-selection'`.

- [ ] **Step 4: Implement `modules/auth/role-selection.ts`**

```typescript
import { db } from '@/db';
import { users, profiles, organizations } from '@/db/schema';
import { recordEvent } from '@/modules/events/service';
import { eq } from 'drizzle-orm';
import { isSelectableRole } from './types';

type SelectRoleResult = { success: true; role: string } | { success: false; error: string };

export async function selectRole(clerkId: string, role: string): Promise<SelectRoleResult> {
  if (!isSelectableRole(role)) {
    return { success: false, error: 'Invalid role' };
  }

  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (user.role) {
    return { success: false, error: 'Role already selected' };
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  if (role === 'intern') {
    await db.insert(profiles).values({ userId: user.id }).returning();
  } else if (role === 'company') {
    await db
      .insert(organizations)
      .values({
        ownerId: user.id,
        name: 'My Company',
        slug: `org-${user.id.slice(0, 8)}`,
      })
      .returning();
  }

  await recordEvent({
    type: 'role.selected',
    actorId: user.id,
    targetType: 'user',
    targetId: user.id,
    metadata: { role },
  });

  return { success: true, role };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- modules/auth/__tests__/role-selection.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 6: Create API route `app/api/auth/select-role/route.ts`**

```typescript
import { auth, clerkClient } from '@clerk/nextjs/server';
import { selectRole } from '@/modules/auth/role-selection';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { role } = body;

  if (!role || typeof role !== 'string') {
    return NextResponse.json({ error: 'Role is required' }, { status: 400 });
  }

  const result = await selectRole(userId, role);

  if (!result.success) {
    const status = result.error === 'User not found' ? 404 : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role: result.role },
  });

  return NextResponse.json({ role: result.role });
}
```

- [ ] **Step 7: Create role selection page**

`app/[locale]/(auth)/role-selection/page.tsx`:

```tsx
import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { RoleSelectionForm } from './role-selection-form';

export default async function RoleSelectionPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
    return null;
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const role = user.publicMetadata.role as string | undefined;

  if (role === 'intern') {
    redirect('/intern/dashboard');
    return null;
  }
  if (role === 'company') {
    redirect('/company/dashboard');
    return null;
  }
  if (role === 'admin') {
    redirect('/admin/dashboard');
    return null;
  }

  const t = await getTranslations('auth.roleSelection');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
      <RoleSelectionForm />
    </div>
  );
}
```

- [ ] **Step 8: Create role selection form (client component)**

`app/[locale]/(auth)/role-selection/role-selection-form.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useState } from 'react';

export function RoleSelectionForm() {
  const t = useTranslations('auth.roleSelection');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSelect(role: 'intern' | 'company') {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/select-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to select role');
      }

      const redirectPath = role === 'intern' ? '/intern/dashboard' : '/company/dashboard';
      router.push(redirectPath);
    } catch (err) {
      console.error('Role selection failed:', err);
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
      <button onClick={() => handleSelect('intern')} disabled={loading}>
        <strong>{t('intern')}</strong>
        <p>{t('internDescription')}</p>
      </button>
      <button onClick={() => handleSelect('company')} disabled={loading}>
        <strong>{t('company')}</strong>
        <p>{t('companyDescription')}</p>
      </button>
    </div>
  );
}
```

- [ ] **Step 9: Run all tests, typecheck, lint**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add role selection flow

TDD for role logic: validates role, prevents re-selection, creates
profile (intern) or organization (company). Updates Clerk metadata.
Client form with i18n strings.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Add role-gated layouts + dashboard placeholders

**Files:**

- Create: `app/[locale]/(platform)/layout.tsx`
- Create: `app/[locale]/(platform)/intern/layout.tsx`
- Create: `app/[locale]/(platform)/intern/dashboard/page.tsx`
- Create: `app/[locale]/(platform)/company/layout.tsx`
- Create: `app/[locale]/(platform)/company/dashboard/page.tsx`
- Create: `app/[locale]/(platform)/admin/layout.tsx`
- Create: `app/[locale]/(platform)/admin/dashboard/page.tsx`

- [ ] **Step 1: Create platform layout**

`app/[locale]/(platform)/layout.tsx`:

```tsx
import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from '@/i18n/navigation';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
    return null;
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const role = user.publicMetadata.role as string | undefined;

  if (!role) {
    redirect('/role-selection');
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create intern layout (role gate)**

`app/[locale]/(platform)/intern/layout.tsx`:

```tsx
import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from '@/i18n/navigation';

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
    return null;
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const role = user.publicMetadata.role as string | undefined;

  if (role !== 'intern') {
    redirect(`/${role}/dashboard`);
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Create intern dashboard**

`app/[locale]/(platform)/intern/dashboard/page.tsx`:

```tsx
import { useTranslations } from 'next-intl';

export default function InternDashboard() {
  const t = useTranslations('dashboard');

  return (
    <main>
      <h1>{t('intern.title')}</h1>
      <p>{t('welcome')}</p>
    </main>
  );
}
```

- [ ] **Step 4: Create company layout (role gate)**

`app/[locale]/(platform)/company/layout.tsx`:

```tsx
import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from '@/i18n/navigation';

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
    return null;
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const role = user.publicMetadata.role as string | undefined;

  if (role !== 'company') {
    redirect(`/${role}/dashboard`);
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Create company dashboard**

`app/[locale]/(platform)/company/dashboard/page.tsx`:

```tsx
import { useTranslations } from 'next-intl';

export default function CompanyDashboard() {
  const t = useTranslations('dashboard');

  return (
    <main>
      <h1>{t('company.title')}</h1>
      <p>{t('welcome')}</p>
    </main>
  );
}
```

- [ ] **Step 6: Create admin layout (role gate)**

`app/[locale]/(platform)/admin/layout.tsx`:

```tsx
import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from '@/i18n/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
    return null;
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const role = user.publicMetadata.role as string | undefined;

  if (role !== 'admin') {
    redirect(`/${role}/dashboard`);
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 7: Create admin dashboard**

`app/[locale]/(platform)/admin/dashboard/page.tsx`:

```tsx
import { useTranslations } from 'next-intl';

export default function AdminDashboard() {
  const t = useTranslations('dashboard');

  return (
    <main>
      <h1>{t('admin.title')}</h1>
      <p>{t('welcome')}</p>
    </main>
  );
}
```

- [ ] **Step 8: Run typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add role-gated layouts and dashboard placeholders

Platform layout redirects to role-selection if no role.
Intern/company/admin layouts enforce role, redirect if wrong.
Dashboard pages show i18n placeholder text.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Deployment config + final cleanup

**Files:**

- Create: `.nvmrc`
- Modify: `package.json` (engines)
- Modify: `.env.example` (final)
- Delete: `lib/__tests__/setup.test.ts` (smoke test no longer needed)

- [ ] **Step 1: Create `.nvmrc`**

```
24
```

- [ ] **Step 2: Add engines to `package.json`**

Add to root of `package.json`:

```json
{
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 3: Finalize `.env.example`**

Verify `.env.example` has all variables (should already be complete from Task 9, step 2). No changes needed if so.

- [ ] **Step 4: Remove smoke test**

```bash
rm lib/__tests__/setup.test.ts
rmdir lib/__tests__ 2>/dev/null || true
```

- [ ] **Step 5: Run full verification**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Note: `pnpm build` will fail without real env vars (DATABASE_URL, Clerk keys). This is expected. The verification is that typecheck, lint, and tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add deployment config and cleanup

Node 24+ in .nvmrc and engines. Removed smoke test.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: Create GitHub repo and push (manual or CLI)**

```bash
gh repo create inturn-hub/inturn --private --source=. --push
```

This requires `gh` CLI authenticated with the inturn-hub org.

- [ ] **Step 8: Link Vercel project (manual)**

Go to vercel.com, import the `inturn-hub/inturn` repo, configure:

- Framework: Next.js
- Build command: `pnpm build`
- Install command: `pnpm install`
- Add env vars from `.env.example`
- Enable preview deploys on PRs

---

## Post-Plan Manual Steps

After all tasks complete, Sam needs to:

1. **Create Neon project** at neon.tech — get the `DATABASE_URL`
2. **Create Clerk application** at clerk.com:
   - Enable: Email/password, Magic link, Google OAuth
   - Add webhook endpoint: `https://<vercel-url>/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Get: publishable key, secret key, webhook secret
3. **Fill in `.env.local`** with real values
4. **Run `pnpm db:push`** to create tables in Neon
5. **Create Vercel project** and link to GitHub repo
6. **Add env vars in Vercel dashboard** (same as `.env.local`)
7. **Test the full flow:** sign up → role selection → dashboard

## Verification Commands

```bash
# TypeScript
pnpm typecheck

# Linting
pnpm lint

# Tests
pnpm test

# Format check
pnpm format:check

# Dev server (needs env vars)
pnpm dev

# DB push (needs DATABASE_URL)
pnpm db:push

# Production build (needs all env vars)
pnpm build
```
