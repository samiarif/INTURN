/**
 * Canonical internship-sector list.
 *
 * Sectors are persisted on the internship row by their stable `value` (the
 * original English string). Never translate or rename a `value` — legacy rows
 * store it verbatim and a mismatch silently drops the sector. The `id` is the
 * i18n key suffix: display a localized label via `t(`sector.${id}`)`.
 *
 * This list is the single source of truth shared by the create form (which
 * persists `value`) and every read surface that renders a stored sector (the
 * public attestation page, the PDF, the admin report detail).
 */
export const INTERNSHIP_SECTORS: ReadonlyArray<{ value: string; id: string }> = [
  { value: 'Design', id: 'design' },
  { value: 'Software & tech', id: 'softwareTech' },
  { value: 'Marketing & comms', id: 'marketingComms' },
  { value: 'Product', id: 'product' },
  { value: 'Data', id: 'data' },
  { value: 'Operations', id: 'operations' },
  { value: 'Finance', id: 'finance' },
  { value: 'Content', id: 'content' },
  { value: 'Other', id: 'other' },
];

/**
 * Map a stored sector `value` to its i18n key suffix (`id`). Returns `null`
 * for empty, unknown, or legacy values that aren't in the canonical list —
 * callers must fall back to rendering the raw value so an old/free-text sector
 * still shows *something* rather than disappearing.
 */
export function sectorKeyFromValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return INTERNSHIP_SECTORS.find((s) => s.value === value)?.id ?? null;
}
