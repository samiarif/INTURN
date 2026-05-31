// Pure state machine for task status transitions — safe to import from client.
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

// Column order + CSS class per status. Display labels are NOT stored here —
// callers localize via next-intl off `status` (workspace.tasksBoard.* status
// maps), so keeping an English `label` would be dead data and a future
// no-literal-string violation.
export const TASK_COLUMNS: Array<{ status: TaskStatus; cls: string }> = [
  { status: 'todo', cls: 'todo' },
  { status: 'in-progress', cls: 'prog' },
  { status: 'review', cls: 'review' },
  { status: 'done', cls: 'done' },
];

// Any transition is allowed — boards are fluid. Tracking the transition in
// the events stream is what matters.
export function isValidTaskTransition(from: TaskStatus, to: TaskStatus): boolean {
  return from !== to;
}
