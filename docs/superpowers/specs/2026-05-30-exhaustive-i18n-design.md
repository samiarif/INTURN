# Exhaustive Bilingual i18n (FR/EN) — Design / Spec

**Date:** 2026-05-30
**Branch:** `feat/i18n-exhaustive` (stacked on `fix/ux-polish` so it builds on the
QA-pass localization instead of redoing it)
**Status:** Draft — pending review

---

## 1. Goal

Make the entire product **fully bilingual (French default / English)** — every
string a user can read, in or out of the app — and make "done" **measurable and
regression-proof** via a lint rule. After this, a hardcoded English literal
fails CI; the app can never silently drift back to half-localized.

French is and remains the default locale (`localePrefix: 'as-needed'`, no prefix
for FR; `/en` prefix for EN). Tunisia-French register, matching existing entries.

## 2. Definition of done

1. `eslint` with `i18next/no-literal-string` (error) passes across the repo —
   zero hardcoded user-facing literals outside the allowlist.
2. `pnpm typecheck` clean.
3. `locales/fr.json` and `locales/en.json` are structurally identical (same key
   set) — enforced by a small parity check script in CI.
4. Per-surface runtime spot-checks render in **both** FR and EN with no
   `MISSING_MESSAGE` / `IntlError`.
5. Emails and the record PDF render correctly in both locales.

## 3. The four localization mechanisms

"Everything" is not one mechanism. Each string class needs the right tool:

### 3a. App UI (client + server components) — ~80% of the work
The existing pattern. `useTranslations` (client) / `await getTranslations()`
(server). ~40–60 component files still have hardcoded strings (the shadcn `ui/`
primitives mostly take text as props and are exempt). Includes JSX text,
`aria-label`s, `title`s, `placeholder`s, button labels, empty/loading/error
states, toasts.

### 3b. Emails (`lib/email/templates/`, 10 templates)
These render **outside a request context**, so `useTranslations`/request-scoped
`getTranslations()` don't apply. Mechanism: each template receives the
**recipient's locale** and calls next-intl's standalone
`getTranslations({ locale, namespace })`. The locale comes from **`users.locale`**
— a column added in this project (migration + a language toggle in the
profile/account settings, default `'fr'`). Subjects + bodies both localized;
`_layout.ts` shared chrome localized once.

### 3c. Record PDF (`modules/records/pdf.tsx`)
Renders in the PDF route (`app/api/records/[recordId]/pdf`). The record snapshot
already stores its language (`snapshot.locale`). Localize all PDF labels via
`getTranslations({ locale: snapshot.locale })`. Dynamic data (names, dates) stays
as-is; dates already go through `formatDate`.

### 3d. Validation + system messages (zod, server-action errors)
Server actions must return **error codes, not English strings** (many already do —
e.g. `'rate_limited'`, `'invalid_reason'`). The display layer maps code → `t()`
key. zod schemas: attach a localized `errorMap` or map issue codes at the form
boundary. No raw English error strings surface to users.

## 4. The lint guardrail

Add `eslint-plugin-i18next`; enable `i18next/no-literal-string` as **error**.

- **Mode:** restrict to user-facing positions — JSX text and a curated set of
  attributes (`aria-label`, `title`, `placeholder`, `alt`, `label`). Ignore
  `className`, `href`, `src`, `id`, `data-*`, `style`, `type`, and similar
  technical attributes.
- **Allowlist:** brand (`Inturn`, `inturn`), single chars / punctuation /
  symbols, pure numbers, technical tokens. Maintained as `words` + `regex` in
  the rule config.
- **Exemptions:** `**/*.test.ts(x)`, `scripts/**`, `app/[locale]/(auth)/dev/**`
  (dev-only), generated files, `node_modules`.
- Rollout: add the rule as **`warn`** first — this surfaces the full inventory
  without blocking intermediate commits during the migration. Flip to **`error`**
  in the final sweep (§7.9) once violations hit zero. (Internally we still clean
  directory-by-directory so each batch is reviewable — see §7.)

## 5. Scope

**In:** all of §3 (UI, emails, PDF, validation/system) across `app/`, `modules/`,
`components/` (excluding `components/ui/` primitives that carry no own copy) —
**including the university product surfaces** now in `main`: `/admin/universities`,
the `/university/*` coordinator area, `/intern/university` academic reports, and
the academic-report emails. Parts are already next-intl-localized; the lint
inventory shows what remains.

