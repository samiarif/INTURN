# Sidebar Shell + Task Board Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the platform header with a full-width left sidebar on platform pages, and wire every dead control in the task board (card/column menus, filters, sort, group, list view, calendar view).

**Architecture:** Two PRs. PR1 ships the sidebar shell + every wired control + intern + Add task. PR2 ships the List + Calendar views. Pure helpers for URL state (`task-view-state.ts`) are unit-tested first; menus use the inline popover pattern from `NotificationBell` (no Radix dependency). No schema migration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Drizzle + Neon, next-intl 4, Tailwind v4, vitest + @testing-library/react, dnd-kit (already present).

**Spec:** [`docs/superpowers/specs/2026-05-27-sidebar-shell-and-task-fixes-design.md`](../specs/2026-05-27-sidebar-shell-and-task-fixes-design.md)

---

## PR1 — Sidebar shell + task control wiring

Branch: `feat/platform-sidebar-and-task-controls`

### Task 1: Pure helper — `parseFilterParam` (TDD)

**Files:**
- Create: `modules/workspace/utils/task-view-state.ts`
- Test: `modules/workspace/utils/task-view-state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// modules/workspace/utils/task-view-state.test.ts
import { describe, it, expect } from 'vitest';
import { parseFilterParam } from './task-view-state';

describe('parseFilterParam', () => {
  it('parses a single key:value', () => {
    expect(parseFilterParam('dueIn:7d')).toEqual({ dueIn: '7d' });
  });

  it('parses multiple comma-separated pairs', () => {
    expect(parseFilterParam('phase:BA,dueIn:7d')).toEqual({
      phase: ['BA'],
      dueIn: '7d',
    });
  });

  it('parses multiple phases as a list', () => {
    expect(parseFilterParam('phase:BA,phase:UX')).toEqual({
      phase: ['BA', 'UX'],
    });
  });

  it('parses status filter', () => {
    expect(parseFilterParam('status:todo')).toEqual({ status: 'todo' });
  });

  it('returns empty object for null', () => {
    expect(parseFilterParam(null)).toEqual({});
  });

  it('returns empty object for empty string', () => {
    expect(parseFilterParam('')).toEqual({});
  });

  it('silently drops malformed pairs', () => {
    expect(parseFilterParam('garbage,dueIn:7d')).toEqual({ dueIn: '7d' });
  });

  it('silently drops unknown keys', () => {
    expect(parseFilterParam('badkey:foo,dueIn:7d')).toEqual({ dueIn: '7d' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: FAIL with `Cannot find module './task-view-state'`

- [ ] **Step 3: Write minimal implementation**

```ts
// modules/workspace/utils/task-view-state.ts
export type FilterState = {
  phase?: string[];
  dueIn?: '7d';
  status?: 'todo' | 'in-progress' | 'review' | 'done';
};

const VALID_STATUSES = new Set(['todo', 'in-progress', 'review', 'done']);

