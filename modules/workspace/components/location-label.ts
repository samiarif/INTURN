/**
 * Map the stored internship `locationType` value (persisted verbatim, never
 * translated) to its i18n key suffix under `workspace.brief.mode`. Unknown or
 * empty values fall back to the hybrid label.
 *
 * Shared by the brief card and the workspace shell mode chip so both surfaces
 * localize the location identically. Keep the key set in sync with the
 * `workspace.brief.mode` map (onSite / remote / hybrid).
 */
export function locationLabelKey(
  locationType: string | null | undefined,
): 'onSite' | 'remote' | 'hybrid' {
  switch (locationType) {
    case 'on-site':
      return 'onSite';
    case 'virtual':
      return 'remote';
    case 'hybrid':
      return 'hybrid';
    default:
      return 'hybrid';
  }
}
