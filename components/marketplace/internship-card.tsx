import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Internship, Organization } from '@/db/schema';
import { toggleBookmarkAction } from '@/modules/bookmarks/actions';

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function InternshipCard({
  internship,
  organization,
  bookmarked,
}: {
  internship: Internship;
  organization: Organization;
  /**
   * When defined, renders the bookmark heart in the top-right corner.
   * Pass `true`/`false` only for signed-in interns; omit (undefined) for
   * everyone else so the heart doesn't render.
   */
  bookmarked?: boolean;
}) {
  const deadline = daysUntil(internship.deadline);
  const tBookmarks = await getTranslations('bookmarks');
  const tMarketplace = await getTranslations('marketplace');
  // We can't wrap the whole card in <Link> because it now contains a
  // nested <form>+<button> (bookmark toggle). React forbids nesting
  // interactive elements, so the root is a plain <article> and only the
  // body block is wrapped in <Link>.
  return (
    <article className="relative border border-[var(--border-color)] rounded-lg bg-[var(--surface)] hover:border-[var(--border-strong)] hover:shadow-sm transition-all">
      {bookmarked !== undefined && (
        <form
          action={async () => {
            'use server';
            await toggleBookmarkAction(internship.id);
          }}
          className="absolute top-3 right-3 z-10"
        >
          <button
            type="submit"
            aria-label={bookmarked ? tBookmarks('removeLabel') : tBookmarks('saveLabel')}
            className="h-8 w-8 rounded-full bg-white/90 border border-[var(--border-color)] flex items-center justify-center hover:bg-white"
          >
            <span aria-hidden style={{ color: bookmarked ? 'var(--brand-500)' : 'var(--ink-3)' }}>
              {bookmarked ? '♥' : '♡'}
            </span>
          </button>
        </form>
      )}
      <Link href={`/internships/${internship.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-mono text-[10.5px] text-[var(--ink-3)] uppercase tracking-wider mb-1">
              {organization.name}
              {organization.city && ` · ${organization.city}`}
            </div>
            <h3 className="text-[16px] font-semibold tracking-tight text-[var(--ink)] line-clamp-2">
              {internship.title}
            </h3>
          </div>
          {internship.isPaid && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#15803D] flex-shrink-0">
              {tMarketplace('paid.paid')}
            </span>
          )}
        </div>
        <p className="text-[13px] text-[var(--ink-2)] line-clamp-2 mb-4">
          {internship.description}
        </p>
        <div className="flex items-center gap-3 text-[12px] text-[var(--ink-3)]">
          {internship.duration && <span>{internship.duration} weeks</span>}
          {internship.locationType && (
            <>
              <span>·</span>
              <span className="capitalize">{internship.locationType}</span>
            </>
          )}
          {deadline !== null && deadline >= 0 && (
            <>
              <span>·</span>
              <span className={deadline <= 7 ? 'text-[var(--warning)] font-medium' : ''}>
                {deadline === 0 ? 'Deadline today' : `${deadline}d to apply`}
              </span>
            </>
          )}
        </div>
      </Link>
    </article>
  );
}
