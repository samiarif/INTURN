import Link from 'next/link';
import type { Internship, Organization } from '@/db/schema';

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function InternshipCard({
  internship,
  organization,
}: {
  internship: Internship;
  organization: Organization;
}) {
  const deadline = daysUntil(internship.deadline);
  return (
    <Link
      href={`/internships/${internship.id}`}
      className="block border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5 hover:border-[var(--border-strong)] hover:shadow-sm transition-all"
    >
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
            Paid
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
  );
}
