# Exhaustive Bilingual i18n (FR/EN) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire product fully bilingual (FR default / EN), with `eslint i18next/no-literal-string` enforcing that no hardcoded user-facing string can ever be reintroduced.

**Architecture:** A lint rule is the spine: it produces the exact inventory and is the definition of done. Work proceeds as directory-scoped batches against that burn-down. Four string classes use four mechanisms — UI (`useTranslations`/`getTranslations`), emails & PDF (`getTranslations({locale})` outside a request), validation (error-codes→keys). Single branch `feat/i18n-exhaustive`, rebased onto latest `main` first so it covers all merged university work.

**Tech Stack:** Next.js 16 App Router, next-intl 4, Drizzle/Neon, `eslint-plugin-i18next`, `locales/{fr,en}.json`.

**Spec:** `docs/superpowers/specs/2026-05-30-exhaustive-i18n-design.md`

**Note on scope shrink:** `users.localePref` (`'en'|'fr'`, nullable) already exists in `db/schema/users.ts` — **no migration**. We add the *setter* (profile toggle) and *consumers* (emails/UI default).

---

## Phase 0 — Foundation

### Task 0: Establish the current base

**Files:** none (git only)

- [ ] **Step 1: Rebase the stack onto latest `main`**

```bash
cd /Users/mac/code/inturn-hub/inturn-i18n
git fetch --all
git rebase --onto main 061a8fc feat/i18n-exhaustive --update-refs
```
Expected: replays the fix commits + spec onto current `main` (which now has all university work). Resolve `locales/{fr,en}.json` conflicts by **keeping both sides' additions** (different namespaces — union them). After resolving: `git rebase --continue`.

- [ ] **Step 2: Verify the base compiles**

Run: `pnpm install && pnpm typecheck`
Expected: clean. If `pnpm typecheck` fails on academic-supervision code, that's a pre-existing main issue — note it, don't fix it here.

- [ ] **Step 3: Confirm university surfaces are present**

Run: `ls "app/[locale]/(platform)/intern/university" "app/[locale]/(platform)/university" && ls lib/email/templates/ | grep academic`
Expected: directories exist + `academic-report-{submitted,reviewed}.ts` present. These are now in scope.

### Task 1: Add the lint guardrail (as `warn`) + capture the inventory

**Files:**
- Modify: the eslint flat config (locate: `ls eslint.config.*` — likely `eslint.config.mjs`; if config lives in `package.json`, edit there)
- Modify: `package.json` (devDependency)

- [ ] **Step 1: Install the plugin**

```bash
pnpm add -D eslint-plugin-i18next
```

- [ ] **Step 2: Locate and read the eslint config**

Run: `ls eslint.config.* 2>/dev/null; grep -n eslint package.json | head`
Read whichever file holds the config before editing.

- [ ] **Step 3: Add the rule (flat config example — adapt to the real file)**

```js
// eslint.config.mjs
import i18next from 'eslint-plugin-i18next';

export default [
  // ...existing config...
  {
    files: ['app/**/*.tsx', 'modules/**/*.tsx', 'components/**/*.tsx'],
    ignores: [
      'components/ui/**',                 // primitives carry no own copy
      '**/*.test.tsx', '**/*.test.ts',
      'app/[locale]/(auth)/dev/**',       // dev-only
    ],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['warn', {
        mode: 'jsx-text-only',            // start text-only; widen to attributes in Phase 2
        'jsx-attributes': { include: ['aria-label', 'title', 'placeholder', 'alt'] },
        words: { exclude: ['Inturn', 'inturn'] },
      }],
    },
  },
];
```

- [ ] **Step 4: Capture the baseline inventory (the burn-down)**

