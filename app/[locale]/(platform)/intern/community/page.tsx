import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { requireSession } from '@/modules/auth/session';
import { listFeed } from '@/modules/community/queries';

function timeAgo(date: Date, locale: string): string {
  const ms = Date.now() - date.getTime();
  const min = Math.round(ms / 60_000);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (min < 60) return locale === 'fr' ? `il y a ${min} min` : `${min}m ago`;
  if (hr < 24) return locale === 'fr' ? `il y a ${hr} h` : `${hr}h ago`;
  if (day < 7) return locale === 'fr' ? `il y a ${day} j` : `${day}d ago`;
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
  });
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function Page() {
  await requireSession();
  const [posts, t, locale] = await Promise.all([
    listFeed(30),
    getTranslations('community'),
    getLocale(),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-1">
            {t('eyebrow')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-[var(--ink-3)] mt-1">{t('subtitle')}</p>
        </div>
        <Link
          href="/intern/community/new"
          className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
        >
          + {t('newPost')}
        </Link>
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
                    <span
                      className="ws-avatar xs"
                      style={{
                        background: 'linear-gradient(135deg,#DDD6FE,#C7D2FE)',
                        color: 'var(--brand-700)',
                        fontSize: 11,
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                      }}
                    >
                      {initials(name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[var(--ink-2)]">{name}</p>
                      <p className="text-[12px] text-[var(--ink-3)]">
                        {timeAgo(new Date(post.lastActivityAt), locale)}
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
