# Atelier Phase 1 — Token Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Land the approved "Atelier" design direction at the token level — ink primaries, violet reserved for value moments, one radius scale, one elevation system, violet focus rings, and the orchestrated entrance — so every shadcn primitive and key screen shifts at once, before any per-screen redesign.

**Architecture:** All color/radius/shadow decisions move into `app/globals.css` tokens; components consume them unchanged. One Button variant addition. A scoped sweep converts chrome-action buttons from hand-patched violet to the ink default on the most-visible screens; the full 64-site sweep finishes during per-screen passes (Phase 3) under the rule below.

**Branch:** `feat/atelier-tokens`, stacked on `fix/audit-quick-wins` (Sam FF-merges in order).

**THE RULE — violet is for value moments only.** Violet backgrounds/CTAs are reserved for: sign-up + apply CTAs on marketing surfaces (landing, marketing header, internship detail, apply form), accept-application, publish-internship, issue-record, nudges to act on AI output (✦ assists, accept AI plan), toggle ON states, active nav pills, the match band. EVERYTHING else — save/create/edit/search/submit-comment/retry/error-page buttons, admin actions — uses the ink default Button. Cyan stays data-only (verified stamps, perf signals, progress-gradient end).

---

### Task 1: Rebind the shadcn semantic tokens (the single biggest "generic" lever)

**Files:** Modify `app/globals.css` (`:root` ~107-139, `.dark` ~252-283)

- [ ] In `:root`: `--primary: var(--ink); --primary-foreground: var(--surface);` (was neutral oklch near-black/white) · `--ring: var(--brand-500);` (was gray) · `--input: var(--border-color);` (was neutral gray — inputs go slate).
- [ ] In `.dark`: same three lines — `var(--ink)` flips near-white and `var(--surface)` near-black in dark, so ink buttons invert automatically; `--ring` stays brand-500 (verify visible against dark surfaces; if too dim use `var(--brand-300)` in `.dark` only).
- [ ] Browser-check: any default `<Button>` (e.g. admin users "Rechercher") renders ink; focus an input → violet ring. Both themes.
- [ ] Commit: `feat(atelier): rebind shadcn semantics — ink primaries, violet focus, slate inputs`

### Task 2: Button `brand` variant + chrome sweep on visible screens

**Files:** Modify `components/ui/button.tsx`; sweep call sites listed below.

- [ ] Add variant `brand: 'bg-brand-500 text-white hover:bg-brand-600'` to buttonVariants (the `@theme` bridge already generates `bg-brand-500`).
- [ ] Convert TO INK (drop the `bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white`-style patches; plain `<button>`s get `bg-[var(--ink)] text-[var(--surface)] hover:opacity-90`): the 3 error pages, marketplace search submit, intern dashboard (2: complete-profile→ink? NO — profile completion is a conversion moment, judgment: keep violet; the workspace/applications links → ink), records page (2), saved (1), applications list (1), community page (2) + composer + add-comment, sprints add-form save, admin resolve-form.
- [ ] KEEP VIOLET (convert `<Button>`s among them to `variant="brand"` where applicable): landing CTAs, marketing-layout signup, internship-detail apply, apply form submit, publish button, sprints accept-AI-plan, notification toggle ON, application status pills.
- [ ] Judgment calls go the rule's way; note each deviation in the commit body.
- [ ] Commit: `feat(atelier): Button brand variant; chrome actions go ink on key screens`

### Task 3: One radius scale (4/6/8/12)

**Files:** Modify `app/globals.css` (@theme ~67-73, `:root` ~201-206)

- [ ] Replace the calc chain in `@theme`: `--radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px; --radius-xl: 12px; --radius-2xl: 16px; --radius-3xl: 20px; --radius-4xl: 24px;` (keep `--radius: 0.625rem` :root var for any internal shadcn references).
- [ ] Delete the dead `--radius-ws-*` block (zero consumers — verified in the audit).
- [ ] LEAVE the `.ws` radius fork in workspace.css (its names map differently; harmonizing is a Phase-3 screen pass).
- [ ] Browser-check: cards/buttons slightly tighter, nothing broken.
- [ ] Commit: `feat(atelier): one radius scale (4/6/8/12) — Workshop-tight, calc chain removed`

