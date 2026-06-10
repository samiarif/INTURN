# Audit Quick-Wins Fix Sprint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the verified correctness/security/UX bugs found by the 2026-06-10 full-repo audit, in small reviewable commits, without touching the design direction (that's the separate Atelier plan).

**Architecture:** All changes are point-fixes inside the existing module convention. Two tiny new `lib/` helpers (`public-routes.ts`, `after-response.ts`) make previously untestable proxy/serverless behavior unit-testable. No new dependencies; two dead dependencies removed.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before using an unfamiliar API), TypeScript strict, Vitest 4 (+ jsdom/@testing-library for component tests), next-intl 4, Tailwind v4.

**Branch:** `fix/audit-quick-wins` off `main` (`ea20dc6`). One commit per task, Conventional Commits, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

**Verify loop (every task):** the named test command, then before each commit: `pnpm typecheck && pnpm lint`. Final task runs the full gate including build + i18n parity.

**Known context:**
- Dev server may already be running on :3000 (`pnpm dev`); `/dev/login` impersonates seeded personas (DEV_AUTH_BYPASS).
- `vitest.config.ts` currently does NOT include tests under `app/` — Task 1 fixes the include list; later tasks rely on it.
- FR is the default locale (`localePrefix: 'as-needed'`): FR routes unprefixed, EN under `/en`.

---

### Task 1: Clerk webhook — verify the raw request body, not a JSON round-trip

**Files:**
- Modify: `app/api/webhooks/clerk/route.ts:33-34`
- Create: `app/api/webhooks/clerk/route.test.ts`
- Modify: `vitest.config.ts:13` (include pattern)
- Delete: `modules/auth/__tests__/webhook.test.ts` (self-asserting placeholder: it mocks `recordEvent` and asserts the mock received what the test itself passed; never imports the route)

**Why:** svix HMACs the exact raw bytes Clerk sent. `JSON.stringify(await req.json())` re-serializes — `1.0`→`1`, `é`→`é`, key-order changes — so legitimate webhooks can fail verification and silently break user sync.

- [ ] **Step 1: Make vitest see tests under `app/`**

In `vitest.config.ts` change the include line to:

```ts
    include: [
      '**/__tests__/**/*.test.ts',
      '**/utils/**/*.test.ts',
      '**/components/**/*.test.tsx',
      'app/**/*.test.{ts,tsx}',
    ],
```

- [ ] **Step 2: Write the failing test**

Create `app/api/webhooks/clerk/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifySpy = vi.fn();
vi.mock('svix', () => ({
  Webhook: class {
    constructor(public secret: string) {}
    verify(payload: string, h: Record<string, string>) {
      return verifySpy(payload, h);
    }
  },
}));
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ users: {} }));
vi.mock('@/modules/events/service', () => ({ recordEvent: vi.fn() }));
vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers({
      'svix-id': 'msg_1',
      'svix-timestamp': '1700000000',
      'svix-signature': 'v1,sig',
      'x-forwarded-for': '1.2.3.4',
    }),
}));

import { POST } from './route';

describe('clerk webhook signature payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test';
  });

  it('passes the exact raw body bytes to svix verify (no JSON round-trip)', async () => {
    // float 1.0, \u-escaped non-ASCII, and key order are all destroyed by
    // JSON.parse → JSON.stringify; the HMAC is over the raw bytes.
    const raw =
      '{"type":"user.unknown","data":{"weight":1.0,"name":"caf\\u00e9","b":1,"a":2}}';
    verifySpy.mockImplementation((payload: string) => JSON.parse(payload));
    const res = await POST(
      new Request('http://localhost/api/webhooks/clerk', { method: 'POST', body: raw }),
    );
    expect(verifySpy).toHaveBeenCalledTimes(1);
    expect(verifySpy.mock.calls[0][0]).toBe(raw);
    expect(res.status).toBe(200); // unknown type falls through the switch to 200 OK
  });

  it('returns 400 when signature verification throws', async () => {
    verifySpy.mockImplementation(() => {
      throw new Error('bad sig');
    });
    const res = await POST(
      new Request('http://localhost/api/webhooks/clerk', { method: 'POST', body: '{}' }),
    );
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run it — expect RED on the first test**

Run: `pnpm vitest run app/api/webhooks/clerk/route.test.ts`
Expected: first test FAILS (`expected '{"type":"user.unknown","data":{"weight":1,…' to be '…"weight":1.0,…'`), second passes.

- [ ] **Step 4: Fix the route**

In `app/api/webhooks/clerk/route.ts` replace lines 33-34:

```ts
  const payload = await req.json();
  const body = JSON.stringify(payload);
