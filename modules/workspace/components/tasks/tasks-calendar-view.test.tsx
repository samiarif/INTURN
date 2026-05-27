// @vitest-environment jsdom
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
