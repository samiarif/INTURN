'use server';

import { revalidatePath } from 'next/cache';

/**
 * Bust the React-cached Pulse for one workspace by revalidating the pages that
 * render it: the supervisor's workspace overview and the company dashboard
 * digest. On the next render `getPulse` re-runs (re-hitting the AI / heuristic).
 *
 * Mirrors the revalidate targets used by the other workspace server actions
 * (see modules/workspace/server-actions.ts).
 */
export async function refreshPulseAction(workspaceId: string): Promise<void> {
  revalidatePath(`/company/workspaces/${workspaceId}`);
  revalidatePath('/company/dashboard');
}
