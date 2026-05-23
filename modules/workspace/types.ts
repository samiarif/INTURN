export type WorkspaceViewerRole = 'intern' | 'supervisor';

export type WorkspaceViewer = {
  userId: string;
  role: 'intern' | 'company' | 'admin';
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