```

with:

```ts
  // svix signs the exact raw bytes — verify the body verbatim, never a
  // JSON.parse → stringify round-trip (re-serialization is not byte-stable:
  // 1.0 → 1, \u-escapes, key order). Parse only AFTER verification.
  const body = await req.text();
```

- [ ] **Step 5: Run tests — expect GREEN**

Run: `pnpm vitest run app/api/webhooks/clerk/route.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Delete the placeholder test, run the full unit suite**

```bash
rm modules/auth/__tests__/webhook.test.ts
pnpm vitest run
```
Expected: all pass (count drops by the 3 deleted self-asserting tests, gains 2 real ones).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts app/api/webhooks/clerk/route.ts app/api/webhooks/clerk/route.test.ts
git rm modules/auth/__tests__/webhook.test.ts
git commit -m "fix(webhooks): verify the raw Clerk payload bytes, not a JSON round-trip

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Make the legal pages public (privacy / terms / cookies)

**Files:**
- Create: `lib/public-routes.ts`
- Create: `lib/__tests__/public-routes.test.ts`
- Modify: `proxy.ts:8-26`

**Why:** the proxy allowlist omits the legal pages, so signed-out visitors and crawlers get bounced to sign-in — while `app/sitemap.ts` advertises those URLs and the cookie banner links to them.

- [ ] **Step 1: Extract the allowlist to a testable module**

Create `lib/public-routes.ts` with the EXACT current pattern list from `proxy.ts:8-26` plus the three legal routes:

```ts
/**
 * Route patterns that must be reachable WITHOUT a session.
 * Consumed by proxy.ts (clerkMiddleware) and unit-tested in
 * lib/__tests__/public-routes.test.ts so compliance pages can never
 * silently fall behind the auth wall again.
 */
export const PUBLIC_ROUTE_PATTERNS = [
  '/',
  '/(fr|en)',
  '/(fr|en)?/sign-in(.*)',
  '/(fr|en)?/sign-up(.*)',
  '/(fr|en)?/dev/login(.*)',
  '/(fr|en)?/marketplace(.*)',
  // Internship detail is public; /apply sits under it and is gated separately
  // by the page (requires complete intern profile).
  '/(fr|en)?/internships/([^/]+)',
  // Public read-only record + deliverable share links. The token IS the
  // credential — the page itself looks up by token and 404s on miss. Scoped
  // to a single path segment ([^/]+) so we don't accidentally open anything
  // nested underneath.
  '/(fr|en)?/records/([^/]+)',
  '/(fr|en)?/deliverables/([^/]+)',
  // Legal/compliance pages — linked from the cookie banner and footer,
  // advertised in sitemap.xml; crawlers and signed-out users must see them.
  '/(fr|en)?/privacy',
  '/(fr|en)?/terms',
  '/(fr|en)?/cookies',
  '/api/webhooks(.*)',
  '/api/health',
];
```

- [ ] **Step 2: Point proxy.ts at it**

In `proxy.ts`, replace the inline array:

```ts
const isPublicRoute = createRouteMatcher([ /* …current list… */ ]);
```

with:

```ts
import { PUBLIC_ROUTE_PATTERNS } from '@/lib/public-routes';

const isPublicRoute = createRouteMatcher(PUBLIC_ROUTE_PATTERNS);
```

(keep the import grouped with the other `@/` imports at the top; delete the now-unused inline list and its comments — they moved into `lib/public-routes.ts`).

- [ ] **Step 3: Write the test**

Create `lib/__tests__/public-routes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { PUBLIC_ROUTE_PATTERNS } from '@/lib/public-routes';

const matcher = createRouteMatcher(PUBLIC_ROUTE_PATTERNS);
const req = (path: string) => new NextRequest(`http://localhost${path}`);

