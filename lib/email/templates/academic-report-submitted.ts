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
  const student = escapeHtml(studentName);
  const coord = escapeHtml(coordinatorName);
  const subject = fr
    ? `${student} a soumis son rapport (v${version})`
    : `${student} submitted their report (v${version})`;
  const bodyHtml = fr
    ? `<p>Bonjour ${coord},</p><p><strong>${student}</strong> a soumis la version <strong>v${version}</strong> de son rapport académique pour relecture.</p>`
    : `<p>Hi ${coord},</p><p><strong>${student}</strong> submitted <strong>v${version}</strong> of their academic report for review.</p>`;
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
