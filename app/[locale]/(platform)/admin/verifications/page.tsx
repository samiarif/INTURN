import Link from 'next/link';
import { listOrganizationsByVerification } from '@/modules/admin/queries';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[var(--surface-muted)] text-[var(--ink-3)]',
  pending: 'bg-[#FFFBEB] text-[#92400E]',
  verified: 'bg-[#ECFDF5] text-[#15803D]',
  suspended: 'bg-[#FEF2F2] text-[#B91C1C]',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = (sp.status ?? 'pending') as 'pending' | 'all' | 'verified' | 'suspended';
  const statuses =
    statusFilter === 'all'
      ? (['draft', 'pending', 'verified', 'suspended'] as const)
      : statusFilter === 'pending'
        ? (['draft', 'pending'] as const)
        : ([statusFilter] as const);
  const rows = await listOrganizationsByVerification([...statuses]);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Verifications</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-6">
        Companies waiting for verification. Once verified, their internships go live on the
        marketplace.
      </p>
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {(['pending', 'verified', 'suspended', 'all'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/verifications?status=${s}`}
            className={
              statusFilter === s
                ? 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--ink)] text-white'
                : 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]'
            }
          >
            {s === 'pending' ? 'Pending (draft + pending)' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          No organizations in this state.
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-md overflow-x-auto bg-[var(--surface)]">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-[var(--surface-muted)] text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Company</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Owner</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">RNE</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ organization, owner }) => (
                <tr key={organization.id} className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{organization.name}</div>
                    <div className="text-[12px] text-[var(--ink-3)]">{organization.city ?? organization.country ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[13px]">{owner.firstName} {owner.lastName}</div>
                    <div className="text-[12px] text-[var(--ink-3)]">{owner.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {organization.rneUrl ? (
                      <span className="text-[var(--success)] text-[12px]">✓ uploaded</span>
                    ) : (
                      <span className="text-[var(--ink-4)] text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[organization.verificationStatus ?? 'draft']}`}>
                      {organization.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/verifications/${organization.id}`}
                      className="text-[var(--brand-600)] hover:text-[var(--brand-700)] text-sm"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
