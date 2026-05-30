import { getTranslations, getLocale } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listUniversities } from '@/modules/university/queries';
import { CreateUniversityForm } from './_create-university-form';
import { InviteCoordinatorButton } from './_invite-coordinator-button';

export default async function Page() {
  const [universities, t, locale] = await Promise.all([
    listUniversities(),
    getTranslations('university.admin'),
    getLocale(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 md:p-8">
      <PageHeader title={t('title')} description={t('subtitle')} className="mb-6" />

      <CreateUniversityForm />

      {universities.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          {t('empty')}
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] overflow-hidden">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('colName')}</TableHead>
                <TableHead>{t('colLocation')}</TableHead>
                <TableHead>{t('colCreated')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {universities.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-[var(--ink)]">{u.name}</TableCell>
                  <TableCell className="text-caption text-[var(--ink-3)]">
                    {[u.city, u.country].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-caption text-[var(--ink-3)] whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                  </TableCell>
                  <TableCell className="text-right">
                    <InviteCoordinatorButton universityOrgId={u.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
