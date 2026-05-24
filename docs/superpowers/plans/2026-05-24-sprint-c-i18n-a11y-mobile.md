# Sprint C — i18n + a11y + mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make inturn launchable in Tunisia: French-first, accessible, usable on a 360 px Android. Closes the remaining Sprint 6 polish items from `docs/inturn-project-brief.md` and the i18n/a11y/mobile findings from the 2026-05-24 audit.

**Architecture:** Eight tasks, each isolated to a domain. Most are mechanical (string extraction, CSS media queries, scaffolding) but C4 (drag-and-drop swap) and C8 (onboarding resume) require real logic. Builds on `sprint-b-phase-1-closure`.

**Tech Stack:** next-intl 4 · Tailwind v4 (`@custom-variant dark`) · `@dnd-kit/core` + `@dnd-kit/sortable` (new dep) · existing Vitest 4. Same as Sprint B.

**Out of scope (defer to later sprints):**
- Real-time updates (post-Phase 1)
- Arabic locale (Phase 2 per brief)
- Dynamic per-tab breadcrumbs via client hook (Sprint B perf hotfix dropped them; reintroduce only if user research demands)
- Performance i18n bundle splitting (single namespace per locale is fine until >50KB)

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `locales/en.json` + `locales/fr.json` | modify | Add `workspace`, `tasks`, `deliverables`, `checkins`, `comments`, `inbox`, `marketplace`, `bookmarks`, `errors` namespaces |
| `modules/workspace/components/topbar.tsx` | modify | Replace hardcoded strings with `useTranslations('workspace.topbar')` |
| `modules/workspace/components/m-head.tsx` | modify | Tab labels via t() |
| `modules/workspace/components/weekly-checkin-form.tsx` | modify | Form labels + placeholders via t() |
| `modules/workspace/components/deliverables-list.tsx` | modify | Action labels via t() |
| `modules/workspace/components/task-list.tsx` | modify | "This week's tasks" etc via t() |
| `modules/workspace/components/tasks-board.tsx` | modify | Column labels + date strings via t() |
| `modules/workspace/components/schedule-check-in.tsx` | modify | All strings via t() |
| `modules/workspace/components/comments-thread.tsx` | modify | "Post comment" etc via t() |
| `modules/workspace/components/activity-feed.tsx` | modify | "X minutes ago", event type labels via t() |
| `modules/workspace/components/stuck-pill.tsx` | modify | "Stuck?" label via t() |
| `modules/workspace/components/workspace-shell-layout.tsx` | modify | Crumb labels via t() |
| `modules/workspace/workspace.css` | modify | Add `@media (max-width: 768px)` and `@media (max-width: 480px)` blocks; collapse sidebar to drawer, single-col tasks board, MHead stacks |
| `components/ui/sidebar-trigger.tsx` (new) | create | Mobile sidebar toggle button (client component) |
| `modules/workspace/components/sidebar.tsx` | modify | Accept `mobileOpen` state via context or URL search param |
| `modules/workspace/components/tasks-board.tsx` (drag) | modify | Swap HTML5 DnD → `@dnd-kit` |
| `package.json` | modify | Add `@dnd-kit/core` + `@dnd-kit/sortable` |
| `app/[locale]/(platform)/layout.tsx` | modify | Add skip-to-content link; add `<html lang={locale}>` if not already |
| `app/[locale]/layout.tsx` | modify | Same `<html lang>` guarantee for marketing routes |
| `app/[locale]/globals.css` | modify | Dark palette (`.dark` variant tokens); restore focus rings stripped by `outline-none` |
| `components/ui/theme-toggle.tsx` | create | Dark/light toggle, cookie-persisted |
| `modules/workspace/components/topbar.tsx` | modify | Add ThemeToggle |
| `app/[locale]/page.tsx` (landing) | modify | Add ThemeToggle to nav |
| Various form components | modify | Wrap inputs with `<label htmlFor>`; add `aria-label` to icon buttons; ensure `:focus-visible` ring |
| `app/sitemap.ts` | create | Marketplace + per-internship sitemap |
| `app/robots.ts` | create | Allow all, exclude /admin + /intern + /company |
| Every public page | modify | `generateMetadata` with locale-aware title/description, FR/EN canonical alternates |
| `app/opengraph-image.tsx` | create | Dynamic OG image |
| `modules/onboarding/progress.ts` (new) | create | Server-stored wizard progress (table or JWT) |
| `db/schema/onboarding-progress.ts` (new, optional) | create | Or store in `profiles.draftJson` |
| `app/[locale]/(auth)/onboarding/intern/_progress-bar.tsx` | create | Step indicator |
| `app/[locale]/(auth)/onboarding/intern/basics/page.tsx` | modify | Read draft → prefill |
| `app/[locale]/(auth)/onboarding/intern/skills/page.tsx` | modify | Same |

---

## Task 1 — i18n: extract workspace UI strings

**Files:**
- Modify: `locales/en.json` + `locales/fr.json` (add `workspace` namespace)
- Modify: every file under `modules/workspace/components/*.tsx` that contains hardcoded English

### Approach

Strings live under `workspace.*` sub-namespaces matching component groups. Don't try one giant flat namespace — group by component family.

- [ ] **Step 1: Add `workspace` namespace to `locales/en.json`**

After the existing `landing` block, add:

