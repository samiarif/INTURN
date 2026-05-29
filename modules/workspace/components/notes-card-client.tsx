'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { StickyNote, X } from 'lucide-react';
import { deleteNoteAction } from '@/modules/notes/server-actions';
import { AddNoteModal } from './add-note-modal';
import { formatTimeAgo, type FormatLocale } from '@/lib/format-time';
import type { WorkspaceNote } from '@/db/schema';

type Props = {
  workspaceId: string;
  notes: WorkspaceNote[];
  locale: FormatLocale;
};

function DeleteNoteButton({ noteId }: { noteId: string }) {
  const t = useTranslations('workspace.notes');
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteNoteAction(noteId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      aria-label={t('deleteLabel')}
      title={t('deleteLabel')}
      className="transition-colors hover:text-[var(--danger)]"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--ink-4)',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 4px',
        flexShrink: 0,
      }}
    >
      <X size={14} strokeWidth={2.25} aria-hidden />
    </button>
  );
}

export function NotesCardClient({ workspaceId, notes, locale }: Props) {
  const t = useTranslations('workspace.notes');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="ws-rail-quick" style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <h4 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <StickyNote size={15} strokeWidth={2.25} style={{ color: 'var(--brand-600)', flexShrink: 0 }} />
            {t('title')}
          </h4>
          <button
            type="button"
            className="ws-btn ghost tiny"
            onClick={() => setModalOpen(true)}
            style={{ fontSize: 11, padding: '3px 8px' }}
          >
            {t('add')}
          </button>
        </div>

        {notes.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0 }}>{t('empty')}</p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {notes.map((note) => (
              <li
                key={note.id}
                style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      marginBottom: 2,
                      fontSize: 12.5,
                      color: 'var(--ink)',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {note.body}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {formatTimeAgo(note.createdAt, locale)}
                  </span>
                </div>
                <DeleteNoteButton noteId={note.id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <AddNoteModal workspaceId={workspaceId} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
