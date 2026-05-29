'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileDrop } from '@/components/file-drop';
import { COMPANY_SIZES } from '@/modules/profiles/validators';
import { saveCompanyProfileAction } from '@/modules/profiles/company-server-actions';

const INDUSTRIES = [
  'Design & creative',
  'Software & tech',
  'Marketing & comms',
  'Finance',
  'Education',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Other',
];

type CompanyInitial = Partial<{
  name: string;
  industry: string;
  size: string;
  country: string;
  city: string;
  description: string;
  website: string;
  logoUrl: string;
  rneUrl: string;
}>;

export function CompanyProfileForm({ initial }: { initial?: CompanyInitial }) {
  const t = useTranslations('onboarding.company');
  const [industry, setIndustry] = useState(initial?.industry ?? '');
  const [size, setSize] = useState(initial?.size ?? '');
  const [country, setCountry] = useState(initial?.country ?? 'Tunisia');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '');
  const [rneUrl, setRneUrl] = useState(initial?.rneUrl ?? '');

  return (
    <form action={saveCompanyProfileAction} className="space-y-5">
      <input type="hidden" name="industry" value={industry} />
      <input type="hidden" name="size" value={size} />
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="rneUrl" value={rneUrl} />

      <div className="grid grid-cols-[120px_1fr] gap-5">
        <div>
          <Label>{t('logo')}</Label>
          <FileDrop
            kind="logo"
            accept="image/*"
            onUploaded={(r) => setLogoUrl(r.url)}
            helper={t('optional')}
          />
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" name="name" defaultValue={initial?.name} required />
          </div>
          <div>
            <Label htmlFor="website">{t('website')}</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={initial?.website}
              placeholder="https://…"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('industry')} *</Label>
          <Select value={industry} onValueChange={(v) => setIndustry(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('size')} *</Label>
          <Select value={size} onValueChange={(v) => setSize(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s} employees
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country">{t('country')} *</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="city">{t('city')}</Label>
          <Input id="city" name="city" defaultValue={initial?.city} />
        </div>
      </div>

      <div>
        <Label htmlFor="description">{t('description')}</Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
          rows={4}
        />
        <p className="text-caption text-[var(--ink-3)] mt-1">
          {description.length} / 280 · {t('descriptionHelper')}
        </p>
      </div>

      <div className="border border-[var(--status-warn-ink)]/20 bg-[var(--status-warn-bg)] text-[var(--status-warn-ink)] rounded-md p-3 text-caption">
        <b className="block mb-1 font-semibold">{t('verificationTitle')}</b>
        <span>{t('verificationBody')}</span>
      </div>

      <div>
        <Label>
          {t('rneLabel')}{' '}
          <span className="text-[var(--ink-4)] font-normal">{t('rneOptional')}</span>
        </Label>
        <FileDrop
          kind="registry"
          accept=".pdf,image/*"
          onUploaded={(r) => setRneUrl(r.url)}
          helper={t('rneHelper')}
        />
        {rneUrl && <p className="text-caption text-[var(--success)] mt-1">RNE uploaded</p>}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost">
          {t('saveDraft')}
        </Button>
        <Button type="submit" className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]">
          {t('continue')}
        </Button>
      </div>
    </form>
  );
}
