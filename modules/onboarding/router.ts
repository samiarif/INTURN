import type { Profile } from '@/db/schema';

export type InternStep =
  | '/onboarding/intern/basics'
  | '/onboarding/intern/skills'
  | '/onboarding/intern/done';

/**
 * Pure router: given an intern's profile, return the next onboarding step
 * they should resume from. Returns null if the profile is fully complete.
 *
 * Stage gates:
 * - basics: profile exists AND university is set (basics form persists this)
 * - skills: at least 3 skills (validator requires 3 minimum)
 * - done:   profileStep === 'complete' OR both gates passed
 */
export function nextInternStep(profile: Profile | null): InternStep | null {
  // No profile row yet → start at basics
  if (!profile) return '/onboarding/intern/basics';

  // Authoritative short-circuit: persisted complete flag wins
  if (profile.profileStep === 'complete') return '/onboarding/intern/done';

  // Basics gate: university is the canonical "basics saved" marker on profiles.
  // (firstName/lastName live on users, not profiles, so we don't check them here.)
  if (!profile.university) return '/onboarding/intern/basics';

  // Skills gate: validator requires >= 3 skills before marking complete
  const skills = (profile.skills ?? []) as string[];
  if (skills.length < 3) return '/onboarding/intern/skills';

  return '/onboarding/intern/done';
}
