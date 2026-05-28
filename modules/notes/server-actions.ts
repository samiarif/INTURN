'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { workspaceNotes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { loadWorkspaceAccess } from '@/modules/workspace/access';

function revalidateWorkspace(workspaceId: string) {
  revalidatePath(`/intern/workspaces/${workspaceId}`);
  revalidatePath(`/company/workspaces/${workspaceId}`);
  revalidatePath(`/intern/workspaces/${workspaceId}/overview`);
  revalidatePath(`/company/workspaces/${workspaceId}/overview`);
}

export type CreateNoteResult = { ok: true } | { ok: false; error: string };

export async function createNoteAction(
  workspaceId: string,
  body: string,
): Promise<CreateNoteResult> {
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) {
    return { ok: false, error: 'invalid' };
  }

  const { session, workspace } = await loadWorkspaceAccess(workspaceId);

  await db.insert(workspaceNotes).values({
    workspaceId: workspace.id,
    authorId: session.user.id,
    body: trimmed,
  });

  revalidateWorkspace(workspace.id);
  return { ok: true };
}

export type DeleteNoteResult = { ok: true } | { ok: false; error: string };

export async function deleteNoteAction(noteId: string): Promise<DeleteNoteResult> {
  const [note] = await db
    .select()
    .from(workspaceNotes)
    .where(eq(workspaceNotes.id, noteId))
    .limit(1);

  if (!note) return { ok: false, error: 'not_found' };

  const { session, workspace } = await loadWorkspaceAccess(note.workspaceId);

  if (note.authorId !== session.user.id) {
    return { ok: false, error: 'forbidden' };
  }

  await db.delete(workspaceNotes).where(eq(workspaceNotes.id, noteId));

  revalidateWorkspace(workspace.id);
  return { ok: true };
}
