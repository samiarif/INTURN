import { baseUrl, emailLayout, escapeHtml } from './_layout';

/** Notify a student that their coordinator approved or requested a revision. */
export function academicReportReviewedTemplate({
  studentName,
  outcome,
  feedback,
  locale,
}: {
  studentName: string;
  outcome: 'approved' | 'revision';
  feedback?: string;
  locale: 'fr' | 'en';
}): { subject: string; text: string; html: string } {
  const fr = locale === 'fr';
  const student = escapeHtml(studentName);
  const subject =
    outcome === 'approved'
      ? fr
        ? 'Votre rapport a été approuvé'
        : 'Your report was approved'
      : fr
        ? 'Votre rapport nécessite une révision'
        : 'Your report needs a revision';

  const intro =
    outcome === 'approved'
      ? fr
        ? `<p>Bonjour ${student},</p><p>Votre encadrant a <strong>approuvé</strong> votre rapport académique. Félicitations !</p>`
        : `<p>Hi ${student},</p><p>Your coordinator <strong>approved</strong> your academic report. Congratulations!</p>`
      : fr
        ? `<p>Bonjour ${student},</p><p>Votre encadrant a demandé une <strong>révision</strong> de votre rapport.</p>`
        : `<p>Hi ${student},</p><p>Your coordinator requested a <strong>revision</strong> of your report.</p>`;

  const trimmed = feedback?.trim();
  const heading = fr ? "Retour de l'encadrant" : 'Coordinator feedback';
  const feedbackBlock =
    outcome === 'revision' && trimmed
      ? `<p style="margin-top:16px;font-weight:600;">${heading}</p><blockquote style="margin:8px 0;padding:12px 16px;border-left:3px solid #7C3AED;background:#F9FAFB;color:#374151;white-space:pre-line;">${escapeHtml(trimmed)}</blockquote>`
      : '';

  return {
    ...emailLayout({
      title: subject,
      bodyHtml: `${intro}${feedbackBlock}`,
      ctaLabel: fr ? 'Voir mon rapport' : 'View my report',
      ctaHref: `${baseUrl()}/intern/university`,
    }),
    subject,
  };
}