```json
  "workspace": {
    "topbar": {
      "search": "Search workspace…",
      "inbox": "Inbox",
      "help": "Help",
      "profile": "Profile",
      "keyboardShortcut": "⌘K"
    },
    "tabs": {
      "overview": "Overview",
      "tasks": "Tasks",
      "deliverables": "Deliverables",
      "timeline": "Timeline",
      "activity": "Activity",
      "comments": "Comments",
      "checkIn": "Check-in"
    },
    "crumbs": {
      "myWorkspaces": "My workspaces"
    },
    "stuck": {
      "label": "Stuck?",
      "title": "Tell us what's blocking you",
      "placeholder": "Describe what you tried and what's not working",
      "send": "Send",
      "cancel": "Cancel"
    },
    "tasksBoard": {
      "columns": {
        "todo": "To do",
        "inProgress": "In progress",
        "review": "In review",
        "done": "Done"
      },
      "dueIn": "Due in {days} days",
      "dueToday": "Due today",
      "overdue": "Overdue by {days} days",
      "noTasks": "No tasks yet.",
      "thisWeek": "This week's tasks",
      "addTask": "Add task"
    },
    "deliverables": {
      "uploadNew": "Upload new",
      "approve": "Approve",
      "requestChanges": "Request changes",
      "changesPlaceholder": "What needs to change?",
      "submitChanges": "Submit feedback",
      "version": "v{n}",
      "status": {
        "draft": "Draft",
        "submitted": "Submitted",
        "approved": "Approved",
        "changesRequested": "Changes requested"
      }
    },
    "checkIn": {
      "title": "Weekly check-in",
      "shipped": "What did you ship this week?",
      "shippedPlaceholder": "What did you close, deliver, decide?",
      "stuck": "Where are you stuck?",
      "stuckPlaceholder": "Where do you need help?",
      "next": "What's next?",
      "nextPlaceholder": "What will you tackle this coming week?",
      "submit": "Submit check-in",
      "draftedByAi": "Drafted by AI — edit before submitting",
      "regenerate": "Regenerate draft"
    },
    "schedule": {
      "title": "Schedule a check-in",
      "description": "Pick a slot; we'll create a Jitsi link and put it on the timeline.",
      "submit": "Schedule",
      "cancel": "Cancel",
      "successHeading": "Scheduled",
      "linkLabel": "Jitsi link"
    },
    "comments": {
      "placeholder": "Write a comment…",
      "post": "Post",
      "empty": "No comments yet. Be the first.",
      "edit": "Edit",
      "delete": "Delete",
      "deletedNotice": "[deleted]"
    },
    "activity": {
      "empty": "No activity yet.",
      "minutesAgo": "{n}m ago",
      "hoursAgo": "{n}h ago",
      "daysAgo": "{n}d ago"
    },
    "timeline": {
      "empty": "Nothing on the timeline yet.",
      "emptySub": "Tasks, deliverables, and check-ins will appear here as they happen.",
      "workspaceStarted": "Workspace started",
      "deadline": "Deadline"
    }
  }
```

- [ ] **Step 2: Translate to `locales/fr.json`**

Mirror the structure, French copy. Examples (verbatim — use these):

```json
  "workspace": {
    "topbar": {
      "search": "Rechercher dans le workspace…",
      "inbox": "Boîte de réception",
      "help": "Aide",
      "profile": "Profil",
      "keyboardShortcut": "⌘K"
    },
    "tabs": {
      "overview": "Vue d'ensemble",
      "tasks": "Tâches",
      "deliverables": "Livrables",
      "timeline": "Chronologie",
      "activity": "Activité",
      "comments": "Commentaires",
      "checkIn": "Point hebdo"
    },
    "crumbs": {
      "myWorkspaces": "Mes workspaces"
    },
    "stuck": {
      "label": "Bloqué·e ?",
      "title": "Dites-nous ce qui vous bloque",
      "placeholder": "Décrivez ce que vous avez essayé et ce qui ne fonctionne pas",
      "send": "Envoyer",
      "cancel": "Annuler"
    },
    "tasksBoard": {
      "columns": {
        "todo": "À faire",
        "inProgress": "En cours",
        "review": "En revue",
        "done": "Terminé"
      },
      "dueIn": "À rendre dans {days} jours",
      "dueToday": "À rendre aujourd'hui",
      "overdue": "En retard de {days} jours",
      "noTasks": "Aucune tâche pour le moment.",
      "thisWeek": "Tâches de la semaine",
      "addTask": "Ajouter une tâche"
    },
    "deliverables": {
      "uploadNew": "Téléverser",
      "approve": "Approuver",
      "requestChanges": "Demander des modifications",
      "changesPlaceholder": "Qu'est-ce qui doit changer ?",
      "submitChanges": "Envoyer le retour",
      "version": "v{n}",
      "status": {
        "draft": "Brouillon",
        "submitted": "Soumis",
        "approved": "Approuvé",
        "changesRequested": "Modifications demandées"
      }
    },
    "checkIn": {
      "title": "Point hebdomadaire",
      "shipped": "Qu'avez-vous livré cette semaine ?",
      "shippedPlaceholder": "Qu'avez-vous bouclé, livré, décidé ?",
      "stuck": "Sur quoi êtes-vous bloqué·e ?",
      "stuckPlaceholder": "Où avez-vous besoin d'aide ?",
      "next": "Et la suite ?",
      "nextPlaceholder": "Sur quoi allez-vous travailler la semaine prochaine ?",
      "submit": "Envoyer le point",
      "draftedByAi": "Brouillon généré par l'IA — relisez avant d'envoyer",
      "regenerate": "Régénérer le brouillon"
    },
    "schedule": {
      "title": "Planifier un point",
      "description": "Choisissez un créneau ; on crée le lien Jitsi et l'ajoute à la timeline.",
      "submit": "Planifier",
      "cancel": "Annuler",
      "successHeading": "Planifié",
      "linkLabel": "Lien Jitsi"
    },
    "comments": {
      "placeholder": "Écrire un commentaire…",
      "post": "Publier",
      "empty": "Pas encore de commentaire. Soyez le premier.",
      "edit": "Modifier",
      "delete": "Supprimer",
      "deletedNotice": "[supprimé]"
    },
    "activity": {
      "empty": "Aucune activité.",
      "minutesAgo": "il y a {n} min",
      "hoursAgo": "il y a {n} h",
      "daysAgo": "il y a {n} j"
    },
    "timeline": {
      "empty": "Rien sur la timeline pour le moment.",
      "emptySub": "Les tâches, livrables et points hebdo apparaîtront ici.",
      "workspaceStarted": "Workspace démarré",
      "deadline": "Échéance"
    }
  }
```

