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

  it('localizes empty student + coordinator names (FR) — no English leak', () => {
    const tpl = academicReportSubmittedTemplate({
      coordinatorName: '', studentName: '', version: 1, studentUserId: 'stu1', locale: 'fr',
    });
    expect(tpl.html).toContain('Un·e étudiant·e');
    expect(tpl.html).toContain('Bonjour,');
    expect(tpl.subject).toContain('Un·e étudiant·e');
    expect(tpl.html).not.toContain('A student');
    expect(tpl.html).not.toContain('Coordinator');
  });

  it('localizes empty names (EN) — "A student" + "Hi there,"', () => {
    const tpl = academicReportSubmittedTemplate({
      coordinatorName: '', studentName: '', version: 1, studentUserId: 'stu1', locale: 'en',
    });
    expect(tpl.html).toContain('A student');
    expect(tpl.html).toContain('Hi there,');
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

  it('localizes an empty student name in the greeting (FR → "Bonjour,")', () => {
    const tpl = academicReportReviewedTemplate({ studentName: '', outcome: 'approved', locale: 'fr' });
    expect(tpl.html).toContain('Bonjour,');
    expect(tpl.html).not.toContain('there');
  });

  it('localizes an empty student name in the greeting (EN → "Hi there,")', () => {
    const tpl = academicReportReviewedTemplate({ studentName: '', outcome: 'approved', locale: 'en' });
    expect(tpl.html).toContain('Hi there,');
  });
});
