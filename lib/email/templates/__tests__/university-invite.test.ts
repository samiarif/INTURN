import { describe, it, expect } from 'vitest';
import { universityInviteTemplate } from '../university-invite';

describe('universityInviteTemplate', () => {
  const base = { universityName: 'ESPRIT', inviterName: 'Admin', token: 'tok123' } as const;

  it('renders the coordinator EN variant with the invite link', () => {
    const tpl = universityInviteTemplate({ ...base, variant: 'coordinator', locale: 'en' });
    expect(tpl.subject).toContain('ESPRIT');
    expect(tpl.html).toContain('/invite/tok123');
    expect(tpl.html.toLowerCase()).toContain('coordinator');
  });

  it('renders the coordinator FR variant', () => {
    const tpl = universityInviteTemplate({ ...base, variant: 'coordinator', locale: 'fr' });
    expect(tpl.html).toContain('/invite/tok123');
    expect(tpl.html.toLowerCase()).toContain('encadrant');
  });

  it('renders the student EN variant', () => {
    const tpl = universityInviteTemplate({ ...base, variant: 'student', locale: 'en' });
    expect(tpl.html).toContain('/invite/tok123');
    expect(tpl.html.toLowerCase()).toContain('invited');
  });

  it('escapes the university name', () => {
    const tpl = universityInviteTemplate({
      ...base, universityName: '<x>', variant: 'student', locale: 'en',
    });
    expect(tpl.html).toContain('&lt;x&gt;');
    expect(tpl.html).not.toContain('<x>');
  });
});
