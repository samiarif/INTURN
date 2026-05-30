import { baseUrl, emailLayout, escapeHtml } from './_layout';

export function universityInviteTemplate({
  universityName,
  inviterName,
  token,
  variant,
  locale,
}: {
  universityName: string;
  inviterName: string;
  token: string;
  variant: 'coordinator' | 'student';
  locale: 'fr' | 'en';
}): { subject: string; text: string; html: string } {
  const fr = locale !== 'en';
  const ctaHref = `${baseUrl()}/invite/${token}`;
  const uni = escapeHtml(universityName);
  const inviter = escapeHtml(inviterName);

  const subject = fr
    ? variant === 'coordinator'
      ? `Vous êtes invité(e) à encadrer ${uni} sur Inturn`
      : `${uni} vous invite sur Inturn`
    : variant === 'coordinator'
      ? `You're invited to coordinate ${uni} on Inturn`
      : `${uni} invited you to Inturn`;

  const bodyHtml = fr
    ? variant === 'coordinator'
      ? `<p><strong>${inviter}</strong> vous invite à rejoindre <strong>${uni}</strong> en tant qu'<strong>encadrant académique</strong> sur Inturn — vous pourrez inviter vos étudiants et suivre l'avancement de leurs stages.</p>
<p>Cliquez ci-dessous pour accepter. Ce lien expire dans 7 jours.</p>`
      : `<p><strong>${uni}</strong> vous invite à rejoindre Inturn pour le suivi académique de votre stage.</p>
<p>Cliquez ci-dessous pour accepter. Ce lien expire dans 7 jours.</p>`
    : variant === 'coordinator'
      ? `<p><strong>${inviter}</strong> has invited you to join <strong>${uni}</strong> as an <strong>academic coordinator</strong> on Inturn — you'll be able to invite your students and follow their internship progress.</p>
<p>Click below to accept. This link expires in 7 days.</p>`
      : `<p><strong>${uni}</strong> invited you to join Inturn for academic supervision of your internship.</p>
<p>Click below to accept. This link expires in 7 days.</p>`;

  const ctaLabel = fr ? "Accepter l'invitation" : 'Accept invitation';

  return {
    ...emailLayout({ title: subject, bodyHtml, ctaLabel, ctaHref }),
    subject,
  };
}
