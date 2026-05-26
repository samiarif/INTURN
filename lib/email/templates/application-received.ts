import { baseUrl, emailLayout, escapeHtml } from './_layout';

export function applicationReceivedTemplate({
  supervisorName,
  internshipTitle,
  applicantName,
  applicationId,
  locale,
}: {
  supervisorName: string;
  internshipTitle: string;
  applicantName: string;
  applicationId: string;
  locale: 'fr' | 'en';
}) {
  const fr = locale === 'fr';
  const title = fr
    ? `Nouvelle candidature — ${internshipTitle}`
    : `New application — ${internshipTitle}`;
  const body = fr
    ? `<p>Bonjour ${escapeHtml(supervisorName)},</p><p><strong>${escapeHtml(applicantName)}</strong> vient de postuler à <strong>${escapeHtml(internshipTitle)}</strong>.</p>`
    : `<p>Hi ${escapeHtml(supervisorName)},</p><p><strong>${escapeHtml(applicantName)}</strong> just applied to <strong>${escapeHtml(internshipTitle)}</strong>.</p>`;
  return {
    ...emailLayout({
      title,
      bodyHtml: body,
      ctaLabel: fr ? 'Voir la candidature' : 'Review application',
      ctaHref: `${baseUrl()}/company/applications/${applicationId}`,
    }),
    subject: title,
  };
}