**Base:** the effort rebases onto the latest `main` — which now includes all
merged university work (university-product + academic-supervision) — so the
inventory and fixes reflect current code (§7 step 0).

**Also folded in (we're already in these files):**
- Public-share pages leak the authenticated user's floating avatar — scope the
  avatar widget to non-standalone layouts.
- `/admin/verifications` subtitle is static under the "Toutes" filter — make it
  reflect the active filter.

**Groundwork (prerequisite for emails):** a `users.locale` column (migration) +
a language toggle in profile/account settings, default `'fr'`. Drives
per-recipient email locale (§3b); also lets a user pin their UI language.

**Out (non-goals):** new languages beyond fr/en; RTL; copy rewrites; splitting
the locale files into per-namespace modules (revisit only if the single files
become unworkable); the env-only items (RESEND/ANTHROPIC keys).

## 6. Locale file strategy

Keep single `locales/{fr,en}.json`, mirrored. Organize new keys by **namespace
per surface** (`workspace.*`, `company.*`, `admin.*`, `emails.*`, `pdf.*`,
`validation.*`, …). Files will roughly double (1280 → ~2.5–3.5k keys). A parity
check (`node` script: flatten both, assert identical key sets) runs in CI and
after every batch. If the single files become painful to edit, splitting into
`messages/{locale}/{namespace}.json` is a clean follow-up — not in this scope.

## 7. Execution approach

**One branch, internally batched, resumable.** Big-bang per your call, but driven
as a sequence of directory-scoped batches so each is reviewable and progress is
measurable (the lint violation count per directory is the burn-down).

Sequencing (highest traffic first):
0. **Establish current base** — rebase the effort onto the latest `main` (all
   merged university work), resolve locale-file conflicts, re-run the lint
   inventory. Everything below is measured against this base.
1. `components/` shared (non-`ui/` widgets: marketplace cards, match-explainer, …)
2. Intern app (`app/[locale]/(platform)/intern/**` + `modules/*` it uses)
3. Company app (incl. the big `internships/new/form.tsx`)
4. Admin
4b. University product — `/admin/universities`, the `/university/*` coordinator
   area, `/intern/university` academic reports + the academic-report emails
   (parts already ICU-localized; lint shows the remainder)
5. Public / marketing (`(marketing)/**`, `invite/[token]`, landing)
6. `users.locale` groundwork (migration + profile toggle), then emails (§3b) —
   all 10 templates off the recipient's locale
7. Record PDF (§3c)
8. Validation / system messages (§3d)
9. Final sweep: flip the lint rule to error globally, drive to zero.

Each batch: a subagent localizes the files + adds mirrored keys; I review the
diff, run scoped lint + typecheck, and spot-render the surface in FR **and** EN.
The lint count going to zero in that directory is the batch's exit criterion.

## 8. Verification

Per the project's standard — drive the running app, don't trust green checks
alone. For each surface: render key pages in FR and EN, confirm no
`MISSING_MESSAGE` and no English leakage. Emails: render each template in both
locales (snapshot the HTML). PDF: generate in both locales. Plus global
`no-literal-string` green + `typecheck` + locale parity.

## 9. Risks & mitigations

- **Conflict with concurrent university work** on `fr.json`/`en.json`: base off
  the fix stack, keep locale edits append-only (new namespaces, don't reorder),
  execute fast, rebase onto `main` right before merge. Coordinate: ideally land
  this while feature churn is low.
- **French quality:** match the register of existing entries; the human review
  gate at merge catches awkward phrasing.
- **Lint noise:** `no-literal-string` is chatty; expect an initial config
  iteration on the attribute allowlist before the inventory is trustworthy.
- **Scale / fatigue:** it's large and multi-session. The per-directory lint
  burn-down makes it resumable — anyone can pick up "what's left" from the lint
  output.
- **Email locale rollout:** the `users.locale` migration defaults everyone to
  `'fr'`, so emails are correct from day one and switch per-user as people set
  their preference. No backfill needed.

## 10. Resolved decisions

- **Email locale → add `users.locale`** (column + migration + a profile/account
  language toggle, default FR). Emails translate to the recipient's saved locale
  (§3b, §5).
- **Bar → exhaustive:** UI + emails + PDF + validation + aria / edge states,
  enforced by `no-literal-string`.
- **Strategy → big-bang single branch**, internally batched by surface (§7),
  rebased onto `main` before merge.
