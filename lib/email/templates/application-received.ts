import { baseUrl, emailLayout, escapeHtml, greeting } from './_layout';

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
  // Applicant name may be empty (not-yet-onboarded) — localize the fallback.
  const applicant = applicantName.trim()
    ? escapeHtml(applicantName)
    : fr
      ? "Quelqu'un"
      : 'Someone';
  const body = fr
    ? `<p>${greeting(supervisorName, locale)}</p><p><strong>${applicant}</strong> vient de postuler à <strong>${escapeHtml(internshipTitle)}</strong>.</p>`
    : `<p>${greeting(supervisorName, locale)}</p><p><strong>${applicant}</strong> just applied to <strong>${escapeHtml(internshipTitle)}</strong>.</p>`;
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