- [ ] **Step 3: Verify JSON validity**

```bash
cd /Users/mac/code/inturn-hub/inturn
node -e "JSON.parse(require('fs').readFileSync('locales/en.json','utf8'))" && echo en-ok
node -e "JSON.parse(require('fs').readFileSync('locales/fr.json','utf8'))" && echo fr-ok
```

Both must print ok-line.

- [ ] **Step 4: Convert each workspace component to use `useTranslations`**

For server components: import `getTranslations` from `next-intl/server` and `await getTranslations('workspace.<group>')` at the top.

For client components: import `useTranslations` from `next-intl` and call hook.

Example for `modules/workspace/components/topbar.tsx`:

```tsx
// At top:
import { useTranslations } from 'next-intl'; // client component? confirm first
// or
import { getTranslations } from 'next-intl/server'; // server component

// Inside the component:
const t = useTranslations('workspace.topbar');
// or for server:
const t = await getTranslations('workspace.topbar');

// Replace strings:
placeholder={t('search')}
aria-label={t('inbox')}
// etc.
```

For each of these files, identify whether it's a client or server component (check for `'use client'` at top), then apply the conversion:
1. `topbar.tsx`
2. `stuck-pill.tsx`
3. `tasks-board.tsx`
4. `task-list.tsx`
5. `weekly-checkin-form.tsx`
6. `deliverables-list.tsx`
7. `schedule-check-in.tsx`
8. `comments-thread.tsx`
9. `activity-feed.tsx`
10. `m-head.tsx` (tab labels via `workspace.tabs`)
11. `workspace-shell-layout.tsx` (crumb via `workspace.crumbs`)
12. `workspace-timeline-page.tsx` (empty state, milestones)

For each file:
- Add the import
- Add the `const t = ...` line
- Replace each hardcoded string with `t('key')` or `t('keyWithVar', { days: 5 })`

Pace: tackle 2-3 files per commit. Smaller commits = easier review.

- [ ] **Step 5: Run typecheck + lint + tests after every 2-3 files**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

next-intl will throw at runtime (not typecheck) if a key is missing. After all 12 files are converted, do a manual smoke: open every tab and confirm strings render in both FR and EN.

- [ ] **Step 6: Commit incrementally**

3-4 commits with messages like:
- `i18n(workspace): extract topbar + stuck-pill strings`
- `i18n(workspace): extract tasks board + task list strings`
- `i18n(workspace): extract check-in + schedule strings`
- `i18n(workspace): extract comments + activity + timeline strings`

DO NOT push between commits — wait until the whole task is done.

---

## Task 2 — i18n: marketplace + onboarding + auth gaps

**Files:**
- Modify: `locales/en.json` + `locales/fr.json` (add `marketplace`, `bookmarks`, `applications`, `errors` namespaces)
- Modify: `app/[locale]/(marketing)/marketplace/page.tsx`
- Modify: `app/[locale]/(platform)/intern/saved/page.tsx`
- Modify: `app/[locale]/(platform)/intern/applications/page.tsx`
- Modify: `components/marketplace/internship-card.tsx`
- Modify: all `error.tsx` files (the 3 we added in Sprint B)

- [ ] **Step 1: Add namespaces to locale files**

