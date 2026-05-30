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
  note,
}: {
  applicantName: string;
  internshipTitle: string;
  status: ApplicationStatusForEmail;
  applicationId: string;
  locale: 'fr' | 'en';
  note?: string;
}) {
  const fr = locale === 'fr';
  const statusLabel = (fr ? STATUS_FR : STATUS_EN)[status];
  const title = fr
    ? `Votre candidature à ${internshipTitle} a été ${statusLabel}`
    : `Your application to ${internshipTitle} was ${statusLabel}`;
  const intro = fr
    ? `<p>Bonjour ${escapeHtml(applicantName)},</p><p>L'entreprise a mis à jour votre candidature à <strong>${escapeHtml(internshipTitle)}</strong>. Statut : <strong>${statusLabel}</strong>.</p>`
    : `<p>Hi ${escapeHtml(applicantName)},</p><p>The company updated your application to <strong>${escapeHtml(internshipTitle)}</strong>. Status: <strong>${statusLabel}</strong>.</p>`;

  // Optional company→candidate feedback. Quoted block, rendered ONLY when the
  // company attached a non-empty note; absent otherwise (graceful, unchanged).
  const trimmed = note?.trim();
  const heading = fr ? "Retour de l'entreprise" : 'Feedback from the company';
  const feedback = trimmed
    ? `<p style="margin-top:16px;font-weight:600;">${heading}</p><blockquote style="margin:8px 0;padding:12px 16px;border-left:3px solid #7C3AED;background:#F9FAFB;color:#374151;white-space:pre-line;">${escapeHtml(trimmed)}</blockquote>`
    : '';

  return {
    ...emailLayout({
      title,
      bodyHtml: `${intro}${feedback}`,
      ctaLabel: fr ? 'Voir la candidature' : 'View application',
      ctaHref: `${baseUrl()}/intern/applications/${applicationId}`,
    }),
    subject: title,
  };
}
