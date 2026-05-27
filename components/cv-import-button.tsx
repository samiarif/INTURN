'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

type CvParsedFields = {
  firstName: string | null;
  lastName: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  yearOfStudy: string | null;
  city: string | null;
  skills: string[];
  languages: string[];
  portfolioLinks: Array<{ platform: string; url: string }>;
  preferredLanguage: 'fr' | 'en' | null;
  notes: string;
};

/**
 * One-click CV import. User drops a PDF, we POST to /api/ai/cv-parse
 * (Claude vision) and surface the extracted fields as a confirmable
 * patch.
 *
 * Currently the patch is applied via window.dispatchEvent('cv-parsed')
 * so any compatible form on the page can listen. Forms that haven't
 * been migrated yet can ignore the event safely.
 *
 * Why event-based? The form's state is owned by the form component;
 * this button is a sibling. Passing setters in would couple the
 * button to one specific form. Custom event keeps both decoupled.
 */
export function CvImportButton() {
  const t = useTranslations('cvImport');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CvParsedFields | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setParsed(null);

    if (file.size > 8 * 1024 * 1024) {
      setError(t('errorTooLarge'));
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError(t('errorNotPdf'));
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/ai/cv-parse', { method: 'POST', body: fd });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          const code = json.error ?? 'unknown';
          if (code === 'rate_limited') setError(t('errorRateLimited'));
          else if (code === 'too_large') setError(t('errorTooLarge'));
          else if (code === 'not_pdf') setError(t('errorNotPdf'));
          else setError(t('errorGeneric'));
          return;
        }
        const json = (await res.json()) as { parsed: CvParsedFields };
        setParsed(json.parsed);
      } catch {
        setError(t('errorNetwork'));
      }
    });
  }

  function applyParsed() {
    if (!parsed) return;
    // Fire a custom event that the form can listen for.
    window.dispatchEvent(
      new CustomEvent('cv-parsed', { detail: parsed }),
    );
    setParsed(null);
  }

  return (
    <div className="border border-dashed border-[var(--brand-500)] rounded-lg p-5 bg-[var(--brand-50)] mb-6">
      <div className="flex items-start gap-3 mb-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--brand-700)] mb-1">
            ✦ {t('eyebrow')}
          </p>
          <h3 className="text-[14px] font-semibold tracking-tight text-[var(--ink)] mb-1">
            {t('title')}
          </h3>
          <p className="text-[12.5px] text-[var(--ink-3)] max-w-[60ch]">{t('subtitle')}</p>
        </div>
        <label
          className={
            'inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium cursor-pointer ' +
            (pending
              ? 'bg-[var(--ink-3)] text-white cursor-not-allowed opacity-70'
              : 'bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]')
          }
        >
          <input
            type="file"
            accept="application/pdf"
            disabled={pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
            className="sr-only"
          />
          {pending ? t('parsing') : t('cta')}
        </label>
      </div>

      {error && (
        <p className="text-[13px] text-[var(--danger)] mt-2">{error}</p>
      )}

      {parsed && (
        <div className="mt-4 border-t border-[var(--border-color)] pt-3">
          <p className="text-[12.5px] text-[var(--ink-2)] mb-3 italic">{parsed.notes}</p>
          <ul className="text-[13px] text-[var(--ink-2)] space-y-1.5 mb-4">
            {parsed.firstName && (
              <li>
                <strong>{t('fields.name')}</strong> {parsed.firstName} {parsed.lastName ?? ''}
              </li>
            )}
            {parsed.university && (
              <li>
                <strong>{t('fields.university')}</strong> {parsed.university}
              </li>
            )}
            {parsed.fieldOfStudy && (
              <li>
                <strong>{t('fields.field')}</strong> {parsed.fieldOfStudy}
              </li>
            )}
            {parsed.yearOfStudy && (
              <li>
                <strong>{t('fields.year')}</strong> {parsed.yearOfStudy}
              </li>
            )}
            {parsed.city && (
              <li>
                <strong>{t('fields.city')}</strong> {parsed.city}
              </li>
            )}
            {parsed.skills.length > 0 && (
              <li>
                <strong>{t('fields.skills')}</strong> {parsed.skills.join(', ')}
              </li>
            )}
            {parsed.portfolioLinks.length > 0 && (
              <li>
                <strong>{t('fields.portfolio')}</strong>{' '}
                {parsed.portfolioLinks.map((l) => l.platform).join(', ')}
              </li>
            )}
          </ul>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyParsed}
              className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
            >
              {t('apply')}
            </button>
            <button
              type="button"
              onClick={() => setParsed(null)}
              className="inline-flex items-center h-9 px-3 text-sm text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              {t('discard')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
