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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">{t('firstName')} *</Label>
          <Input
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">{t('lastName')} *</Label>
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
            value={fieldOfStudy}
            onChange={(e) => setFieldOfStudy(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="city">{t('city')}</Label>
        <Input
          id="city"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />
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
