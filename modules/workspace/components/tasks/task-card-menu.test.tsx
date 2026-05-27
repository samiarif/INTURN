// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
