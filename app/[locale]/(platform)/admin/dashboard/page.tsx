import Link from 'next/link';
import { getAdminStats, listRecentOrganizations } from '@/modules/admin/queries';
import { countOpenReports } from '@/modules/reports/queries';
import { StatusPill, toneForVerificationStatus } from '@/components/status-pill';

export default async function Page() {
  const [stats, recent, openReports] = await Promise.all([
    getAdminStats(),
    listRecentOrganizations(10),
    countOpenReports(),
  ]);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Admin dashboard</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-8">Verifications, workspaces, recent activity.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Link
          href="/admin/verifications"
          className="block border border-[var(--border-color)] rounded-lg p-5 bg-[var(--surface)] hover:border-[var(--border-strong)]"
        >
          <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-2">
            Verifications pending
          </div>
          <div className="text-3xl font-semibold tracking-tight">{stats.verificationsPending}</div>
          <div className="text-[12px] text-[var(--ink-3)] mt-1">Draft + pending companies</div>
        </Link>
        <div className="border border-[var(--border-color)] rounded-lg p-5 bg-[var(--surface)]">
          <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-2">
            Companies verified
          </div>
          <div className="text-3xl font-semibold tracking-tight">{stats.companiesVerified}</div>
          <div className="text-[12px] text-[var(--success)] mt-1">+{stats.companiesVerifiedRecent} in last 30d</div>
        </div>
        <div className="border border-[var(--border-color)] rounded-lg p-5 bg-[var(--surface)]">
          <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-2">
            Active workspaces
          </div>
          <div className="text-3xl font-semibold tracking-tight">{stats.activeWorkspaces}</div>
          <div className="text-[12px] text-[var(--success)] mt-1">+{stats.activeWorkspacesRecent} in last 30d</div>
        </div>
        <Link
          href="/admin/reports?status=open"
          className={`block border rounded-lg p-5 hover:border-[var(--border-strong)] ${
            openReports > 0
              ? 'border-[#FCA5A5] bg-[#FEF2F2]'
              : 'border-[var(--border-color)] bg-[var(--surface)]'
          }`}
        >
          <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-2">
            Open reports
          </div>
          <div className={`text-3xl font-semibold tracking-tight ${openReports > 0 ? 'text-[#B91C1C]' : ''}`}>
            {openReports}
          </div>
          <div className="text-[12px] text-[var(--ink-3)] mt-1">
            {openReports > 0 ? 'Needs triage' : 'All clear'}
          </div>
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent organizations</h2>
        {recent.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
            No organizations yet.
          </div>
        ) : (
          <div className="border border-[var(--border-color)] rounded-md overflow-x-auto bg-[var(--surface)]">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-[var(--surface-muted)] text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Company</th>
                  <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Owner</th>
                  <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Created</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(({ organization, owner }) => (
                  <tr key={organization.id} className="border-t border-[var(--border-color)]">
                    <td className="px-4 py-3 font-medium">{organization.name}</td>
                    <td className="px-4 py-3 text-[13px]">{owner.email}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={toneForVerificationStatus(organization.verificationStatus)}>
                        {organization.verificationStatus}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[var(--ink-3)]">
                      {new Date(organization.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/verifications/${organization.id}`} className="text-[var(--brand-600)] hover:text-[var(--brand-700)] text-sm">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
