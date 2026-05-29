import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { requireSession } from '@/modules/auth/session';
import { getPost, listComments } from '@/modules/community/queries';
import { AddCommentForm } from './add-comment-form';
import { DeletePostButton } from './delete-post-button';
import { ReportButton } from '@/modules/reports/components/report-button';
import { Avatar } from '@/components/avatar';
import { formatTimeAgo, type FormatLocale } from '@/lib/format-time';
import { ArrowLeft } from 'lucide-react';

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const session = await requireSession();
  const { postId } = await params;
  const [post, comments, t, locale] = await Promise.all([
    getPost(postId),
    listComments(postId),
    getTranslations('community'),
    getLocale(),
  ]);
  if (!post) notFound();

  const authorName =
    `${post.author.firstName ?? ''} ${post.author.lastName ?? ''}`.trim() || post.author.email;
  const canDelete = post.post.authorId === session.user.id || session.role === 'admin';
  const canComment = session.role === 'intern' || session.role === 'admin';

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link
        href="/intern/community"
        className="text-caption text-[var(--ink-3)] hover:text-[var(--ink)] mb-4 inline-flex items-center gap-1.5"
      >
        <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
        {t('backToFeed')}
      </Link>

      <article className="border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--surface)] shadow-[var(--elev-card)] p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            name={authorName}
            email={post.author.email}
            imageUrl={post.author.imageUrl}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-label text-[var(--ink)]">{authorName}</p>
            <p className="text-caption text-[var(--ink-3)]">
              {formatTimeAgo(new Date(post.post.createdAt), locale as FormatLocale)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canDelete && <DeletePostButton postId={postId} />}
            <ReportButton subjectType="user" subjectId={post.post.authorId} />
          </div>
        </div>
        <h1 className="text-display font-[family-name:var(--font-display)] text-[var(--ink)] mb-3">
          {post.post.title}
        </h1>
        <div className="text-body text-[var(--ink-2)] whitespace-pre-wrap">
          {post.post.body}
        </div>
      </article>

      <section>
        <h2 className="text-eyebrow uppercase font-mono text-[var(--brand-700)] mb-4">
          {t('replies', { count: comments.length })}
        </h2>

        {comments.length === 0 ? (
          <p className="text-body text-[var(--ink-3)] mb-6 italic">{t('noReplies')}</p>
        ) : (
          <ul className="space-y-4 mb-6">
            {comments.map(({ comment, author }) => {
              const name =
                `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim() || author.email;
              return (
                <li
                  key={comment.id}
                  className="flex gap-3 border-b border-[var(--border-color)] pb-4 last:border-b-0"
                >
                  <Avatar
                    name={name}
                    email={author.email}
                    imageUrl={author.imageUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span className="text-label text-[var(--ink)]">{name}</span>
                      <span className="text-caption text-[var(--ink-3)]">
                        {formatTimeAgo(new Date(comment.createdAt), locale as FormatLocale)}
                      </span>
                    </div>
                    <p className="text-body text-[var(--ink-2)] whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canComment && <AddCommentForm postId={postId} />}
        {!canComment && (
          <p className="text-caption text-[var(--ink-3)] italic mt-4">{t('readOnly')}</p>
        )}
      </section>
    </div>
  );
}
