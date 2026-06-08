// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskCardMenu } from './task-card-menu';
import type { Task } from '@/db/schema';

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
vi.mock('@/modules/workspace/sprint-actions', () => ({
  setTaskSprintAction: vi.fn(async () => ({ ok: true })),
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
    sprintId: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task;
}

const SPRINT_OPTIONS = [
  { id: 's1', name: 'Sprint 1' },
  { id: 's2', name: 'Sprint 2' },
];

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

  it('does NOT show "moveToSprint" when sprintOptions is absent', () => {
    render(<TaskCardMenu task={makeTask()} view="intern" />);
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    expect(screen.queryByText('moveToSprint')).toBeNull();
  });

  it('does NOT show "moveToSprint" when sprintOptions is empty', () => {
    render(<TaskCardMenu task={makeTask()} view="intern" sprintOptions={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    expect(screen.queryByText('moveToSprint')).toBeNull();
  });

  it('shows "moveToSprint" in main panel when sprintOptions is provided', () => {
    render(<TaskCardMenu task={makeTask()} view="intern" sprintOptions={SPRINT_OPTIONS} />);
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    expect(screen.getByText('moveToSprint')).toBeTruthy();
  });

  it('opens sprint sub-panel with sprint names and unsorted on click', () => {
    render(<TaskCardMenu task={makeTask()} view="intern" sprintOptions={SPRINT_OPTIONS} />);
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    fireEvent.click(screen.getByText('moveToSprint'));
    expect(screen.getByText('Sprint 1')).toBeTruthy();
    expect(screen.getByText('Sprint 2')).toBeTruthy();
    expect(screen.getByText('unsorted')).toBeTruthy();
  });

  it('calls setTaskSprintAction with correct sprintId when a sprint is selected', async () => {
    const { setTaskSprintAction } = await import('@/modules/workspace/sprint-actions');
    render(<TaskCardMenu task={makeTask({ id: 't1' })} view="intern" sprintOptions={SPRINT_OPTIONS} />);
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    fireEvent.click(screen.getByText('moveToSprint'));
    fireEvent.click(screen.getByText('Sprint 2'));
    await waitFor(() => {
      expect(setTaskSprintAction).toHaveBeenCalledWith({ taskId: 't1', sprintId: 's2' });
    });
  });

  it('calls setTaskSprintAction with null for Unsorted', async () => {
    const { setTaskSprintAction } = await import('@/modules/workspace/sprint-actions');
    render(<TaskCardMenu task={makeTask({ id: 't1', sprintId: 's1' })} view="intern" sprintOptions={SPRINT_OPTIONS} />);
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    fireEvent.click(screen.getByText('moveToSprint'));
    fireEvent.click(screen.getByText('unsorted'));
    await waitFor(() => {
      expect(setTaskSprintAction).toHaveBeenCalledWith({ taskId: 't1', sprintId: null });
    });
  });

  it('disables the currently active sprint in the sprint sub-panel', () => {
    render(
      <TaskCardMenu
        task={makeTask({ sprintId: 's1' })}
        view="intern"
        sprintOptions={SPRINT_OPTIONS}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    fireEvent.click(screen.getByText('moveToSprint'));
    const sprint1Btn = screen.getByText('Sprint 1').closest('button');
    expect(sprint1Btn).toBeDefined();
    expect((sprint1Btn as HTMLButtonElement).disabled).toBe(true);
    const sprint2Btn = screen.getByText('Sprint 2').closest('button');
    expect(sprint2Btn).toBeDefined();
    expect((sprint2Btn as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables Unsorted when task already has no sprint', () => {
    render(
      <TaskCardMenu
        task={makeTask({ sprintId: null })}
        view="intern"
        sprintOptions={SPRINT_OPTIONS}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'triggerLabel' }));
    fireEvent.click(screen.getByText('moveToSprint'));
    const unsortedBtn = screen.getByText('unsorted').closest('button');
    expect(unsortedBtn).toBeDefined();
    expect((unsortedBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
