import { getTranslations } from 'next-intl/server';

export async function StuckPill() {
  const t = await getTranslations('workspace.stuck');
  return (
    <div className="ws-stuck">
      <span className="pulse" />
      <span>{t('label')}</span>
    </div>
  );
}
