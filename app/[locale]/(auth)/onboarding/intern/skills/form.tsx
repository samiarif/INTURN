'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChipInput } from '@/components/chip-input';
import { RoleChipGrid } from '@/components/role-chip-grid';
import { LinkRepeater, type PortfolioLink } from '@/components/link-repeater';
import { FileDrop } from '@/components/file-drop';
import type { RoleCategory } from '@/modules/profiles/validators';
import { saveProfileSkillsAction } from '@/modules/profiles/server-actions';

type SkillsInitial = Partial<{
  skills: string[];
  roles: RoleCategory[];
  cvUrl: string;
  portfolioLinks: PortfolioLink[];
}>;

export function ProfileSkillsForm({ initial }: { initial?: SkillsInitial }) {
  const t = useTranslations('onboarding.intern.skills');
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [roles, setRoles] = useState<RoleCategory[]>(initial?.roles ?? []);
  const [cvUrl, setCvUrl] = useState<string>(initial?.cvUrl ?? '');
  const [links, setLinks] = useState<PortfolioLink[]>(initial?.portfolioLinks ?? []);

  return (
    <form action={saveProfileSkillsAction} className="space-y-6">
      <input type="hidden" name="skills" value={JSON.stringify(skills)} />
      <input type="hidden" name="roles" value={JSON.stringify(roles)} />
      <input type="hidden" name="cvUrl" value={cvUrl} />
      <input type="hidden" name="portfolioLinks" value={JSON.stringify(links)} />

      <div>
        <Label>{t('skillsLabel')} *</Label>
        <ChipInput value={skills} onChange={setSkills} />
      </div>

      <div>
        <Label>{t('rolesLabel')}</Label>
        <p className="text-caption text-[var(--ink-3)] mb-2">{t('rolesHelper')}</p>
        <RoleChipGrid value={roles} onChange={setRoles} />
      </div>

      <div>
        <Label>
          {t('cvLabel')}{' '}
          <span className="text-[var(--ink-4)] font-normal">{t('optional')}</span>
        </Label>
        <FileDrop
          kind="cv"
          accept=".pdf"
          onUploaded={(r) => setCvUrl(r.url)}
          helper={t('cvHelper')}
        />
        {cvUrl && (
          <p className="text-caption text-[var(--success)] mt-1">
            CV uploaded ·{' '}
            <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="underline">
              view
            </a>
          </p>
        )}
      </div>

      <div>
        <Label>{t('linksLabel')}</Label>
        <LinkRepeater value={links} onChange={setLinks} />
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={() => history.back()}>
          {t('back')}
        </Button>
        <Button
          type="submit"
          className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
        >
          {t('finish')}
        </Button>
      </div>
    </form>
  );
}
