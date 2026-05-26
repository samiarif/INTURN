import { baseUrl, emailLayout, escapeHtml } from './_layout';

export function welcomeTemplate({
  firstName,
  locale,
}: {
  firstName: string;
  locale: 'fr' | 'en';
}) {
  const fr = locale === 'fr';
  const title = fr
    ? `Bienvenue sur Inturn, ${firstName}`
    : `Welcome to Inturn, ${firstName}`;
  const body = fr
    ? `<p>Bonjour ${escapeHtml(firstName)},</p><p>Votre compte est créé. Complétez votre profil en deux minutes pour postuler aux stages publiés par les entreprises tunisiennes.</p>`
    : `<p>Hi ${escapeHtml(firstName)},</p><p>Your account is set up. Complete your profile in two minutes to start applying to internships from Tunisian companies.</p>`;
  const cta = fr ? 'Compléter mon profil' : 'Complete my profile';
  return {
    ...emailLayout({
      title,
      bodyHtml: body,
      ctaLabel: cta,
      ctaHref: `${baseUrl()}/onboarding/intern/basics`,
    }),
    subject: title,
  };
}
