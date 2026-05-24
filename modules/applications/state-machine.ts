// Pure state machine — safe to import from client components.
// (modules/applications/service.ts touches the DB and must not be imported client-side.)

export type ApplicationStatus =
  | 'new'
  | 'reviewed'
  | 'shortlisted'
  | 'interview'
  | 'accepted'
  | 'rejected';

const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  new: ['reviewed', 'rejected'],
  reviewed: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'accepted', 'rejected'],
  interview: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

export function isValidApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
