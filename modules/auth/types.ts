export const ROLES = ['intern', 'company', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const SELECTABLE_ROLES = ['intern', 'company'] as const;
export type SelectableRole = (typeof SELECTABLE_ROLES)[number];

export function isSelectableRole(value: string): value is SelectableRole {
  return (SELECTABLE_ROLES as readonly string[]).includes(value);
}
