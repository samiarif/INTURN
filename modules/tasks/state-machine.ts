// Pure state machine for task status transitions — safe to import from client.
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export const TASK_COLUMNS: Array<{ status: TaskStatus; label: string; cls: string }> = [
  { status: 'todo', label: 'To do', cls: 'todo' },
  { status: 'in-progress', label: 'In progress', cls: 'prog' },
  { status: 'review', label: 'In review', cls: 'review' },
  { status: 'done', label: 'Done', cls: 'done' },
];

// Any transition is allowed — boards are fluid. Tracking the transition in
// the events stream is what matters.
export function isValidTaskTransition(from: TaskStatus, to: TaskStatus): boolean {
  return from !== to;
}
