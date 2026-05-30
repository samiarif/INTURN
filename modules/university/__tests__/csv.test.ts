import { describe, it, expect } from 'vitest';
import { parseStudentCsv } from '../csv';

describe('parseStudentCsv', () => {
  it('parses email-only lines', () => {
    const r = parseStudentCsv('a@x.com\nb@y.com');
    expect(r.rows).toEqual([
      { email: 'a@x.com', name: null },
      { email: 'b@y.com', name: null },
    ]);
    expect(r.invalid).toEqual([]);
  });

  it('parses "email,Name" and trims', () => {
    const r = parseStudentCsv('  a@x.com , Lina Ben \n b@y.com,Amine Gharbi');
    expect(r.rows).toEqual([
      { email: 'a@x.com', name: 'Lina Ben' },
      { email: 'b@y.com', name: 'Amine Gharbi' },
    ]);
  });

  it('skips a header row and blank lines', () => {
    const r = parseStudentCsv('Email,Name\n\na@x.com,Lina\n');
    expect(r.rows).toEqual([{ email: 'a@x.com', name: 'Lina' }]);
  });

  it('collects invalid emails separately', () => {
    const r = parseStudentCsv('not-an-email\nb@y.com');
    expect(r.invalid).toEqual(['not-an-email']);
    expect(r.rows).toEqual([{ email: 'b@y.com', name: null }]);
  });

  it('dedupes case-insensitively within the input (first wins)', () => {
    const r = parseStudentCsv('A@x.com,Lina\na@X.com,Dup');
    expect(r.rows).toEqual([{ email: 'A@x.com', name: 'Lina' }]);
  });

  it('handles semicolon and tab separators', () => {
    const r = parseStudentCsv('a@x.com;Lina\nb@y.com\tAmine');
    expect(r.rows).toEqual([
      { email: 'a@x.com', name: 'Lina' },
      { email: 'b@y.com', name: 'Amine' },
    ]);
  });
});
