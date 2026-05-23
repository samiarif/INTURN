import { useTranslations } from 'next-intl';

export default function CompanyDashboard() {
  const t = useTranslations('dashboard');

  return (
    <main>
      <h1>{t('company.title')}</h1>
      <p>{t('welcome')}</p>
    </main>
  );
}
