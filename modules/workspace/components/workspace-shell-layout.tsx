import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { WorkspaceTopBar, type Crumb } from './topbar';
import { StuckPill } from './stuck-pill';
import { computeWeekOfTotal, getProjectSiblingWorkspaces } from '../queries';
import type { WorkspaceShell } from '../page-data';

// `localePrefix: 'as-needed'` — French (default) has no prefix, English is /en
// (see i18n/routing.ts). Mirrors CommandCenterFilter's hrefFor.
function localeHref(locale: string, path: string): string {
  return locale === 'en' ? `/en${path}` : path;
}

async function buildShellCrumbs(
  shell: WorkspaceShell['shell'],
  view: WorkspaceShell['view'],
  myWorkspacesLabel: string,
  locale: string,
): Promise<Crumb[]> {
  // Workspace-level crumbs only — per-tab label is shown in the MHead tab bar.
  // The tab-bar visual highlight is the per-tab indicator.
  if (view === 'intern') {
    // Interns get NO switcher (privacy — never navigate into a teammate's
    // workspace). The combined org · project crumb links to their dashboard.
    return [
      { label: myWorkspacesLabel },
      {
        label: `${shell.organizationName} · ${shell.projectOrInternshipLabel}`,
        bold: true,
        href: localeHref(locale, '/intern/dashboard'),
      },
    ];
  }

  // Supervisor: org → project (command center) → intern switcher.
  const orgCrumb: Crumb = {
    label: shell.organizationName,
    href: localeHref(locale, '/company/dashboard'),
  };
  const projectCrumb: Crumb = {
    label: shell.projectOrInternshipLabel,
    href: shell.projectId
      ? localeHref(locale, `/company/projects/${shell.projectId}`)
      : undefined,
  };

  // The intern crumb becomes a switcher across sibling workspaces under the
  // project. No projectId (internship has no project) → plain bold label.
  const internCrumb: Crumb = shell.projectId
    ? {
        label: shell.internFirstName ?? '—',
        bold: true,
        switcher: {
          current: shell.workspaceId,
          siblings: await getProjectSiblingWorkspaces(shell.projectId),
        },
      }
    : { label: shell.internFirstName ?? '—', bold: true };

  return [orgCrumb, projectCrumb, internCrumb];
}

function buildShellModeChip(shell: WorkspaceShell['shell']): { label: string } {
  const { current, total } = computeWeekOfTotal(shell.startDate, shell.durationWeeks);
  return { label: `${shell.locationType} · WEEK ${current} / ${total}` };
}

export async function WorkspaceShellLayout({
  shell,
  children,
}: {
  shell: WorkspaceShell;
  children: ReactNode;
}) {
  const s = shell.shell;
  const [tCrumbs, locale] = await Promise.all([
    getTranslations('workspace.crumbs'),
    getLocale(),
  ]);
  const crumbs = await buildShellCrumbs(s, shell.view, tCrumbs('myWorkspaces'), locale);
  return (
    <div
      className="ws-shell ws"
      style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <WorkspaceTopBar
        view={shell.view}
        viewerInitials={shell.viewer.initials}
        crumbs={crumbs}
        modeChip={buildShellModeChip(s)}
      />
      <div className="ws-body">
        <main id="main-content" className="ws-main">{children}</main>
      </div>
      {shell.view === 'intern' && <StuckPill />}
    </div>
  );
}
