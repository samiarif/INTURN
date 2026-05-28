import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/modules/auth/session';
import { listInternBookmarks } from '@/modules/bookmarks/queries';
import { InternshipCard, type InternshipCardStrings } from '@/components/marketplace/internship-card';

export default async function SavedPage() {
  const session = await requireSession();
  if (session.role !== 'intern') redirect('/');

  const [rows, tBookmarks, tApps, tMarketplace, tCard] = await Promise.all([
    listInternBookmarks(session.user.id),
    getTranslations('bookmarks'),
    getTranslations('applications'),
    getTranslations('marketplace'),
    getTranslations('card'),
  ]);

  const cardStrings: InternshipCardStrings = {
    saveLabel: tBookmarks('saveLabel'),
    removeLabel: tBookmarks('removeLabel'),
    matchPill: (n: number) => tMarketplace('matchPill', { n }),
    paidPaid: tMarketplace('paid.paid'),
    paidUnpaid: tMarketplace('paid.unpaid'),
    durationWeeks: (n: number) => tCard('durationWeeks', { n }),
    deadlineToday: tCard('deadlineToday'),
    deadlineInDays: (n: number) => tCard('deadlineInDays', { n }),
    closed: tCard('closed'),
    rolling: tCard('rolling'),
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <nav className="flex items-center gap-4 text-sm mb-6 border-b border-[var(--border-color)]">
        <Link
          href="/intern/applications"
          className="px-3 py-2 text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          {tApps('tabActive')}
        </Link>
        <span className="px-3 py-2 border-b-2 border-[var(--brand-500)] text-[var(--ink)] font-medium">
          {tApps('tabSaved')}
        </span>
      </nav>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{tBookmarks('savedTitle')}</h1>
      <p className="text-[var(--ink-3)] mb-8">{tBookmarks('savedDescription')}</p>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center">
          <p className="text-[var(--ink-2)] font-medium mb-1">{tBookmarks('empty')}</p>
          <p className="text-[var(--ink-3)] text-sm mb-4">{tBookmarks('emptySub')}</p>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            {tBookmarks('openMarketplace')}
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map(({ internship, organization }) => (
            <InternshipCard
              key={internship.id}
              internship={internship}
              organization={organization}
              bookmarked
              strings={cardStrings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