### Task 4: One elevation system

**Files:** Modify `app/globals.css`

- [ ] In `@theme inline` add: `--shadow-card: var(--elev-card); --shadow-card-hover: var(--elev-card-hover); --shadow-pop: var(--elev-pop);` (generates `shadow-card` etc. utilities).
- [ ] Delete `:root` `--shadow-xs/sm/md/lg` (collide with Tailwind v4's shadow namespace); fix the one consumer `.pi-card:hover` (~line 2186) → `box-shadow: var(--elev-card-hover);`.
- [ ] Give the flat designed-family cards a resting lift: add `box-shadow: var(--elev-card);` to `.db-card`, `.db-stat`, `.pi-card`, `.ph-brief` rules.
- [ ] Commit: `feat(atelier): single elevation system — elev tokens as shadow utilities, families get resting lift`

### Task 5: Wire the orchestrated entrance (.ui-rise)

**Files:** Modify the main-column wrappers of: intern dashboard, company dashboard, projects index, project hub, marketplace grid.

- [ ] Add `ui-rise ui-rise-1..4` to the first 3-4 top-level blocks of each page's main column (the CSS exists at globals.css:240-250, currently zero consumers; respects reduced-motion).
- [ ] Commit: `feat(atelier): staggered entrance on the five key screens`

### Task 6: Verify + handoff

- [ ] `pnpm typecheck && pnpm lint && pnpm vitest run && pnpm check:i18n && pnpm build` — all green.
- [ ] Before/after screenshots: landing, marketplace, intern dashboard, company dashboard, admin users, onboarding form focus state. Both themes for one platform screen.
- [ ] HANDOFF.md addendum; commit `docs: handoff for Atelier phase 1`.

**Out of scope (next phases):** the remaining ~50 violet-patch call sites (rule documented above), the 1,954 arbitrary-var wrapper codemod, px font-sizes → `--text-*`, stray hex → tokens, dissolving per-screen CSS families, the `.ws` radius fork, form-layer redesign.

---

## Phase 2 (Sam, 2026-06-10): the website becomes the platform's front door

**Decision:** the `../inturn-web` marketing site replaces the platform's placeholder landing — ONE app on :3000; the site's pages move INTO the platform and its CTAs link straight into the product. The standalone :3010 app is then retired (kept as source archive until parity).

**Approach (in order — each step ships independently):**
1. **Homepage first.** Port `inturn-web/app/page.tsx` + `HomeHero`/`Nav`/`Footer`/`MarketingEffects` + needed pieces of `tokens.css`/`illustrations.css` into the platform's `(marketing)` group as the new `app/[locale]/page.tsx`. CRITICAL: the site is English-only with hardcoded copy; the platform enforces `i18next/no-literal-string` + FR/EN parity — every string must land in `locales/{fr,en}.json` (FR copy to be written, Sam reviews tone). Wire CTAs: "Post your first internship" → `/sign-up` (company), "For interns" → `/marketplace`, nav → platform routes.
2. **Reconcile the two token systems.** `inturn-web/app/tokens.css` vs the platform's globals — map the site's tokens onto the platform's (they share the ink+violet+mono DNA; the site's hero strike-through, role toggle, and ticker become shared marketing primitives).
3. **Port the supporting pages** behind the same translation gate, in value order: how-it-works, for-companies / for-interns / for-universities, **verify** (wire it to the REAL record-share lookup — it's the trust story), virtual-internships, about/contact; the site's terms/privacy are NOT ported (the platform's localized legal pages already exist and are public).
4. **Retire `inturn-web`** once parity is reached; `inturn-hub/README.md` updated.

**Search follow-ups (Sam: "search not working correctly", 2026-06-10):** city/location search + EN-form locale loss fixed in `27244de`. Remaining gap is *language*: listings are written in English, so French queries (« stage », « développeur ») return nothing. Options to decide in this phase: bilingual listing fields, a FR→EN synonym map in the query layer, or a `french`-config tsvector alongside the `simple` one. Also consider searching `organizations.name` (users search by company).
