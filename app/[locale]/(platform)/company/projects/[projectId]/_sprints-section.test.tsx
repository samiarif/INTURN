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