```bash
pnpm exec eslint "app/**/*.tsx" "modules/**/*.tsx" "components/**/*.tsx" -f json 2>/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);const by={};for(const f of r){if(!f.warningCount)continue;const dir=f.filePath.split('/').slice(-4,-1).join('/');by[dir]=(by[dir]||0)+f.warningCount;}console.log(Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([d,n])=>n+'  '+d).join('\n'));console.log('TOTAL',r.reduce((a,f)=>a+f.warningCount,0));})"
```
Expected: a per-directory violation count. **Save this output** — it is the burn-down list that orders Phase 1 and tells us when each batch is done.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml eslint.config.mjs
git commit -m "chore(i18n): add no-literal-string lint guardrail (warn) + baseline inventory"
```

### Task 2: Verification harness (locale parity + FR/EN render helper)

**Files:**
- Create: `scripts/check-locale-parity.ts`
- Create: `scripts/_i18n-cookies.ts` (throwaway-style helper; gitignore or keep under scripts/)

- [ ] **Step 1: Locale parity check**

```ts
// scripts/check-locale-parity.ts
import fr from '../locales/fr.json';
import en from '../locales/en.json';
const flat = (o: any, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v, p + k + '.') : [p + k]);
const f = new Set(flat(fr)), e = new Set(flat(en));
const miss = [...f].filter(x => !e.has(x)).concat([...e].filter(x => !f.has(x)));
if (miss.length) { console.error('KEY MISMATCH:', miss.slice(0, 50)); process.exit(1); }
console.log(`OK — ${f.size} keys aligned`);
```

- [ ] **Step 2: Wire it into the lint/CI script**

Add to `package.json` scripts: `"check:i18n": "tsx scripts/check-locale-parity.ts"`. Run: `pnpm check:i18n` → Expected: `OK — N keys aligned`.

- [ ] **Step 3: Render helper for verification**

The dev server is driven with sourced env (`set -a && . .env.local && set +a && pnpm exec next dev -p 3001`) and crafted dev cookies (`inturn-dev-session = <clerkId>.<hmac(clerkId, DEV_AUTH_SECRET)>`). Keep a `scripts/_i18n-cookies.ts` that prints admin/company/intern/coordinator cookies + sample ids, so each batch can curl pages in **both** FR (`/path`) and EN (`/en/path`) and grep for leaked English. (Pattern already proven in the QA/fix work.)

- [ ] **Step 4: Commit**

```bash
git add scripts/check-locale-parity.ts package.json
git commit -m "chore(i18n): locale parity check + render verification harness"
```

### Task 3: Profile language toggle (sets `users.localePref`)

**Files:**
- Modify: `app/[locale]/(platform)/account/edit/page.tsx` (+ its form component)
- Modify or create: a `setLocalePrefAction` in `modules/account/` (follow the existing account-action pattern)

- [ ] **Step 1: Server action**

```ts
'use server';
import { requireSession } from '@/modules/auth/session';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function setLocalePrefAction(locale: 'fr' | 'en'): Promise<{ ok: boolean }> {
  const session = await requireSession();
  await db.update(users).set({ localePref: locale }).where(eq(users.id, session.user.id));
  revalidatePath('/account');
  return { ok: true };
}
```

- [ ] **Step 2: Toggle UI in account/edit** — a two-option control (Français / English) bound to `setLocalePrefAction`, current value from `users.localePref ?? activeLocale`. On change, also switch the UI locale (`router.replace` with the `/en` prefix or none). Localize its own labels via a new `account.language.*` namespace.

- [ ] **Step 3: Verify live** — set EN, confirm the row updates and the UI switches; set FR back. Run `pnpm typecheck`.

- [ ] **Step 4: Commit** — `feat(account): language preference toggle writing users.localePref`

### Task 4: Email i18n infrastructure

**Files:**
- Modify: `lib/email/templates/_layout.ts` + each sender that builds a template
- Modify: the dispatch path (`modules/notifications/dispatcher.ts` and any `sendEmail` callers) to pass the recipient's `localePref ?? 'fr'`

- [ ] **Step 1: Establish the pattern (one template first — `application-received.ts`)**

```ts
import { getTranslations } from 'next-intl/server';

