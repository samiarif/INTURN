/**
 * Marketplace match-score helpers.
 *
 * The marketplace explore view ranks listings against the signed-in intern's
 * profile by simple set-overlap of skills. Score is the fraction of the
 * listing's required skills that the intern already has, expressed as a
 * 0–100 integer. Comparison is case-insensitive and trimmed so "Figma"
 * matches "  figma  ".
 *
 * Returns 0 (not undefined) when either side is empty so the caller can
 * freely sort/threshold without guarding.
 */
export function matchScore(
  internSkills: string[] | null | undefined,
  listingSkills: unknown,
): number {
  if (
    !internSkills ||
    internSkills.length === 0 ||
    !Array.isArray(listingSkills) ||
    listingSkills.length === 0
  ) {
    return 0;
  }
  const internSet = new Set(internSkills.map((s) => s.toLowerCase().trim()));
  const overlap = listingSkills.filter(
    (s): s is string => typeof s === 'string' && internSet.has(s.toLowerCase().trim()),
  ).length;
  return Math.round((overlap / listingSkills.length) * 100);
}

/**
 * Skills (as they appear on the listing, original casing) that the intern
 * already has — used to render the "have" chip variant. Lookup uses a
 * case-insensitive set, but the returned values preserve the listing's
 * own strings so the UI shows the role's spelling.
 */
export function intersectingSkills(
  internSkills: string[] | null | undefined,
  listingSkills: unknown,
): Set<string> {
  if (!internSkills || internSkills.length === 0 || !Array.isArray(listingSkills)) {
    return new Set();
  }
  const internSet = new Set(internSkills.map((s) => s.toLowerCase().trim()));
  return new Set(
    listingSkills.filter(
      (s): s is string => typeof s === 'string' && internSet.has(s.toLowerCase().trim()),
    ),
  );
}
