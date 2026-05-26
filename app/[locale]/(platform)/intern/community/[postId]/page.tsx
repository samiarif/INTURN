import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { requireSession } from '@/modules/auth/session';
import { getPost, listComments } from '@/modules/community/queries';
import { AddCommentForm } from './add-comment-form';
import { DeletePostButton } from './delete-post-button';
import { ReportButton } from '@/modules/reports/components/report-button';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(iso: Date, locale: string): string {
  return iso.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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
        className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)] mb-4 inline-block"
      >
        ← {t('backToFeed')}
      </Link>

      <article className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="ws-avatar"
            style={{
              background: 'linear-gradient(135deg,#DDD6FE,#C7D2FE)',
              color: 'var(--brand-700)',
              fontSize: 12,
              width: 36,
              height: 36,
              flexShrink: 0,
            }}
          >
            {initials(authorName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[14px]">{authorName}</p>
            <p className="text-[12px] text-[var(--ink-3)]">
              {formatDate(new Date(post.post.createdAt), locale)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canDelete && <DeletePostButton postId={postId} />}
            <ReportButton subjectType="user" subjectId={post.post.authorId} />
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-3">{post.post.title}</h1>
        <div className="text-[15px] text-[var(--ink-2)] leading-relaxed whitespace-pre-wrap">
          {post.post.body}
        </div>
      </article>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-4">
          {t('replies', { count: comments.length })}
        </h2>

        {comments.length === 0 ? (
          <p className="text-[14px] text-[var(--ink-3)] mb-6 italic">{t('noReplies')}</p>
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
                  <span
                    className="ws-avatar xs flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg,#E0F2FE,#BAE6FD)',
                      color: 'var(--brand-700)',
                      fontSize: 11,
                      width: 28,
                      height: 28,
                    }}
                  >
                    {initials(name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-[13px]">{name}</span>
                      <span className="text-[11px] text-[var(--ink-3)]">
                        {formatDate(new Date(comment.createdAt), locale)}
                      </span>
                    </div>
                    <p className="text-[14px] text-[var(--ink-2)] whitespace-pre-wrap">
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
          <p className="text-[13px] text-[var(--ink-3)] italic mt-4">{t('readOnly')}</p>
        )}
      </section>
    </div>
  );
}
