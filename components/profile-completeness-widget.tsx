import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ProfileCompleteness } from '@/modules/profiles/service';

/**
 * Profile completeness card for the intern dashboard.
 *
 * - Shows a progress bar with the percentage
 * - Lists up to 3 missing items so the user knows what to fix
 * - Hides itself entirely at 100% to keep the dashboard clean
 *
 * Server component so it can pull i18n labels directly. Pure
 * presentation — the caller computes ProfileCompleteness via
 * `computeProfileCompleteness`.
 */
export async function ProfileCompletenessWidget({
  completeness,
  editHref = '/account/edit',
}: {
  completeness: ProfileCompleteness;
  editHref?: string;
}) {
  if (completeness.percent >= 100) return null;
  const t = await getTranslations('profileCompleteness');

  // Tone the bar — red <40, amber 40-79, green 80+
  const tone =
    completeness.percent >= 80
      ? 'var(--success)'
      : completeness.percent >= 40
        ? '#f59e0b'
        : 'var(--danger)';

  const top3Missing = completeness.missing.slice(0, 3);

  return (
    <section className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="text-[14px] font-semibold tracking-tight">{t('title')}</h2>
          <p className="text-[12.5px] text-[var(--ink-3)]">{t('subtitle')}</p>
        </div>
        <span className="font-mono text-[18px] font-semibold" style={{ color: tone }}>
          {completeness.percent}%
        </span>
      </div>

      <div
        className="h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden mb-4"
        role="progressbar"
        aria-valuenow={completeness.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('title')}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${completeness.percent}%`, background: tone }}
        />
      </div>

      {top3Missing.length > 0 && (
        <ul className="flex flex-wrap gap-2 mb-4">
          {top3Missing.map((m) => (
            <li
              key={m.key}
              className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[12px] text-[var(--ink-2)]"
            >
              <span className="text-[var(--danger)] mr-1.5" aria-hidden>
                ○
              </span>
              {t(`missing.${m.key}`)}
            </li>
          ))}
          {completeness.missing.length > top3Missing.length && (
            <li className="inline-flex items-center px-2.5 py-1 text-[12px] text-[var(--ink-3)]">
              + {completeness.missing.length - top3Missing.length} {t('more')}
            </li>
          )}
        </ul>
      )}

      <Link
        href={editHref}
        className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
      >
        {t('cta')}
      </Link>
    </section>
  );
}