```json
"marketplace": {
  "title": "Browse internships",
  "subtitle": "Real internships from Tunisian companies. Apply once with your inturn profile.",
  "searchPlaceholder": "Search title, sector, description…",
  "skillPlaceholder": "Skill (e.g. Figma)",
  "searchButton": "Search",
  "anySector": "Any sector",
  "anyLocation": "Any location",
  "anyDuration": "Any duration",
  "anyLanguage": "Any language",
  "duration": { "short": "< 8 weeks", "medium": "8–12 weeks", "long": "> 12 weeks" },
  "paid": { "all": "All", "paid": "Paid", "unpaid": "Unpaid" },
  "clearFilters": "Clear filters",
  "noResults": "No internships match.",
  "noResultsHelp": "Try removing filters or broadening your search.",
  "previous": "← Previous",
  "next": "Next →",
  "page": "Page {n}"
},
"bookmarks": {
  "savedTitle": "Saved internships",
  "savedDescription": "Your wishlist. Heart any internship from the marketplace to keep it here.",
  "empty": "Nothing saved yet.",
  "emptySub": "Browse the marketplace and tap the heart on anything you want to come back to.",
  "openMarketplace": "Open marketplace",
  "saveLabel": "Save for later",
  "removeLabel": "Remove from saved"
},
"applications": {
  "tabActive": "Applications",
  "tabSaved": "Saved"
},
"errors": {
  "root": {
    "title": "Something went wrong.",
    "body": "We've been notified. Try again, or head back to the home page.",
    "tryAgain": "Try again",
    "home": "Home",
    "reference": "Reference: {digest}"
  },
  "platform": {
    "title": "This page hit an error.",
    "body": "Try again or open another tab from the sidebar. If it keeps happening, ping support."
  },
  "marketplace": {
    "title": "Couldn't load the marketplace.",
    "body": "We'll get it back in a moment. Try again or visit later.",
    "back": "Back to home"
  }
}
```

French equivalent (lift from existing fr.json patterns):

```json
"marketplace": {
  "title": "Parcourir les stages",
  "subtitle": "Des vrais stages d'entreprises tunisiennes. Postulez en un clic avec votre profil inturn.",
  "searchPlaceholder": "Rechercher titre, secteur, description…",
  "skillPlaceholder": "Compétence (ex. Figma)",
  "searchButton": "Rechercher",
  "anySector": "Tous secteurs",
  "anyLocation": "Tous lieux",
  "anyDuration": "Toutes durées",
  "anyLanguage": "Toutes langues",
  "duration": { "short": "< 8 semaines", "medium": "8–12 semaines", "long": "> 12 semaines" },
  "paid": { "all": "Tous", "paid": "Rémunéré", "unpaid": "Non rémunéré" },
  "clearFilters": "Effacer les filtres",
  "noResults": "Aucun stage ne correspond.",
  "noResultsHelp": "Essayez de retirer des filtres ou d'élargir la recherche.",
  "previous": "← Précédent",
  "next": "Suivant →",
  "page": "Page {n}"
},
"bookmarks": {
  "savedTitle": "Stages enregistrés",
  "savedDescription": "Votre wishlist. Cliquez sur un cœur dans le marketplace pour le garder ici.",
  "empty": "Rien d'enregistré pour le moment.",
  "emptySub": "Parcourez le marketplace et cliquez sur le cœur pour retrouver un stage plus tard.",
  "openMarketplace": "Ouvrir le marketplace",
  "saveLabel": "Enregistrer",
  "removeLabel": "Retirer des favoris"
},
"applications": {
  "tabActive": "Candidatures",
  "tabSaved": "Enregistrés"
},
"errors": {
  "root": {
    "title": "Une erreur s'est produite.",
    "body": "Nous avons été notifiés. Réessayez, ou revenez à l'accueil.",
    "tryAgain": "Réessayer",
    "home": "Accueil",
    "reference": "Référence : {digest}"
  },
  "platform": {
    "title": "Cette page a rencontré une erreur.",
    "body": "Réessayez ou ouvrez un autre onglet depuis la barre latérale. Si ça persiste, contactez le support."
  },
  "marketplace": {
    "title": "Impossible de charger le marketplace.",
    "body": "On revient dans un instant. Réessayez ou revenez plus tard.",
    "back": "Retour à l'accueil"
  }
}
```

- [ ] **Step 2: Update marketplace page to use t()**

In `app/[locale]/(marketing)/marketplace/page.tsx`, add at top:

```tsx
import { getTranslations } from 'next-intl/server';
// inside component:
const t = await getTranslations('marketplace');
```

Replace each hardcoded English string with `t('key')`. The filter option arrays (PAID_OPTIONS, LOCATION_OPTIONS, etc.) need their labels translated — easiest is to inline the t() call at render time rather than at module-init.

- [ ] **Step 3: Update saved + applications + card + error files similarly**

Apply same pattern to each file.

- [ ] **Step 4: Commit**

```bash
git add locales/*.json 'app/[locale]/(marketing)/marketplace/page.tsx' 'app/[locale]/(platform)/intern/saved/page.tsx' 'app/[locale]/(platform)/intern/applications/page.tsx' components/marketplace/internship-card.tsx 'app/[locale]/error.tsx' 'app/[locale]/(platform)/error.tsx' 'app/[locale]/(marketing)/marketplace/error.tsx'
git commit -m "i18n: extract marketplace + bookmarks + applications + errors strings"
```

---

## Task 3 — Mobile responsive workspace.css

**Files:**
- Modify: `modules/workspace/workspace.css`

The workspace.css is ~1377 lines from Sprint A's CSS split. It has zero `@media` queries. We add:
- `@media (max-width: 768px)`: sidebar becomes a drawer (hidden by default, slides in on toggle); `ws-content` grid drops to 1 column; MHead stacks date range + tab bar vertically
- `@media (max-width: 480px)`: smaller padding, hide secondary metadata

- [ ] **Step 1: Read the current workspace.css**

```bash
wc -l /Users/mac/code/inturn-hub/inturn/modules/workspace/workspace.css
grep -nE '\.ws-body|\.ws-sidebar|\.ws-main|\.ws-content|\.ws-topbar|\.ws-mhead' modules/workspace/workspace.css | head -40
```

