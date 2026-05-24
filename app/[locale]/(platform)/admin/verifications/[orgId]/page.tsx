import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrganizationDetail } from '@/modules/admin/queries';
import { VerificationActions } from './_actions';
import type { VerificationStatus } from '@/modules/admin/state-machine';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[var(--surface-muted)] text-[var(--ink-3)]',
  pending: 'bg-[#FFFBEB] text-[#92400E]',
  verified: 'bg-[#ECFDF5] text-[#15803D]',
  suspended: 'bg-[#FEF2F2] text-[#B91C1C]',
};

export default async function Page({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const data = await getOrganizationDetail(orgId);
  if (!data) notFound();
  const { organization, owner } = data;
  const status = (organization.verificationStatus ?? 'draft') as VerificationStatus;

  const isPdf = organization.rneUrl?.toLowerCase().endsWith('.pdf') ?? false;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-2">
        <Link href="/admin/verifications" className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)]">
          ← All verifications
        </Link>
      </div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2 inline-flex items-center gap-3">
            {organization.name}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[status]}`}>
              {status}
            </span>
          </h1>
          {organization.description && (
            <p className="text-[14px] text-[var(--ink-2)] max-w-prose">{organization.description}</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <section>
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            Organization
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[var(--ink-3)]">Slug</span><span className="font-mono">{organization.slug}</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-3)]">Industry</span><span>{organization.industry ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-3)]">Size</span><span>{organization.size ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-3)]">Country</span><span>{organization.country ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-3)]">City</span><span>{organization.city ?? '—'}</span></div>
            {organization.website && (
              <div className="flex justify-between">
                <span className="text-[var(--ink-3)]">Website</span>
                <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-600)] hover:text-[var(--brand-700)]">
                  {organization.website} ↗
                </a>
              </div>
            )}
            <div className="flex justify-between"><span className="text-[var(--ink-3)]">Created</span><span>{new Date(organization.createdAt).toLocaleDateString()}</span></div>
          </div>
        </section>
        <section>
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            Owner
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] space-y-2 text-sm">
            <div className="font-medium">{owner.firstName} {owner.lastName}</div>
            <div className="text-[var(--ink-3)]">{owner.email}</div>
            <div className="text-[12px] text-[var(--ink-3)] font-mono">{owner.clerkId}</div>
          </div>
        </section>
      </div>

      <section className="mb-8">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          RNE document
        </h2>
        {organization.rneUrl ? (
          isPdf ? (
            <iframe
              src={organization.rneUrl}
              className="w-full h-[600px] border border-[var(--border-color)] rounded-md"
              title="RNE document"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organization.rneUrl}
              alt="RNE document"
              className="max-w-full h-auto border border-[var(--border-color)] rounded-md"
            />
          )
        ) : (
          <div className="border border-dashed border-[var(--border-color)] rounded-md p-6 text-center text-[var(--ink-3)] text-sm">
            No RNE document uploaded yet. The company can verify later — admin can also mark verified
            without it for design-partner companies onboarded offline.
          </div>
        )}
      </section>

      <section className="border-t border-[var(--border-color)] pt-6">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          Actions
        </h2>
        <VerificationActions orgId={orgId} currentStatus={status} />
      </section>
    </div>
  );
}
