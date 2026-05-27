'use client';

import { useTranslations } from 'next-intl';
import { INTERNSHIP_TEMPLATES, type InternshipTemplate } from '@/lib/internship-templates';

/**
 * Compact picker shown above the internship creation form. Click a card
 * → the new-internship form gets prefilled (handled by the parent which
 * passes onPick).
 *
 * Pure visual. Server form retains the i18n labels and uses the picked
 * template only to fill input defaults — the form is still fully
 * editable post-pick.
 */
export function TemplatePicker({
  onPick,
}: {
  onPick: (template: InternshipTemplate) => void;
}) {
  const t = useTranslations('internshipTemplates');

  return (
    <section className="mb-8 border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-[var(--ink)] mb-1">
            {t('pickerTitle')}
          </h2>
          <p className="text-[12.5px] text-[var(--ink-3)]">{t('pickerSubtitle')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {INTERNSHIP_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onPick(template)}
            className="text-left border border-[var(--border-color)] rounded-md bg-[var(--surface)] p-3 hover:border-[var(--brand-500)] hover:bg-[var(--brand-50)] transition-colors group"
          >
            <div className="font-mono uppercase tracking-[0.06em] text-[10px] text-[var(--ink-3)] mb-1">
              {template.sector} · {template.duration}wk · {template.locationType}
            </div>
            <h3 className="text-[13.5px] font-semibold text-[var(--ink)] mb-1 leading-snug">
              {t(`${template.id}.title`)}
            </h3>
            <p className="text-[12px] text-[var(--ink-3)] line-clamp-2 leading-snug">
              {t(`${template.id}.description`)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
