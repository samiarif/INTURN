import { useTranslations } from 'next-intl';

export default function AdminDashboard() {
  const t = useTranslations('dashboard');

  return (
    <main>
      <h1>{t('admin.title')}</h1>
      <p>{t('welcome')}</p>
    </main>
  );
}
