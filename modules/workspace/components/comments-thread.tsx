'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MessageSquare, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  addCommentAction,
  deleteCommentAction,
} from '@/modules/comments/server-actions';
import type { CommentWithAuthor } from '@/modules/comments/queries';
import { Avatar } from '@/components/avatar';

function timeAgo(
  date: Date | string,
  t: (key: 'minutesAgo' | 'hoursAgo' | 'daysAgo', vars?: { n: number }) => string,
): string {
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return t('minutesAgo', { n: 0 });
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  return t('daysAgo', { n: days });
}

export function CommentsThread({
  workspaceId,
  comments,
  currentUserId,
  taskId,
  deliverableId,
  placeholder,
  emptyMessage,
}: {
  workspaceId: string;
  comments: CommentWithAuthor[];
  currentUserId: string;
  taskId?: string;
  deliverableId?: string;
  placeholder?: string;
  emptyMessage?: string;
}) {
  const t = useTranslations('workspace.comments');
  const tActivity = useTranslations('workspace.activity');
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addCommentAction({ workspaceId, taskId, deliverableId, body: trimmed });
      setBody('');
      router.refresh();
    });
  }

  function remove(commentId: string) {
    if (!confirm('Delete this comment?')) return;
    startTransition(async () => {
      await deleteCommentAction({ commentId, workspaceId });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card padding="default">
        <label htmlFor="comment-body" className="sr-only">
          {placeholder ?? t('placeholder')}
        </label>
        <Textarea
          id="comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={placeholder ?? t('placeholder')}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <span className="text-caption font-mono text-[var(--ink-4)]">
            ⌘/Ctrl + Enter · {body.length} / 4000
          </span>
          <Button
            type="button"
            disabled={pending || !body.trim()}
            onClick={submit}
            className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
          >
            <Send aria-hidden />
            {pending ? 'Sending…' : t('post')}
          </Button>
        </div>
      </Card>

      {comments.length === 0 ? (
        <Card padding="lg" className="flex flex-col items-center gap-2.5 text-center">
          <MessageSquare
            size={26}
            strokeWidth={1.75}
            className="text-[var(--ink-4)]"
            aria-hidden
          />
          <p className="text-body text-[var(--ink-3)]">{emptyMessage ?? t('empty')}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {comments.map(({ comment, author }) => {
            const isAuthor = author.id === currentUserId;
            return (
              <Card
                key={comment.id}
                padding="default"
                className="grid grid-cols-[36px_1fr] items-start gap-3"
              >
                <Avatar
                  name={`${author.firstName ?? ''} ${author.lastName ?? ''}`.trim()}
                  email={author.email}
                  imageUrl={author.imageUrl}
                  size="md"
                  title={`${author.firstName ?? ''} ${author.lastName ?? ''}`.trim()}
                />
                <div className="min-w-0">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="font-medium text-[var(--ink)]">
                      {author.firstName} {author.lastName}
                    </span>
                    <span className="text-caption font-mono text-[var(--ink-3)]">
                      {timeAgo(comment.createdAt, tActivity)}
                    </span>
                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => remove(comment.id)}
                        disabled={pending}
                        className="ml-auto cursor-pointer text-caption text-[var(--ink-4)] transition-colors hover:text-[var(--danger)]"
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                  <p className="text-body whitespace-pre-line break-words text-[var(--ink-2)]">
                    {comment.body}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
