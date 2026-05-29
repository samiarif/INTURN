import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/modules/auth/session';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
        className="text-caption text-[var(--ink-3)] hover:text-[var(--ink)] mb-4 inline-flex items-center gap-1.5"
      >
        <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
        {t('backToFeed')}
      </Link>
      <h1 className="text-display font-[family-name:var(--font-display)] text-[var(--ink)] mb-2">
        {t('title')}
      </h1>
      <p className="text-body text-[var(--ink-3)] mb-8">{t('subtitle')}</p>
      <NewPostForm />
    </div>
  );
}
