import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { MarketplaceFacetCounts } from '@/modules/internships/queries';

export type MarketplaceFiltersState = {
  search?: string;
  paid?: 'paid' | 'unpaid' | 'all';
  sector?: string;
  locationType?: 'on-site' | 'virtual' | 'hybrid';
  duration?: 'short' | 'medium' | 'long';
  language?: 'fr' | 'en' | 'ar';
  skill?: string;
  city?: string;
  page?: number;
};

/**
 * Build a `/marketplace?…` href from the current filter state with one
 * facet replaced or cleared. Used by every filter row so click = navigation
 * — no client JS needed.
 */
function buildHref(state: MarketplaceFiltersState, overrides: Partial<MarketplaceFiltersState>): string {
  const next: MarketplaceFiltersState = { ...state, ...overrides };
  const sp = new URLSearchParams();
  if (next.search) sp.set('q', next.search);
  if (next.skill) sp.set('skill', next.skill);
  if (next.sector) sp.set('sector', next.sector);
  if (next.locationType) sp.set('loc', next.locationType);
  if (next.duration) sp.set('dur', next.duration);
  if (next.language) sp.set('lang', next.language);
  if (next.city) sp.set('city', next.city);
  if (next.paid && next.paid !== 'all') sp.set('paid', next.paid);
  // Always reset to page 1 when filters change.
  const s = sp.toString();
  return `/marketplace${s ? `?${s}` : ''}`;
}

function FilterRow({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link href={href} className={`ex-filt-row${active ? ' on' : ''}`}>
      <span className="box" aria-hidden />
      <span className="lbl">{label}</span>
      {typeof count === 'number' && count > 0 ? <span className="count">{count}</span> : null}
    </Link>
  );
}

/**
 * Left-rail filter for the marketplace explore view.
 *
 * Each option is a `<Link>` so toggling becomes a navigation — no client
 * JS, no form submit. Selecting an "on" option clears that facet (toggle).
 * Counts come from `computeFacetCounts()` snapshot of the published set.
 */
export async function MarketplaceFilters({
  state,
  sectors,
  counts,
  hasActiveFilters,
}: {
  state: MarketplaceFiltersState;
  sectors: string[];
  counts: MarketplaceFacetCounts;
  hasActiveFilters: boolean;
}) {
  const t = await getTranslations('marketplace');

  const locationOptions: Array<{ value: 'hybrid' | 'virtual' | 'on-site'; label: string }> = [
    { value: 'hybrid', label: t('locationLabels.hybrid') },
    { value: 'virtual', label: t('locationLabels.virtual') },
    { value: 'on-site', label: t('locationLabels.onsite') },
  ];

  const durationOptions: Array<{ value: 'short' | 'medium' | 'long'; label: string }> = [
    { value: 'short', label: t('duration.short') },
    { value: 'medium', label: t('duration.medium') },
    { value: 'long', label: t('duration.long') },
  ];

  // Sectors get sorted alphabetically by listMarketplaceSectors; cap to the
  // top 6 by count so the rail doesn't overflow. The full list stays
  // reachable via the existing search box at the top of the page.
  const topSectors = [...sectors]
    .sort((a, b) => (counts.sector[b] ?? 0) - (counts.sector[a] ?? 0))
    .slice(0, 6);

  const topCities = Object.entries(counts.city)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <aside className="ex-filters" aria-label={t('filters')}>
      <div className="ex-filters-head">
        <h3>{t('filters')}</h3>
        {hasActiveFilters ? (
          <Link href="/marketplace" className="clear">
            {t('clearAll')}
          </Link>
        ) : null}
      </div>

      {topSectors.length > 0 ? (
        <div className="ex-filt">
          <h4>{t('discipline')}</h4>
          {topSectors.map((s) => {
            const active = state.sector === s;
            return (
              <FilterRow
                key={s}
                href={buildHref(state, { sector: active ? undefined : s })}
                label={s}
                count={counts.sector[s]}
                active={active}
              />
            );
          })}
        </div>
      ) : null}

      <div className="ex-filt">
        <h4>{t('mode')}</h4>
        {locationOptions.map(({ value, label }) => {
          const active = state.locationType === value;
          return (
            <FilterRow
              key={value}
              href={buildHref(state, { locationType: active ? undefined : value })}
              label={label}
              count={counts.locationType[value]}
              active={active}
            />
          );
        })}
      </div>

      {topCities.length > 0 ? (
        <div className="ex-filt">
          <h4>{t('location')}</h4>
          {topCities.map(([city, n]) => {
            const active = state.city === city;
            return (
              <FilterRow
                key={city}
                href={buildHref(state, { city: active ? undefined : city })}
                label={city}
                count={n}
                active={active}
              />
            );
          })}
        </div>
      ) : null}

      <div className="ex-filt">
        <h4>{t('durationLabel')}</h4>
        {durationOptions.map(({ value, label }) => {
          const active = state.duration === value;
          return (
            <FilterRow
              key={value}
              href={buildHref(state, { duration: active ? undefined : value })}
              label={label}
              count={counts.duration[value]}
              active={active}
            />
          );
        })}
      </div>

      <div className="ex-filt">
        <h4>{t('compensation')}</h4>
        <FilterRow
          href={buildHref(state, { paid: state.paid === 'paid' ? 'all' : 'paid' })}
          label={t('paidOnly')}
          count={counts.paid.paid}
          active={state.paid === 'paid'}
        />
      </div>
    </aside>
  );
}
