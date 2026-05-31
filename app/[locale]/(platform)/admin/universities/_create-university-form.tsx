'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { createUniversityAction } from '@/modules/university/admin-actions';

export function CreateUniversityForm() {
  const t = useTranslations('university.admin');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createUniversityAction({ name, city, country });
      if (res.ok) {
        setName(''); setCity(''); setCountry('');
        router.refresh();
      } else {
        // createUniversityAction only surfaces thrown/shouldn't-happen codes
        // (authz, unexpected), so every failure funnels to generic copy.
        setError(t('errorGeneric'));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 mb-6">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--ink-3)]">{t('name')}</span>
        <input
          required value={name} onChange={(e) => setName(e.target.value)}
          className="h-9 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--ink-3)]">{t('city')}</span>
        <input
          required value={city} onChange={(e) => setCity(e.target.value)}
          className="h-9 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--ink-3)]">{t('country')}</span>
        <input
          required value={country} onChange={(e) => setCountry(e.target.value)}
          className="h-9 px-3 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? t('creating') : t('createSubmit')}
      </Button>
      {error && <p className="text-sm text-destructive w-full">{error}</p>}
    </form>
  );
}
