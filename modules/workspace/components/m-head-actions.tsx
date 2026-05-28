'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { AddTaskModal } from './add-task-modal';
import { ScheduleCheckInButton } from './schedule-check-in';

type Props = {
  view: 'intern' | 'supervisor';
  workspaceId: string;
};

export function MHeadActions({ view, workspaceId }: Props) {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function goToCheckIn() {
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'check-in');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  if (view === 'supervisor') {
    return (
      <>
        <ScheduleCheckInButton workspaceId={workspaceId} trigger="inline-cta" />
        <button
          type="button"
          className="ws-btn brand tiny"
          onClick={() => setTaskModalOpen(true)}
        >
          <span className="plus">+</span> Assign task
        </button>
        {taskModalOpen && (
          <AddTaskModal
            workspaceId={workspaceId}
            initialStatus="todo"
            onClose={() => setTaskModalOpen(false)}
          />
        )}
      </>
    );
  }

  // intern view
  return (
    <>
      <button
        type="button"
        className="ws-btn ghost tiny"
        onClick={goToCheckIn}
      >
        Weekly check-in →
      </button>
      {/* + Add note — wired in S1-C */}
      <button type="button" className="ws-btn brand tiny">
        <span className="plus">+</span> Add note
      </button>
    </>
  );
}
