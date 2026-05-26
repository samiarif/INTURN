'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { addCommentAction } from '@/modules/community/server-actions';

export function AddCommentForm({ postId }: { postId: string }) {
  const t = useTranslations('community');
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (body.trim().length < 1) return;
    startTransition(async () => {
      const res = await addCommentAction({ postId, body });
      if (!res.ok) {
        setError(t('errorGeneric'));
        return;
      }
      setBody('');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder={t('replyPlaceholder')}
        className="w-full px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[14px] resize-y"
      />
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending || body.trim().length < 1}
          className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? t('replying') : t('reply')}
        </button>
      </div>
    </div>
  );
}