This tells you the key class names and where to anchor media queries.

- [ ] **Step 2: Append the responsive blocks at the bottom of `workspace.css`**

```css
/* ────────────────────────── responsive: tablet ────────────────────────── */
@media (max-width: 768px) {
  /* Sidebar slides in as drawer; hidden by default */
  .ws-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: 280px;
    transform: translateX(-100%);
    transition: transform 200ms ease-out;
    z-index: 40;
    box-shadow: 2px 0 10px rgba(0,0,0,0.08);
    background: var(--surface);
  }
  .ws-sidebar[data-mobile-open="true"] {
    transform: translateX(0);
  }
  .ws-body {
    grid-template-columns: 1fr;
  }
  .ws-main {
    padding-left: 16px;
    padding-right: 16px;
  }
  /* Topbar: collapse search input on small screens */
  .ws-topbar-search {
    display: none;
  }
  .ws-topbar-mobile-trigger {
    display: inline-flex;
  }
  /* MHead: stack rather than horizontal */
  .ws-mhead {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .ws-mhead-tabs {
    overflow-x: auto;
    width: 100%;
    scrollbar-width: thin;
  }
  /* Workspace overview content grid: 1 column on tablet, 2 on desktop */
  .ws-content {
    grid-template-columns: 1fr !important;
  }
  /* Tasks board: 2 columns instead of 4 */
  .ws-tasks-board {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ────────────────────────── responsive: phone ────────────────────────── */
@media (max-width: 480px) {
  .ws-topbar {
    padding-left: 12px;
    padding-right: 12px;
  }
  .ws-mhead {
    padding: 16px 12px;
  }
  /* Tasks board: 1 column stacked on phone */
  .ws-tasks-board {
    grid-template-columns: 1fr;
  }
  /* Hide secondary breadcrumbs on phone — only the bold one remains */
  .ws-topbar-crumb:not(.bold) {
    display: none;
  }
  /* Smaller stat tiles */
  .ws-stat-tile {
    padding: 12px;
  }
  .ws-stat-tile-value {
    font-size: 20px;
  }
}

/* Backdrop when sidebar drawer is open on mobile */
.ws-sidebar-backdrop {
  display: none;
}
@media (max-width: 768px) {
  .ws-sidebar-backdrop[data-mobile-open="true"] {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 30;
  }
}
```

- [ ] **Step 3: Create the mobile sidebar trigger component**

`components/ui/sidebar-trigger.tsx`:

```tsx
'use client';

import { useState } from 'react';

/**
 * Mobile sidebar drawer toggle. Sets data-mobile-open on the closest
 * .ws-sidebar via DOM query — keeps state in JS, no global store.
 */
export function SidebarTrigger({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    const sidebar = document.querySelector('.ws-sidebar');
    const backdrop = document.querySelector('.ws-sidebar-backdrop');
    if (sidebar) sidebar.setAttribute('data-mobile-open', String(next));
    if (backdrop) backdrop.setAttribute('data-mobile-open', String(next));
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className="ws-topbar-mobile-trigger md:hidden h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)]"
        style={{ display: 'none' }}
      >
        <span aria-hidden>☰</span>
      </button>
      <div className="ws-sidebar-backdrop" onClick={toggle} aria-hidden />
    </>
  );
}
```

- [ ] **Step 4: Mount the trigger in `WorkspaceTopBar`**

In `modules/workspace/components/topbar.tsx`, add the trigger as the first child:

```tsx
import { SidebarTrigger } from '@/components/ui/sidebar-trigger';
// ...
<header className="ws-topbar">
  <SidebarTrigger label={t('topbar.help')} />
  {/* ... existing topbar content */}
</header>
```

- [ ] **Step 5: Smoke-test in mobile viewport**

Run `pnpm dev`, open DevTools, set viewport to 360×640, navigate Yasmine's workspace:
- Sidebar should be hidden
- Tap the ☰ icon → sidebar slides in with backdrop
- Tap backdrop or ☰ again → sidebar closes
- Tabs scroll horizontally if too many
- Tasks board is 2 cols at 768px, 1 col at 480px
- Workspace overview content stacks vertically

- [ ] **Step 6: Run all checks + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add modules/workspace/workspace.css components/ui/sidebar-trigger.tsx modules/workspace/components/topbar.tsx
git commit -m "feat(workspace): mobile responsive (drawer sidebar + stacked layouts)"
```

---

## Task 4 — Swap HTML5 DnD for @dnd-kit (mobile touch support)

**Files:**
- Add dep: `@dnd-kit/core` + `@dnd-kit/sortable`
- Modify: `modules/workspace/components/tasks-board.tsx`

The current tasks board uses HTML5 DnD which is broken on touch devices. `@dnd-kit` is the canonical React DnD library that handles both mouse + touch + keyboard.

- [ ] **Step 1: Install the deps**

```bash
cd /Users/mac/code/inturn-hub/inturn
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Commit the lockfile update separately or together:

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @dnd-kit for touch-friendly tasks-board DnD"
```

- [ ] **Step 2: Read current `tasks-board.tsx`**

```bash
cat /Users/mac/code/inturn-hub/inturn/modules/workspace/components/tasks-board.tsx
```

Note the current API: how it manages drag state, how columns are defined, what server action it calls on drop.

- [ ] **Step 3: Convert to @dnd-kit**

The pattern:

```tsx
'use client';

