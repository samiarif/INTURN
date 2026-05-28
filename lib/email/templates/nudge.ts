import { baseUrl, emailLayout, escapeHtml } from './_layout';

export function nudgeTemplate({
  internName,
  supervisorName,
  workspaceTitle,
  workspaceId,
  message,
  locale,
}: {
  internName: string;
  supervisorName: string;
  workspaceTitle: string;
  workspaceId: string;
  message: string | null;
  locale: 'fr' | 'en';
}) {
  const fr = locale === 'fr';
  const title = fr
    ? `${escapeHtml(supervisorName)} vous envoie un rappel`
    : `${escapeHtml(supervisorName)} sent you a nudge`;

  const messageBlock =
    message
      ? fr
        ? `<p style="margin:16px 0;padding:12px;background:#F9FAFB;border-left:3px solid #7C3AED;border-radius:4px;">${escapeHtml(message)}</p>`
        : `<p style="margin:16px 0;padding:12px;background:#F9FAFB;border-left:3px solid #7C3AED;border-radius:4px;">${escapeHtml(message)}</p>`
      : '';

  const body = fr
    ? `<p>Bonjour ${escapeHtml(internName)},</p><p>Votre superviseur <strong>${escapeHtml(supervisorName)}</strong> vous envoie un rappel concernant le workspace <strong>${escapeHtml(workspaceTitle)}</strong>.</p>${messageBlock}<p>Consultez votre workspace pour rester à jour.</p>`
    : `<p>Hi ${escapeHtml(internName)},</p><p>Your supervisor <strong>${escapeHtml(supervisorName)}</strong> sent you a nudge about <strong>${escapeHtml(workspaceTitle)}</strong>.</p>${messageBlock}<p>Check your workspace to stay on track.</p>`;

  return {
    ...emailLayout({
      title,
      bodyHtml: body,
      ctaLabel: fr ? 'Voir mon workspace' : 'View my workspace',
      ctaHref: `${baseUrl()}/intern/workspaces/${workspaceId}`,
    }),
    subject: title,
  };
}
