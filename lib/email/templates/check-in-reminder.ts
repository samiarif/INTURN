import { baseUrl, emailLayout, escapeHtml, greeting } from './_layout';

export function checkInReminderTemplate({
  internName,
  workspaceTitle,
  workspaceId,
  locale,
}: {
  internName: string;
  workspaceTitle: string;
  workspaceId: string;
  locale: 'fr' | 'en';
}) {
  const fr = locale === 'fr';
  const title = fr
    ? `Votre point hebdomadaire — ${workspaceTitle}`
    : `Weekly check-in due — ${workspaceTitle}`;
  const body = fr
    ? `<p>${greeting(internName, locale)}</p><p>Votre point hebdomadaire pour <strong>${escapeHtml(workspaceTitle)}</strong> est attendu. Inturn peut rédiger un premier brouillon à partir de votre activité — il suffit de l'éditer et de l'envoyer.</p>`
    : `<p>${greeting(internName, locale)}</p><p>Your weekly check-in for <strong>${escapeHtml(workspaceTitle)}</strong> is due. Inturn can draft it from your activity — just edit and send.</p>`;
  return {
    ...emailLayout({
      title,
      bodyHtml: body,
      ctaLabel: fr ? 'Rédiger mon point' : 'Draft my check-in',
      ctaHref: `${baseUrl()}/intern/workspaces/${workspaceId}/check-in`,
    }),
    subject: title,
  };
}
