import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendEmail } from '../email';
import { welcomeTemplate } from '../email/templates/welcome';
import { applicationReceivedTemplate } from '../email/templates/application-received';
import { applicationStatusTemplate } from '../email/templates/application-status';
import { checkInReminderTemplate } from '../email/templates/check-in-reminder';
import { digestDailyTemplate } from '../email/templates/digest-daily';

describe('sendEmail', () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.EMAIL_FROM;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-mode';
    process.env.EMAIL_FROM = 'Inturn <test@inturn-hub.com>';
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = originalFrom;
    consoleSpy.mockRestore();
  });

  it('short-circuits in test-mode and returns null', async () => {
    const result = await sendEmail({
      to: 'foo@example.com',
      subject: 'hi',
      text: 'hi',
      html: '<p>hi</p>',
    });
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('email templates', () => {
  it('welcome template — EN includes first name and CTA href', () => {
    const tpl = welcomeTemplate({ firstName: 'Yasmine', locale: 'en' });
    expect(tpl.subject).toContain('Welcome');
    expect(tpl.subject).toContain('Yasmine');
    expect(tpl.html).toContain('Yasmine');
    expect(tpl.html).toContain('/onboarding/intern/basics');
    expect(tpl.text).toContain('Yasmine');
  });

  it('welcome template — FR uses French copy', () => {
    const tpl = welcomeTemplate({ firstName: 'Yasmine', locale: 'fr' });
    expect(tpl.subject).toContain('Bienvenue');
    expect(tpl.html).toContain('Compléter mon profil');
  });

  it('application-received template names supervisor + applicant + role', () => {
    const tpl = applicationReceivedTemplate({
      supervisorName: 'Mehdi',
      internshipTitle: 'Visual designer',
      applicantName: 'Yasmine',
      applicationId: 'app_1',
      locale: 'en',
    });
    expect(tpl.subject).toContain('Visual designer');
    expect(tpl.html).toContain('Yasmine');
    expect(tpl.html).toContain('Mehdi');
    expect(tpl.html).toContain('/company/applications/app_1');
  });

  it('application-status maps status to localized label', () => {
    const tpl = applicationStatusTemplate({
      applicantName: 'Yasmine',
      internshipTitle: 'UX researcher',
      status: 'shortlisted',
      applicationId: 'app_2',
      locale: 'en',
    });
    expect(tpl.subject).toContain('shortlisted');

    const fr = applicationStatusTemplate({
      applicantName: 'Yasmine',
      internshipTitle: 'UX researcher',
      status: 'accepted',
      applicationId: 'app_2',
      locale: 'fr',
    });
    expect(fr.subject).toContain('acceptée');
  });

  it('escapes HTML in user-controlled content (XSS guard)', () => {
    const tpl = applicationStatusTemplate({
      applicantName: '<script>alert(1)</script>',
      internshipTitle: 'Brand audit',
      status: 'accepted',
      applicationId: 'app_3',
      locale: 'en',
    });
    expect(tpl.html).not.toContain('<script>alert(1)</script>');
    expect(tpl.html).toContain('&lt;script&gt;');
  });

  it('check-in-reminder includes workspace title and link', () => {
    const tpl = checkInReminderTemplate({
      internName: 'Arif',
      workspaceTitle: 'Brand audit & system refresh',
      workspaceId: 'ws_1',
      locale: 'en',
    });
    expect(tpl.subject).toContain('Brand audit');
    expect(tpl.html).toContain('/intern/workspaces/ws_1/check-in');
  });

  it('digest-daily empty state vs items', () => {
    const empty = digestDailyTemplate({ recipientName: 'Sam', items: [], locale: 'en' });
    expect(empty.html).toContain('Nothing new today');

    const populated = digestDailyTemplate({
      recipientName: 'Sam',
      items: [
        { label: 'Yasmine submitted v2', href: '/x', meta: '2h ago' },
        { label: 'Lina applied', href: '/y' },
      ],
      locale: 'en',
    });
    expect(populated.html).toContain('Yasmine submitted v2');
    expect(populated.html).toContain('Lina applied');
    expect(populated.html).toContain('2h ago');
  });
});
