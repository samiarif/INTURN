// Shared view-model types for the Phase E Team page UI.
//
// Plain types only — safe to import from both server and client components.
import type { OrganizationMember } from '@/db/schema';

/**
 * An org member enriched with the user-row fields the roster needs to render
 * (name + avatar). Invited members have no linked user yet, so all three
 * enrichment fields are nullable. Built server-side in the page component.
 */
export type TeamMember = OrganizationMember & {
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

/**
 * A trimmed project row for the multiselect / supervisor preselect. Carries
 * `supervisorIds` so a supervisor's current projects can be pre-checked.
 */
export type ProjectLite = {
  id: string;
  name: string;
  supervisorIds: string[] | null;
};
