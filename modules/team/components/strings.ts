// Inline bilingual dictionary for the Phase E Team page.
//
// Phase I migrates these to next-intl keys. Until then, server + client
// components import this plain module so they share one source of strings
// without pulling next-intl into client bundles. NO `'use client'` here —
// it must be importable from both server and client components.

export const TEAM_STR = {
  fr: {
    // Page shell
    title: 'Équipe',
    subtitle: 'Gérez les membres de votre organisation et suivez vos stagiaires.',
    // Filter pills
    pillAll: 'Tous',
    pillAdmin: 'Admins',
    pillSupervisor: 'Encadrants',
    pillIntern: 'Stagiaires',
    // Toolbar
    search: 'Rechercher par nom ou e-mail…',
    viewList: 'Liste',
    viewGrid: 'Grille',
    // Roles
    roleOwner: 'Propriétaire',
    roleAdmin: 'Admin',
    roleSupervisor: 'Encadrant',
    pendingInvite: 'Invitation en attente',
    // Actions / sections
    addMember: 'Ajouter un membre',
    sectionStaff: 'Équipe',
    sectionInterns: 'Stagiaires',
    // Invite modal
    modalTitle: 'Inviter un membre',
    modalEmailLabel: 'Adresse e-mail',
    modalEmailPlaceholder: 'nom@exemple.com',
    modalRoleLabel: 'Rôle',
    modalProjectsLabel: 'Projets encadrés',
    modalSend: "Envoyer l'invitation",
    modalSending: 'Envoi…',
    modalCancel: 'Annuler',
    // Row menu actions
    actionChangeToAdmin: 'Passer admin',
    actionChangeToSupervisor: 'Passer encadrant',
    actionManageProjects: 'Gérer les projets',
    actionRemove: 'Retirer',
    actionResend: "Renvoyer l'invitation",
    actionRevoke: "Révoquer l'invitation",
    rowActions: 'Actions',
    // Intern row
    openWorkspace: "Ouvrir l'espace",
    supervisedBy: 'Encadré par',
    noSupervisors: 'Aucun encadrant',
    statusActive: 'Actif',
    // Empty states
    noStaff: 'Aucun membre ne correspond.',
    noInterns: 'Les stagiaires apparaissent ici une fois acceptés depuis la marketplace.',
    // Misc
    confirmRemove: 'Retirer ce membre ?',
    saveProjects: 'Enregistrer',
    saving: 'Enregistrement…',
    noProjects: 'Aucun projet pour le moment.',
    errorGeneric: "Une erreur s'est produite. Réessayez.",
    errorRateLimited: 'Trop de tentatives. Réessayez dans un instant.',
    emailRequired: 'Saisissez une adresse e-mail valide.',
    membersCount: 'membres',
    internsCount: 'stagiaires',
    goToProjects: 'Voir les projets',
  },
  en: {
    // Page shell
    title: 'Team',
    subtitle: 'Manage your organization members and keep track of your interns.',
    // Filter pills
    pillAll: 'All',
    pillAdmin: 'Admins',
    pillSupervisor: 'Supervisors',
    pillIntern: 'Interns',
    // Toolbar
    search: 'Search by name or email…',
    viewList: 'List',
    viewGrid: 'Grid',
    // Roles
    roleOwner: 'Owner',
    roleAdmin: 'Admin',
    roleSupervisor: 'Supervisor',
    pendingInvite: 'Pending invite',
    // Actions / sections
    addMember: 'Add Member',
    sectionStaff: 'Staff',
    sectionInterns: 'Interns',
    // Invite modal
    modalTitle: 'Invite a member',
    modalEmailLabel: 'Email address',
    modalEmailPlaceholder: 'name@example.com',
    modalRoleLabel: 'Role',
    modalProjectsLabel: 'Supervised projects',
    modalSend: 'Send invite',
    modalSending: 'Sending…',
    modalCancel: 'Cancel',
    // Row menu actions
    actionChangeToAdmin: 'Make admin',
    actionChangeToSupervisor: 'Make supervisor',
    actionManageProjects: 'Manage projects',
    actionRemove: 'Remove',
    actionResend: 'Resend invite',
    actionRevoke: 'Revoke invite',
    rowActions: 'Actions',
    // Intern row
    openWorkspace: 'Open workspace',
    supervisedBy: 'Supervised by',
    noSupervisors: 'No supervisors',
    statusActive: 'Active',
    // Empty states
    noStaff: 'No members match.',
    noInterns: "Interns appear here once they're accepted from the marketplace.",
    // Misc
    confirmRemove: 'Remove this member?',
    saveProjects: 'Save',
    saving: 'Saving…',
    noProjects: 'No projects yet.',
    errorGeneric: 'Something went wrong. Please try again.',
    errorRateLimited: 'Too many attempts. Try again in a moment.',
    emailRequired: 'Enter a valid email address.',
    membersCount: 'members',
    internsCount: 'interns',
    goToProjects: 'View projects',
  },
} as const;

// Widen the per-key literal types to `string` so the two locale objects are
// structurally interchangeable (the `as const` keeps each value a literal,
// which would otherwise make `fr` incompatible with `en`).
export type TeamStrings = { readonly [K in keyof (typeof TEAM_STR)['en']]: string };

export function teamStrings(locale: string): TeamStrings {
  return TEAM_STR[locale === 'en' ? 'en' : 'fr'];
}