import { DndContext, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="ws-task-card">
      {/* existing card content */}
    </div>
  );
}

export function TasksBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    // Optimistic update
    const fromStatus = tasks.find((t) => t.id === active.id)?.status;
    const toStatus = over.data.current?.status ?? fromStatus;
    if (!fromStatus || !toStatus) return;

    const next = tasks.map((t) =>
      t.id === active.id ? { ...t, status: toStatus } : t,
    );
    setTasks(next);

    // Server action
    await moveTaskAction({ taskId: String(active.id), newStatus: toStatus });
  }

  // Render with DndContext wrapping each column's SortableContext
  // ...
}
```

The above is a sketch. The exact implementation depends on the current shape — preserve the existing column layout, optimistic update pattern, and server action call.

Key points to preserve:
- Activation constraint of 8px distance prevents accidental drags
- Keyboard sensor for a11y (arrow keys to move)
- `aria-roledescription` on draggable items
- Optimistic UI before server action completes

- [ ] **Step 4: Add `dnd-kit` types to keep typecheck clean**

If TypeScript complains, ensure `@dnd-kit/core`'s built-in types are picked up (they ship as `.d.ts`).

- [ ] **Step 5: Manual test on touch**

In DevTools, switch device to a phone, navigate to tasks tab, long-press + drag a task between columns. Should smoothly drag and snap to drop target. Repeat with mouse.

- [ ] **Step 6: Run all checks + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add modules/workspace/components/tasks-board.tsx
git commit -m "feat(tasks): @dnd-kit for touch + keyboard drag-and-drop"
```

---

## Task 5 — Accessibility pass

**Files:**
- Modify: `app/[locale]/(platform)/layout.tsx` (skip-to-content link)
- Modify: `app/[locale]/layout.tsx` (`<html lang={locale}>`)
- Modify: `app/[locale]/globals.css` (focus-visible rings, color contrast)
- Modify: every form component with input fields — wrap with `<label htmlFor>`
- Modify: every icon-only button — add `aria-label`

- [ ] **Step 1: Skip-to-content link**

In `app/[locale]/(platform)/layout.tsx`, near the top of the returned JSX:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--surface)] focus:border focus:border-[var(--brand-500)] focus:rounded focus:px-4 focus:py-2 focus:text-sm"
>
  Skip to content
</a>
```

Ensure the first `<main>` or content area has `id="main-content"`.

- [ ] **Step 2: `<html lang>` correctness**

In `app/[locale]/layout.tsx`, the root layout should already wrap children in `<html lang={locale}>`. If not (some next-intl setups put `<html>` in a custom root), add it:

```tsx
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // ...
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Focus rings**

In `app/[locale]/globals.css`, search for `outline-none` or `outline: none`. For each occurrence that targets an interactive element, add a `:focus-visible` ring:

```css
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
}
```

Add this at the end of `globals.css` so it overrides resets.

- [ ] **Step 4: Form labels**

For every input field in the codebase that uses `placeholder` without a `<label>`:

```bash
cd /Users/mac/code/inturn-hub/inturn
grep -rn 'placeholder=' --include='*.tsx' modules/ components/ app/ | grep -v 'aria-label\|htmlFor' | head -40
```

For each match, wrap the input with:

```tsx
<label htmlFor="some-id" className="block text-sm text-[var(--ink-2)] mb-1">
  {t('field.label')}
</label>
<input id="some-id" ... />
```

Or use `sr-only` label if the visible design doesn't have a visible label:

```tsx
<label htmlFor="search" className="sr-only">{t('marketplace.searchLabel')}</label>
<input id="search" type="search" placeholder={t('marketplace.searchPlaceholder')} />
```

Common offenders to fix:
- marketplace search + skill input
- bookmark heart button (use `aria-label`)
- topbar search
- weekly check-in textareas
- deliverables "what needs to change" textarea

- [ ] **Step 5: Icon-only buttons**

Grep for `<button` without `aria-label`:

```bash
cd /Users/mac/code/inturn-hub/inturn
grep -rn '<button' --include='*.tsx' modules/ components/ app/ | grep -v 'aria-label' | head -30
```

Add `aria-label={t('...')}` to each that has no visible text child.

- [ ] **Step 6: Manual a11y audit with axe DevTools**

Install the axe DevTools browser extension. Run `pnpm dev`, open landing → marketplace → sign-in → onboarding → workspace overview → workspace tasks. Run axe on each. Target: zero "serious" or "critical" issues. "Moderate" issues for color contrast and landmark structure can be deferred.

- [ ] **Step 7: Commit**

Split into 2-3 commits:

```bash
git commit -m "feat(a11y): skip-to-content link + html lang"
git commit -m "feat(a11y): focus-visible rings on interactive elements"
git commit -m "feat(a11y): label + aria-label coverage on inputs/buttons"
```

---

## Task 6 — Dark mode wiring

**Files:**
- Modify: `app/[locale]/globals.css` (dark palette tokens)
- Create: `components/ui/theme-toggle.tsx`
- Modify: `modules/workspace/components/topbar.tsx` (add toggle)
- Modify: `app/[locale]/page.tsx` (landing nav)

- [ ] **Step 1: Add dark palette to globals.css**

