import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Internship, Organization } from '@/db/schema';
import { toggleBookmarkAction } from '@/modules/bookmarks/actions';
import { orgMark } from '@/lib/avatar';

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

const LOCATION_LABEL: Record<string, string> = {
  'on-site': 'On-site',
  virtual: 'Remote',
  hybrid: 'Hybrid',
};

export async function InternshipCard({
  internship,
  organization,
  bookmarked,
  match,
  haveSkills,
}: {
  internship: Internship;
  organization: Organization;
  /**
   * When defined, renders the bookmark heart in the top-right corner.
   * Pass `true`/`false` only for signed-in interns; omit (undefined) for
   * everyone else so the heart doesn't render.
   */
  bookmarked?: boolean;
  /**
   * Match score 0–100 against the signed-in intern's profile. When
   * defined, renders a colored pill in the card's top-right and (at
   * threshold) promotes the card to the "matched" visual treatment.
   * Omit for signed-out viewers or interns without a complete profile.
   */
  match?: number;
  /**
   * Subset of the listing's skills that the intern already has —
   * highlighted in green ("have" chip). Empty set is fine; pass
   * `undefined` to skip the highlighting entirely.
   */
  haveSkills?: Set<string>;
}) {
  const deadline = daysUntil(internship.deadline);
  const [tBookmarks, tMarketplace, tCard] = await Promise.all([
    getTranslations('bookmarks'),
    getTranslations('marketplace'),
    getTranslations('card'),
  ]);
  const { initials, tone } = orgMark(organization.name, organization.id);

  // Cap skills to keep cards even-height. "Have" skills bubble to the front
  // so the green chips are visible when the listing has more than 4.
  const allSkills = internship.skills ?? [];
  const skills = haveSkills
    ? [...allSkills.filter((s) => haveSkills.has(s)), ...allSkills.filter((s) => !haveSkills.has(s))].slice(0, 4)
    : allSkills.slice(0, 4);

  const locationLabel =
    internship.locationType && LOCATION_LABEL[internship.locationType]
      ? LOCATION_LABEL[internship.locationType]
      : internship.locationType;
  const locationDetail = internship.location
    ? `${locationLabel ?? ''}${locationLabel && internship.location ? ' · ' : ''}${internship.location}`
    : locationLabel;

  const deadlineUrgent = deadline !== null && deadline >= 0 && deadline <= 7;
  const deadlineText =
    deadline === null
      ? null
      : deadline < 0
        ? tCard('closed')
        : deadline === 0
          ? tCard('deadlineToday')
          : tCard('deadlineInDays', { n: deadline });

  // Match tiers — `>= 85` is the visual promotion threshold (purple ring +
  // gradient top edge). `>= 70` is "mid" (cyan pill). Below that the pill
  // is neutral so the score is informative but not loud.
  const matchClass = match === undefined ? '' : match >= 85 ? ' hi' : match >= 70 ? ' mid' : '';
  const isMatched = match !== undefined && match >= 85;

  // We can't wrap the whole card in <Link> because it now contains a
  // nested <form>+<button> (bookmark toggle). React forbids nesting
  // interactive elements, so the root is a plain <article> and only the
  // body block is wrapped in <Link>.
  return (
    <article
      className="ex-card group relative border border-[var(--border-color)] rounded-lg bg-[var(--surface)] hover:border-[var(--border-strong)] hover:shadow-sm transition-all"
      data-matched={isMatched ? 'true' : undefined}
    >
      {bookmarked !== undefined && (
        <form
          action={async () => {
            'use server';
            await toggleBookmarkAction(internship.id);
          }}
          className="absolute top-4 right-4 z-10"
        >
          <button
            type="submit"
            aria-label={bookmarked ? tBookmarks('removeLabel') : tBookmarks('saveLabel')}
            className="h-8 w-8 rounded-full bg-[var(--surface)]/95 border border-[var(--border-color)] flex items-center justify-center text-[15px] leading-none hover:border-[var(--brand-300)] hover:text-[var(--brand-500)] transition-colors"
            style={{ color: bookmarked ? 'var(--brand-500)' : 'var(--ink-3)' }}
          >
            <span aria-hidden>{bookmarked ? '♥' : '♡'}</span>
          </button>
        </form>
      )}
      <Link
        href={`/internships/${internship.id}`}
        className="block p-5 focus-visible:outline-none rounded-lg"
      >
        <div className="flex items-start gap-3 mb-3">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-10 h-10 rounded-md font-mono text-[12px] font-bold flex-shrink-0 border"
            style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
          >
            {initials}
          </span>
          <div className={`flex-1 min-w-0 ${match !== undefined ? 'pr-28' : 'pr-9'}`}>
            <div className="font-mono text-[10.5px] text-[var(--ink-3)] uppercase tracking-[0.06em] truncate mb-1">
              {organization.name}
              {organization.city && ` · ${organization.city}`}
            </div>
            <h3 className="text-[15.5px] font-semibold tracking-tight text-[var(--ink)] leading-snug text-balance line-clamp-2">
              {internship.title}
            </h3>
          </div>
          {match !== undefined ? (
            // Anchored top-right; sits left of the bookmark heart when the
            // viewer is also a signed-in intern (heart is positioned in
            // its own absolute box above).
            <span
              className={`ex-card-match${matchClass}`}
              style={{ position: 'absolute', top: 16, right: bookmarked !== undefined ? 56 : 16 }}
              aria-label={tMarketplace('matchPill', { n: match })}
            >
              {tMarketplace('matchPill', { n: match })}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 text-[12.5px] text-[var(--ink-2)]">
          {internship.isPaid && internship.compensation ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-[var(--success)]">{'●'}</span>
              <b className="font-semibold text-[var(--ink)]">{internship.compensation}</b>
            </span>
          ) : internship.isPaid ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-[var(--success)]">{'●'}</span>
              <b className="font-semibold text-[var(--ink)]">{tMarketplace('paid.paid')}</b>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[var(--ink-3)]">
              <span aria-hidden>{'○'}</span>
              {tMarketplace('paid.unpaid')}
            </span>
          )}
          {internship.duration ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-[var(--ink-4)]">{'⏱'}</span>
              {tCard('durationWeeks', { n: internship.duration })}
            </span>
          ) : null}
          {locationDetail ? (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span aria-hidden className="text-[var(--ink-4)]">{'◉'}</span>
              <span className="truncate">{locationDetail}</span>
            </span>
          ) : null}
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {skills.map((skill) => {
              const have = haveSkills?.has(skill);
              return (
                <span
                  key={skill}
                  className="ex-skill inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--surface-muted)] text-[var(--ink-2)] text-[11.5px] leading-5"
                  data-have={have ? 'true' : undefined}
                >
                  {have ? <span aria-hidden style={{ fontSize: 9, fontWeight: 700, marginRight: 3 }}>{'✓'}</span> : null}
                  {skill}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)]">
          <span
            className="font-mono text-[11px] tracking-wide"
            style={{ color: deadlineUrgent ? 'var(--warning)' : 'var(--ink-3)' }}
          >
            {deadlineText ?? tCard('rolling')}
          </span>
          <span
            aria-hidden
            className="text-[var(--ink-3)] group-hover:text-[var(--brand-500)] group-hover:translate-x-0.5 transition-all"
          >
            {'→'}
          </span>
        </div>
      </Link>
    </article>
  );
}