describe('public route allowlist', () => {
  it.each(['/privacy', '/terms', '/cookies', '/fr/privacy', '/en/terms', '/en/cookies'])(
    'legal page %s is public',
    (p) => expect(matcher(req(p))).toBe(true),
  );
  it.each([
    '/',
    '/fr',
    '/marketplace',
    '/fr/marketplace',
    '/internships/abc-123',
    '/records/tok123',
    '/deliverables/tok456',
    '/api/health',
  ])('existing public route %s stays public', (p) => expect(matcher(req(p))).toBe(true));
  it.each(['/intern/dashboard', '/fr/company/projects', '/admin/users', '/api/upload', '/records/a/b'])(
    'protected route %s is NOT public',
    (p) => expect(matcher(req(p))).toBe(false),
  );
});
```

- [ ] **Step 4: Run it**

Run: `pnpm vitest run lib/__tests__/public-routes.test.ts`
Expected: all pass. (If importing `@clerk/nextjs/server` fails in the node env, wrap the matcher build in the test using `path-to-regexp` — but try Clerk first; `createRouteMatcher` is runtime-free.)

- [ ] **Step 5: Commit**

```bash
git add lib/public-routes.ts lib/__tests__/public-routes.test.ts proxy.ts
git commit -m "fix(proxy): legal pages (privacy/terms/cookies) reachable signed-out

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: SprintsSection — adopt fresh server data + surface action errors

**Files:**
- Modify: `app/[locale]/(platform)/company/projects/[projectId]/_sprints-section.tsx` (~lines 455, 472-477, 585-596, error banner after header)
- Create: `app/[locale]/(platform)/company/projects/[projectId]/_sprints-section.test.tsx`
- Modify: `locales/fr.json`, `locales/en.json` (`sprints.actionError`)

**Why:** `useState(initialSprints)` never re-syncs — `router.refresh()` re-renders the RSC but React preserves client state, so create/rename/delete/AI-accept appear to do nothing until hard navigation. And `mutate()` has no error handling at all.

- [ ] **Step 1: Write the failing test**

Create `_sprints-section.test.tsx` next to the component:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SprintsSection } from './_sprints-section';
import type { ProjectSprint } from '@/db/schema';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/modules/sprints/server-actions', () => ({
  createSprintAction: vi.fn(async () => {
    throw new Error('forbidden');
  }),
  updateSprintAction: vi.fn(async () => ({})),
  deleteSprintAction: vi.fn(async () => ({})),
  reorderSprintsAction: vi.fn(async () => ({})),
  setSprintTasksAction: vi.fn(async () => ({})),
  applySprintPlanAction: vi.fn(async () => ({})),
}));

