import { getTranslations } from 'next-intl/server';
import { StuckPillClient } from './stuck-pill-client';

export async function StuckPill({ workspaceId }: { workspaceId?: string }) {
  const t = await getTranslations('workspace.stuck');
  return (
    <StuckPillClient
      label={t('label')}
      title={t('title')}
      placeholder={t('placeholder')}
      sendLabel={t('send')}
      cancelLabel={t('cancel')}
      draftBadgeLabel="Drafted by AI"
      regenerateLabel="Regenerate"
      workspaceId={workspaceId}
    />
  );
}
