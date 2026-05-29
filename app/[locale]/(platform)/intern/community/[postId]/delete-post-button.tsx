'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { deletePostAction } from '@/modules/community/server-actions';

export function DeletePostButton({ postId }: { postId: string }) {
  const t = useTranslations('community');
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(t('deleteConfirm'))) return;
    startTransition(async () => {
      await deletePostAction(postId);
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="text-caption text-[var(--ink-3)] hover:text-[var(--danger)]"
    >
      {pending ? t('deleting') : t('delete')}
    </button>
  );
}
