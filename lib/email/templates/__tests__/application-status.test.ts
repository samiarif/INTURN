import { describe, it, expect } from 'vitest';
import { applicationStatusTemplate } from '../application-status';

describe('applicationStatusTemplate — optional feedback block', () => {
  const base = {
    applicantName: 'Lina',
    internshipTitle: 'Brand audit',
    applicationId: 'app1',
  } as const;

  it('omits the feedback block when no note is provided', () => {
    const en = applicationStatusTemplate({ ...base, status: 'rejected', locale: 'en' });
    expect(en.html).not.toContain('Feedback from the company');
    const fr = applicationStatusTemplate({ ...base, status: 'rejected', locale: 'fr' });
    expect(fr.html).not.toContain("Retour de l'entreprise");
  });

  it('omits the feedback block when the note is whitespace-only', () => {
    const en = applicationStatusTemplate({ ...base, status: 'rejected', locale: 'en', note: '   ' });
    expect(en.html).not.toContain('Feedback from the company');
  });

  it('renders an HTML-escaped EN feedback block when a note is present', () => {
    const tpl = applicationStatusTemplate({
      ...base,
      status: 'rejected',
      locale: 'en',
      note: 'Strong portfolio, <not> a fit this round',
    });
    expect(tpl.html).toContain('Feedback from the company');
    expect(tpl.html).toContain('Strong portfolio, &lt;not&gt; a fit this round');
    // The note also reaches the plaintext alternative (stripHtml keeps text nodes).
    expect(tpl.text).toContain('Strong portfolio');
  });

  it('renders the FR feedback heading when locale is fr', () => {
    const tpl = applicationStatusTemplate({
      ...base,
      status: 'accepted',
      locale: 'fr',
      note: 'Bravo et bienvenue',
    });
    expect(tpl.html).toContain("Retour de l'entreprise");
    expect(tpl.html).toContain('Bravo et bienvenue');
  });
});
