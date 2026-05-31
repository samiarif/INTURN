/**
 * Canonical company-industry list.
 *
 * Industry is persisted on the organization row by its stable `value` (the
 * original English string). Never translate or rename a `value` — existing
 * rows store it verbatim and a mismatch silently drops the industry. The `key`
 * is the i18n suffix: display a localized label via
 * `t(`onboarding.company.industries.${key}`)`.
 *
 * Single source of truth shared by the onboarding form (which persists
 * `value`) and every read surface that renders a stored industry (the account
 * page, the admin user detail). Distinct domain from internship sectors —
 * keep the two lists separate.
 */
export const COMPANY_INDUSTRIES: ReadonlyArray<{ value: string; key: string }> = [
  { value: 'Design & creative', key: 'designCreative' },
  { value: 'Software & tech', key: 'softwareTech' },
  { value: 'Marketing & comms', key: 'marketingComms' },
  { value: 'Finance', key: 'finance' },
  { value: 'Education', key: 'education' },
  { value: 'Healthcare', key: 'healthcare' },
  { value: 'Manufacturing', key: 'manufacturing' },
  { value: 'Retail', key: 'retail' },
  { value: 'Other', key: 'other' },
];

/**
 * Map a stored industry `value` to its i18n key suffix. Returns `null` for
 * empty, unknown, or legacy values not in the canonical list — callers must
 * fall back to rendering the raw value so an old/free-text industry still
 * shows *something* rather than disappearing.
 */
export function industryKeyFromValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return COMPANY_INDUSTRIES.find((i) => i.value === value)?.key ?? null;
}