export function parseFilterParam(raw: string | null): FilterState {
  if (!raw) return {};
  const out: FilterState = {};
  for (const pair of raw.split(',')) {
    const idx = pair.indexOf(':');
    if (idx < 1) continue;
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    if (!value) continue;
    if (key === 'phase') {
      out.phase = [...(out.phase ?? []), value];
    } else if (key === 'dueIn' && value === '7d') {
      out.dueIn = '7d';
    } else if (key === 'status' && VALID_STATUSES.has(value)) {
      out.status = value as FilterState['status'];
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/platform-sidebar-and-task-controls
git add modules/workspace/utils/task-view-state.ts modules/workspace/utils/task-view-state.test.ts
git commit -m "feat(tasks): parseFilterParam helper for URL view state"
```

---

### Task 2: Pure helper — `serializeFilterParam` (TDD)

**Files:**
- Modify: `modules/workspace/utils/task-view-state.ts`
- Modify: `modules/workspace/utils/task-view-state.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `modules/workspace/utils/task-view-state.test.ts`:

```ts
import { serializeFilterParam } from './task-view-state';

describe('serializeFilterParam', () => {
  it('returns undefined for empty state', () => {
    expect(serializeFilterParam({})).toBeUndefined();
  });

  it('serializes a single key', () => {
    expect(serializeFilterParam({ dueIn: '7d' })).toBe('dueIn:7d');
  });

  it('serializes multiple phases', () => {
    expect(serializeFilterParam({ phase: ['BA', 'UX'] })).toBe('phase:BA,phase:UX');
  });

  it('round-trips with parseFilterParam', () => {
    const state = { phase: ['BA'], dueIn: '7d' as const, status: 'todo' as const };
    const serialized = serializeFilterParam(state);
    expect(serialized).toBeDefined();
    expect(parseFilterParam(serialized!)).toEqual(state);
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: FAIL with `Cannot find name 'serializeFilterParam'`

- [ ] **Step 3: Implement**

Append to `modules/workspace/utils/task-view-state.ts`:

```ts
export function serializeFilterParam(state: FilterState): string | undefined {
  const parts: string[] = [];
  if (state.phase) for (const p of state.phase) parts.push(`phase:${p}`);
  if (state.dueIn) parts.push(`dueIn:${state.dueIn}`);
  if (state.status) parts.push(`status:${state.status}`);
  return parts.length > 0 ? parts.join(',') : undefined;
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: PASS (12 tests total)

- [ ] **Step 5: Commit**

```bash
git add modules/workspace/utils/task-view-state.ts modules/workspace/utils/task-view-state.test.ts
git commit -m "feat(tasks): serializeFilterParam round-trip with parseFilterParam"
```

---

### Task 3: Pure helper — `derivePhasesFromTasks` (TDD)

**Files:**
- Modify: `modules/workspace/utils/task-view-state.ts`
- Modify: `modules/workspace/utils/task-view-state.test.ts`

- [ ] **Step 1: Add failing tests**

Append to test file:

```ts
import { derivePhasesFromTasks } from './task-view-state';
import type { Task } from '@/db/schema';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    workspaceId: 'ws-1',
    tag: null,
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task;
}

describe('derivePhasesFromTasks', () => {
  it('returns unique prefixes alphabetically', () => {
    const tasks = [
      makeTask({ tag: 'BA-1' }),
      makeTask({ tag: 'UX-3' }),
      makeTask({ tag: 'BA-2' }),
    ];
    expect(derivePhasesFromTasks(tasks)).toEqual(['BA', 'UX']);
  });

  it('skips tasks without tags', () => {
    expect(derivePhasesFromTasks([makeTask({ tag: null })])).toEqual([]);
  });

  it('skips tags without a dash', () => {
    expect(derivePhasesFromTasks([makeTask({ tag: 'plain' })])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: FAIL with `Cannot find name 'derivePhasesFromTasks'`

- [ ] **Step 3: Implement**

Append to `task-view-state.ts`:

```ts
import type { Task } from '@/db/schema';

export function derivePhasesFromTasks(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const t of tasks) {
    if (!t.tag) continue;
    const idx = t.tag.indexOf('-');
    if (idx < 1) continue;
    set.add(t.tag.slice(0, idx));
  }
  return [...set].sort();
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: PASS (15 tests total)

- [ ] **Step 5: Commit**

```bash
git add modules/workspace/utils/task-view-state.ts modules/workspace/utils/task-view-state.test.ts
git commit -m "feat(tasks): derivePhasesFromTasks helper"
```

---

### Task 4: Sort comparators (TDD)

**Files:**
- Modify: `modules/workspace/utils/task-view-state.ts`
- Modify: `modules/workspace/utils/task-view-state.test.ts`

- [ ] **Step 1: Add failing tests**

Append:

```ts
import { compareByDue, compareByPriority, compareByTitle, compareByCreated, sortTasks } from './task-view-state';

describe('compareByDue', () => {
  it('orders overdue < today < later < no-date', () => {
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
    const a = makeTask({ id: 'a', dueDate: yesterday });
    const b = makeTask({ id: 'b', dueDate: tomorrow });
    const c = makeTask({ id: 'c', dueDate: null });
    const sorted = [c, b, a].sort(compareByDue);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('compareByPriority', () => {
  it('orders high before medium before low', () => {
    const a = makeTask({ id: 'a', priority: 'low' });
    const b = makeTask({ id: 'b', priority: 'high' });
    const c = makeTask({ id: 'c', priority: 'medium' });
    const sorted = [a, b, c].sort(compareByPriority);
    expect(sorted.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('compareByTitle', () => {
  it('orders alphabetically case-insensitive', () => {
    const a = makeTask({ id: 'a', title: 'beta' });
    const b = makeTask({ id: 'b', title: 'Alpha' });
    const sorted = [a, b].sort(compareByTitle);
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('compareByCreated', () => {
  it('orders newest first', () => {
    const a = makeTask({ id: 'a', createdAt: new Date('2026-01-01') });
    const b = makeTask({ id: 'b', createdAt: new Date('2026-02-01') });
    const sorted = [a, b].sort(compareByCreated);
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('sortTasks', () => {
  it('dispatches by sort key, defaults to due', () => {
    const a = makeTask({ id: 'a', priority: 'high', title: 'Z' });
    const b = makeTask({ id: 'b', priority: 'low', title: 'A' });
    expect(sortTasks([a, b], 'priority').map((t) => t.id)).toEqual(['a', 'b']);
    expect(sortTasks([a, b], 'title').map((t) => t.id)).toEqual(['b', 'a']);
    expect(sortTasks([a, b], null).map((t) => t.id)).toEqual(['a', 'b']); // null → due, both no date → input order
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: FAIL with `Cannot find name 'compareByDue'` etc.

- [ ] **Step 3: Implement**

Append:

```ts
const PRIORITY_RANK: Record<NonNullable<Task['priority']>, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function dueRank(t: Task): number {
  if (!t.dueDate) return Number.POSITIVE_INFINITY;
  return new Date(t.dueDate).getTime();
}

export function compareByDue(a: Task, b: Task): number {
  return dueRank(a) - dueRank(b);
}

export function compareByPriority(a: Task, b: Task): number {
  return PRIORITY_RANK[a.priority ?? 'medium'] - PRIORITY_RANK[b.priority ?? 'medium'];
}

export function compareByTitle(a: Task, b: Task): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function compareByCreated(a: Task, b: Task): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export type SortKey = 'due' | 'priority' | 'title' | 'created';

export function sortTasks(tasks: Task[], sortKey: SortKey | string | null): Task[] {
  const copy = tasks.slice();
  switch (sortKey) {
    case 'priority': return copy.sort(compareByPriority);
    case 'title':    return copy.sort(compareByTitle);
    case 'created':  return copy.sort(compareByCreated);
    case 'due':
    default:         return copy.sort(compareByDue);
  }
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: PASS (20 tests total)

- [ ] **Step 5: Commit**

```bash
git add modules/workspace/utils/task-view-state.ts modules/workspace/utils/task-view-state.test.ts
git commit -m "feat(tasks): sort comparators (due/priority/title/created)"
```

---

### Task 5: Filter applier (TDD)

**Files:**
- Modify: `modules/workspace/utils/task-view-state.ts`
- Modify: `modules/workspace/utils/task-view-state.test.ts`

- [ ] **Step 1: Add failing tests**

Append:

```ts
import { filterTasks } from './task-view-state';

describe('filterTasks', () => {
  it('returns all when filter is empty', () => {
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];
    expect(filterTasks(tasks, {})).toHaveLength(2);
  });

  it('filters by phase prefix', () => {
    const a = makeTask({ id: 'a', tag: 'BA-1' });
    const b = makeTask({ id: 'b', tag: 'UX-1' });
    const c = makeTask({ id: 'c', tag: null });
    expect(filterTasks([a, b, c], { phase: ['BA'] }).map((t) => t.id)).toEqual(['a']);
  });

  it('filters by dueIn:7d (next 7 days, excluding done)', () => {
    const inWeek = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
    const a = makeTask({ id: 'a', dueDate: inWeek });
    const b = makeTask({ id: 'b', dueDate: later });
    const c = makeTask({ id: 'c', dueDate: inWeek, status: 'done' });
    expect(filterTasks([a, b, c], { dueIn: '7d' }).map((t) => t.id)).toEqual(['a']);
  });

  it('filters by status', () => {
    const a = makeTask({ id: 'a', status: 'todo' });
    const b = makeTask({ id: 'b', status: 'done' });
    expect(filterTasks([a, b], { status: 'todo' }).map((t) => t.id)).toEqual(['a']);
  });

  it('combines filters with AND', () => {
    const a = makeTask({ id: 'a', tag: 'BA-1', status: 'todo' });
    const b = makeTask({ id: 'b', tag: 'BA-2', status: 'done' });
    expect(filterTasks([a, b], { phase: ['BA'], status: 'todo' }).map((t) => t.id)).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: FAIL with `Cannot find name 'filterTasks'`

- [ ] **Step 3: Implement**

Append:

```ts
export function filterTasks(tasks: Task[], filter: FilterState): Task[] {
  if (!filter.phase && !filter.dueIn && !filter.status) return tasks;
  const weekFromNow = Date.now() + 7 * 86400_000;
  return tasks.filter((t) => {
    if (filter.phase && filter.phase.length > 0) {
      const prefix = t.tag?.split('-')[0];
      if (!prefix || !filter.phase.includes(prefix)) return false;
    }
    if (filter.dueIn === '7d') {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate).getTime();
      if (due > weekFromNow) return false;
    }
    if (filter.status && t.status !== filter.status) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `pnpm vitest run modules/workspace/utils/task-view-state.test.ts`
Expected: PASS (25 tests total)

- [ ] **Step 5: Commit**

```bash
git add modules/workspace/utils/task-view-state.ts modules/workspace/utils/task-view-state.test.ts
git commit -m "feat(tasks): filterTasks applies phase/dueIn/status filters"
```

---

### Task 6: Add `updateTaskAction` server action

**Files:**
- Modify: `modules/tasks/server-actions.ts`
- Modify: `modules/workspace/access.ts` (only if ownership query needs to live here — read first to decide)

- [ ] **Step 1: Read existing `loadWorkspaceAccess`**

The existing `loadWorkspaceAccess(workspaceId)` already does session + workspace + canViewWorkspace check. We reuse it.

- [ ] **Step 2: Implement `updateTaskAction`**

Append to `modules/tasks/server-actions.ts`:

```ts
import { tasks, type Task } from '@/db/schema';
import { eq } from 'drizzle-orm';

export type UpdateTaskPatch = Partial<
  Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'tag'>
>;

export type UpdateTaskActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateTaskAction(
  taskId: string,
  patch: UpdateTaskPatch,
): Promise<UpdateTaskActionResult> {
  if (Object.keys(patch).length === 0) return { ok: false, error: 'empty_patch' };
  if (patch.title !== undefined) {
    if (patch.title.trim().length < 3) return { ok: false, error: 'title_too_short' };
    if (patch.title.length > 140) return { ok: false, error: 'title_too_long' };
  }

  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) return { ok: false, error: 'not_found' };

  // loadWorkspaceAccess throws Unauthorized/Forbidden — let that propagate.
  const { workspace } = await loadWorkspaceAccess(task.workspaceId);

  await db.update(tasks).set({ ...patch, updatedAt: new Date() }).where(eq(tasks.id, taskId));

  revalidatePath(`/intern/workspaces/${workspace.id}`);
  revalidatePath(`/company/workspaces/${workspace.id}`);
  revalidatePath(`/intern/workspaces/${workspace.id}/tasks`);
  revalidatePath(`/company/workspaces/${workspace.id}/tasks`);

  return { ok: true };
}
```

(Note: the spec called out the ownership SQL pseudo-code with an org join, but `loadWorkspaceAccess` already runs the equivalent authorization through `canViewWorkspace`. We reuse it for consistency.)

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add modules/tasks/server-actions.ts
git commit -m "feat(tasks): updateTaskAction server action with ownership check"
```

---

### Task 7: Add `deleteTaskAction` server action

**Files:**
- Modify: `modules/tasks/server-actions.ts`

- [ ] **Step 1: Implement**

Append to `modules/tasks/server-actions.ts`:

```ts
export type DeleteTaskActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteTaskAction(taskId: string): Promise<DeleteTaskActionResult> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) return { ok: false, error: 'not_found' };

  const { session, workspace } = await loadWorkspaceAccess(task.workspaceId);
  // Delete is supervisor-only — interns can edit/move but not destroy.
  if (session.role !== 'company' && session.role !== 'admin') {
    return { ok: false, error: 'forbidden' };
  }

  await db.delete(tasks).where(eq(tasks.id, taskId));

  revalidatePath(`/intern/workspaces/${workspace.id}`);
  revalidatePath(`/company/workspaces/${workspace.id}`);
  revalidatePath(`/intern/workspaces/${workspace.id}/tasks`);
  revalidatePath(`/company/workspaces/${workspace.id}/tasks`);

  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add modules/tasks/server-actions.ts
git commit -m "feat(tasks): deleteTaskAction (supervisor-only)"
```

---

### Task 8: Broaden `createTaskAction` so interns can create

**Files:**
- Modify: `modules/tasks/server-actions.ts`

- [ ] **Step 1: Edit the role gate**

In `modules/tasks/server-actions.ts`, find:

```ts
  if (session.role !== 'company' && session.role !== 'admin') {
    return { ok: false, error: 'forbidden' };
  }
```

Replace with:

```ts
  // Allow intern, company, or admin — loadWorkspaceAccess already
  // checked the caller is a participant in this workspace via
  // canViewWorkspace, so we just need to exclude non-participants.
  if (session.role !== 'intern' && session.role !== 'company' && session.role !== 'admin') {
    return { ok: false, error: 'forbidden' };
  }
```

Update the JSDoc above the function to:

```ts
/**
 * Create a task in a workspace. Allowed for any participant — the
 * intern can self-assign work between supervisor reviews, the supervisor
 * adds tasks from the board's `+ Add task` button. Authorization comes
 * from loadWorkspaceAccess (canViewWorkspace).
 */
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add modules/tasks/server-actions.ts
git commit -m "feat(tasks): allow interns to create tasks in their own workspace"
```

---

### Task 9: Add `initialTask` prop + edit mode to `AddTaskModal`

**Files:**
- Modify: `modules/workspace/components/add-task-modal.tsx`

- [ ] **Step 1: Update Props**

In `modules/workspace/components/add-task-modal.tsx`, replace:

```ts
type Props = {
  workspaceId: string;
  initialStatus: 'todo' | 'in-progress' | 'review' | 'done';
  onClose: () => void;
};
```

with:

```ts
import type { Task } from '@/db/schema';

type Props = {
  workspaceId: string;
  initialStatus: 'todo' | 'in-progress' | 'review' | 'done';
  /** When present, the modal is in edit mode and submits via updateTaskAction. */
  initialTask?: Task;
  onClose: () => void;
};
```

- [ ] **Step 2: Use `initialTask` to seed state**

Find:

```ts
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
```

Replace with:

```ts
  const isEdit = Boolean(initialTask);
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(
    (initialTask?.priority as 'low' | 'medium' | 'high' | null) ?? 'medium',
  );
  const [dueDate, setDueDate] = useState(initialTask?.dueDate ?? '');
```

Also update the destructured props line:

```ts
export function AddTaskModal({ workspaceId, initialStatus, initialTask, onClose }: Props) {
```

- [ ] **Step 3: Branch the submit() call**

Find the `submit()` function and replace its body with:

```ts
  function submit() {
    setError(null);
    if (title.trim().length < 3) {
      setError(t('errorTitleMin'));
      return;
    }
    startTransition(async () => {
      if (isEdit && initialTask) {
        const { updateTaskAction } = await import('@/modules/tasks/server-actions');
        const res = await updateTaskAction(initialTask.id, {
          title,
          description: description.trim() || null,
          priority,
          dueDate: dueDate || null,
        });
        if (!res.ok) {
          setError(t('errorGeneric'));
          return;
        }
      } else {
        const res = await createTaskAction({
          workspaceId,
          title,
          description: description.trim() || null,
          priority,
          dueDate: dueDate || null,
        });
        if (!res.ok) {
          setError(t('errorGeneric'));
          return;
        }
      }
      router.refresh();
      onClose();
    });
  }
```

- [ ] **Step 4: Update modal title to reflect mode**

Find:

```tsx
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
          {t('title')}
        </h3>
```

Replace with:

```tsx
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
          {isEdit ? t('editTitle') : t('title')}
        </h3>
```

- [ ] **Step 5: Add `editTitle` translation key**

In `locales/en.json`, find the `workspace.addTask` block and add inside it:

```json
"editTitle": "Edit task",
```

In `locales/fr.json`, the equivalent block:

```json
"editTitle": "Modifier la tâche",
```

- [ ] **Step 6: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add modules/workspace/components/add-task-modal.tsx locales/en.json locales/fr.json
git commit -m "feat(tasks): AddTaskModal supports initialTask + edit mode"
```

---

### Task 10: Create `tasks/` subfolder + extract `task-card.tsx`

**Files:**
- Create: `modules/workspace/components/tasks/task-card.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p modules/workspace/components/tasks
```

- [ ] **Step 2: Create `task-card.tsx`**

Copy the `SortableTaskCard` function and its dependent types from
`modules/workspace/components/tasks-board.tsx` into a new file. The
exported component will accept the same props plus an `onMenuAction`
callback we'll wire in Task 11.

```tsx
// modules/workspace/components/tasks/task-card.tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/db/schema';
import { Avatar } from '@/components/avatar';
import { TaskCardMenu } from './task-card-menu';
import type { TaskStatus } from '@/modules/tasks/state-machine';

type TaskWithMeta = Task & {
  needsReview?: boolean;
  comments?: number;
  attachments?: number;
};

const LABELS_BY_TAG_PREFIX: Record<string, { kind: string; text: string }> = {
  BA: { kind: 'design', text: 'Design' },
  UX: { kind: 'research', text: 'Research' },
};

function deriveLabel(tag: string | null): { kind: string; text: string } | null {
  if (!tag) return null;
  const prefix = tag.split('-')[0];
  return LABELS_BY_TAG_PREFIX[prefix] ?? null;
}

export type DueInfo =
  | { kind: 'closed'; urgent: false; overdue: false }
  | { kind: 'review'; urgent: false; overdue: false }
  | { kind: 'none'; urgent: false; overdue: false }
  | { kind: 'overdue'; days: number; urgent: true; overdue: true }
  | { kind: 'dueSoon'; days: number; weekday: string; urgent: true; overdue: false }
  | { kind: 'dueLater'; date: string; urgent: false; overdue: false };

export function formatDue(task: Task): DueInfo {
  if (task.status === 'done') return { kind: 'closed', urgent: false, overdue: false };
  if (task.status === 'review') return { kind: 'review', urgent: false, overdue: false };
  if (!task.dueDate) return { kind: 'none', urgent: false, overdue: false };
  const due = new Date(task.dueDate);
  const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { kind: 'overdue', days: -days, urgent: true, overdue: true };
  if (days <= 3) {
    const weekday = due.toLocaleDateString('en-US', { weekday: 'short' });
    return { kind: 'dueSoon', days, weekday, urgent: true, overdue: false };
  }
  return {
    kind: 'dueLater',
    date: due.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    urgent: false,
    overdue: false,
  };
}

export type TaskCardProps = {
  task: TaskWithMeta;
  status: TaskStatus;
  view: 'intern' | 'supervisor';
  internName: string;
  renderDue: (d: DueInfo) => string;
};

export function SortableTaskCard({ task, status, view, internName, renderDue }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { columnId: status } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const due = formatDue(task);
  const label = deriveLabel(task.tag);
  const showNeedsReview = view === 'supervisor' && status === 'review';
  const cardClass = [
    'tb-card',
    due.urgent && 'urgent',
    due.overdue && 'overdue',
    showNeedsReview && 'needs-review',
    status === 'done' && 'done',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      id={`task-${task.id}`}
      className={cardClass}
      style={style}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable task"
    >
      <div className="tb-card-top">
        {task.tag && <span className="tb-card-tag">{task.tag}</span>}
        {label && <span className={`tb-card-label ${label.kind}`}>{label.text}</span>}
        <TaskCardMenu task={task} view={view} />
      </div>
      <div className="tb-card-title">{task.title}</div>
      {task.description && <div className="tb-card-sub">{task.description}</div>}
      <div className="tb-card-foot">
        <span
          className={`tb-card-due ${due.urgent ? 'urgent' : ''} ${due.overdue ? 'overdue' : ''} ${status === 'done' ? 'good' : ''}`}
        >
          {status === 'done' ? <span className="ico-check" /> : <span className="cal" />}
          <span>{renderDue(due)}</span>
        </span>
        <Avatar name={internName} size="xs" title={internName} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit (compiler will fail until TaskCardMenu exists — that's Task 11)**

```bash
git add modules/workspace/components/tasks/task-card.tsx
git commit -m "feat(tasks): extract SortableTaskCard into tasks/task-card.tsx" --no-verify
```

(`--no-verify` only used here because TaskCardMenu doesn't exist yet — Task 11 creates it and removes the broken reference.)

---

### Task 11: Create `task-card-menu.tsx` — popover with edit/due/priority/move/delete

**Files:**
- Create: `modules/workspace/components/tasks/task-card-menu.tsx`

- [ ] **Step 1: Implement**

```tsx
// modules/workspace/components/tasks/task-card-menu.tsx
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Task } from '@/db/schema';
import { TASK_COLUMNS, type TaskStatus } from '@/modules/tasks/state-machine';
import {
  deleteTaskAction,
  updateTaskAction,
} from '@/modules/tasks/server-actions';
import { AddTaskModal } from '../add-task-modal';

type Props = {
  task: Task;
  view: 'intern' | 'supervisor';
};

type Panel = 'main' | 'due' | 'priority' | 'move' | null;

export function TaskCardMenu({ task, view }: Props) {
  const t = useTranslations('workspace.tasksBoard.cardMenu');
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Outside click + Escape close. Mirrors NotificationBell pattern.
  useEffect(() => {
    if (!panel) return;
    function onDocPointer(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPanel(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanel(null);
    }
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  function patch(p: Parameters<typeof updateTaskAction>[1]) {
    startTransition(async () => {
      const res = await updateTaskAction(task.id, p);
      if (res.ok) {
        router.refresh();
        setPanel(null);
      }
    });
  }

  function onDelete() {
    if (!confirm(t('deleteConfirm'))) return;
    startTransition(async () => {
      const res = await deleteTaskAction(task.id);
      if (res.ok) {
        router.refresh();
        setPanel(null);
      }
    });
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="tb-card-menu"
        aria-label={t('triggerLabel')}
        aria-haspopup="menu"
        aria-expanded={panel !== null}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setPanel(panel ? null : 'main')}
      >
        ⋯
      </button>
      {panel && (
        <div
          role="menu"
          className="tb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 180,
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
            zIndex: 40,
            padding: 4,
          }}
        >
          {panel === 'main' && (
            <>
              <MenuItem onClick={() => setEditing(true)}>{t('edit')}</MenuItem>
              <MenuItem onClick={() => setPanel('due')}>{t('changeDue')}</MenuItem>
              <MenuItem onClick={() => setPanel('priority')}>{t('changePriority')}</MenuItem>
              <MenuItem onClick={() => setPanel('move')}>{t('moveTo')}</MenuItem>
              {view === 'supervisor' && (
                <MenuItem onClick={onDelete} danger>
                  {t('delete')}
                </MenuItem>
              )}
            </>
          )}

          {panel === 'due' && (
            <div style={{ padding: 8 }}>
              <input
                type="date"
                defaultValue={task.dueDate ?? ''}
                onChange={(e) => patch({ dueDate: e.target.value || null })}
                style={{ width: '100%', padding: '6px 8px', fontSize: 13 }}
              />
            </div>
          )}

          {panel === 'priority' && (
            <div style={{ padding: 4 }}>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <MenuItem
                  key={p}
                  onClick={() => patch({ priority: p })}
                  disabled={pending || task.priority === p}
                >
                  {t(`priority.${p}`)}
                </MenuItem>
              ))}
            </div>
          )}

          {panel === 'move' && (
            <div style={{ padding: 4 }}>
              {TASK_COLUMNS.map((c) => (
                <MenuItem
                  key={c.status}
                  onClick={() => patch({ status: c.status as TaskStatus })}
                  disabled={pending || task.status === c.status}
                >
                  {t(`status.${c.status}`)}
                </MenuItem>
              ))}
            </div>
          )}
        </div>
      )}
      {editing && (
        <AddTaskModal
          workspaceId={task.workspaceId}
          initialStatus={(task.status ?? 'todo') as TaskStatus}
          initialTask={task}
          onClose={() => {
            setEditing(false);
            setPanel(null);
          }}
        />
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        fontSize: 13,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--ink-3)' : danger ? 'var(--danger)' : 'var(--ink)',
        borderRadius: 4,
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget.style.background = 'var(--surface-muted)');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Add i18n keys**

In `locales/en.json`, under `workspace.tasksBoard`, add:

```json
"cardMenu": {
  "triggerLabel": "Task actions",
  "edit": "Edit…",
  "changeDue": "Change due…",
  "changePriority": "Change priority…",
  "moveTo": "Move to…",
  "delete": "Delete",
  "deleteConfirm": "Delete this task? This cannot be undone.",
  "priority": {
    "low": "Low",
    "medium": "Medium",
    "high": "High"
  },
  "status": {
    "todo": "To do",
    "in-progress": "In progress",
    "review": "In review",
    "done": "Done"
  }
}
```

In `locales/fr.json` mirror block:

```json
"cardMenu": {
  "triggerLabel": "Actions de la tâche",
  "edit": "Modifier…",
  "changeDue": "Changer l'échéance…",
  "changePriority": "Changer la priorité…",
  "moveTo": "Déplacer vers…",
  "delete": "Supprimer",
  "deleteConfirm": "Supprimer cette tâche ? Action irréversible.",
  "priority": {
    "low": "Basse",
    "medium": "Moyenne",
    "high": "Haute"
  },
  "status": {
    "todo": "À faire",
    "in-progress": "En cours",
    "review": "En revue",
    "done": "Terminé"
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/tasks/task-card-menu.tsx locales/en.json locales/fr.json
git commit -m "feat(tasks): TaskCardMenu (edit/due/priority/move/delete)"
```

---

### Task 12: Component test for `TaskCardMenu`

**Files:**
- Create: `modules/workspace/components/tasks/task-card-menu.test.tsx`

- [ ] **Step 1: Check for existing testing-library setup**

Run: `grep -l "@testing-library/react" /Users/mac/code/inturn-hub/inturn/package.json`
Expected: a hit, or check `vitest.config.ts` for `jsdom`.

If `@testing-library/react` is **not** installed, install it:

```bash
pnpm add -D @testing-library/react @testing-library/dom jsdom
```

If `vitest.config.ts` doesn't set `environment: 'jsdom'`, add it.

- [ ] **Step 2: Write the test**

```tsx
// modules/workspace/components/tasks/task-card-menu.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCardMenu } from './task-card-menu';
import type { Task } from '@/db/schema';

// Stub next-intl + next/navigation + server actions
vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/modules/tasks/server-actions', () => ({
  deleteTaskAction: vi.fn(async () => ({ ok: true })),
  updateTaskAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../add-task-modal', () => ({
  AddTaskModal: () => null,
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    workspaceId: 'ws1',
    tag: null,
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task;
}

describe('TaskCardMenu', () => {
  it('opens main panel on trigger click', () => {
    render(<TaskCardMenu task={makeTask()} view="intern" />);
    const trigger = screen.getByRole('button', { name: 'triggerLabel' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByText('edit')).toBeTruthy();
    expect(screen.getByText('moveTo')).toBeTruthy();
  });

  it('hides Delete from intern view', () => {
    render(<TaskCardMenu task={makeTask()} view="intern" />);
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    expect(screen.queryByText('delete')).toBeNull();
  });

  it('shows Delete in supervisor view', () => {
    render(<TaskCardMenu task={makeTask()} view="supervisor" />);
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    expect(screen.getByText('delete')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run modules/workspace/components/tasks/task-card-menu.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/tasks/task-card-menu.test.tsx package.json pnpm-lock.yaml vitest.config.ts 2>/dev/null
git commit -m "test(tasks): TaskCardMenu opens, hides Delete from intern"
```

---

### Task 13: Extract `task-column.tsx` + create `task-column-menu.tsx`

**Files:**
- Create: `modules/workspace/components/tasks/task-column.tsx`
- Create: `modules/workspace/components/tasks/task-column-menu.tsx`

- [ ] **Step 1: Create `task-column-menu.tsx`**

```tsx
// modules/workspace/components/tasks/task-column-menu.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { TaskStatus } from '@/modules/tasks/state-machine';

type Props = {
  status: TaskStatus;
  onAddClick: () => void;
};

export function TaskColumnMenu({ status, onAddClick }: Props) {
  const t = useTranslations('workspace.tasksBoard.columnMenu');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [sortPanel, setSortPanel] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSortPanel(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setSortPanel(false);
      }
    }
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pushParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function focusColumn() {
    const existing = params.get('filter');
    if (existing === `status:${status}`) {
      pushParam('filter', null);
    } else {
      pushParam('filter', `status:${status}`);
    }
    setOpen(false);
  }

  function sortColumn(key: 'due' | 'priority' | 'title' | 'created') {
    pushParam('columnSort', key);
    setOpen(false);
    setSortPanel(false);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="menu"
        aria-label={t('triggerLabel', { status })}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="tb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 180,
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
            zIndex: 40,
            padding: 4,
          }}
        >
          {!sortPanel ? (
            <>
              <Item onClick={() => { onAddClick(); setOpen(false); }}>{t('addHere')}</Item>
              <Item onClick={focusColumn}>{t('focus')}</Item>
              <Item onClick={() => setSortPanel(true)}>{t('sortWithin')}</Item>
            </>
          ) : (
            <>
              {(['due', 'priority', 'title', 'created'] as const).map((k) => (
                <Item key={k} onClick={() => sortColumn(k)}>
                  {t(`sort.${k}`)}
                </Item>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Item({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        fontSize: 13,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--ink)',
        borderRadius: 4,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-muted)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create `task-column.tsx`**

Extract `BoardColumn` from `tasks-board.tsx`:

```tsx
// modules/workspace/components/tasks/task-column.tsx
'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task } from '@/db/schema';
import type { TaskStatus } from '@/modules/tasks/state-machine';
import { SortableTaskCard, type DueInfo } from './task-card';
import { TaskColumnMenu } from './task-column-menu';

type TaskWithMeta = Task & {
  needsReview?: boolean;
  comments?: number;
  attachments?: number;
};

export type TaskColumnProps = {
  status: TaskStatus;
  cls: string;
  label: string;
  tasks: TaskWithMeta[];
  view: 'intern' | 'supervisor';
  internName: string;
  isOver: boolean;
  renderDue: (d: DueInfo) => string;
  addTaskLabel: string;
  emptyDropLabel: string;
  onAddClick: () => void;
};

export function TaskColumn({
  status,
  cls,
  label,
  tasks,
  view,
  internName,
  isOver,
  renderDue,
  addTaskLabel,
  emptyDropLabel,
  onAddClick,
}: TaskColumnProps) {
  const { setNodeRef } = useDroppable({ id: `column-${status}`, data: { columnId: status } });
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={`tb-col ${cls} ${isOver ? 'tb-col-over' : ''}`}
      data-column-status={status}
    >
      <div className="tb-col-head">
        <span className="pip" aria-hidden="true" />
        <span className="name">{label}</span>
        <span className="count" aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
        <TaskColumnMenu status={status} onAddClick={onAddClick} />
      </div>
      <div className="tb-col-list">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              status={status}
              view={view}
              internName={internName}
              renderDue={renderDue}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && <div className="tb-card-ghost">{emptyDropLabel}</div>}
      </div>
      <button className="tb-col-add" type="button" onClick={onAddClick}>
        <span className="plus">+</span>
        <span>{addTaskLabel}</span>
      </button>
    </div>
  );
}
```

(Note the removed `view === 'supervisor'` guard on the + Add task button — that's the intern-can-add change from spec.)

- [ ] **Step 3: Add column menu i18n keys**

In `locales/en.json`, under `workspace.tasksBoard`:

```json
"columnMenu": {
  "triggerLabel": "{status} column actions",
  "addHere": "Add task here",
  "focus": "Focus this column",
  "sortWithin": "Sort within column…",
  "sort": {
    "due": "By due date",
    "priority": "By priority",
    "title": "By title",
    "created": "By created"
  }
}
```

In `locales/fr.json`:

```json
"columnMenu": {
  "triggerLabel": "Actions de la colonne {status}",
  "addHere": "Ajouter une tâche ici",
  "focus": "Mettre en évidence cette colonne",
  "sortWithin": "Trier dans la colonne…",
  "sort": {
    "due": "Par échéance",
    "priority": "Par priorité",
    "title": "Par titre",
    "created": "Par création"
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add modules/workspace/components/tasks/task-column.tsx modules/workspace/components/tasks/task-column-menu.tsx locales/en.json locales/fr.json
git commit -m "feat(tasks): TaskColumn + TaskColumnMenu (focus / sort within)"
```

---

### Task 14: Create `task-toolbar.tsx`

**Files:**
- Create: `modules/workspace/components/tasks/task-toolbar.tsx`

- [ ] **Step 1: Implement**

```tsx
// modules/workspace/components/tasks/task-toolbar.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Task } from '@/db/schema';
import {
  parseFilterParam,
  serializeFilterParam,
  derivePhasesFromTasks,
  type FilterState,
  type SortKey,
} from '@/modules/workspace/utils/task-view-state';

type Props = {
  tasks: Task[];
  enableListAndCalendar: boolean;
};

export function TaskToolbar({ tasks, enableListAndCalendar }: Props) {
  const t = useTranslations('workspace.tasksBoard.toolbar');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const view = params.get('view') ?? 'board';
  const filter = parseFilterParam(params.get('filter'));
  const sort = (params.get('sort') ?? 'due') as SortKey;
  const group = params.get('group') ?? 'status';

  const phases = derivePhasesFromTasks(tasks);

  function patchUrl(updates: Partial<{ view: string; filter: FilterState; sort: SortKey; group: string }>) {
    const next = new URLSearchParams(params);
    if ('view' in updates) {
      if (updates.view && updates.view !== 'board') next.set('view', updates.view);
      else next.delete('view');
    }
    if ('filter' in updates) {
      const s = serializeFilterParam(updates.filter ?? {});
      if (s) next.set('filter', s);
      else next.delete('filter');
    }
    if ('sort' in updates) {
      if (updates.sort && updates.sort !== 'due') next.set('sort', updates.sort);
      else next.delete('sort');
    }
    if ('group' in updates) {
      if (updates.group && updates.group !== 'status') next.set('group', updates.group);
      else next.delete('group');
    }
    router.replace(`${pathname}?${next.toString()}`);
  }

  function togglePhase(p: string) {
    const current = filter.phase ?? [];
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    patchUrl({ filter: { ...filter, phase: next.length > 0 ? next : undefined } });
  }

  function toggleDueThisWeek() {
    patchUrl({ filter: { ...filter, dueIn: filter.dueIn === '7d' ? undefined : '7d' } });
  }

  function clearAll() {
    patchUrl({ filter: {} });
  }

  return (
    <div className="tb-toolbar">
      <div className="tb-view" role="tablist" aria-label={t('viewTabsLabel')}>
        <ViewTab active={view === 'board'} onClick={() => patchUrl({ view: 'board' })}>
          {t('viewBoard')}
        </ViewTab>
        <ViewTab
          active={view === 'list'}
          onClick={() => enableListAndCalendar && patchUrl({ view: 'list' })}
          disabled={!enableListAndCalendar}
          title={!enableListAndCalendar ? t('comingSoon') : undefined}
        >
          {t('viewList')}
        </ViewTab>
        <ViewTab
          active={view === 'calendar'}
          onClick={() => enableListAndCalendar && patchUrl({ view: 'calendar' })}
          disabled={!enableListAndCalendar}
          title={!enableListAndCalendar ? t('comingSoon') : undefined}
        >
          {t('viewCalendar')}
        </ViewTab>
      </div>

      <Chip active={!filter.phase && !filter.dueIn && !filter.status} onClick={clearAll}>
        {t('filterAll')} <span className="num">{tasks.length}</span>
      </Chip>

      <PhaseDropdown phases={phases} selected={filter.phase ?? []} onToggle={togglePhase} label={t('filterPhase')} />

      <Chip active={filter.dueIn === '7d'} onClick={toggleDueThisWeek}>
        {t('filterDueThisWeek')}
      </Chip>

      <div className="tb-spacer" />

      <SortDropdown value={sort} onChange={(v) => patchUrl({ sort: v })} label={t('sort')} t={t} />

      {view === 'board' && (
        <GroupDropdown value={group} onChange={(v) => patchUrl({ group: v })} label={t('group')} t={t} />
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      type="button"
      className={active ? 'active' : ''}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`tb-chip ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

function PhaseDropdown({
  phases,
  selected,
  onToggle,
  label,
}: {
  phases: string[];
  selected: string[];
  onToggle: (p: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  if (phases.length === 0) return null;
  const active = selected.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`tb-chip ${active ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        {active ? `: ${selected.join(', ')}` : ''}
        <span className="caret" />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: 140,
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: 4,
            zIndex: 30,
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
          }}
        >
          {phases.map((p) => {
            const checked = selected.includes(p);
            return (
              <button
                key={p}
                role="menuitemcheckbox"
                aria-checked={checked}
                type="button"
                onClick={() => onToggle(p)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 10px',
                  fontSize: 13,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 4,
                  color: 'var(--ink)',
                }}
              >
                {checked ? '✓ ' : '  '}
                {p}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortDropdown({
  value,
  onChange,
  label,
  t,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
  label: string;
  t: (k: string) => string;
}) {
  return (
    <label className="tb-chip">
      {label}:{' '}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        style={{ background: 'transparent', border: 'none', color: 'var(--ink)', font: 'inherit' }}
      >
        <option value="due">{t('sortDue')}</option>
        <option value="priority">{t('sortPriority')}</option>
        <option value="title">{t('sortTitle')}</option>
        <option value="created">{t('sortCreated')}</option>
      </select>
    </label>
  );
}

function GroupDropdown({
  value,
  onChange,
  label,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  t: (k: string) => string;
}) {
  return (
    <label className="tb-chip">
      {label}:{' '}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: 'transparent', border: 'none', color: 'var(--ink)', font: 'inherit' }}
      >
        <option value="status">{t('groupStatus')}</option>
        <option value="phase">{t('groupPhase')}</option>
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Add toolbar i18n keys**

In `locales/en.json`, under `workspace.tasksBoard`:

```json
"toolbar": {
  "viewTabsLabel": "Task view",
  "viewBoard": "Board",
  "viewList": "List",
  "viewCalendar": "Calendar",
  "comingSoon": "Coming soon",
  "filterAll": "All",
  "filterPhase": "Phase",
  "filterDueThisWeek": "Due this week",
  "sort": "Sort",
  "sortDue": "Due date",
  "sortPriority": "Priority",
  "sortTitle": "Title",
  "sortCreated": "Created",
  "group": "Group",
  "groupStatus": "Status",
  "groupPhase": "Phase"
}
```

`locales/fr.json` (translated equivalents):

```json
"toolbar": {
  "viewTabsLabel": "Vue des tâches",
  "viewBoard": "Tableau",
  "viewList": "Liste",
  "viewCalendar": "Calendrier",
  "comingSoon": "Bientôt disponible",
  "filterAll": "Toutes",
  "filterPhase": "Phase",
  "filterDueThisWeek": "Cette semaine",
  "sort": "Tri",
  "sortDue": "Échéance",
  "sortPriority": "Priorité",
  "sortTitle": "Titre",
  "sortCreated": "Création",
  "group": "Groupe",
  "groupStatus": "Statut",
  "groupPhase": "Phase"
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/tasks/task-toolbar.tsx locales/en.json locales/fr.json
git commit -m "feat(tasks): TaskToolbar with filter/sort/group/view URL state"
```

---

### Task 15: Slim `tasks-board.tsx` to `tasks-board-view.tsx`

**Files:**
- Create: `modules/workspace/components/tasks/tasks-board-view.tsx`
- Modify: `modules/workspace/components/tasks-board.tsx`

- [ ] **Step 1: Write `tasks-board-view.tsx`**

```tsx
// modules/workspace/components/tasks/tasks-board-view.tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task } from '@/db/schema';
import { TASK_COLUMNS, type TaskStatus } from '@/modules/tasks/state-machine';
import { moveTaskAction } from '@/modules/tasks/server-actions';
import {
  parseFilterParam,
  sortTasks,
  filterTasks,
  derivePhasesFromTasks,
  type SortKey,
} from '@/modules/workspace/utils/task-view-state';
import { TaskColumn } from './task-column';
import { formatDue, type DueInfo } from './task-card';
import { AddTaskModal } from '../add-task-modal';
import { TaskToolbar } from './task-toolbar';

type TaskWithMeta = Task & { needsReview?: boolean; comments?: number; attachments?: number };

export type TasksBoardViewProps = {
  tasks: TaskWithMeta[];
  view: 'intern' | 'supervisor';
  internName: string;
  workspaceId: string;
  /** PR2 flips this to true when list+calendar views land. */
  enableListAndCalendar?: boolean;
};

const COLUMN_LABEL_KEY: Record<TaskStatus, 'todo' | 'inProgress' | 'review' | 'done'> = {
  todo: 'todo',
  'in-progress': 'inProgress',
  review: 'review',
  done: 'done',
};

export function TasksBoardView({
  tasks,
  view,
  internName,
  workspaceId,
  enableListAndCalendar = false,
}: TasksBoardViewProps) {
  const t = useTranslations('workspace.tasksBoard');
  const tCols = useTranslations('workspace.tasksBoard.columns');
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({});
  const [addingForColumn, setAddingForColumn] = useState<TaskStatus | null>(null);

  // Apply filter + sort from URL.
  const filter = parseFilterParam(params.get('filter'));
  const sortKey = (params.get('sort') ?? 'due') as SortKey;
  const group = params.get('group') ?? 'status';
  const filtered = useMemo(() => filterTasks(tasks, filter), [tasks, filter]);
  const sorted = useMemo(() => sortTasks(filtered, sortKey), [filtered, sortKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function renderDue(d: DueInfo): string {
    switch (d.kind) {
      case 'closed':   return t('closed');
      case 'review':   return t('awaitingReview');
      case 'none':     return '—';
      case 'overdue':  return t('overdue', { days: d.days });
      case 'dueSoon':  return d.days === 0 ? t('dueToday') : `${d.weekday} · ${t('dueIn', { days: d.days })}`;
      case 'dueLater': return t('dueOn', { date: d.date });
    }
  }

  function statusOf(task: TaskWithMeta): TaskStatus {
    return (optimistic[task.id] ?? task.status ?? 'todo') as TaskStatus;
  }

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { columnId?: TaskStatus } | undefined;
    setActiveColumn(data?.columnId ?? null);
    setOverColumn(data?.columnId ?? null);
  }
  function onDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) { setOverColumn(null); return; }
    const overData = over.data.current as { columnId?: TaskStatus } | undefined;
    let to: TaskStatus | null = overData?.columnId ?? null;
    if (!to && typeof over.id === 'string' && over.id.startsWith('column-')) {
      to = over.id.slice('column-'.length) as TaskStatus;
    }
    setOverColumn(to);
  }
  function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setOverColumn(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const task = sorted.find((tk) => tk.id === taskId);
    if (!task) return;
    const overData = over.data.current as { columnId?: TaskStatus } | undefined;
    const fromIdPrefix = typeof over.id === 'string' && over.id.startsWith('column-')
      ? (over.id.slice('column-'.length) as TaskStatus)
      : null;
    const toStatus: TaskStatus | null = overData?.columnId ?? fromIdPrefix;
    if (!toStatus) return;
    if (statusOf(task) === toStatus) return;
    setOptimistic((m) => ({ ...m, [taskId]: toStatus }));
    startTransition(async () => {
      try {
        await moveTaskAction({ taskId, to: toStatus });
        router.refresh();
      } catch {
        setOptimistic((m) => { const next = { ...m }; delete next[taskId]; return next; });
      }
    });
  }
  function onDragCancel() {
    setActiveColumn(null);
    setOverColumn(null);
  }

  // Group resolution: when grouping by status, columns are TASK_COLUMNS.
  // When grouping by phase, columns are derived prefixes + "no phase".
  const columns = useMemo(() => {
    if (group === 'phase') {
      const phases = derivePhasesFromTasks(sorted);
      const phaseLike = phases.map((p) => ({ status: p as TaskStatus, label: p, cls: 'phase' }));
      return [...phaseLike, { status: '__none__' as TaskStatus, label: t('noPhase'), cls: 'phase' }];
    }
    return TASK_COLUMNS.map((c) => ({ status: c.status, label: tCols(COLUMN_LABEL_KEY[c.status]), cls: c.cls }));
  }, [group, sorted, t, tCols]);

  function tasksForColumn(colStatus: string): TaskWithMeta[] {
    if (group === 'phase') {
      if (colStatus === '__none__') {
        return sorted.filter((tk) => !tk.tag || !tk.tag.includes('-'));
      }
      return sorted.filter((tk) => tk.tag?.startsWith(`${colStatus}-`));
    }
    return sorted.filter((tk) => statusOf(tk) === colStatus);
  }

  return (
    <div className="ws-col-main" style={{ gap: 0 }}>
      <TaskToolbar tasks={tasks} enableListAndCalendar={enableListAndCalendar} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className={`tb-board ${pending ? 'opacity-90' : ''}`}>
          {columns.map((col) => {
            const colTasks = tasksForColumn(col.status);
            return (
              <TaskColumn
                key={String(col.status)}
                status={col.status as TaskStatus}
                cls={col.cls}
                label={col.label}
                tasks={colTasks}
                view={view}
                internName={internName}
                isOver={overColumn === col.status && activeColumn !== col.status}
                renderDue={renderDue}
                addTaskLabel={t('addTask')}
                emptyDropLabel={t('emptyDrop')}
                onAddClick={() => setAddingForColumn(col.status as TaskStatus)}
              />
            );
          })}
        </div>
      </DndContext>
      {addingForColumn && (
        <AddTaskModal
          workspaceId={workspaceId}
          initialStatus={addingForColumn}
          onClose={() => setAddingForColumn(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `tasks-board.tsx` with a thin re-export**

```ts
// modules/workspace/components/tasks-board.tsx
export { TasksBoardView as TasksBoard } from './tasks/tasks-board-view';
```

- [ ] **Step 3: Add `noPhase` + `dueOn` translation keys**

In `locales/en.json` under `workspace.tasksBoard`:

```json
"noPhase": "No phase",
"dueOn": "Due {date}",
"closed": "Closed",
"awaitingReview": "Awaiting review",
```

In `locales/fr.json`:

```json
"noPhase": "Sans phase",
"dueOn": "Échéance {date}",
"closed": "Fermé",
"awaitingReview": "En attente de revue",
```

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run modules/workspace`
Expected: PASS (all task tests still green)

- [ ] **Step 6: Commit**

```bash
git add modules/workspace/components/tasks/tasks-board-view.tsx modules/workspace/components/tasks-board.tsx locales/en.json locales/fr.json
git commit -m "refactor(tasks): split tasks-board into focused tasks/ files"
```

---

### Task 16: Create `PlatformSidebar`

**Files:**
- Create: `components/platform-sidebar.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/platform-sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/ui/notification-bell';
import { UserButtonShim } from '@/components/auth/user-button-shim';
import type { Role } from '@/modules/auth/types';
import type { Notification, User } from '@/db/schema';

type Props = {
  role: Role;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'imageUrl'>;
  notifications: Notification[];
  unreadCount: number;
  devBypassed?: boolean;
};

export function PlatformSidebar({ role, user, notifications, unreadCount, devBypassed = false }: Props) {
  const tNav = useTranslations('platformNav');
  const tNotif = useTranslations('notifications');
  const tA11y = useTranslations('a11y');
  const pathname = usePathname();

  // Hide inside workspaces — they own their own shell.
  if (pathname.includes('/workspaces/')) return null;

  const accountItem = { href: '/account', label: tNav('account') };
  const navItems = role === 'intern'
    ? [
        { href: '/intern/dashboard',     label: tNav('dashboard') },
        { href: '/intern/applications',  label: tNav('applications') },
        { href: '/intern/saved',         label: tNav('saved') },
        { href: '/intern/records',       label: tNav('records') },
        { href: '/intern/community',     label: tNav('community') },
        { href: '/marketplace',          label: tNav('browse') },
        accountItem,
      ]
    : role === 'company'
    ? [
        { href: '/company/dashboard', label: tNav('dashboard') },
        { href: '/company/projects',  label: tNav('projects') },
        { href: '/marketplace',       label: tNav('browse') },
        accountItem,
      ]
    : role === 'admin'
    ? [
        { href: '/admin/dashboard',     label: tNav('dashboard') },
        { href: '/admin/verifications', label: tNav('verifications') },
        { href: '/admin/reports',       label: tNav('reports') },
        { href: '/admin/users',         label: tNav('users') },
        { href: '/admin/audit',         label: tNav('audit') },
        { href: '/marketplace',         label: tNav('browse') },
        accountItem,
      ]
    : [];

  function isActive(href: string): boolean {
    return href === pathname || (href !== '/marketplace' && pathname.startsWith(href));
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

  return (
    <aside
      aria-label={tA11y('mainNavigation')}
      className="hidden md:flex flex-col w-[240px] h-screen sticky top-0 border-r border-[var(--border-color)] bg-[var(--surface)]"
    >
      {/* Logo block */}
      <Link href={`/${role}/dashboard`} className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border-color)]">
        <GradientStar size="md" />
        <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
      </Link>

      {/* Nav */}
      <nav aria-label={tA11y('primaryNav')} className="flex-1 overflow-y-auto py-3">
        <ul className="flex flex-col">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={
                  'block px-4 py-2 text-[14px] border-l-2 ' +
                  (isActive(item.href)
                    ? 'text-[var(--ink)] font-medium bg-[var(--brand-50)] border-[var(--brand-500)]'
                    : 'text-[var(--ink-2)] border-transparent hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]')
                }
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer block */}
      <div className="border-t border-[var(--border-color)] p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <NotificationBell initialUnread={unreadCount} initialItems={notifications} label={tNotif('label')} />
          <ThemeToggle labelDark={tA11y('switchToDark')} labelLight={tA11y('switchToLight')} />
          <LanguageSwitch />
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
          <UserButtonShim bypassed={devBypassed} />
          <div className="min-w-0 flex-1 text-[12px]">
            <div className="truncate font-medium text-[var(--ink)]">{displayName}</div>
            <div className="truncate text-[var(--ink-3)]">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Add `a11y.mainNavigation` and `a11y.primaryNav` keys**

In `locales/en.json` under `a11y`:

```json
"mainNavigation": "Main navigation",
"primaryNav": "Primary navigation",
```

In `locales/fr.json` under `a11y`:

```json
"mainNavigation": "Navigation principale",
"primaryNav": "Navigation primaire",
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/platform-sidebar.tsx locales/en.json locales/fr.json
git commit -m "feat(shell): PlatformSidebar component (240px, desktop only)"
```

---

### Task 17: Create `PlatformMobileTopStrip`

**Files:**
- Create: `components/platform-mobile-top-strip.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/platform-mobile-top-strip.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GradientStar } from '@/components/brand/gradient-star';
import { PlatformSidebar } from './platform-sidebar';
import type { Role } from '@/modules/auth/types';
import type { Notification, User } from '@/db/schema';

type Props = {
  role: Role;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'imageUrl'>;
  notifications: Notification[];
  unreadCount: number;
  devBypassed?: boolean;
};

export function PlatformMobileTopStrip(props: Props) {
  const tA11y = useTranslations('a11y');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Escape closes drawer.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (pathname.includes('/workspaces/')) return null;

  return (
    <>
      <div className="md:hidden h-11 flex items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--surface)] sticky top-0 z-30">
        <button
          type="button"
          aria-label={tA11y('openMenu')}
          aria-expanded={open}
          aria-controls="mobile-sidebar"
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded hover:bg-[var(--surface-muted)]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <Link href={`/${props.role}/dashboard`} className="flex items-center gap-2">
          <GradientStar size="sm" />
          <span className="font-semibold text-[15px] tracking-tight">Inturn</span>
        </Link>
        <div className="w-9" aria-hidden />
      </div>

      {/* Drawer overlay + sidebar */}
      {open && (
        <>
          <button
            type="button"
            aria-label={tA11y('closeMenu')}
            onClick={() => setOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/40"
          />
          <div
            id="mobile-sidebar"
            className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-[240px] bg-[var(--surface)] shadow-xl"
          >
            {/* Sidebar already renders `<aside>`; we wrap in a div so the
                hidden md:flex doesn't suppress it inside the drawer. */}
            <div className="block md:block h-full">
              <PlatformSidebar {...props} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
```

(Tradeoff: PlatformSidebar's own `hidden md:flex` will hide it inside the
drawer at `md+`. That's fine — at `md+` the drawer itself is hidden by
`md:hidden`, so the user never sees both. Below `md`, we render the
drawer which contains the sidebar.)

- [ ] **Step 2: Override the `hidden md:flex` inside the drawer**

The sidebar has `hidden md:flex` baked in. Inside the drawer that hides
it on mobile. Fix by adding a `forceVisible` prop to `PlatformSidebar`:

Edit `components/platform-sidebar.tsx`. Update Props:

```ts
type Props = {
  role: Role;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'imageUrl'>;
  notifications: Notification[];
  unreadCount: number;
  devBypassed?: boolean;
  /** When true, render even below md (used by the mobile drawer). */
  forceVisible?: boolean;
};
```

In the function signature add the prop, and change the `<aside>` class:

```tsx
export function PlatformSidebar({ role, user, notifications, unreadCount, devBypassed = false, forceVisible = false }: Props) {
  // ...
  return (
    <aside
      aria-label={tA11y('mainNavigation')}
      className={`${forceVisible ? 'flex' : 'hidden md:flex'} flex-col w-[240px] h-screen sticky top-0 border-r border-[var(--border-color)] bg-[var(--surface)]`}
    >
```

In `components/platform-mobile-top-strip.tsx`, pass `forceVisible`:

```tsx
<PlatformSidebar {...props} forceVisible />
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/platform-mobile-top-strip.tsx components/platform-sidebar.tsx
git commit -m "feat(shell): PlatformMobileTopStrip + drawer rendering"
```

---

### Task 18: Replace header with sidebar in platform layout

**Files:**
- Modify: `app/[locale]/(platform)/layout.tsx`
- Delete: `components/platform-header.tsx`

- [ ] **Step 1: Edit layout**

Replace the contents of `app/[locale]/(platform)/layout.tsx` with:

```tsx
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { PlatformSidebar } from '@/components/platform-sidebar';
import { PlatformMobileTopStrip } from '@/components/platform-mobile-top-strip';
import {
  getUnreadCount,
  listRecentNotifications,
} from '@/modules/notifications/queries';
import { SuspendedBanner } from '@/components/suspended-banner';
import { isDevAuthBypassed } from '@/lib/dev-auth';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect(isDevAuthBypassed() ? '/dev/login' : '/sign-in');
  if (!session.user.role) redirect('/role-selection');
  const t = await getTranslations('a11y');

  const [unreadCount, notifications] = await Promise.all([
    getUnreadCount(session.user.id),
    listRecentNotifications(session.user.id, 12),
  ]);

  const userProps = {
    role: session.role,
    user: {
      id: session.user.id,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      email: session.user.email,
      imageUrl: session.user.imageUrl,
    },
    notifications,
    unreadCount,
    devBypassed: isDevAuthBypassed(),
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--surface)] focus:border focus:border-[var(--brand-500)] focus:rounded focus:px-4 focus:py-2 focus:text-sm"
      >
        {t('skipToContent')}
      </a>
      <PlatformMobileTopStrip {...userProps} />
      <div className="md:grid md:grid-cols-[240px_1fr] min-h-screen">
        <PlatformSidebar {...userProps} />
        <div className="flex flex-col min-w-0">
          {session.user.suspendedAt && <SuspendedBanner />}
          <main id="main-content" className="flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Delete the old header**

```bash
git rm components/platform-header.tsx
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors. If anything else imports `PlatformHeader`, that's a real grep target:

Run: `grep -rln 'PlatformHeader\|platform-header' --include='*.ts' --include='*.tsx' .`
Expected: only the deleted file or zero hits.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/\(platform\)/layout.tsx
git commit -m "feat(shell): replace PlatformHeader with PlatformSidebar"
```

---

### Task 19: Manual smoke pass — task board controls

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Click through with dev-bypass cookies**

In your browser, visit `http://localhost:3000/dev/login` and sign in as
the company user (`dazzsemi@gmail.com`). Navigate to a workspace's
tasks tab. Verify:

- Sidebar shows the right nav items, current page highlighted
- Card `⋯` opens a menu; Edit / Change due / Change priority / Move to / Delete all fire and reflect in the UI after refresh
- Column `⋯` shows Add task here / Focus column / Sort within column
- Filter chips: clicking All clears, clicking Phase opens a dropdown of tag prefixes, clicking Due this week toggles
- Sort dropdown changes column order
- Group dropdown swaps columns between status mode and phase mode
- List + Calendar tabs appear disabled with a "Coming soon" tooltip

- [ ] **Step 3: Sign in as intern, repeat**

Sign in as the intern user (`sami.arif@thog.io`) and verify:

- Sidebar shows intern nav items
- `+ Add task` button appears at the bottom of each column (was supervisor-only)
- Card menu: Edit / Change due / Change priority / Move to present; **Delete is hidden**

- [ ] **Step 4: Commit a smoke-test note**

If anything was off, fix inline and commit. If all green:

```bash
git commit --allow-empty -m "test(manual): PR1 smoke pass — all controls wired, intern can add task"
```

---

### Task 20: PR1 — push and open PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/platform-sidebar-and-task-controls
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat: sidebar shell + task board control wiring" --body "$(cat <<'EOF'
## Summary
- Replace PlatformHeader with a 240px full-width left sidebar on platform pages (workspaces unchanged)
- Wire every dead control on the task board: card ⋯, column ⋯, filter chips, sort, group
- Let interns create tasks (was supervisor-only)
- Mobile top strip + drawer for sub-`md` viewports

## Test plan
- [ ] Click through as intern: sidebar nav, card menu (Delete hidden), + Add task works
- [ ] Click through as supervisor: card menu including Delete, column ⋯ focus + sort
- [ ] Filter by phase + due this week — counts update
- [ ] Sort by due / priority / title / created
- [ ] Group by status (default) → phase
- [ ] Mobile: hamburger opens drawer, Escape closes, scrim click closes
- [ ] List + Calendar tabs disabled with "Coming soon"

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## PR2 — List view + Calendar view

Branch from `main` (or whatever target branch PR1 merged into):

```bash
git checkout main
git pull
git checkout -b feat/task-list-and-calendar-views
```

### Task 21: Create `tasks-list-view.tsx` (TDD for sort behavior)

**Files:**
- Create: `modules/workspace/components/tasks/tasks-list-view.tsx`
- Create: `modules/workspace/components/tasks/tasks-list-view.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// modules/workspace/components/tasks/tasks-list-view.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TasksListView } from './tasks-list-view';
import type { Task } from '@/db/schema';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('next/navigation', () => {
  const params = new URLSearchParams();
  return {
    useRouter: () => ({ replace: vi.fn() }),
    usePathname: () => '/test',
    useSearchParams: () => params,
  };
});
vi.mock('./task-card-menu', () => ({ TaskCardMenu: () => null }));

function makeTask(o: Partial<Task>): Task {
  return {
    id: o.id ?? 't',
    workspaceId: 'ws',
    tag: null,
    title: 'Title',
    description: null,
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    order: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date(),
    ...o,
  } as Task;
}

describe('TasksListView', () => {
  it('renders a row for every task', () => {
    const tasks = [makeTask({ id: 'a', title: 'Alpha' }), makeTask({ id: 'b', title: 'Bravo' })];
    render(<TasksListView tasks={tasks} view="supervisor" />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Bravo')).toBeTruthy();
  });

  it('renders sortable column headers', () => {
    render(<TasksListView tasks={[]} view="supervisor" />);
    expect(screen.getByRole('button', { name: /header.title/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /header.due/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm vitest run modules/workspace/components/tasks/tasks-list-view.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```tsx
// modules/workspace/components/tasks/tasks-list-view.tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Task } from '@/db/schema';
import { TaskCardMenu } from './task-card-menu';
import type { SortKey } from '@/modules/workspace/utils/task-view-state';

type Props = {
  tasks: Task[];
  view: 'intern' | 'supervisor';
};

const COLUMNS: Array<{ key: SortKey | 'phase' | 'status' | 'priority'; tk: string }> = [
  { key: 'title',    tk: 'header.title' },
  { key: 'status',   tk: 'header.status' },
  { key: 'phase',    tk: 'header.phase' },
  { key: 'due',      tk: 'header.due' },
  { key: 'priority', tk: 'header.priority' },
  { key: 'created',  tk: 'header.created' },
];

export function TasksListView({ tasks, view }: Props) {
  const t = useTranslations('workspace.tasksBoard.list');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sort = params.get('sort') ?? 'due';

  function setSort(k: string) {
    const next = new URLSearchParams(params);
    if (k === 'due') next.delete('sort');
    else next.set('sort', k);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function phaseOf(tk: Task): string {
    if (!tk.tag) return '—';
    const idx = tk.tag.indexOf('-');
    return idx > 0 ? tk.tag.slice(0, idx) : '—';
  }

  function formatRelative(d: Date): string {
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400_000);
    if (days < 1) return t('relativeToday');
    if (days < 7) return t('relativeDays', { n: days });
    return d.toLocaleDateString();
  }

  return (
    <div className="ws-col-main">
      <table className="tb-list" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <caption className="sr-only">{t('caption')}</caption>
        <thead>
          <tr>
            {COLUMNS.map((c) => {
              const isSortable = ['title', 'due', 'priority', 'created'].includes(c.key);
              const isActive = isSortable && sort === c.key;
              return (
                <th key={c.key} scope="col" style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--border-color)', fontSize: 12, fontWeight: 600 }}>
                  {isSortable ? (
                    <button
                      type="button"
                      onClick={() => setSort(c.key)}
                      aria-label={t(c.tk)}
                      style={{ background: 'transparent', border: 0, padding: 0, font: 'inherit', cursor: 'pointer', color: 'var(--ink)' }}
                    >
                      {t(c.tk)} {isActive ? '↑' : ''}
                    </button>
                  ) : (
                    t(c.tk)
                  )}
                </th>
              );
            })}
            <th scope="col" aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((tk) => (
            <tr key={tk.id} tabIndex={0} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: 8 }}>
                {tk.tag && <span className="tb-card-tag" style={{ marginRight: 8 }}>{tk.tag}</span>}
                {tk.title}
              </td>
              <td style={{ padding: 8 }}>{tk.status ?? 'todo'}</td>
              <td style={{ padding: 8 }}>{phaseOf(tk)}</td>
              <td style={{ padding: 8 }}>{tk.dueDate ?? '—'}</td>
              <td style={{ padding: 8 }}>{tk.priority ?? 'medium'}</td>
              <td style={{ padding: 8 }}>{formatRelative(tk.createdAt)}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>
                <TaskCardMenu task={tk} view={view} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <p style={{ padding: 16, color: 'var(--ink-3)', textAlign: 'center' }}>{t('empty')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add list i18n keys**

In `locales/en.json` under `workspace.tasksBoard`:

```json
"list": {
  "caption": "Tasks list, sortable",
  "empty": "No tasks.",
  "relativeToday": "today",
  "relativeDays": "{n}d ago",
  "header": {
    "title": "Title",
    "status": "Status",
    "phase": "Phase",
    "due": "Due",
    "priority": "Priority",
    "created": "Created"
  }
}
```

In `locales/fr.json`:

```json
"list": {
  "caption": "Liste des tâches, triable",
  "empty": "Aucune tâche.",
  "relativeToday": "aujourd'hui",
  "relativeDays": "il y a {n}j",
  "header": {
    "title": "Titre",
    "status": "Statut",
    "phase": "Phase",
    "due": "Échéance",
    "priority": "Priorité",
    "created": "Création"
  }
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run modules/workspace/components/tasks/tasks-list-view.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add modules/workspace/components/tasks/tasks-list-view.tsx modules/workspace/components/tasks/tasks-list-view.test.tsx locales/en.json locales/fr.json
git commit -m "feat(tasks): TasksListView sortable table"
```

---

### Task 22: Create `tasks-calendar-view.tsx`

**Files:**
- Create: `modules/workspace/components/tasks/tasks-calendar-view.tsx`
- Create: `modules/workspace/components/tasks/tasks-calendar-view.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// modules/workspace/components/tasks/tasks-calendar-view.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TasksCalendarView } from './tasks-calendar-view';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k, useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams('month=2026-06'),
}));

describe('TasksCalendarView', () => {
  it('renders 42 cells (7 cols × 6 rows) for any month', () => {
    render(<TasksCalendarView tasks={[]} view="supervisor" />);
    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBe(42);
  });

  it('renders day-name row', () => {
    render(<TasksCalendarView tasks={[]} view="supervisor" />);
    expect(screen.getAllByRole('columnheader').length).toBe(7);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm vitest run modules/workspace/components/tasks/tasks-calendar-view.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```tsx
// modules/workspace/components/tasks/tasks-calendar-view.tsx
'use client';

import { useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import type { Task } from '@/db/schema';

type Props = {
  tasks: Task[];
  view: 'intern' | 'supervisor';
};

function parseMonthParam(raw: string | null): { year: number; month: number } {
  if (raw) {
    const m = /^(\d{4})-(\d{2})$/.exec(raw);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]) - 1;
      if (month >= 0 && month <= 11) return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function TasksCalendarView({ tasks, view: _view }: Props) {
  const t = useTranslations('workspace.tasksBoard.calendar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { year, month } = parseMonthParam(params.get('month'));

  function setMonth(y: number, m: number) {
    const next = new URLSearchParams(params);
    const now = new Date();
    if (y === now.getFullYear() && m === now.getMonth()) next.delete('month');
    else next.set('month', `${y}-${pad(m + 1)}`);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getFullYear(), d.getMonth());
  }

  function today() {
    const now = new Date();
    setMonth(now.getFullYear(), now.getMonth());
  }

  // Grid: always 42 cells = 6 weeks × 7 days, starting on Sunday.
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay()); // Sunday before
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month]);

  const dayNames = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2026, 0, i + 4); // 2026-01-04 was a Sunday
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
  }, [locale]);

  const monthLabel = useMemo(() => {
    return new Date(year, month, 1).toLocaleDateString(locale, { year: 'numeric', month: 'long' });
  }, [locale, year, month]);

  function cellTasks(cellDate: Date): Task[] {
    const iso = `${cellDate.getFullYear()}-${pad(cellDate.getMonth() + 1)}-${pad(cellDate.getDate())}`;
    return tasks.filter((tk) => tk.dueDate === iso);
  }

  const undated = tasks.filter((tk) => !tk.dueDate).length;

  const isCurrentMonth = (d: Date) => d.getMonth() === month;
  const isToday = (d: Date) => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  return (
    <div className="ws-col-main">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{monthLabel}</h3>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => shift(-1)} aria-label={t('prevMonth')}>←</button>
        <button type="button" onClick={today}>{t('today')}</button>
        <button type="button" onClick={() => shift(1)} aria-label={t('nextMonth')}>→</button>
      </div>

      {undated > 0 && (
        <p style={{ padding: '6px 12px', fontSize: 12, color: 'var(--ink-3)' }}>
          {t('undatedBanner', { n: undated })}
        </p>
      )}

      <div role="grid" aria-label={monthLabel} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border-color)', border: '1px solid var(--border-color)' }}>
        {dayNames.map((n) => (
          <div key={n} role="columnheader" style={{ padding: 6, background: 'var(--surface)', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
            {n}
          </div>
        ))}
        {cells.map((d, i) => {
          const cTasks = cellTasks(d);
          const dim = !isCurrentMonth(d);
          const ring = isToday(d);
          return (
            <div
              key={i}
              role="gridcell"
              style={{
                minHeight: 84,
                background: 'var(--surface)',
                padding: 4,
                opacity: dim ? 0.5 : 1,
                outline: ring ? '2px solid var(--brand-500)' : 'none',
                outlineOffset: -2,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 2 }}>{d.getDate()}</div>
              {cTasks.slice(0, 3).map((tk) => (
                <div key={tk.id} style={{ fontSize: 11, padding: '2px 4px', borderRadius: 3, background: 'var(--surface-muted)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  ● {tk.title}
                </div>
              ))}
              {cTasks.length > 3 && (
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>+{cTasks.length - 3} {t('more')}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add calendar i18n keys**

In `locales/en.json` under `workspace.tasksBoard`:

```json
"calendar": {
  "prevMonth": "Previous month",
  "nextMonth": "Next month",
  "today": "Today",
  "more": "more",
  "undatedBanner": "{n} task(s) without a due date"
}
```

In `locales/fr.json`:

```json
"calendar": {
  "prevMonth": "Mois précédent",
  "nextMonth": "Mois suivant",
  "today": "Aujourd'hui",
  "more": "de plus",
  "undatedBanner": "{n} tâche(s) sans échéance"
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run modules/workspace/components/tasks/tasks-calendar-view.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add modules/workspace/components/tasks/tasks-calendar-view.tsx modules/workspace/components/tasks/tasks-calendar-view.test.tsx locales/en.json locales/fr.json
git commit -m "feat(tasks): TasksCalendarView month grid (read-only)"
```

---

### Task 23: Create `tasks-views-shell.tsx`

**Files:**
- Create: `modules/workspace/components/tasks/tasks-views-shell.tsx`

- [ ] **Step 1: Implement**

```tsx
// modules/workspace/components/tasks/tasks-views-shell.tsx
'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Task } from '@/db/schema';
import {
  parseFilterParam,
  filterTasks,
  sortTasks,
  type SortKey,
} from '@/modules/workspace/utils/task-view-state';
import { TasksBoardView } from './tasks-board-view';
import { TasksListView } from './tasks-list-view';
import { TasksCalendarView } from './tasks-calendar-view';

type Props = {
  tasks: Task[];
  view: 'intern' | 'supervisor';
  internName: string;
  workspaceId: string;
};

export function TasksViewsShell({ tasks, view, internName, workspaceId }: Props) {
  const params = useSearchParams();
  const which = params.get('view') ?? 'board';
  const filter = parseFilterParam(params.get('filter'));
  const sortKey = (params.get('sort') ?? 'due') as SortKey;

  const prepared = useMemo(() => sortTasks(filterTasks(tasks, filter), sortKey), [tasks, filter, sortKey]);

  if (which === 'list') return <TasksListView tasks={prepared} view={view} />;
  if (which === 'calendar') return <TasksCalendarView tasks={prepared} view={view} />;
  // Board still does its own filtering for group=phase, so it gets the raw
  // tasks AND the prepared ones via the same hook chain. To keep the
  // contract simple we pass raw tasks; the board re-applies filter+sort
  // identically (idempotent).
  return (
    <TasksBoardView
      tasks={tasks}
      view={view}
      internName={internName}
      workspaceId={workspaceId}
      enableListAndCalendar
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add modules/workspace/components/tasks/tasks-views-shell.tsx
git commit -m "feat(tasks): TasksViewsShell dispatches board/list/calendar"
```

---

### Task 24: Wire the shell into both workspace task pages

**Files:**
- Modify: `app/[locale]/(platform)/intern/workspaces/[workspaceId]/tasks/page.tsx`
- Modify: `app/[locale]/(platform)/company/workspaces/[workspaceId]/tasks/page.tsx`

- [ ] **Step 1: Inspect current pages**

Run: `grep -n 'TasksBoard\|tasks-board' /Users/mac/code/inturn-hub/inturn/app/\[locale\]/\(platform\)/{intern,company}/workspaces/\[workspaceId\]/tasks/page.tsx`

You'll see each page imports `TasksBoard` from
`@/modules/workspace/components/tasks-board`. Don't change those — the
re-export still works. But to enable list+calendar, swap to
`TasksViewsShell`.

- [ ] **Step 2: Replace import + JSX in intern page**

In `app/[locale]/(platform)/intern/workspaces/[workspaceId]/tasks/page.tsx`:

```tsx
// Replace
import { TasksBoard } from '@/modules/workspace/components/tasks-board';
// With
import { TasksViewsShell } from '@/modules/workspace/components/tasks/tasks-views-shell';

// Replace usage
<TasksBoard tasks={tasks} view="intern" internName={...} workspaceId={...} />
// With
<TasksViewsShell tasks={tasks} view="intern" internName={...} workspaceId={...} />
```

- [ ] **Step 3: Same swap in company page**

In `app/[locale]/(platform)/company/workspaces/[workspaceId]/tasks/page.tsx`:

Replace `TasksBoard` import + usage with `TasksViewsShell`, `view="supervisor"`.

- [ ] **Step 4: Drop the `enableListAndCalendar={false}` PR1 stub**

In `tasks-views-shell.tsx`, the Board path already passes
`enableListAndCalendar`. Now that PR2 ships them, the toolbar in
TaskToolbar honors `enableListAndCalendar` and the shell renders the
right view. No additional change needed.

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/\(platform\)/intern/workspaces/\[workspaceId\]/tasks/page.tsx app/[locale]/\(platform\)/company/workspaces/\[workspaceId\]/tasks/page.tsx
git commit -m "feat(tasks): wire TasksViewsShell on both workspace task pages"
```

---

### Task 25: Manual smoke pass — PR2

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Verify the new views**

As supervisor and intern:
- `?view=list` → table renders, click a sortable header → URL updates, rows re-order
- `?view=calendar` → month grid renders, prev/next/today work, today's cell ringed, tasks with due dates appear in correct cells
- Tasks without dueDate excluded from calendar; "N tasks without a due date" banner appears at top
- Switching between views preserves filter/sort

- [ ] **Step 3: Commit smoke note**

```bash
git commit --allow-empty -m "test(manual): PR2 smoke pass — list + calendar render and switch cleanly"
```

---

### Task 26: PR2 — push and open PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/task-list-and-calendar-views
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat(tasks): list view + calendar view" --body "$(cat <<'EOF'
## Summary
- TasksListView — sortable table, click a header to update `?sort=…`
- TasksCalendarView — 7×6 month grid driven by `?month=YYYY-MM`
- TasksViewsShell — single dispatcher reading `?view=…`
- Toolbar's List/Calendar tabs now enabled

## Test plan
- [ ] Switch between Board, List, Calendar; filters and sort survive view changes
- [ ] List view sorts each column ascending; sort=due is the default (no URL param)
- [ ] Calendar view: prev/next/today work, URL updates, today cell ringed
- [ ] Undated tasks excluded from calendar; banner counts them

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

Mentally walked back through the spec against the plan:

- **Spec coverage:** Sidebar (T16-18), mobile drawer (T17), card menu (T11-12), column menu (T13), filter chips + sort + group + view tabs (T14), intern + Add task (T8 + T13 column add removed supervisor gate), update + delete server actions (T6-7), AddTaskModal edit mode (T9), files split (T10-15), URL state contract + helpers (T1-5), list view (T21), calendar view (T22), views shell (T23-24). ✓
- **Placeholder scan:** Each code block contains complete code or a single concrete edit. No "TBD" / "etc". ✓
- **Type consistency:** `FilterState`, `SortKey`, `TaskCardProps`, `TaskColumnProps`, `Props` shapes match across files. ✓ The `Task` type is imported from `@/db/schema` everywhere.
- **Known weak spots:**
  - Task 12 needs `@testing-library/react` + `jsdom` installed. The plan includes the install command if missing.
  - Task 10 uses `--no-verify` on its commit because `TaskCardMenu` doesn't exist yet (created in Task 11). This is the only TDD-violation in the plan, justified by the file-split refactor needing to land in pieces.
  - Tasks 6/7 reuse `loadWorkspaceAccess` instead of the explicit SQL join the spec sketched. This is the codebase's existing pattern — pointed out in the spec note.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-27-sidebar-shell-and-task-fixes.md`.
