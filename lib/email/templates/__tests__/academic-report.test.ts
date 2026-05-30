import { describe, it, expect } from 'vitest';
import { academicReportSubmittedTemplate } from '../academic-report-submitted';
import { academicReportReviewedTemplate } from '../academic-report-reviewed';

describe('academicReportSubmittedTemplate', () => {
  const base = { coordinatorName: 'Prof. Saidi', studentName: 'Lina Ben', version: 2, studentUserId: 'stu1' } as const;

  it('renders EN with the student name, version, and review deep-link', () => {
    const tpl = academicReportSubmittedTemplate({ ...base, locale: 'en' });
    expect(tpl.subject).toContain('Lina Ben');
    expect(tpl.html).toContain('v2');
    expect(tpl.html).toContain('/university/students/stu1');
  });

  it('renders FR', () => {
    const tpl = academicReportSubmittedTemplate({ ...base, locale: 'fr' });
    expect(tpl.html).toContain('/university/students/stu1');
    expect(tpl.html.toLowerCase()).toContain('rapport');
  });

  it('escapes the student name', () => {
    const tpl = academicReportSubmittedTemplate({ ...base, studentName: '<x>', locale: 'en' });
    expect(tpl.html).toContain('&lt;x&gt;');
    expect(tpl.html).not.toContain('<x>');
  });
});

describe('academicReportReviewedTemplate', () => {
  const base = { studentName: 'Lina', outcome: 'approved' as const } as const;

  it('renders the approved EN variant with the intern deep-link', () => {
    const tpl = academicReportReviewedTemplate({ ...base, locale: 'en' });
    expect(tpl.subject.toLowerCase()).toContain('approved');
    expect(tpl.html).toContain('/intern/university');
  });

  it('renders the revision variant with the feedback block', () => {
    const tpl = academicReportReviewedTemplate({
      studentName: 'Lina', outcome: 'revision', feedback: 'Add sources', locale: 'en',
    });
    expect(tpl.html).toContain('Add sources');
    expect(tpl.html.toLowerCase()).toContain('revision');
  });

  it('renders FR approved', () => {
    const tpl = academicReportReviewedTemplate({ ...base, locale: 'fr' });
    expect(tpl.html.toLowerCase()).toContain('approuvé');
    expect(tpl.html).toContain('/intern/university');
  });
});