Tailwind v4 + the existing `@custom-variant dark (&:is(.dark *))` means dark mode applies when an ancestor has `.dark` class. Add a dark palette overriding the brand tokens:

```css
.dark {
  --bg: oklch(0.18 0.01 240);
  --surface: oklch(0.22 0.01 240);
  --surface-muted: oklch(0.25 0.01 240);
  --ink: oklch(0.95 0.01 240);
  --ink-2: oklch(0.78 0.01 240);
  --ink-3: oklch(0.60 0.01 240);
  --border-color: oklch(0.32 0.01 240);
  --border-strong: oklch(0.40 0.01 240);
  /* brand stays the same */
}
```

(Tune the oklch values against the design-bundle if available; these are reasonable defaults that should look decent.)

- [ ] **Step 2: Create theme-toggle component**

`components/ui/theme-toggle.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

const COOKIE_KEY = 'inturn-theme';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  const cookie = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_KEY}=`));
  if (cookie) return cookie.split('=')[1] === 'dark' ? 'dark' : 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--border-color)] hover:border-[var(--border-strong)] bg-[var(--surface)]"
    >
      <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}
```

- [ ] **Step 3: Server-side dark class injection (prevent FOUC)**

In `app/[locale]/layout.tsx`, read the cookie and set the `<html className="dark">` server-side:

```tsx
import { cookies } from 'next/headers';

export default async function LocaleLayout({ children, params }: ...) {
  const { locale } = await params;
  const theme = (await cookies()).get('inturn-theme')?.value ?? 'light';
  return (
    <html lang={locale} className={theme === 'dark' ? 'dark' : ''}>
      <body>{children}</body>
    </html>
  );
}
```

This prevents the flash of unstyled content (FOUC) when a user with a dark cookie loads the page.

- [ ] **Step 4: Mount ThemeToggle in landing nav + workspace topbar**

In `app/[locale]/page.tsx` landing header, add `<ThemeToggle />` next to LanguageSwitch.

In `modules/workspace/components/topbar.tsx`, add `<ThemeToggle />` near the avatar.

- [ ] **Step 5: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Manually: load landing, click toggle → all surfaces flip. Reload → stays dark (cookie). Open workspace → also dark. Open in incognito → respects system preference.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/globals.css app/[locale]/layout.tsx components/ui/theme-toggle.tsx modules/workspace/components/topbar.tsx app/[locale]/page.tsx
git commit -m "feat: dark mode (palette + cookie-persisted toggle, no FOUC)"
```

---

## Task 7 — SEO scaffolding

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Create: `app/opengraph-image.tsx` (dynamic OG image)
- Modify: `app/[locale]/page.tsx` — add `generateMetadata`
- Modify: `app/[locale]/(marketing)/marketplace/page.tsx` — add `generateMetadata`
- Modify: `app/[locale]/internships/[slug]/page.tsx` — add `generateMetadata` per internship

- [ ] **Step 1: `app/sitemap.ts`**

```typescript
import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { internships, organizations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://inturn-hub.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await db
    .select({ id: internships.id, updatedAt: internships.updatedAt })
    .from(internships)
    .innerJoin(organizations, eq(organizations.id, internships.organizationId))
    .where(and(eq(internships.status, 'published'), eq(organizations.verificationStatus, 'verified')));

  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/en`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/marketplace`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/en/marketplace`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
  ];

  const internshipEntries: MetadataRoute.Sitemap = rows.map((r) => ({
    url: `${BASE}/internships/${r.id}`,
    lastModified: r.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticEntries, ...internshipEntries];
}
```

- [ ] **Step 2: `app/robots.ts`**

```typescript
import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://inturn-hub.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/en/', '/marketplace', '/internships/'],
        disallow: ['/admin/', '/intern/', '/company/', '/api/', '/sign-in/', '/sign-up/', '/onboarding/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
```

- [ ] **Step 3: Dynamic OG image**

`app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Inturn — the internship platform for Tunisia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
        }}
      >
        <div>Inturn</div>
        <div style={{ fontSize: 28, marginTop: 16, opacity: 0.9 }}>
          The internship platform for Tunisia
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 4: Per-page `generateMetadata`**

In `app/[locale]/page.tsx` (landing), add:

```tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });
  return {
    title: `Inturn — ${t('title')}`,
    description: t('subtitle'),
    alternates: {
      canonical: locale === 'fr' ? '/' : '/en',
      languages: { fr: '/', en: '/en' },
    },
    openGraph: {
      title: 'Inturn',
      description: t('subtitle'),
      type: 'website',
      locale: locale === 'fr' ? 'fr_TN' : 'en_US',
    },
  };
}
```

Same pattern for marketplace + internship detail pages.

- [ ] **Step 5: Set `NEXT_PUBLIC_BASE_URL` in Vercel**

This is a Vercel dashboard task. Add `NEXT_PUBLIC_BASE_URL=https://inturn-hub.com` (or `https://inturn.vercel.app` until DNS is wired) to project env vars in all three environments.

- [ ] **Step 6: Verify**

```bash
pnpm build
# After deploy:
curl https://inturn-hub.com/sitemap.xml
curl https://inturn-hub.com/robots.txt
curl https://inturn-hub.com/opengraph-image
```

- [ ] **Step 7: Commit**

