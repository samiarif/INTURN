import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/modules/auth/session';
import { redirect } from 'next/navigation';
import { NewPostForm } from './new-post-form';

export default async function Page() {
  const session = await requireSession();
  if (session.role !== 'intern' && session.role !== 'admin') {
    redirect('/intern/community');
  }
  const t = await getTranslations('community.new');
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link
        href="/intern/community"
        className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)] mb-4 inline-block"
      >
        ← {t('backToFeed')}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('title')}</h1>
      <p className="text-[var(--ink-3)] mb-8">{t('subtitle')}</p>
      <NewPostForm />
    </div>
  );
}
