'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { updateInternalNotesAction } from '@/modules/applications/server-actions';

export function NotesEditor({
  applicationId,
  projectId,
  initialNotes,
}: {
  applicationId: string;
  projectId: string;
  initialNotes: string;
}) {
  const t = useTranslations('applications.notes');
  const locale = useLocale();
  const [notes, setNotes] = useState(initialNotes);
  const [savedAt, setSavedAt] = useState<Date | null>(initialNotes ? new Date() : null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (notes === initialNotes) return;
    timer.current = setTimeout(() => {
      startTransition(async () => {
        await updateInternalNotesAction({ applicationId, projectId, notes });
        setSavedAt(new Date());
      });
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  return (
    <div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        placeholder={t('placeholder')}
      />
      <p className="text-caption text-[var(--ink-3)] mt-1 font-mono">
        {pending
          ? t('saving')
          : savedAt
            ? t('saved', { time: savedAt.toLocaleTimeString(locale) })
            : t('autoSaves')}
      </p>
    </div>
  );
}
