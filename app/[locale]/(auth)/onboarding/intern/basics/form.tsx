'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/combobox';
import { UNIVERSITIES } from '@/modules/profiles/universities';
import {
  saveProfileBasicsAction,
  saveProfileBasicsFromAccountAction,
} from '@/modules/profiles/server-actions';

const YEARS = ['L1', 'L2', 'L3', 'M1', 'M2', 'Eng1', 'Eng2', 'Eng3', 'PhD'];

type BasicsInitial = Partial<{
  firstName: string;
  lastName: string;
  university: string;
  yearOfStudy: string;
  fieldOfStudy: string;
  city: string;
  preferredLanguage: 'fr' | 'en';
}>;

export function ProfileBasicsForm({
  initial,
  mode = 'onboarding',
}: {
  initial?: BasicsInitial;
  mode?: 'onboarding' | 'account';
}) {
  const t = useTranslations('onboarding.intern.basics');
  const [university, setUniversity] = useState(initial?.university ?? '');
  const [yearOfStudy, setYearOfStudy] = useState(initial?.yearOfStudy ?? '');
  const [preferredLanguage, setPreferredLanguage] = useState<'fr' | 'en'>(
    initial?.preferredLanguage ?? 'fr',
  );
  const action =
    mode === 'account' ? saveProfileBasicsFromAccountAction : saveProfileBasicsAction;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="university" value={university} />
      <input type="hidden" name="yearOfStudy" value={yearOfStudy} />
      <input type="hidden" name="preferredLanguage" value={preferredLanguage} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">{t('firstName')} *</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={initial?.firstName}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">{t('lastName')} *</Label>
          <Input id="lastName" name="lastName" defaultValue={initial?.lastName} required />
        </div>
      </div>

      <div>
        <Label>{t('university')} *</Label>
        <Combobox
          options={UNIVERSITIES.map((u) => ({ value: u.id, label: u.name }))}
          value={university}
          onChange={setUniversity}
          placeholder="Select university…"
        />
        <p className="text-[12px] text-[var(--ink-3)] mt-1">{t('universityHelper')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('yearOfStudy')} *</Label>
          <Select value={yearOfStudy} onValueChange={(v) => setYearOfStudy(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="fieldOfStudy">{t('fieldOfStudy')} *</Label>
          <Input
            id="fieldOfStudy"
            name="fieldOfStudy"
            defaultValue={initial?.fieldOfStudy}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="city">{t('city')}</Label>
        <Input id="city" name="city" defaultValue={initial?.city} required />
        <p className="text-[12px] text-[var(--ink-3)] mt-1">{t('cityHelper')}</p>
      </div>

      <div>
        <Label>{t('preferredLanguage')} *</Label>
        <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
          <button
            type="button"
            onClick={() => setPreferredLanguage('fr')}
            className={
              preferredLanguage === 'fr'
                ? 'px-3 py-1 rounded-[4px] font-medium bg-white shadow-sm'
                : 'px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'
            }
          >
            Français
          </button>
          <button
            type="button"
            onClick={() => setPreferredLanguage('en')}
            className={
              preferredLanguage === 'en'
                ? 'px-3 py-1 rounded-[4px] font-medium bg-white shadow-sm'
                : 'px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'
            }
          >
            English
          </button>
        </div>
        <p className="text-[12px] text-[var(--ink-3)] mt-1">{t('preferredLanguageHelper')}</p>
      </div>

      <div className="flex justify-between pt-2">
        {mode === 'account' ? (
          <Link
            href="/account"
            className="inline-flex items-center h-9 px-3 text-sm text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            {t('back')}
          </Link>
        ) : (
          <Button type="button" variant="ghost" disabled>
            {t('back')}
          </Button>
        )}
        <Button type="submit" className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]">
          {mode === 'account' ? t('save') : t('continue')}
        </Button>
      </div>
    </form>
  );
}
