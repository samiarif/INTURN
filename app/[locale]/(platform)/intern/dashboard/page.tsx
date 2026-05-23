import { useTranslations } from 'next-intl';

export default function InternDashboard() {
  const t = useTranslations('dashboard');

  return (
    <main>
      <h1>{t('intern.title')}</h1>
      <p>{t('welcome')}</p>
    </main>
  );
}
