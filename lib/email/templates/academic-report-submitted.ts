import { baseUrl, emailLayout, escapeHtml } from './_layout';

/** Notify a coordinator that a managed student submitted their rapport. */
export function academicReportSubmittedTemplate({
  coordinatorName,
  studentName,
  version,
  studentUserId,
  locale,
}: {
  coordinatorName: string;
  studentName: string;
  version: number;
  studentUserId: string;
  locale: 'fr' | 'en';
}): { subject: string; text: string; html: string } {
  const fr = locale === 'fr';
  const studentHtml = escapeHtml(studentName);
  const coord = escapeHtml(coordinatorName);
  // Subject is the plain-text SMTP header; emailLayout escapes it for the HTML <title>.
  // Escape only for the body to avoid double-escaping / entities in the subject header.
  const subject = fr
    ? `${studentName} a soumis son rapport (v${version})`
    : `${studentName} submitted their report (v${version})`;
  const bodyHtml = fr
    ? `<p>Bonjour ${coord},</p><p><strong>${studentHtml}</strong> a soumis la version <strong>v${version}</strong> de son rapport académique pour relecture.</p>`
    : `<p>Hi ${coord},</p><p><strong>${studentHtml}</strong> submitted <strong>v${version}</strong> of their academic report for review.</p>`;
  return {
    ...emailLayout({
      title: subject,
      bodyHtml,
      ctaLabel: fr ? 'Relire le rapport' : 'Review the report',
      ctaHref: `${baseUrl()}/university/students/${studentUserId}`,
    }),
    subject,
  };
}
