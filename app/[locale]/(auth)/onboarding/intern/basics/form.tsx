'use client';

import { useEffect, useState } from 'react';
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
  const tc = useTranslations('common');
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [university, setUniversity] = useState(initial?.university ?? '');
  const [yearOfStudy, setYearOfStudy] = useState(initial?.yearOfStudy ?? '');
  const [fieldOfStudy, setFieldOfStudy] = useState(initial?.fieldOfStudy ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [preferredLanguage, setPreferredLanguage] = useState<'fr' | 'en'>(
    initial?.preferredLanguage ?? 'fr',
  );
  const action =
    mode === 'account' ? saveProfileBasicsFromAccountAction : saveProfileBasicsAction;

  // Listen for the CV-parser's "cv-parsed" event so importing a CV
  // populates the form fields. Each field only updates if the parsed
  // value is truthy — we never overwrite existing input with null.
  useEffect(() => {
    function onParsed(e: Event) {
      const detail = (e as CustomEvent).detail as {
        firstName?: string | null;
        lastName?: string | null;
        university?: string | null;
        yearOfStudy?: string | null;
        fieldOfStudy?: string | null;
        city?: string | null;
        preferredLanguage?: 'fr' | 'en' | null;
      };
      if (detail.firstName) setFirstName(detail.firstName);
      if (detail.lastName) setLastName(detail.lastName);
      if (detail.university) setUniversity(detail.university);
      if (detail.yearOfStudy) setYearOfStudy(detail.yearOfStudy);
      if (detail.fieldOfStudy) setFieldOfStudy(detail.fieldOfStudy);
      if (detail.city) setCity(detail.city);
      if (detail.preferredLanguage) setPreferredLanguage(detail.preferredLanguage);
    }
    window.addEventListener('cv-parsed', onParsed);
    return () => window.removeEventListener('cv-parsed', onParsed);
  }, []);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="university" value={university} />
      <input type="hidden" name="yearOfStudy" value={yearOfStudy} />
      <input type="hidden" name="preferredLanguage" value={preferredLanguage} />

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-5 shadow-[var(--elev-card)] space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="text-label text-[var(--ink-2)]">{t('firstName')} {tc('requiredMark')}</Label>
          <Input
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="text-label text-[var(--ink-2)]">{t('lastName')} {tc('requiredMark')}</Label>
          <Input
            id="lastName"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label className="text-label text-[var(--ink-2)]">{t('university')} {tc('requiredMark')}</Label>
        <Combobox
          options={UNIVERSITIES.map((u) => ({ value: u.id, label: u.name }))}
          value={university}
          onChange={setUniversity}
          placeholder={t('universityPlaceholder')}
          searchPlaceholder={t('universitySearchPlaceholder')}
          emptyMessage={t('universityNoMatches')}
        />
        <p className="text-caption text-[var(--ink-3)] mt-1">{t('universityHelper')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-label text-[var(--ink-2)]">{t('yearOfStudy')} {tc('requiredMark')}</Label>
          <Select value={yearOfStudy} onValueChange={(v) => setYearOfStudy(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder={tc('selectPlaceholder')} />
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
          <Label htmlFor="fieldOfStudy" className="text-label text-[var(--ink-2)]">{t('fieldOfStudy')} {tc('requiredMark')}</Label>
          <Input
            id="fieldOfStudy"
            name="fieldOfStudy"
            value={fieldOfStudy}
            onChange={(e) => setFieldOfStudy(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="city" className="text-label text-[var(--ink-2)]">{t('city')}</Label>
        <Input
          id="city"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />
        <p className="text-caption text-[var(--ink-3)] mt-1">{t('cityHelper')}</p>
      </div>

      <div>
        <Label className="text-label text-[var(--ink-2)]">{t('preferredLanguage')} {tc('requiredMark')}</Label>
        <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
          <button
            type="button"
            onClick={() => setPreferredLanguage('fr')}
            className={
              preferredLanguage === 'fr'
                ? 'px-3 py-1 rounded-[4px] font-medium bg-[var(--surface)] shadow-sm'
                : 'px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'
            }
          >
            {tc('languages.fr')}
          </button>
          <button
            type="button"
            onClick={() => setPreferredLanguage('en')}
            className={
              preferredLanguage === 'en'
                ? 'px-3 py-1 rounded-[4px] font-medium bg-[var(--surface)] shadow-sm'
                : 'px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'
            }
          >
            {tc('languages.en')}
          </button>
        </div>
        <p className="text-caption text-[var(--ink-3)] mt-1">{t('preferredLanguageHelper')}</p>
      </div>
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
        <Button type="submit">
          {mode === 'account' ? t('save') : t('continue')}
        </Button>
      </div>
    </form>
  );
}
