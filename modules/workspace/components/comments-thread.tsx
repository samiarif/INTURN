'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  addCommentAction,
  deleteCommentAction,
} from '@/modules/comments/server-actions';
import type { CommentWithAuthor } from '@/modules/comments/queries';

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

function initials(first?: string | null, last?: string | null): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="ws-card" style={{ padding: 16 }}>
        <Textarea
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
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            ⌘/Ctrl + Enter · {body.length} / 4000
          </span>
          <Button
            type="button"
            disabled={pending || !body.trim()}
            onClick={submit}
            className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
          >
            {pending ? 'Sending…' : t('post')}
          </Button>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="ws-card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>{emptyMessage ?? t('empty')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.map(({ comment, author }) => {
            const isAuthor = author.id === currentUserId;
            return (
              <div
                key={comment.id}
                className="ws-card"
                style={{ padding: 16, display: 'grid', gridTemplateColumns: '36px 1fr', gap: 12, alignItems: 'flex-start' }}
              >
                <span
                  className="ws-avatar"
                  style={{ width: 36, height: 36, fontSize: 13 }}
                  title={`${author.firstName} ${author.lastName}`}
                >
                  {initials(author.firstName, author.lastName)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>
                      {author.firstName} {author.lastName}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                      {timeAgo(comment.createdAt, tActivity)}
                    </span>
                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => remove(comment.id)}
                        disabled={pending}
                        style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)', cursor: 'pointer' }}
                        className="hover:text-[var(--danger)]"
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--ink-2)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                      wordBreak: 'break-word',
                    }}
                  >
                    {comment.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
