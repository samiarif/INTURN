# Sidebar Shell + Task Board Fixes — Design

**Status:** Draft, pending Sam review
**Date:** 2026-05-27
**Author:** Claude (paired with Sam)
**Ships in:** Two PRs (PR1 = shell + control wiring, PR2 = list + calendar views)

## Problem

Two related UX problems:

1. **Header doesn't scale.** The horizontal `PlatformHeader` works on
   marketing pages but feels cramped inside the product. As we add nav
   items (admin gets 6+ links today, more coming), the header runs out
   of horizontal room and pushes us toward overflow menus. A vertical
   sidebar gives us room to grow and matches the mental model of
   "settled-in workspace" apps (Notion, Vercel, Linear).

2. **Task board has dead controls.** `modules/workspace/components/tasks-board.tsx`
   ships 6 groups of placeholder controls that look interactive but
   don't do anything — card `⋯` menus, column `⋯` menus, `List` and
   `Calendar` view tabs (`disabled`), filter chips, sort/group chips.
   Interns also can't create their own tasks (`view === 'supervisor'`
   gate). Users hit these, nothing happens, trust erodes.

## Goals

- Replace the platform header with a 240px full-width left sidebar on
  every logged-in route except inside workspaces (which have their own
  shell).
- Wire every dead control on the task board to a real action.
- Let interns create tasks for themselves.
- Add real `List` and `Calendar` views as alternatives to the Kanban
  board.

## Non-goals

- Replacing the workspace's own shell (`topbar`, `rail-supervisor`,
  `tab-bar`). Workspaces stay as-is.
- Replacing the marketing-page header (public pages).
- A collapsible/icon-rail sidebar mode. Option C was rejected in
  brainstorming — we ship full-width always.
- Drag-to-reschedule on the calendar view. Ship read-only first;
  rescheduling is a v2 follow-up.
- Persistence of sidebar collapsed state (we don't have a collapsed
  state).
- e2e Playwright coverage. Unit + component tests only.

## Scope split

| Piece | PR1 | PR2 |
|---|---|---|
| Sidebar shell + mobile drawer | ✓ | — |
| Card `⋯` menu | ✓ | — |
| Column `⋯` menu | ✓ | — |
| Filter chips (All / Phase / Due this week) | ✓ | — |
| Sort dropdown (Due / Priority / Title / Created) | ✓ | — |
| Group dropdown (Status / Phase) | ✓ | — |
| Intern `+ Add task` | ✓ | — |
| List view (sortable table) | — | ✓ |
| Calendar view (month grid, read-only) | — | ✓ |

PR1 ~4–5 days, PR2 ~3–4 days.

## Architecture

### Shell

- **Delete** `components/platform-header.tsx`.
- **Add** `components/platform-sidebar.tsx` (client component).
- **Add** `components/platform-mobile-top-strip.tsx` (client component;
  44px top bar visible only below `md`, contains the hamburger that
  opens the sidebar drawer).
- **Modify** `app/[locale]/(platform)/layout.tsx`: replace the
  `<PlatformHeader>` block with `<PlatformSidebar>` +
  `<PlatformMobileTopStrip>` and switch the outer layout to a
  desktop grid (`240px 1fr`) collapsing to a single column below `md`.

Sidebar contents (top → bottom):

```
┌────────────────────────┐
│  ★ Inturn              │  56px logo block
├────────────────────────┤
│  Dashboard             │  role-based nav list
│  Applications          │     active = brand-tinted bg
│  Saved internships     │       + 2px left border
│  Records               │
│  Community             │
│  Browse marketplace    │
├────────────────────────┤
│  (flex spacer)         │
├────────────────────────┤
│  🔔 Notifications  N   │  NotificationBell reused as a row
│  ☼ Theme              │  ThemeToggle reused inline
│  EN / FR              │  LanguageSwitch reused inline
│  ─────────────────    │
│  👤 Sami Arif      ⋯   │  user menu (Account / Sign out)
└────────────────────────┘
```

Active-link logic: exact match OR `pathname.startsWith(href)`, except
`/marketplace` which only matches exactly (same logic as today).

Mobile drawer: hidden by default (`-translate-x-full`), slides in on
hamburger tap, dismissed by scrim click or Escape.

### Task board reorganization

`modules/workspace/components/tasks-board.tsx` (470 lines today) is
split into focused files under `modules/workspace/components/tasks/`:

```
tasks-board-view.tsx       Kanban DnD (was tasks-board.tsx, slimmed)
task-card.tsx              card render + sortable wrapper
task-card-menu.tsx         ⋯ popover on a card
task-column.tsx            column header + droppable list
task-column-menu.tsx       ⋯ popover on a column
task-toolbar.tsx           filter + sort + group + view tabs
```

