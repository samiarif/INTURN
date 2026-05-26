'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createPostAction } from '@/modules/community/server-actions';

export function NewPostForm() {
  const t = useTranslations('community.new');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (title.trim().length < 6) {
      setError(t('errorTitleMin'));
      return;
    }
    if (body.trim().length < 20) {
      setError(t('errorBodyMin'));
      return;
    }
    startTransition(async () => {
      const res = await createPostAction({ title, body });
      if (!res.ok) {
        setError(t('errorGeneric'));
        return;
      }
      router.push(`/intern/community/${res.postId}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-[12px] font-semibold text-[var(--ink)] mb-1 block">
          {t('titleLabel')}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          className="w-full px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[15px]"
        />
        <p className="text-[11px] text-[var(--ink-3)] mt-1">{title.length}/6 min</p>
      </div>
      <div>
        <label className="text-[12px] font-semibold text-[var(--ink)] mb-1 block">
          {t('bodyLabel')}
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder={t('bodyPlaceholder')}
          className="w-full px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[14px] font-sans resize-y"
        />
        <p className="text-[11px] text-[var(--ink-3)] mt-1">{body.length}/20 min</p>
      </div>
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending || title.trim().length < 6 || body.trim().length < 20}
          className="inline-flex items-center h-10 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? t('saving') : t('submit')}
        </button>
      </div>
    </div>
  );
}
