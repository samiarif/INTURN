export type UserRole = 'intern' | 'company' | 'admin';

export type WorkspaceRoute = 'intern' | 'company';

/**
 * UI variant for the workspace screen — determined by the route, not the viewer's
 * role. Admins follow whichever route they hit (/intern/workspaces → intern view,
 * /company/workspaces → supervisor view).
 */
export type WorkspaceView = 'intern' | 'supervisor';

export function viewFromRoute(route: WorkspaceRoute): WorkspaceView {
  return route === 'company' ? 'supervisor' : 'intern';
}

export type WorkspaceViewer = {
  userId: string;
  role: UserRole;
  supervisorOf: string[];
};

export type SidebarData =
  | {
      role: 'intern';
      activeWorkspaces: Array<{ id: string; label: string; live: boolean }>;
    }
  | {
      role: 'supervisor';
      activeProjects: Array<{
        id: string;
        code: string;
        name: string;
        meta: string;
        status: 'active' | 'draft';
        workspaces: Array<{ id: string; label: string; live: boolean }>;
      }>;
    };