PR2 adds:

```
tasks-list-view.tsx        sortable table
tasks-calendar-view.tsx    month grid
tasks-views-shell.tsx      reads ?view=… and dispatches to the right view
```

The current `tasks-board.tsx` becomes a thin re-export so callers
don't need to change imports.

### URL state contract

The toolbar owns all view-affecting state in URL params (no
client-only state for these — survives refresh, deep-linkable):

```
?view=board                # board (default) | list | calendar
&filter=phase:BA,dueIn:7d  # csv of key:value pairs (keys: phase, dueIn, status)
&sort=due                  # due (default) | priority | title | created
&group=status              # status (default) | phase
&columnSort=due            # optional secondary sort inside a column
&month=2026-06             # calendar view only
```

Helpers in `modules/workspace/utils/task-view-state.ts`:

- `parseFilterParam(raw: string | null): FilterState`
- `serializeFilterParam(state: FilterState): string | undefined`
- `derivePhasesFromTasks(tasks: Task[]): string[]`
- Sort comparators: `compareByDue`, `compareByPriority`,
  `compareByTitle`, `compareByCreated`

These are pure functions and the unit-test target.

### Server actions

`modules/tasks/server-actions.ts` already exports `moveTaskAction` and
`createTaskAction`. We add:

```ts
updateTaskAction(taskId: string, patch: Partial<Pick<Task,
  'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'tag'
>>): Promise<void>

deleteTaskAction(taskId: string): Promise<void>
```

Both:

1. `await requireActiveSession()`
2. Run a single ownership query. There is no `supervisor_id` column on
   `workspaces` — the supervisor relationship is via
   `workspaces.organization_id` → `organizations.owner_id`. The
   ownership join is therefore:
   ```sql
   SELECT 1 FROM tasks
     JOIN workspaces      ON workspaces.id      = tasks.workspace_id
     JOIN organizations   ON organizations.id   = workspaces.organization_id
   WHERE tasks.id = $1
     AND (workspaces.intern_id = $user OR organizations.owner_id = $user)
   ```
3. If zero rows → throw `Error('Unauthorized')`
4. Perform the update/delete
5. Call `revalidatePath` for the workspace tasks page

`createTaskAction` ownership check is broadened the same way so
interns can create tasks in their own workspace, not just the
company-side supervisor.

## Components in detail

### `PlatformSidebar`

```ts
type Props = {
  role: 'intern' | 'company' | 'admin';
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'imageUrl'>;
  notifications: Notification[];
  unreadCount: number;
  devBypassed: boolean;
};
```

Reuses existing `<NotificationBell>`, `<ThemeToggle>`,
`<LanguageSwitch>`, `<UserButtonShim>`, `<Avatar>`, `<GradientStar>`
components. The popovers anchor to their trigger and pop to the right
(toward main content) so they don't get clipped by the sidebar edge.

i18n: existing `platformNav.*` keys, no new strings needed for nav
items themselves.

### `PlatformMobileTopStrip`

44px height (iOS touch-target floor), `surface` background, contains
hamburger button + logo. Visible only on viewports below `md`. Click
hamburger → opens sidebar drawer. Escape and scrim click both close it.

### `TaskCardMenu`

Radix Popover triggered by the existing `<button class="tb-card-menu">⋯</button>`.

Menu items:

| Action | Intern | Supervisor | UI |
|---|---|---|---|
| Edit… | ✓ | ✓ | Opens `AddTaskModal` with new `initialTask?: Task` prop |
| Change due… | ✓ | ✓ | Inline date picker inside the popover |
| Change priority… | ✓ | ✓ | Inline radio group (low / medium / high) |
| Move to… | ✓ | ✓ | Inline list of the 4 task statuses (todo / in-progress / review / done), current status disabled |
| Delete | — | ✓ | Confirm dialog before firing `deleteTaskAction` |

`Move to…` is allowed for both roles because the existing state
machine (`modules/tasks/state-machine.ts`) explicitly permits any
transition — boards are fluid by design. Delete remains supervisor-only.

`Edit…` opens `AddTaskModal` with the modal switching between create
and edit modes based on whether `initialTask` is present. Focus lands
on the title field.

The trigger keeps `onPointerDown={(e) => e.stopPropagation()}` so
dnd-kit doesn't swallow the click.

### `TaskColumnMenu`

Three actions only:

- **Add task here** — same as the existing `+` button at the column
  bottom, just available from the header too.
- **Focus this column** — toggle. When on, sets
  `?filter=status:<col>` so the board shows only that column
  full-width. When already on for the same column, clears the filter.
- **Sort within column** — submenu: Due / Priority / Title / Created.
  Writes `?columnSort=<key>`.

