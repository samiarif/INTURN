'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { addReportCommentAction } from '@/modules/academic-reports/server-actions';
import type { ReportCommentWithAuthor } from '@/modules/academic-reports/queries';

export function ReportCommentsThread({
  reportId,
  comments,
  currentUserId: _currentUserId,
  locale,
  labels,
}: {
  reportId: string;
  comments: ReportCommentWithAuthor[];
  /** Reserved for Task 8 delete-button; keep in prop type for forward compatibility. */
  currentUserId: string;
  locale: string;
  labels: { placeholder: string; empty: string; post: string; sending: string };
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addReportCommentAction({ reportId, body: trimmed });
      setBody('');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          className="w-full resize-y rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={pending || !body.trim()} onClick={submit}>
            <Send size={14} aria-hidden /> {pending ? labels.sending : labels.post}
          </Button>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--border-color)] p-8 text-center">
          <MessageSquare size={24} className="text-[var(--ink-4)]" aria-hidden />
          <p className="text-sm text-[var(--ink-3)]">{labels.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {comments.map(({ comment, author }) => (
            <li
              key={comment.id}
              className="grid grid-cols-[36px_1fr] items-start gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-3"
            >
              <Avatar
                name={`${author.firstName ?? ''} ${author.lastName ?? ''}`.trim()}
                email={author.email}
                imageUrl={author.imageUrl}
                size="md"
              />
              <div className="min-w-0">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="font-medium text-[var(--ink)]">
                    {author.firstName} {author.lastName}
                  </span>
                  <span className="font-mono text-caption text-[var(--ink-3)]">
                    {new Date(comment.createdAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="whitespace-pre-line break-words text-sm text-[var(--ink-2)]">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
