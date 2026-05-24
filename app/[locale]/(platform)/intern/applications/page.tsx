import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getApplicationsByApplicant } from '@/modules/applications/queries';

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-[#EFF6FF] text-[#1D4ED8]',
  reviewed: 'bg-[var(--surface-muted)] text-[var(--ink-2)]',
  shortlisted: 'bg-[var(--brand-50)] text-[var(--brand-600)]',
  interview: 'bg-[#FFFBEB] text-[#92400E]',
  accepted: 'bg-[#ECFDF5] text-[#15803D]',
  rejected: 'bg-[#FEF2F2] text-[#B91C1C]',
};

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const rows = await getApplicationsByApplicant(user.id);

  return (
    <div className="max-w-3xl mx-auto p-8">
      <nav className="flex items-center gap-4 text-sm mb-6 border-b border-[var(--border-color)]">
        <span className="px-3 py-2 border-b-2 border-[var(--brand-500)] text-[var(--ink)] font-medium">
          Applications
        </span>
        <Link
          href="/intern/saved"
          className="px-3 py-2 text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          Saved
        </Link>
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">My applications</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-8">
        {rows.length === 0 ? 'No applications yet.' : `${rows.length} application${rows.length === 1 ? '' : 's'}`}
      </p>
      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-12 text-center">
          <p className="text-[var(--ink-2)] font-medium mb-2">Start applying</p>
          <p className="text-[var(--ink-3)] text-sm mb-4">
            Browse internships and apply with one click.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            Browse internships →
          </Link>
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-md overflow-hidden bg-[var(--surface)]">
          {rows.map(({ application, internship }) => (
            <Link
              key={application.id}
              href={`/intern/applications/${application.id}`}
              className="block border-b border-[var(--border-color)] last:border-b-0 px-4 py-3 hover:bg-[var(--surface-muted)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{internship.title}</div>
                  <div className="text-[12px] text-[var(--ink-3)] mt-0.5">
                    Applied {new Date(application.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[application.status ?? 'new']}`}
                >
                  {application.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
