'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AddTaskModal } from './add-task-modal';
import { AddNoteModal } from './add-note-modal';
import { ScheduleCheckInButton } from './schedule-check-in';

type Props = {
  view: 'intern' | 'supervisor';
  workspaceId: string;
};

export function MHeadActions({ view, workspaceId }: Props) {
  const t = useTranslations('workspace.topbar');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
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
          className="ws-btn ghost tiny"
          onClick={() => setNoteModalOpen(true)}
        >
          <span className="plus">{t('addGlyph')}</span> {t('addNote')}
        </button>
        <button
          type="button"
          className="ws-btn brand tiny"
          onClick={() => setTaskModalOpen(true)}
        >
          <span className="plus">{t('addGlyph')}</span> {t('assignTask')}
        </button>
        {taskModalOpen && (
          <AddTaskModal
            workspaceId={workspaceId}
            initialStatus="todo"
            onClose={() => setTaskModalOpen(false)}
          />
        )}
        {noteModalOpen && (
          <AddNoteModal
            workspaceId={workspaceId}
            onClose={() => setNoteModalOpen(false)}
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
        {t('weeklyCheckIn')}
      </button>
      <button
        type="button"
        className="ws-btn brand tiny"
        onClick={() => setNoteModalOpen(true)}
      >
        <span className="plus">{t('addGlyph')}</span> {t('addNote')}
      </button>
      {noteModalOpen && (
        <AddNoteModal
          workspaceId={workspaceId}
          onClose={() => setNoteModalOpen(false)}
        />
      )}
    </>
  );
}