No "Rename" (status enum), no "Archive" (status enum), no "Clear
column" (too destructive given there's no bulk undo).

### `TaskToolbar`

Single client component that owns URL state via `useSearchParams` +
`useRouter`. Renders three rows:

```
[Board] [List] [Calendar]                        ← view tabs
Filter: [All ✓] [Phase ▾] [Due this week]        ← filter chips
Sort: [Due ▾]   Group: [Status ▾]                ← sort + group
```

- Filter chips are buttons that toggle URL params. `[All]` clears all.
- `[Phase ▾]` opens a multi-select dropdown of phase prefixes derived
  from `derivePhasesFromTasks(currentTasks)`. The list is dynamic —
  only shows prefixes present in the data.
- `[Due this week]` is a toggle that adds/removes `dueIn:7d`.
- View tabs become `<Link>` elements that swap `?view=…`. On list and
  calendar views, the Group dropdown is hidden (only the board cares
  about grouping).
- **In PR1 the List and Calendar tabs render `disabled` with a
  `title="Coming soon"` tooltip.** PR2 removes the disabled state.

### `TasksListView` (PR2)

Semantic `<table>` with columns Title / Status / Phase / Due /
Priority / Created / `⋯`. Each header is a sortable button that writes
`?sort=…` and shows ↑/↓ when active. Click a row body → opens the
edit modal. The `⋯` column reuses `TaskCardMenu` (same component,
same actions).

No pagination — workspaces have 10–50 tasks typically. If a workspace
ever exceeds 200 tasks, virtual scroll is a separate task.

a11y: `<caption>` describing the table, `<th scope="col">`, rows have
`tabIndex={0}` with keyboard activation.

### `TasksCalendarView` (PR2)

Month grid driven by `?month=YYYY-MM` (defaults to current month).

- 7×6 grid (rendering leading/trailing days from neighboring months
  dimmed to 50% but still interactive).
- Each cell shows up to 3 task pills (status dot + truncated title),
  then `+N more` if overflowing.
- Click a pill → edit modal. Click `+N more` or empty cell space →
  popover listing every task due that day.
- Today's cell has a brand-tinted border. Past dates dim to 75%
  opacity.
- Header controls: `←` `Today` `→`. Keyboard: `[` and `]` for
  prev/next month, `T` for today.
- Tasks without a `dueDate` are excluded. A small banner at top reads
  "N tasks without a due date" and links to
  `?view=list&filter=&sort=created`.
- Day and month names come from `Intl.DateTimeFormat` with the active
  locale — no new translation keys for those.

### `TasksViewsShell` (PR2)

Reads `?view`, dispatches to the right child. Filtering + sorting
happens once here; each view receives a pre-prepared array. Group
applies only when `view === 'board'`.

```tsx
const filtered = filterTasks(rawTasks, parseFilterParam(searchParams.get('filter')));
const sorted = sortTasks(filtered, searchParams.get('sort') ?? 'due');

switch (searchParams.get('view')) {
  case 'list':     return <TasksListView tasks={sorted} {...rest} />;
  case 'calendar': return <TasksCalendarView tasks={sorted} {...rest} />;
  default:         return <TasksBoardView tasks={sorted} grouping={...} {...rest} />;
}
```

## Data flow

1. The server component for the workspace tasks page
   (`app/[locale]/(platform)/{intern,company}/workspaces/[workspaceId]/tasks/page.tsx`)
   loads `tasks` from the DB, passes them to `<TasksViewsShell>`.
2. The shell is a client component (so it can read `useSearchParams`).
3. Toolbar mutations push to URL via `router.replace(...)`. The shell
   re-runs filter/sort/group on the next render. No server roundtrip
   for view/sort/filter changes.
4. Task mutations (`updateTaskAction`, `deleteTaskAction`,
   `createTaskAction`, `moveTaskAction`) go through server actions and
   call `revalidatePath` on the workspace tasks route, which re-renders
   the server component and re-feeds tasks down. Optimistic UI in the
   board view (existing `optimistic` state for drag) extends to the
   card menu's status changes too.

## Error handling