function sprint(id: string, name: string, orderIndex: number): ProjectSprint {
  return {
    id,
    projectId: 'p1',
    name,
    goal: null,
    orderIndex,
    startDate: null,
    endDate: null,
    taskBlueprint: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as ProjectSprint;
}

describe('SprintsSection', () => {
  it('adopts a fresh sprints prop after router.refresh (server is source of truth)', () => {
    const { rerender } = render(
      <SprintsSection projectId="p1" projectName="P" sprints={[sprint('s1', 'Sprint One', 0)]} />,
    );
    expect(screen.getByText('Sprint One')).toBeTruthy();
    expect(screen.queryByText('Sprint Two')).toBeNull();
    rerender(
      <SprintsSection
        projectId="p1"
        projectName="P"
        sprints={[sprint('s1', 'Sprint One', 0), sprint('s2', 'Sprint Two', 1)]}
      />,
    );
    expect(screen.getByText('Sprint Two')).toBeTruthy();
  });

  it('surfaces an error banner when a sprint action rejects', async () => {
    render(<SprintsSection projectId="p1" projectName="P" sprints={[]} />);
    fireEvent.click(screen.getByText('addSprint'));
    fireEvent.change(screen.getByPlaceholderText('sprintNamePlaceholder'), {
      target: { value: 'X' },
    });
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(screen.getByText('actionError')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run it — expect RED**

Run: `pnpm vitest run "app/[locale]/(platform)/company/projects/[projectId]/_sprints-section.test.tsx"`
Expected: test 1 FAILS (`Sprint Two` not found — stale state), test 2 FAILS (`actionError` never rendered).

- [ ] **Step 3: Implement the resync + error surface**

In `_sprints-section.tsx`:

(a) directly under `const [sprints, setSprints] = useState<ProjectSprint[]>(initialSprints);` (line ~455) add:

```tsx
  // Keep the local list in sync with the server: router.refresh() re-renders
  // the RSC tree and passes a fresh `sprints` prop, but React preserves
  // client-component state across refresh — adopt the new prop when it changes
  // (the official "adjusting state when a prop changes" render-phase pattern).
  const [prevInitial, setPrevInitial] = useState(initialSprints);
  if (prevInitial !== initialSprints) {
    setPrevInitial(initialSprints);
    setSprints(initialSprints);
  }

  const [actionError, setActionError] = useState<string | null>(null);
```

(b) replace `mutate` (lines ~472-477):

```tsx
  function mutate(action: () => Promise<unknown>) {
    setActionError(null);
    startTransition(async () => {
      try {
        await action();
      } catch {
        setActionError(t('actionError'));
      } finally {
        // Always refresh: success pulls the fresh list; failure restores the
        // authoritative order after an optimistic move.
        router.refresh();
      }
    });
  }
```

(c) DELETE the misleading stale comment block (lines ~589-594, the one claiming "we keep local state in sync when prop changes") — the real code now exists in (a).

(d) render the banner directly after the `{/* Header */}` div closes (before the AI-plan-error block), mirroring its styling:

```tsx
      {/* Action error (CRUD/reorder failures) */}
      {actionError && (
        <div className="flex items-center gap-2 text-caption text-[var(--danger)] mb-3 px-3 py-2 rounded border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_6%,transparent)]">
          {actionError}
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="ml-auto text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <X size={13} />
          </button>
        </div>
      )}
```

- [ ] **Step 4: Add the i18n key (both locales, keep alphabetical-ish placement near the other keys in the `sprints` namespace)**

`locales/fr.json` → `"sprints": { …, "actionError": "Action impossible pour le moment. Réessayez." }`
`locales/en.json` → `"sprints": { …, "actionError": "That didn't go through. Try again." }`

- [ ] **Step 5: Run the test — expect GREEN — then parity**

Run: `pnpm vitest run "app/[locale]/(platform)/company/projects/[projectId]/_sprints-section.test.tsx" && pnpm check:i18n`
Expected: 2 passed; locale parity OK.

- [ ] **Step 6: Browser-verify** (dev server, `/dev/login` → company persona → a project → Sprints): create a sprint → it appears immediately; rename → updates immediately; delete → disappears.

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/(platform)/company/projects/[projectId]/_sprints-section.tsx" "app/[locale]/(platform)/company/projects/[projectId]/_sprints-section.test.tsx" locales/fr.json locales/en.json
git commit -m "fix(sprints): adopt refreshed server data + surface action errors in SprintsSection

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Kanban board — useOptimistic instead of a leaky manual map

**Files:**
- Modify: `modules/workspace/components/tasks/tasks-board-view.tsx` (~lines 80, 105-107, onDragEnd ~130-148)

**Why:** the manual `optimistic` map is deleted only on FAILURE; on success the entry pins the rendered column forever, silently overriding any later server-side status change, and entries accumulate for the whole session.

- [ ] **Step 1: Swap the state for useOptimistic**

(a) add `useOptimistic` to the React import.
(b) replace `const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({});` with:

```tsx
  // Optimistic column overrides during a drag transition. useOptimistic
  // auto-reverts to the server truth when the transition (which includes
  // router.refresh()) settles — no manual cleanup, no permanent override.
  const [optimistic, addOptimistic] = useOptimistic<
    Record<string, TaskStatus>,
    { taskId: string; to: TaskStatus }
  >({}, (state, { taskId, to }) => ({ ...state, [taskId]: to }));
```

(c) in `onDragEnd`, replace:

```tsx
    setOptimistic((m) => ({ ...m, [taskId]: toStatus }));
    startTransition(async () => {
      try {
        await moveTaskAction({ taskId, to: toStatus });
        router.refresh();
      } catch {
        setOptimistic((m) => { const next = { ...m }; delete next[taskId]; return next; });
      }
    });
```

with:

```tsx
    startTransition(async () => {
      addOptimistic({ taskId, to: toStatus });
      try {
        await moveTaskAction({ taskId, to: toStatus });
        router.refresh();
      } catch {
        // useOptimistic reverts to the server status when the transition settles.
      }
    });
```

`statusOf` stays unchanged (it already reads `optimistic[task.id] ?? task.status`).

- [ ] **Step 2: Typecheck + existing board tests**

Run: `pnpm typecheck && pnpm vitest run modules/workspace/components/tasks`
Expected: clean; existing tasks tests pass.

- [ ] **Step 3: Browser-verify** (intern persona → workspace → Tâches): drag a card between columns → it stays after the refresh settles; drag with dev server briefly killed → card snaps back (auto-revert), restart server.

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/components/tasks/tasks-board-view.tsx
git commit -m "fix(tasks): drag-status via useOptimistic — no permanent client-side override

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Check-in default time — local wall-clock, client-computed

**Files:**
- Modify: `lib/format-time.ts` (append two helpers)
- Modify: `lib/__tests__/format-time.test.ts` (append tests)
- Modify: `modules/workspace/components/schedule-check-in.tsx:19-27,41` (+ submit guard)

**Why:** `toISOString()` converts to UTC, so Tunisia (UTC+1) gets 13:00 prefilled instead of 14:00; and the inline `useState(defaultDate())` initializer is computed on the server with the server's clock/zone — a hydration hazard.

- [ ] **Step 1: Write failing tests** — append to `lib/__tests__/format-time.test.ts`:

```ts
import { toDatetimeLocalValue, nextWeekdayAt } from '@/lib/format-time'; // merge into the existing import

describe('toDatetimeLocalValue', () => {
  it('formats local wall-clock time without UTC shift', () => {
    const d = new Date(2026, 5, 12, 14, 0); // 12 June 2026, 14:00 LOCAL
    expect(toDatetimeLocalValue(d)).toBe('2026-06-12T14:00');
  });
});

describe('nextWeekdayAt', () => {
  it('returns next Friday 14:00 from a Wednesday', () => {
    const wed = new Date(2026, 5, 10, 9, 0); // Wed 10 June 2026
    expect(toDatetimeLocalValue(nextWeekdayAt(wed, 5, 14))).toBe('2026-06-12T14:00');
  });
  it('rolls a full week when already on that weekday', () => {
    const fri = new Date(2026, 5, 12, 16, 0);
    expect(toDatetimeLocalValue(nextWeekdayAt(fri, 5, 14))).toBe('2026-06-19T14:00');
  });
});
```

Run: `pnpm vitest run lib/__tests__/format-time.test.ts` → FAIL (helpers don't exist).

- [ ] **Step 2: Implement** — append to `lib/format-time.ts`:

```ts
/**
 * Format a Date as a `datetime-local` input value (YYYY-MM-DDTHH:mm) in the
 * user's LOCAL timezone. `toISOString().slice(0,16)` is wrong for this — it
 * converts to UTC, shifting the wall-clock (Tunisia is UTC+1: 14:00 → 13:00).
 */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Next occurrence of `weekday` (0=Sun…6=Sat) at `hour`:00 local, strictly in the future. */
export function nextWeekdayAt(now: Date, weekday: number, hour: number): Date {
  const d = new Date(now);
  const days = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}
```

Run: `pnpm vitest run lib/__tests__/format-time.test.ts` → PASS.

- [ ] **Step 3: Rewire the component** — in `schedule-check-in.tsx`:

(a) delete the local `defaultDate()` function (lines 19-27);
(b) add to imports: `useEffect` from react, and `import { nextWeekdayAt, toDatetimeLocalValue } from '@/lib/format-time';`
(c) replace `const [scheduledAt, setScheduledAt] = useState(defaultDate());` with:

```tsx
  const [scheduledAt, setScheduledAt] = useState('');
  // Compute the default on the CLIENT after mount: the inline initializer ran
  // during SSR with the server's clock/timezone (hydration hazard + UTC shift).
  useEffect(() => {
    setScheduledAt((v) => v || toDatetimeLocalValue(nextWeekdayAt(new Date(), 5, 14)));
  }, []);
```

(d) guard `submit()` — first line: `if (!scheduledAt) return;`

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm vitest run lib/__tests__/format-time.test.ts`
Browser: workspace → "Point hebdomadaire" → the datetime field shows next Friday **14:00**.

- [ ] **Step 5: Commit**

```bash
git add lib/format-time.ts lib/__tests__/format-time.test.ts modules/workspace/components/schedule-check-in.tsx
git commit -m "fix(checkins): default slot is local 14:00 (was UTC-shifted) and client-computed

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Notification/analytics dispatch survives serverless response-freeze

**Files:**
- Create: `lib/after-response.ts`
- Create: `lib/__tests__/after-response.test.ts`
- Modify: `modules/events/service.ts:19-27`
- Modify: `modules/applications/server-actions.ts:82-91`

**Why:** `void promise` lets Vercel freeze the lambda the moment the response is sent — dropping in-app notifications and Resend emails. Next 16's `after()` (see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`) keeps the function alive; but it throws outside a request scope (unit tests, `scripts/seed.ts`), so we need a guarded wrapper.

- [ ] **Step 1: Failing test** — create `lib/__tests__/after-response.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const afterMock = vi.fn();
vi.mock('next/server', () => ({ after: (cb: () => Promise<unknown>) => afterMock(cb) }));

import { afterResponse } from '@/lib/after-response';

describe('afterResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defers work through next/server after() in a request scope', () => {
    const work = vi.fn(async () => {});
    afterResponse(work);
    expect(afterMock).toHaveBeenCalledWith(work);
    expect(work).not.toHaveBeenCalled();
  });

  it('falls back to firing the work directly when after() throws (tests/scripts)', () => {
    afterMock.mockImplementation(() => {
      throw new Error('outside request scope');
    });
    const work = vi.fn(async () => {});
    afterResponse(work);
    expect(work).toHaveBeenCalledTimes(1);
  });
});
```

Run: `pnpm vitest run lib/__tests__/after-response.test.ts` → FAIL (module missing).

- [ ] **Step 2: Implement** — create `lib/after-response.ts`:

```ts
import { after } from 'next/server';

/**
 * Run side-effect work after the HTTP response is sent. On Vercel a bare
 * floating promise can be frozen mid-flight the moment the response streams
 * out — `after()` keeps the function alive until the callback settles.
 * Outside a request scope (unit tests, seed/maintenance scripts) `after()`
 * throws synchronously; fall back to firing the promise directly so callers
 * behave identically everywhere.
 */
export function afterResponse(work: () => Promise<unknown>): void {
  try {
    after(work);
  } catch {
    void work();
  }
}
```

Run: `pnpm vitest run lib/__tests__/after-response.test.ts` → PASS.

- [ ] **Step 3: Adopt it** —

`modules/events/service.ts`: add `import { afterResponse } from '@/lib/after-response';` and replace the `void dispatchNotificationsFor({...});` call (keeping its argument object verbatim) with:

```ts
  // Notifications must not block or fail the originating action, but they
  // must also survive the response being sent (serverless freeze) — so they
  // run via after() instead of a bare floating promise.
  afterResponse(() =>
    dispatchNotificationsFor({
      type: event.type,
      actorId: event.actorId,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: (event.metadata as Record<string, unknown> | null) ?? null,
    }),
  );
```

`modules/applications/server-actions.ts` (lines ~82-91): replace `void (async () => { … })();` with:

```ts
  // Fire-and-forget analytics — deferred past the response, not awaited.
  afterResponse(async () => {
    const { trackServer } = await import('@/lib/analytics');
    await trackServer(user.id, {
      name: 'application_submitted',
      props: {
        internshipId,
        hasCustomAnswers: (parsed.customAnswers?.length ?? 0) > 0,
      },
    });
  });
```

(+ the import at the top.)

- [ ] **Step 4: Full unit suite** (dispatcher/service tests exercise recordEvent through the fallback path):

Run: `pnpm vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add lib/after-response.ts lib/__tests__/after-response.test.ts modules/events/service.ts modules/applications/server-actions.ts
git commit -m "fix(events): dispatch notifications/analytics via next/server after() so serverless can't drop them

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: workspace.css — stop forking global tokens (restores workspace dark mode, ink contrast, real Geist Mono)

**Files:**
- Modify: `modules/workspace/workspace.css:11-55` (+ a global font literal sweep across the file)

**Why (3 bugs, 1 root cause):** the `.ws` scope re-declares global token NAMES with stale light-only hex → (1) the entire workspace ignores `.dark` (light workspace inside dark chrome), (2) it kept the washed-gray ink ramp Sam explicitly fixed on 2026-05-28, (3) `font-family: 'Geist Mono'` literals reference a name next/font never registers → OS fallback mono everywhere in the workspace.

**Scope guard:** keep the `.ws` radius fork (4/6/8/12) — radius unification belongs to the Atelier token plan, not this fix sprint. Delete only color/shadow/font forks.

- [ ] **Step 1: Replace the token block.** In `modules/workspace/workspace.css`, the `.ws {` rule currently declares (lines 11-44): `--bg, --surface, --surface-muted, --border, --border-strong, --ink, --ink-2, --ink-3, --ink-4, --brand, --brand-50, --brand-100, --brand-600, --accent, --accent-50, --success, --warning, --danger, --info`, a radius scale, `--shadow-xs/sm/md`, and a `font-family: 'Geist', …` line. Replace the rule's opening section with:

```css
.ws {
  /* Tokens inherit from app/globals.css (:root + .dark). The old local copies
   * forked the palette — stale ink ramp, light-only hex (no dark mode), and
   * off-spec brand tints. Only aliases with no global equivalent stay, bound
   * to the global tokens so theme changes propagate. */
  --border: var(--border-color);
  --brand: var(--brand-500);
  --accent: var(--accent-500);

  /* Workspace keeps its denser radius scale for now — unifying radii is the
   * Atelier token pass's job, not this fix sprint's. */
  --radius-sm: 4px;
  --radius: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  font-family: var(--font-sans);
  font-feature-settings: 'cv11', 'ss03';
  background: var(--bg);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.5;
  width: 100%; height: 100%;
  overflow: hidden;
  display: flex; flex-direction: column;
  position: relative;
}
```

(i.e. delete every other custom-property line and the `--shadow-*` triple — `grep -c "var(--shadow" modules/workspace/workspace.css` is 0, they had no consumers in this file, and the global `--shadow-*` values are identical strings.)

- [ ] **Step 2: Sweep the font literals**

```bash
grep -c "Geist Mono" modules/workspace/workspace.css   # expect 41 before
sed -i '' "s/'Geist Mono', ui-monospace, monospace/var(--font-mono)/g; s/'Geist Mono', monospace/var(--font-mono)/g" modules/workspace/workspace.css
grep -n "Geist" modules/workspace/workspace.css        # expect ZERO hits after
```

If the second grep still shows hits (other fallback-stack variants), replace those `font-family` values with `var(--font-mono)` by hand.

- [ ] **Step 3: Verify in the browser** (this is a CSS-only change — no unit tests):
  1. `/dev/login` → intern persona → workspace.
  2. Light mode: layout identical; meta text slightly darker (the global ink ramp finally reaching the workspace — intended); mono labels now render in Geist Mono (DevTools → computed `font-family` on a `.ws .mono` element resolves through `--font-mono`).
  3. Toggle dark mode (sidebar moon button): the workspace now follows — dark surfaces, readable ink. Screenshot both for the PR/handoff.
  4. Check the tasks board (`?tab=tasks`) and deliverables tab in dark mode too (`.tb-*`/`.dv-*` share the same tokens).

- [ ] **Step 4: Commit**

```bash
git add modules/workspace/workspace.css
git commit -m "fix(workspace): inherit global tokens — dark mode works, ink contrast unforked, Geist Mono actually loads

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Branded 404 (replace the raw Next default)

**Files:**
- Create: `app/[locale]/not-found.tsx`
- Create: `app/[locale]/[...rest]/page.tsx`
- Modify: `locales/fr.json`, `locales/en.json` (`notFound` namespace)

**Why:** unmatched URLs render Next's unstyled default 404. Convention (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`): `not-found.tsx` renders when `notFound()` is thrown in the segment; a `[...rest]` catch-all page makes unmatched URLs inside `[locale]` throw it. (`global-not-found.js` is experimental — skip.)

- [ ] **Step 1: Locale keys**

`locales/fr.json`:
```json
"notFound": {
  "title": "Page introuvable",
  "description": "Cette page n'existe pas ou a été déplacée.",
  "home": "Retour à l'accueil"
}
```
`locales/en.json`:
```json
"notFound": {
  "title": "Page not found",
  "description": "This page doesn't exist or has moved.",
  "home": "Back to home"
}
```

- [ ] **Step 2: The page** — create `app/[locale]/not-found.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GradientStar } from '@/components/brand/gradient-star';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <GradientStar size="lg" />
      <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-[var(--ink-3)]">404</p>
      <h1 className="text-display text-[var(--ink)]">{t('title')}</h1>
      <p className="text-body text-[var(--ink-2)] max-w-md">{t('description')}</p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-md bg-[var(--ink)] px-4 py-2 text-label text-white hover:opacity-90"
      >
        {t('home')}
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: The catch-all** — create `app/[locale]/[...rest]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';

// Any URL inside [locale] that no real route matched lands here and renders
// app/[locale]/not-found.tsx (instead of Next's unstyled default 404).
export default function CatchAllNotFound() {
  notFound();
}
```

- [ ] **Step 4: Verify**

```bash
pnpm check:i18n && pnpm typecheck
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/fr/definitely-not-a-page   # expect 404
```
Browser: visit `/fr/definitely-not-a-page` → branded 404 with the mark, FR copy, working home link. Also spot-check that a REAL route still works (`/fr/marketplace`) — the catch-all must not shadow anything.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/not-found.tsx" "app/[locale]/[...rest]/page.tsx" locales/fr.json locales/en.json
git commit -m "feat(app): branded localized 404 via [locale] catch-all + not-found

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Delete stale revalidatePath targets (routes that no longer exist)

**Files:**
- Modify: `modules/tasks/server-actions.ts` (lines 26-27, 75-76, 112-113, 138-139)
- Modify: `modules/comments/server-actions.ts` (lines 10-15)

**Why:** workspace tabs became `?tab=` query params — the `/…/workspaces/{id}/tasks|comments|deliverables` subroutes these lines revalidate don't exist; the surviving base-path lines already cover the page. (The separate locale-prefix blindness of `revalidatePath` across the codebase is a known, deferred, systemic issue — do NOT attempt it here.)

- [ ] **Step 1:** In `modules/tasks/server-actions.ts` delete the four pairs of lines revalidating `…/workspaces/${workspace.id}/tasks` (keep the base `…/workspaces/${workspace.id}` pairs). In `modules/comments/server-actions.ts` delete lines revalidating `…/comments`, `…/tasks`, `…/deliverables` (keep the two base-path lines).

- [ ] **Step 2:** `pnpm typecheck && pnpm vitest run` → clean.

- [ ] **Step 3: Commit**

```bash
git add modules/tasks/server-actions.ts modules/comments/server-actions.ts
git commit -m "chore(cache): drop revalidatePath calls to removed tab subroutes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Dead weight — unused shadcn scaffolding, RHF deps, empty module

**Files:**
- Delete: `components/ui/form.tsx`, `components/ui/separator.tsx`, `modules/marketplace/` (contains only `.gitkeep`)
- Modify: `package.json` (remove `react-hook-form`, `@hookform/resolvers`)

**Why:** grep-verified zero importers. `ui/form.tsx` is the ONLY consumer of react-hook-form — its presence misleads readers into thinking RHF is the house form pattern (every real form is hand-rolled useState + server-side zod). Decision: forms stay hand-rolled for now; client-side validation arrives with the form-layer redesign in the Atelier track.

- [ ] **Step 1:**

```bash
git rm components/ui/form.tsx components/ui/separator.tsx modules/marketplace/.gitkeep
pnpm remove react-hook-form @hookform/resolvers
```

- [ ] **Step 2: Prove nothing breaks**

```bash
grep -rn "ui/form\|ui/separator\|react-hook-form\|@hookform" app components modules lib --include="*.ts*" | grep -v node_modules   # expect zero hits
pnpm typecheck && pnpm vitest run
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: remove dead ui/form + ui/separator, unused RHF deps, empty marketplace module

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Final gate + docs (handoff + website pointer)

**Files:**
- Modify: `docs/README.md` (one map line)
- Modify: `docs/planning/HANDOFF.md` (new TL;DR section at top)

- [ ] **Step 1: Full gate**

```bash
pnpm typecheck && pnpm lint && pnpm vitest run && pnpm check:i18n && pnpm build
```
Expected: all clean. (Reminder: local `pnpm build` skips DB migrations by design — none were added in this sprint.)

- [ ] **Step 2: docs/README.md** — add one row to "The map" table:

```markdown
| [`../inturn-web/`](../../inturn-web) | The marketing website — separate Next.js app + git repo OUTSIDE this repo (see `/Users/mac/code/inturn-hub/README.md`) | marketing | 📥 imported 2026-06-10 |
```

- [ ] **Step 3: HANDOFF.md** — add a new top TL;DR section titled `## TL;DR — Where we are (2026-06-10 — Audit + quick-wins fix sprint · marketing site import)` summarizing, in the established style: the full-repo audit happened (review delivered in-session); this branch's 10 fixes (one line each, file-anchored); the marketing site now at `../inturn-web` (own repo); deploys still deliberately deferred; next = Atelier design-token plan.

- [ ] **Step 4: Commit**

```bash
git add docs/README.md docs/planning/HANDOFF.md
git commit -m "docs: handoff for audit quick-wins sprint + marketing-site pointer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Out of scope (tracked, deliberate)

- **Atelier design implementation** (token rebind, ink Button variant, `.ui-rise` wiring, per-screen passes) → its own plan, written after this sprint lands.
- In-memory rate limiter → durable store; public-blob privacy for CVs/registry docs; admin read-path `requireAdmin`; migration renumbering; locale-aware revalidation; project-hub decomposition — all logged in the 2026-06-10 review, each needs its own decision/plan.
- Anything Vercel/deploy-related — explicitly deferred by Sam until platform enhancement lands.
