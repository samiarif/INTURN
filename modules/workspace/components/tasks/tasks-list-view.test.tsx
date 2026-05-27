// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
