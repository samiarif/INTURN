import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { requireSession } from '@/modules/auth/session';
import { listFeed } from '@/modules/community/queries';
import { Avatar } from '@/components/avatar';
import { formatTimeAgo, type FormatLocale } from '@/lib/format-time';

export default async function Page() {
  const session = await requireSession();
  const [posts, t, locale] = await Promise.all([
    listFeed(30),
    getTranslations('community'),
    getLocale(),
  ]);

  const canPost = session.role === 'intern' || session.role === 'admin';

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6 flex-col sm:flex-row">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-1">
            {t('eyebrow')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-[var(--ink-3)] mt-1">{t('subtitle')}</p>
        </div>
        {canPost && (
          <Link
            href="/intern/community/new"
            className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] whitespace-nowrap"
          >
            + {t('newPost')}
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center">
          <p className="text-[var(--ink-2)] font-medium mb-1">{t('emptyTitle')}</p>
          <p className="text-[var(--ink-3)] text-sm mb-4">{t('emptyBody')}</p>
          <Link
            href="/intern/community/new"
            className="inline-flex items-center h-10 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            {t('startThread')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map(({ post, author }) => {
            const name =
              `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim() || author.email;
            return (
              <li
                key={post.id}
                className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] hover:border-[var(--border-strong)] transition-colors"
              >
                <Link href={`/intern/community/${post.id}`} className="block p-5">
                  <div className="flex items-start gap-3 mb-2">
                    <Avatar name={name} email={author.email} imageUrl={author.imageUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[var(--ink-2)]">{name}</p>
                      <p className="text-[12px] text-[var(--ink-3)]">
                        {formatTimeAgo(new Date(post.lastActivityAt), locale as FormatLocale)}
                      </p>
                    </div>
                  </div>
                  <h2 className="text-[17px] font-semibold mb-1 line-clamp-2">{post.title}</h2>
                  <p className="text-[14px] text-[var(--ink-2)] line-clamp-2 mb-3">{post.body}</p>
                  <div className="flex items-center gap-3 text-[12px] text-[var(--ink-3)]">
                    <span>
                      💬 {post.commentCount} {t('replies', { count: post.commentCount })}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
