import Link from 'next/link';
import { listPublishedInternships } from '@/modules/internships/queries';
import { InternshipCard } from '@/components/marketplace/internship-card';

const PAID_OPTIONS: Array<{ value: 'all' | 'paid' | 'unpaid'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; paid?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const paid = (params.paid === 'paid' || params.paid === 'unpaid') ? params.paid : 'all';
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 20;

  const results = await listPublishedInternships({
    search,
    paid,
    limit: pageSize + 1,
    offset: (page - 1) * pageSize,
  });
  const hasNext = results.length > pageSize;
  const rows = results.slice(0, pageSize);

  function buildHref(overrides: Partial<{ q: string; paid: string; page: number }>): string {
    const sp = new URLSearchParams();
    const q = overrides.q !== undefined ? overrides.q : search;
    const p = overrides.paid !== undefined ? overrides.paid : paid;
    const pg = overrides.page !== undefined ? overrides.page : page;
    if (q) sp.set('q', q);
    if (p && p !== 'all') sp.set('paid', p);
    if (pg && pg > 1) sp.set('page', String(pg));
    const s = sp.toString();
    return `/marketplace${s ? `?${s}` : ''}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Browse internships</h1>
      <p className="text-[var(--ink-3)] mb-8">
        Real internships from Tunisian companies. Apply once with your inturn profile.
      </p>

      <form className="flex flex-wrap items-center gap-3 mb-8" action="/marketplace">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder="Search by title…"
          className="flex-1 min-w-[240px] h-10 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
        />
        <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
          {PAID_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={buildHref({ paid: opt.value, page: 1 })}
              className={
                paid === opt.value
                  ? 'px-3 py-1 rounded-[4px] font-medium bg-white shadow-sm'
                  : 'px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'
              }
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
        >
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center">
          <p className="text-[var(--ink-2)] font-medium mb-1">No internships match.</p>
          <p className="text-[var(--ink-3)] text-sm">Try removing filters or broadening your search.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map(({ internship, organization }) => (
            <InternshipCard key={internship.id} internship={internship} organization={organization} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-8 text-sm">
        {page > 1 ? (
          <Link href={buildHref({ page: page - 1 })} className="text-[var(--brand-600)] hover:text-[var(--brand-700)]">
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        <span className="text-[var(--ink-3)]">Page {page}</span>
        {hasNext ? (
          <Link href={buildHref({ page: page + 1 })} className="text-[var(--brand-600)] hover:text-[var(--brand-700)]">
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
