import { baseUrl, emailLayout, escapeHtml } from './_layout';

export function teamInviteTemplate({
  orgName,
  inviterName,
  role,
  token,
  locale,
}: {
  orgName: string;
  inviterName: string;
  role: 'admin' | 'supervisor';
  token: string;
  locale: 'fr' | 'en';
}): { subject: string; text: string; html: string } {
  const fr = locale !== 'en';
  const ctaHref = `${baseUrl()}/invite/${token}`;

  const roleLabel = fr
    ? role === 'admin'
      ? 'administrateur'
      : 'superviseur'
    : role === 'admin'
      ? 'admin'
      : 'supervisor';

  const subject = fr
    ? `Invitation à rejoindre ${escapeHtml(orgName)} sur Inturn`
    : `You've been invited to join ${escapeHtml(orgName)} on Inturn`;

  const bodyHtml = fr
    ? `<p><strong>${escapeHtml(inviterName)}</strong> vous invite à rejoindre l'organisation <strong>${escapeHtml(orgName)}</strong> en tant que <strong>${roleLabel}</strong> sur Inturn.</p>
<p>Cliquez sur le bouton ci-dessous pour accepter l'invitation. Ce lien expire dans 7 jours.</p>`
    : `<p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(orgName)}</strong> as a <strong>${roleLabel}</strong> on Inturn.</p>
<p>Click the button below to accept the invitation. This link expires in 7 days.</p>`;

  const ctaLabel = fr ? "Accepter l'invitation" : 'Accept invitation';

  return {
    ...emailLayout({ title: subject, bodyHtml, ctaLabel, ctaHref }),
    subject,
  };
}