export async function applicationReceivedEmail(opts: {
  recipientLocale: 'fr' | 'en'; applicantName: string; internshipTitle: string; ctaHref: string;
}) {
  const t = await getTranslations({ locale: opts.recipientLocale, namespace: 'emails.applicationReceived' });
  return {
    subject: t('subject', { title: opts.internshipTitle }),
    html: layout(opts.recipientLocale, t('body', { name: opts.applicantName }), opts.ctaHref, t('cta')),
  };
}
```
Add `emails.applicationReceived.{subject,body,cta}` to both locales.

- [ ] **Step 2: Thread `recipientLocale` from the dispatcher** — at each send site, load the recipient `users.localePref` (default `'fr'`) and pass it in.

- [ ] **Step 3: Verify** — render this template in FR and EN (call the builder in a tsx scratch script, print both subjects/bodies). Confirm no English in the FR output.

- [ ] **Step 4: Commit** — `feat(emails): locale-aware rendering via recipient localePref (first template)`

---

## Phase 1 — Surface localization batches

**The burn-down order** comes from Task 1 Step 4 (highest count first), but target these surfaces:

| # | Surface | Paths | Notes |
|---|---|---|---|
| 1 | Shared widgets | `components/` (excl. `ui/`) | marketplace card, match-explainer, brand bits |
| 2 | Intern app | `app/[locale]/(platform)/intern/**` + `modules/*` it uses | |
| 3 | Company app | `app/[locale]/(platform)/company/**` | incl. `internships/new/form.tsx` (~1000 lines) |
| 4 | Admin | `app/[locale]/(platform)/admin/**` | |
| 4b | University | `admin/universities`, `university/**`, `intern/university` | parts already ICU-localized |
| 5 | Public / marketing | `(marketing)/**`, `invite/[token]`, landing | |
| 6 | Emails | `lib/email/templates/**` | apply Task 4 pattern to the remaining 9 |
| 7 | Record PDF | `modules/records/pdf.tsx` | use `snapshot.locale` |
| 8 | Validation / system | server-action error codes, zod, toasts | codes → `t()` keys |

### The batch procedure (apply to every row above)

For each batch, run these steps. **Exit criterion: `no-literal-string` reports 0 in that scope, both locales render, parity passes.**

- [ ] **Step 1: List the batch's violations**

```bash
pnpm exec eslint "<batch-glob>" -f unix 2>/dev/null | grep no-literal-string
```

- [ ] **Step 2: Localize each string** using the right transformation:

**JSX text + listed attributes** (server component):
```tsx
// before:  <button aria-label="Close">Submit</button>
const t = await getTranslations('<namespace>');
// after:   <button aria-label={t('close')}>{t('submit')}</button>
```
Client component: `const t = useTranslations('<namespace>')` (same call sites). Interpolation: `t('greeting', { name })` ↔ `"greeting": "Bonjour {name}"`. Dates/relative-times: existing `formatDateShort` / `formatTimeAgo` with `useLocale()`.

**Record PDF** (`modules/records/pdf.tsx`):
```ts
const t = await getTranslations({ locale: snapshot.locale, namespace: 'pdf' });
// replace each hardcoded label with t('<label>')
```

**Validation / system messages:** server actions already return codes (`{ ok:false, error:'body_too_short' }`). At the display layer: `t(\`errors.\${result.error}\`)`. For zod, map `issue.code`/path → a key; never surface a raw English `message`.

Add every new key to **both** `locales/fr.json` and `locales/en.json` under a namespace that matches the surface (`workspace.*`, `company.*`, `admin.*`, `university.*`, `pdf.*`, `errors.*`, …). Reuse existing keys (e.g. `applications.status.*`) — don't duplicate.

- [ ] **Step 3: Re-run lint on the scope** → Expected: `0` violations. Run `pnpm check:i18n` → keys aligned.

- [ ] **Step 4: Run `pnpm typecheck`** → clean.

- [ ] **Step 5: Render the surface in FR and EN** on `:3001` (sourced-env dev server + dev cookie). Grep the SSR HTML for leaked English and for raw key paths; confirm no `MISSING_MESSAGE` in the server log. For client-only popovers/dialogs, drive with the preview browser.

- [ ] **Step 6: Commit** — `i18n(<surface>): localize <surface> (lint 0 in scope)`

> Batches 1–8 are independent and individually committable. A subagent can own one batch end-to-end; review the diff + the FR/EN render between batches.

---

## Phase 2 — Final sweep + the two visual gaps

### Task 5: Visual gaps (fold in — not i18n)

- [ ] **Avatar leak:** scope the floating user-avatar widget so it does NOT render on the standalone public layouts (`app/[locale]/records/[token]`, `app/[locale]/deliverables/[token]`). Find the widget in the root/platform layout; guard it out of the public route group. Verify: load a share page as an authed user → no avatar.
- [ ] **Verifications subtitle:** `app/[locale]/(platform)/admin/verifications` — make the subtitle reflect the active filter instead of the static "en attente" copy. Verify under each filter tab.
- [ ] **Commit** — `fix(ui): scope avatar off public share pages; verifications subtitle tracks filter`

### Task 6: Flip the lint to `error` and drive to zero

- [ ] **Step 1: Widen the rule** — set `no-literal-string` to `error`, and (now that text is clean) widen `mode` to also cover the remaining attributes. Re-run globally:

```bash
pnpm exec eslint "app/**/*.{ts,tsx}" "modules/**/*.{ts,tsx}" "components/**/*.tsx" 2>&1 | grep -c no-literal-string
```

- [ ] **Step 2: Drive the remainder to 0** — clean any stragglers the wider config surfaces (apply the batch procedure). Update the allowlist for genuine false-positives (technical tokens) rather than disabling lines.

- [ ] **Step 3: Full verification** — `pnpm exec eslint ... ` (0), `pnpm check:i18n` (aligned), `pnpm typecheck`, and a final FR+EN smoke pass across one page per surface + one email + the PDF.

- [ ] **Step 4: Commit** — `chore(i18n): enforce no-literal-string as error — exhaustive bilingual coverage complete`

### Task 7: Ready to merge

- [ ] **Step 1: Rebase onto latest `main`** (it has moved) — resolve locale unions, re-run `check:i18n` + `typecheck`.
- [ ] **Step 2: Hand off** the linear stack for FF-merge (or open a PR), same as the fix stack.

---

## Self-review notes

- **Spec coverage:** UI (Phase 1 batches 1–5, 4b), emails (Task 4 + batch 6), PDF (batch 7), validation (batch 8), lint guardrail (Task 1 + Task 6), `users.locale` (Task 3 — column pre-exists), 2 visual gaps (Task 5), verification (Task 2 + per-batch Step 5), university (batch 4b + Task 0). All mapped.
- **The per-string "code" is intentionally a procedure, not an enumeration** — the strings are *discovered* by the lint tool; enumerating thousands of `t()` calls in a plan would be noise. The canonical transformation per mechanism is the actual content an engineer needs.
- **Resumability:** the lint burn-down (Task 1 Step 4, re-run anytime) is the single source of "what's left."