- **Sidebar mobile drawer:** closing via Escape is global; if the
  drawer is closed, Escape is a no-op (don't trap focus).
- **Card menu actions:** wrap each action in `try { await ...action(); }
  catch (e) { toast.error(...) }`. Reuse the existing `toast` helper if
  it exists, otherwise the `aria-live` region pattern from
  `NotificationBell`.
- **URL state parse errors:** `parseFilterParam` returns an empty
  filter state on malformed input rather than throwing. Bad URL params
  silently drop instead of breaking the page.
- **Calendar view month param:** invalid `?month=` falls back to
  current month; the URL is also rewritten to the canonical form
  silently.
- **Empty states:**
  - Board, no tasks at all: existing empty message stays
  - Board with filters set, no tasks match: "No tasks match the current
    filters" + `[Clear filters]` button
  - List view, same as board's filtered-empty case
  - Calendar view, no tasks in the visible month: cells render empty,
    no banner

## Testing strategy

### Unit (`vitest`)

Target: pure functions in `modules/workspace/utils/task-view-state.ts`
and the sort comparators.

- `parseFilterParam('phase:BA,dueIn:7d')` → `{ phase: ['BA'], dueIn: '7d' }`
- `parseFilterParam('garbage')` → `{}` (no throw)
- `serializeFilterParam(...)` round-trips
- `derivePhasesFromTasks([...])` → unique prefixes
- `compareByDue(a, b)` — overdue < due-today < later < no-date

### Component (`vitest` + `@testing-library/react`)

- `TaskCardMenu` — opens on click, fires correct action callback,
  role-aware items hidden/shown
- `TaskToolbar` — clicking chips writes correct URL params
- `TasksListView` — clicking a column header updates `?sort=` and
  re-renders in the new order
- `TasksCalendarView` — renders correct number of cells for known
  months (Feb 2026 = 28 days starting Sunday; June 2026 = 30 days
  starting Monday)
- `PlatformSidebar` — renders the right nav items per role, active
  state matches current pathname

### No e2e

No Playwright today; adding it for this work is out of scope. Sam's
manual click-through after each PR is the smoke test.

### No new server-action tests

`moveTaskAction` is not tested today. Adding tests just for the new
actions (`updateTaskAction`, `deleteTaskAction`) would be asymmetric.
Tracked as tech debt for a later "test the tasks server actions" pass.

## Migration / rollout

- **PR1 ships first.** After merge, the platform header is gone, the
  sidebar is the new shell, and the task board has working controls but
  only the Kanban view. Calendar and List tabs in the toolbar are
  visible but disabled (with a `coming-soon` tooltip).
- **PR2 ships next.** Activates the List and Calendar tabs. URL
  contract is unchanged from PR1.
- No feature flag required — both PRs are user-visible UI changes that
  can roll out on their own.
- No schema migration in either PR.

## Open questions (none currently)

All open scope questions were resolved in brainstorming:

- Sidebar scope: platform pages only, not workspaces, not marketing ✓
- Sidebar style: full 240px, always-on labels (Option B) ✓
- PR slicing: two PRs (Approach 2) ✓
- Intern + Add task: yes ✓
- Wire vs hide: wire everything ✓
- No `assigneeId` schema column — "Mine" filter and "Group by
  assignee" are dropped from scope ✓
- No `phaseId` schema column — phase derives from tag prefix ✓
- Calendar drag-to-reschedule: v2 follow-up, not in PR2 ✓

## Appendix — files touched (estimated)

### PR1

**New:**
- `components/platform-sidebar.tsx`
- `components/platform-mobile-top-strip.tsx`
- `modules/workspace/components/tasks/task-card.tsx`
- `modules/workspace/components/tasks/task-card-menu.tsx`
- `modules/workspace/components/tasks/task-column.tsx`
- `modules/workspace/components/tasks/task-column-menu.tsx`
- `modules/workspace/components/tasks/task-toolbar.tsx`
- `modules/workspace/components/tasks/tasks-board-view.tsx`
- `modules/workspace/utils/task-view-state.ts`
- `modules/workspace/utils/task-view-state.test.ts`

**Modified:**
- `app/[locale]/(platform)/layout.tsx` — swap header for sidebar
- `modules/workspace/components/tasks-board.tsx` — becomes a
  re-export of `tasks-board-view.tsx`
- `modules/workspace/components/add-task-modal.tsx` — accept
  `initialTask`, support edit mode
- `modules/tasks/server-actions.ts` — add
  `updateTaskAction`, `deleteTaskAction`; broaden `createTaskAction`
  ownership check
- `app/globals.css` — sidebar layout vars, popover styles
- `locales/en.json`, `locales/fr.json` — toolbar/menu strings

**Deleted:**
- `components/platform-header.tsx`

### PR2

**New:**
- `modules/workspace/components/tasks/tasks-views-shell.tsx`
- `modules/workspace/components/tasks/tasks-list-view.tsx`
- `modules/workspace/components/tasks/tasks-calendar-view.tsx`

**Modified:**
- `modules/workspace/components/tasks/task-toolbar.tsx` — enable
  List/Calendar tabs
- workspace tasks page server component — wrap board in
  `TasksViewsShell`
- `locales/en.json`, `locales/fr.json` — list/calendar strings
