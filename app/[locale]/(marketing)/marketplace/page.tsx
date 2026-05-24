import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { listPublishedInternships, listMarketplaceSectors } from '@/modules/internships/queries';
import { InternshipCard } from '@/components/marketplace/internship-card';
import { getSession } from '@/modules/auth/session';
import { getBookmarkedSet } from '@/modules/bookmarks/queries';

// Filter option values are stable identifiers; visible labels are inlined at
// render time via t() since translations aren't available at module init.
const PAID_VALUES = ['all', 'paid', 'unpaid'] as const;
const LOCATION_VALUES = ['', 'on-site', 'virtual', 'hybrid'] as const;
const DURATION_VALUES = ['', 'short', 'medium', 'long'] as const;
const LANGUAGE_VALUES = ['', 'fr', 'en', 'ar'] as const;
// Display names for non-paid/duration languages are language endonyms — not translated.
const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};

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
  const paid = (params.paid === 'paid' || params.paid === 'unpaid') ? params.paid : 'all';
  const sector = params.sector?.trim() || undefined;
  const locationType =
    params.loc === 'on-site' || params.loc === 'virtual' || params.loc === 'hybrid'
      ? params.loc
      : undefined;
  const duration =
    params.dur === 'short' || params.dur === 'medium' || params.dur === 'long'
      ? params.dur
      : undefined;
  const language = params.lang === 'fr' || params.lang === 'en' || params.lang === 'ar' ? params.lang : undefined;
  const skill = params.skill?.trim() || undefined;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 20;

  const [results, sectors, session, t] = await Promise.all([
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
    getSession(),
    getTranslations('marketplace'),
  ]);

  // Localized label maps assembled at render time.
  const locationLabels: Record<string, string> = {
    '': t('anyLocation'),
    'on-site': 'On-site',
    virtual: 'Virtual',
    hybrid: 'Hybrid',
  };
  const durationLabels: Record<string, string> = {
    '': t('anyDuration'),
    short: t('duration.short'),
    medium: t('duration.medium'),
    long: t('duration.long'),
  };
  const languageLabels: Record<string, string> = {
    '': t('anyLanguage'),
    ...LANGUAGE_LABELS,
  };
  const paidLabels: Record<string, string> = {
    all: t('paid.all'),
    paid: t('paid.paid'),
    unpaid: t('paid.unpaid'),
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

  function buildHref(overrides: Partial<Search>): string {
    const sp = new URLSearchParams();
    const next = {
      q: overrides.q ?? search,
      paid: overrides.paid ?? (paid === 'all' ? undefined : paid),
      sector: overrides.sector ?? sector,
      loc: overrides.loc ?? locationType,
      dur: overrides.dur ?? duration,
      lang: overrides.lang ?? language,
      skill: overrides.skill ?? skill,
      page: overrides.page ?? (page > 1 ? String(page) : undefined),
    };
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== 'all' && v !== '') sp.set(k, String(v));
    }
    const s = sp.toString();
    return `/marketplace${s ? `?${s}` : ''}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[var(--ink-3)] mb-8">{t('subtitle')}</p>

      <form className="space-y-3 mb-8" action="/marketplace">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder={t('searchPlaceholder')}
            className="flex-1 min-w-[240px] h-10 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
          />
          <input
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
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            name="sector"
            defaultValue={sector ?? ''}
            className="h-9 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)]"
          >
            <option value="">{t('anySector')}</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select name="loc" defaultValue={locationType ?? ''} className="h-9 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)]">
            {LOCATION_VALUES.map((v) => (
              <option key={v} value={v}>{locationLabels[v]}</option>
            ))}
          </select>
          <select name="dur" defaultValue={duration ?? ''} className="h-9 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)]">
            {DURATION_VALUES.map((v) => (
              <option key={v} value={v}>{durationLabels[v]}</option>
            ))}
          </select>
          <select name="lang" defaultValue={language ?? ''} className="h-9 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)]">
            {LANGUAGE_VALUES.map((v) => (
              <option key={v} value={v}>{languageLabels[v]}</option>
            ))}
          </select>
          <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
            {PAID_VALUES.map((value) => (
              <Link
                key={value}
                href={buildHref({ paid: value, page: undefined })}
                className={
                  paid === value
                    ? 'px-3 py-1 rounded-[4px] font-medium bg-white shadow-sm'
                    : 'px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'
                }
              >
                {paidLabels[value]}
              </Link>
            ))}
          </div>
          {(sector || locationType || duration || language || skill || paid !== 'all' || search) && (
            <Link href="/marketplace" className="text-[var(--ink-3)] hover:text-[var(--ink)] underline ml-1">
              {t('clearFilters')}
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center">
          <p className="text-[var(--ink-2)] font-medium mb-1">{t('noResults')}</p>
          <p className="text-[var(--ink-3)] text-sm">{t('noResultsHelp')}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map(({ internship, organization }) => (
            <InternshipCard
              key={internship.id}
              internship={internship}
              organization={organization}
              bookmarked={bookmarkedSet ? bookmarkedSet.has(internship.id) : undefined}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-8 text-sm">
        {page > 1 ? (
          <Link href={buildHref({ page: String(page - 1) })} className="text-[var(--brand-600)] hover:text-[var(--brand-700)]">
            {t('previous')}
          </Link>
        ) : (
          <span />
        )}
        <span className="text-[var(--ink-3)]">{t('page', { n: page })}</span>
        {hasNext ? (
          <Link href={buildHref({ page: String(page + 1) })} className="text-[var(--brand-600)] hover:text-[var(--brand-700)]">
            {t('next')}
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
