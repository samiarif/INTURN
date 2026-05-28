import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  listPublishedInternships,
  listMarketplaceSectors,
  computeFacetCounts,
} from '@/modules/internships/queries';
import { InternshipCard, type InternshipCardStrings } from '@/components/marketplace/internship-card';
import { MarketplaceFilters } from '@/components/marketplace/marketplace-filters';
import { MarketplaceFiltersCollapse } from '@/components/marketplace/marketplace-filters-collapse';
import { getSession } from '@/modules/auth/session';
import { getBookmarkedSet } from '@/modules/bookmarks/queries';
import { getProfileByUserId } from '@/modules/profiles/queries';
import { matchScore, intersectingSkills } from '@/lib/match';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketplace' });
  return {
    title: `${t('title')} — Inturn`,
    description: t('subtitle'),
    alternates: {
      canonical: locale === 'fr' ? '/marketplace' : '/en/marketplace',
      languages: { fr: '/marketplace', en: '/en/marketplace' },
    },
    openGraph: {
      title: t('title'),
      description: t('subtitle'),
      type: 'website',
      locale: locale === 'fr' ? 'fr_TN' : 'en_US',
    },
  };
}

type Search = {
  q?: string;
  paid?: string;
  sector?: string;
  loc?: string;
  dur?: string;
  lang?: string;
  skill?: string;
  page?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const paid = params.paid === 'paid' || params.paid === 'unpaid' ? params.paid : 'all';
  const sector = params.sector?.trim() || undefined;
  const locationType =
    params.loc === 'on-site' || params.loc === 'virtual' || params.loc === 'hybrid'
      ? params.loc
      : undefined;
  const duration =
    params.dur === 'short' || params.dur === 'medium' || params.dur === 'long'
      ? params.dur
      : undefined;
  const language =
    params.lang === 'fr' || params.lang === 'en' || params.lang === 'ar' ? params.lang : undefined;
  const skill = params.skill?.trim() || undefined;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 20;

  const session = await getSession();
  const profile = session?.role === 'intern' ? await getProfileByUserId(session.user.id) : null;

  const [results, sectors, facetCounts, t, tBookmarks, tCard] = await Promise.all([
    listPublishedInternships({
      search,
      paid,
      sector,
      locationType,
      duration,
      language,
      skill,
      limit: pageSize + 1,
      offset: (page - 1) * pageSize,
    }),
    listMarketplaceSectors(),
    computeFacetCounts(),
    getTranslations('marketplace'),
    getTranslations('bookmarks'),
    getTranslations('card'),
  ]);

  const cardStrings: InternshipCardStrings = {
    saveLabel: tBookmarks('saveLabel'),
    removeLabel: tBookmarks('removeLabel'),
    matchPill: (n: number) => t('matchPill', { n }),
    paidPaid: t('paid.paid'),
    paidUnpaid: t('paid.unpaid'),
    durationWeeks: (n: number) => tCard('durationWeeks', { n }),
    deadlineToday: tCard('deadlineToday'),
    deadlineInDays: (n: number) => tCard('deadlineInDays', { n }),
    closed: tCard('closed'),
    rolling: tCard('rolling'),
  };

  const hasNext = results.length > pageSize;
  const rows = results.slice(0, pageSize);

  // Decorate cards with bookmark state — only for signed-in interns.
  // For everyone else the card renders without the heart.
  const bookmarkedSet =
    session?.role === 'intern'
      ? await getBookmarkedSet(
          session.user.id,
          rows.map((r) => r.internship.id),
        )
      : null;

  // Decorate cards with match-score data. Only signed-in interns with at
  // least one skill on their profile see scores; everyone else gets the
  // standard card. The match band above the grid is gated on the same
  // signal plus "at least one listing scored ≥ 70".
  const internSkills = profile?.skills && profile.skills.length > 0 ? profile.skills : null;
  const rowsWithMatch = rows.map((r) => ({
    ...r,
    match: internSkills ? matchScore(internSkills, r.internship.skills) : undefined,
    haveSkills: internSkills ? intersectingSkills(internSkills, r.internship.skills) : undefined,
  }));

  const matchedCount = rowsWithMatch.filter((r) => (r.match ?? 0) >= 70).length;
  const highlyMatchedCount = rowsWithMatch.filter((r) => (r.match ?? 0) >= 85).length;
  const topMatch = internSkills
    ? rowsWithMatch.reduce<{ score: number; row: (typeof rowsWithMatch)[number] } | null>(
        (acc, r) => {
          const s = r.match ?? 0;
          return acc && acc.score >= s ? acc : { score: s, row: r };
        },
        null,
      )
    : null;
  const showMatchBand = Boolean(internSkills) && matchedCount > 0;

  const hasActiveFilters = Boolean(
    sector || locationType || duration || language || skill || paid !== 'all' || search,
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[var(--ink-3)] mb-6">{t('subtitle')}</p>

      <form className="mb-6" action="/marketplace">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="marketplace-q" className="sr-only">
            {t('searchPlaceholder')}
          </label>
          <input
            id="marketplace-q"
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder={t('searchPlaceholder')}
            className="flex-1 min-w-[240px] h-10 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
          />
          <label htmlFor="marketplace-skill" className="sr-only">
            {t('skillPlaceholder')}
          </label>
          <input
            id="marketplace-skill"
            type="text"
            name="skill"
            defaultValue={skill ?? ''}
            placeholder={t('skillPlaceholder')}
            className="w-44 h-10 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            {t('searchButton')}
          </button>
        </div>
      </form>

      <div className="ex-layout grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <div>
          <MarketplaceFiltersCollapse
            label={t('filters')}
            activeCount={
              (search ? 1 : 0) +
              (paid && paid !== 'all' ? 1 : 0) +
              (sector ? 1 : 0) +
              (locationType ? 1 : 0) +
              (duration ? 1 : 0) +
              (language ? 1 : 0) +
              (skill ? 1 : 0)
            }
          >
            <MarketplaceFilters
              state={{
                search,
                paid,
                sector,
                locationType,
                duration,
                language,
                skill,
              }}
              sectors={sectors}
              counts={facetCounts}
              hasActiveFilters={hasActiveFilters}
            />
          </MarketplaceFiltersCollapse>
        </div>

        <div>
          <div className="ex-meta">
            <b>{rows.length}</b> {t('countInternships', { n: rows.length })}
            {highlyMatchedCount > 0 ? (
              <>
                {' · '}
                <b>{highlyMatchedCount}</b> {t('highlyMatched')}
              </>
            ) : null}
          </div>

          {showMatchBand && topMatch ? (
            <div className="ex-match-band" role="status">
              <span className="star" aria-hidden>
                {'✦'}
              </span>
              <div className="body">
                <div className="title">{t('matchBandTitle', { n: matchedCount })}</div>
                <div className="sub">
                  {t('matchBandSub', {
                    top: topMatch.row.organization.name,
                    role: topMatch.row.internship.title,
                    pct: topMatch.score,
                  })}
                </div>
              </div>
              <span className="more" aria-hidden>
                {t('whyThese')} →
              </span>
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center">
              <p className="text-[var(--ink-2)] font-medium mb-1">{t('noResults')}</p>
              <p className="text-[var(--ink-3)] text-sm">{t('noResultsHelp')}</p>
            </div>
          ) : (
            <div className="ex-grid grid grid-cols-1 xl:grid-cols-2 gap-4">
              {rowsWithMatch.map(({ internship, organization, match, haveSkills }) => (
                <InternshipCard
                  key={internship.id}
                  internship={internship}
                  organization={organization}
                  bookmarked={bookmarkedSet ? bookmarkedSet.has(internship.id) : undefined}
                  match={match}
                  haveSkills={haveSkills}
                  strings={cardStrings}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 text-sm">
            {page > 1 ? (
              <Link
                href={buildPaginationHref(
                  { search, paid, sector, locationType, duration, language, skill },
                  page - 1,
                )}
                className="text-[var(--brand-600)] hover:text-[var(--brand-700)]"
              >
                {t('previous')}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-[var(--ink-3)]">{t('page', { n: page })}</span>
            {hasNext ? (
              <Link
                href={buildPaginationHref(
                  { search, paid, sector, locationType, duration, language, skill },
                  page + 1,
                )}
                className="text-[var(--brand-600)] hover:text-[var(--brand-700)]"
              >
                {t('next')}
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Pagination URL builder. Keeps the active filter set and just updates the
 * page number. Kept inline here (vs. shared util) because the filter rail
 * has its own buildHref shape (toggles, never page).
 */
function buildPaginationHref(
  filters: {
    search?: string;
    paid: string;
    sector?: string;
    locationType?: string;
    duration?: string;
    language?: string;
    skill?: string;
  },
  page: number,
): string {
  const sp = new URLSearchParams();
  if (filters.search) sp.set('q', filters.search);
  if (filters.skill) sp.set('skill', filters.skill);
  if (filters.sector) sp.set('sector', filters.sector);
  if (filters.locationType) sp.set('loc', filters.locationType);
  if (filters.duration) sp.set('dur', filters.duration);
  if (filters.language) sp.set('lang', filters.language);
  if (filters.paid && filters.paid !== 'all') sp.set('paid', filters.paid);
  if (page > 1) sp.set('page', String(page));
  const s = sp.toString();
  return `/marketplace${s ? `?${s}` : ''}`;
}
