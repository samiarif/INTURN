// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SprintsSection } from './_sprints-section';
import type { ProjectSprint } from '@/db/schema';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// The sprint actions report failure by RESOLVING `{ ok: false }` (they catch
// internally) — a thrown rejection only happens on network/runtime errors.
// Both failure modes must surface the banner.
const createSprintAction = vi.fn(async (): Promise<{ ok: boolean; error?: string }> => ({
  ok: false,
  error: 'forbidden',
}));
vi.mock('@/modules/sprints/server-actions', () => ({
  createSprintAction: (...args: unknown[]) => createSprintAction(...(args as [])),
  updateSprintAction: vi.fn(async () => ({ ok: true })),
  deleteSprintAction: vi.fn(async () => ({ ok: true })),
  reorderSprintsAction: vi.fn(async () => ({ ok: true })),
  setSprintTasksAction: vi.fn(async () => ({ ok: true })),
  applySprintPlanAction: vi.fn(async () => ({ ok: true })),
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

  it('surfaces the banner and keeps the form when an action RESOLVES { ok: false }', async () => {
    createSprintAction.mockResolvedValueOnce({ ok: false, error: 'forbidden' });
    render(<SprintsSection projectId="p1" projectName="P" sprints={[]} />);
    fireEvent.click(screen.getByText('addSprint'));
    fireEvent.change(screen.getByPlaceholderText('sprintNamePlaceholder'), {
      target: { value: 'X' },
    });
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(screen.getByText('actionError')).toBeTruthy());
    // Failure must NOT clear the add form — the user corrects and retries.
    expect(
      (screen.getByPlaceholderText('sprintNamePlaceholder') as HTMLInputElement).value,
    ).toBe('X');
  });

  it('surfaces the banner when an action REJECTS (network/runtime error)', async () => {
    createSprintAction.mockRejectedValueOnce(new Error('network'));
    render(<SprintsSection projectId="p1" projectName="P" sprints={[]} />);
    fireEvent.click(screen.getByText('addSprint'));
    fireEvent.change(screen.getByPlaceholderText('sprintNamePlaceholder'), {
      target: { value: 'X' },
    });
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(screen.getByText('actionError')).toBeTruthy());
  });
});
