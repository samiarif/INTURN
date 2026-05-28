import { getLocale } from 'next-intl/server';
import type { WorkspaceNote } from '@/db/schema';
import { NotesCardClient } from './notes-card-client';

type Props = {
  workspaceId: string;
  notes: WorkspaceNote[];
};

export async function NotesCard({ workspaceId, notes }: Props) {
  const locale = (await getLocale()) as 'en' | 'fr';
  return <NotesCardClient workspaceId={workspaceId} notes={notes} locale={locale} />;
}
