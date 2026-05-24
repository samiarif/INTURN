import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/modules/auth/session';
import { listInternBookmarks } from '@/modules/bookmarks/queries';
import { InternshipCard } from '@/components/marketplace/internship-card';

export default async function SavedPage() {
  const session = await requireSession();
  if (session.role !== 'intern') redirect('/');

  const rows = await listInternBookmarks(session.user.id);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <nav className="flex items-center gap-4 text-sm mb-6 border-b border-[var(--border-color)]">
        <Link
          href="/intern/applications"
          className="px-3 py-2 text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          Applications
        </Link>
        <span className="px-3 py-2 border-b-2 border-[var(--brand-500)] text-[var(--ink)] font-medium">
          Saved
        </span>
      </nav>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Saved internships</h1>
      <p className="text-[var(--ink-3)] mb-8">
        Your wishlist. Heart any internship from the marketplace to keep it here.
      </p>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center">
          <p className="text-[var(--ink-2)] font-medium mb-1">Nothing saved yet.</p>
          <p className="text-[var(--ink-3)] text-sm mb-4">
            Browse the marketplace and tap the heart on anything you want to come back to.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            Open marketplace
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
