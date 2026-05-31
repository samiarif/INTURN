import { baseUrl, emailLayout, escapeHtml, greeting } from './_layout';

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
  // Student name may be empty (not-yet-onboarded) — localize the fallback. The
  // subject is the plain-text SMTP header (emailLayout escapes it for the HTML
  // <title>); the body escapes separately to avoid double-escaping.
  const studentDisplay = studentName.trim() || (fr ? 'Un·e étudiant·e' : 'A student');
  const studentHtml = escapeHtml(studentDisplay);
  const subject = fr
    ? `${studentDisplay} a soumis son rapport (v${version})`
    : `${studentDisplay} submitted their report (v${version})`;
  const bodyHtml = fr
    ? `<p>${greeting(coordinatorName, locale)}</p><p><strong>${studentHtml}</strong> a soumis la version <strong>v${version}</strong> de son rapport académique pour relecture.</p>`
    : `<p>${greeting(coordinatorName, locale)}</p><p><strong>${studentHtml}</strong> submitted <strong>v${version}</strong> of their academic report for review.</p>`;
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
