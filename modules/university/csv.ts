export type ParsedStudentRow = { email: string; name: string | null };
export type ParsedStudentCsv = { rows: ParsedStudentRow[]; invalid: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse a pasted/uploaded CSV of students. One per line: `email` or
 * `email,Full Name` (comma OR semicolon OR tab separated). A leading header row
 * (first cell not an email, looks like "email") is skipped. Blank lines ignored.
 * Case-insensitive de-dupe within the input (first occurrence wins). Pure — no
 * caps, no I/O; the caller enforces the row cap and dedupes against existing
 * members.
 */
export function parseStudentCsv(text: string): ParsedStudentCsv {
  const rows: ParsedStudentRow[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const cells = trimmed.split(/[,;\t]/).map((c) => c.trim());
    const email = cells[0] ?? '';
    const name = cells.slice(1).join(' ').trim() || null;

    // Skip a header row only as the very first line, and only when its first
    // cell is exactly an "email" label (not just any string containing "mail").
    if (i === 0 && !EMAIL_RE.test(email) && /^e-?mail$/i.test(email)) {
      return;
    }

    if (!EMAIL_RE.test(email)) {
      invalid.push(trimmed);
      return;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ email, name });
  });

  return { rows, invalid };
}
