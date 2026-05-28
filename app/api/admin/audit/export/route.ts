import { requireAdmin } from '@/modules/auth/session';
import { listAllAuditLogsForExport, type AuditLogFilter } from '@/modules/audit/queries';

/**
 * GET /api/admin/audit/export — stream the full audit log as CSV.
 * Admin only. Respects the same `action` prefix filter as the audit page
 * (e.g. ?action=report). Columns: timestamp, actor, action, target, detail.
 */
export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch {
    return new Response('Forbidden', { status: 403 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const filter: AuditLogFilter = {};
  // Keep in step with the audit page's filter keys.
  const PREFIXES: Record<string, string> = {
    org: 'org.',
    report: 'report.',
    internship: 'internship.',
    user: 'user.',
  };
  if (action && PREFIXES[action]) filter.actionPrefix = PREFIXES[action];

  const rows = await listAllAuditLogsForExport(filter);

  const header = ['timestamp', 'actor', 'action', 'target', 'detail'];
  const lines = [header.map(csvCell).join(',')];
  for (const { log, actor } of rows) {
    const timestamp = new Date(log.createdAt).toISOString();
    const actorLabel = actor?.email ?? '';
    const target = `${log.targetType}/${log.targetId ?? ''}`;
    const detail = log.metadata ? JSON.stringify(log.metadata) : '';
    lines.push([timestamp, actorLabel, log.action, target, detail].map(csvCell).join(','));
  }
  const csv = lines.join('\r\n');

  const filename = `inturn-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Escape a single CSV cell per RFC 4180: wrap in double quotes and double
 * any embedded quotes whenever the value contains a comma, quote, or
 * newline. Leading `=`/`+`/`-`/`@` are prefixed to neutralise spreadsheet
 * formula injection.
 */
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