```bash
git add app/sitemap.ts app/robots.ts app/opengraph-image.tsx app/[locale]/page.tsx 'app/[locale]/(marketing)/marketplace/page.tsx' 'app/[locale]/internships/[slug]/page.tsx'
git commit -m "feat(seo): sitemap + robots + OG image + per-page generateMetadata"
```

---

## Task 8 — Onboarding progress indicator + resume

**Files:**
- Create: `components/ui/wizard-progress.tsx`
- Modify: `app/[locale]/(auth)/onboarding/intern/basics/page.tsx`
- Modify: `app/[locale]/(auth)/onboarding/intern/skills/page.tsx`
- Modify: `app/[locale]/(auth)/onboarding/intern/done/page.tsx`
- Modify: `app/[locale]/(auth)/onboarding/company/page.tsx`

Decision: store draft state in `profiles` table (already exists) by allowing partial saves. No new schema needed.

- [ ] **Step 1: Create `WizardProgress` component**

```tsx
import { useTranslations } from 'next-intl';

export function WizardProgress({ step, total, label }: { step: number; total: number; label: string }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between text-xs text-[var(--ink-3)] mb-2">
        <span>{label}</span>
        <span>{step} / {total}</span>
      </div>
      <div className="h-1 bg-[var(--surface-muted)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--brand-500)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add to each onboarding step**

In `basics/page.tsx`:

```tsx
<WizardProgress step={1} total={3} label={t('basics.step')} />
```

In `skills/page.tsx`:

```tsx
<WizardProgress step={2} total={3} label={t('skills.step')} />
```

In `done/page.tsx`:

```tsx
<WizardProgress step={3} total={3} label={t('done.step')} />
```

- [ ] **Step 3: Resume on refresh (server-stored draft)**

The intern onboarding's basics page already saves on Continue. To support refresh-resume:
1. Each step's form pre-fills from the DB profile (already does this if the field is set).
2. If the user reloads mid-step, they see what they've typed because it's already saved.

The actual feature is: "if user signs out at step 1 and back in, send them back to step 1, not step 2". This requires checking which fields are filled and routing accordingly.

Add to `modules/onboarding/router.ts` (new file):

```typescript
import type { Profile } from '@/db/schema';

export function nextInternStep(profile: Profile | null): '/onboarding/intern/basics' | '/onboarding/intern/skills' | '/onboarding/intern/done' | null {
  if (!profile?.firstName || !profile?.lastName || !profile?.university) {
    return '/onboarding/intern/basics';
  }
  if (!profile?.skills || profile.skills.length < 3) {
    return '/onboarding/intern/skills';
  }
  return '/onboarding/intern/done';
}
```

Then in `(auth)/onboarding/intern/page.tsx` (if it doesn't exist, create it):

```tsx
import { redirect } from 'next/navigation';
import { requireSession } from '@/modules/auth/session';
import { getProfile } from '@/modules/profiles/queries';
import { nextInternStep } from '@/modules/onboarding/router';

export default async function Page() {
  const session = await requireSession();
  const profile = await getProfile(session.user.id);
  const next = nextInternStep(profile);
  if (next) redirect(next);
  redirect('/intern/dashboard');
}
```

- [ ] **Step 4: Verify the resume flow manually**

Sign up as a new intern, fill basics, sign out, sign back in. Confirm landed on skills (not basics, not done). Fill skills, sign out, sign back in → done. Click done → dashboard.

- [ ] **Step 5: Commit**

```bash
git add components/ui/wizard-progress.tsx modules/onboarding/router.ts app/[locale]/\(auth\)/onboarding/
git commit -m "feat(onboarding): progress indicator + resume from last completed step"
```

---

## Wrap-up

- [ ] Push the branch
- [ ] Update `docs/HANDOFF.md` with Sprint C section
- [ ] Update memory file

---

## Self-review checklist

1. **Coverage:** 8 tasks match 8 audit items (i18n × 2, mobile, dnd-kit, a11y, dark mode, SEO, onboarding resume). ✓
2. **No placeholders:** Each task has real code or precise editing instructions. ✓
3. **i18n bilateral:** Every namespace added in en.json has a French equivalent in fr.json. ✓
4. **Test discipline:** This sprint is mostly UI — no new vitest tests except possibly for `nextInternStep` (a pure function, easy to test). Add a minimal smoke test in Task 8.

## Risk callouts

- **i18n breakage**: Missing translation keys throw at runtime, not at build. Manual smoke per page is essential. Consider adding a CI script that loads each locale JSON and asserts every key in `en` exists in `fr` and vice versa.
- **CSS specificity wars**: Workspace CSS is large; adding media queries might collide with existing rules. Use the same class prefixes; avoid `!important` unless absolutely needed.
- **`@dnd-kit` bundle size**: ~25KB minified. Acceptable for a client component that only loads on the tasks tab.
- **Dark mode token coverage**: The dark palette overrides core tokens but custom colors used inline in some components (e.g. the `#ECFDF5` paid pill background in `internship-card.tsx`) won't follow dark mode. Sweep for hardcoded colors and add `dark:` variants or replace with CSS vars.
- **SEO `NEXT_PUBLIC_BASE_URL`**: must be set in Vercel before deploy or sitemap.xml will hard-code the wrong domain.
- **Onboarding draft state**: storing in `profiles` means partial profile rows exist for users who abandon onboarding. Acceptable; admin queries should filter `WHERE profile_complete = true` if a clean cohort view is needed (Sprint D analytics).
