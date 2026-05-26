import { baseUrl, emailLayout, escapeHtml } from './_layout';

const STATUS_FR: Record<string, string> = {
  reviewed: 'examinée',
  shortlisted: 'présélectionnée',
  interview: 'invitée à un entretien',
  accepted: 'acceptée',
  rejected: 'non retenue',
};
const STATUS_EN: Record<string, string> = {
  reviewed: 'reviewed',
  shortlisted: 'shortlisted',
  interview: 'invited to interview',
  accepted: 'accepted',
  rejected: 'declined',
};

export type ApplicationStatusForEmail =
  | 'reviewed'
  | 'shortlisted'
  | 'interview'
  | 'accepted'
  | 'rejected';

export function applicationStatusTemplate({
  applicantName,
  internshipTitle,
  status,
  applicationId,
  locale,
}: {
  applicantName: string;
  internshipTitle: string;
  status: ApplicationStatusForEmail;
  applicationId: string;
  locale: 'fr' | 'en';
}) {
  const fr = locale === 'fr';
  const statusLabel = (fr ? STATUS_FR : STATUS_EN)[status];
  const title = fr
    ? `Votre candidature à ${internshipTitle} a été ${statusLabel}`
    : `Your application to ${internshipTitle} was ${statusLabel}`;
  const body = fr
    ? `<p>Bonjour ${escapeHtml(applicantName)},</p><p>L'entreprise a mis à jour votre candidature à <strong>${escapeHtml(internshipTitle)}</strong>. Statut : <strong>${statusLabel}</strong>.</p>`
    : `<p>Hi ${escapeHtml(applicantName)},</p><p>The company updated your application to <strong>${escapeHtml(internshipTitle)}</strong>. Status: <strong>${statusLabel}</strong>.</p>`;
  return {
    ...emailLayout({
      title,
      bodyHtml: body,
      ctaLabel: fr ? 'Voir la candidature' : 'View application',
      ctaHref: `${baseUrl()}/intern/applications/${applicationId}`,
    }),
    subject: title,
  };
}
