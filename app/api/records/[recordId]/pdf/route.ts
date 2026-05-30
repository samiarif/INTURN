import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { findRecordById } from '@/modules/records/queries';
import { RecordPdf } from '@/modules/records/pdf';
import { getSession } from '@/modules/auth/session';
import { organizations } from '@/db/schema';
import { db } from '@/db';
import { eq } from 'drizzle-orm';

/**
 * Download the PDF for an internship record.
 *
 * Authorization — allowed if EITHER:
 *   - the request carries the record's share token (?token=…), i.e. whoever
 *     holds the public viewer link (/records/[token]); or
 *   - the session belongs to a stakeholder: the intern who earned it, the
 *     supervisor who issued it, the host-org owner, or any admin.
 *
 * Revoked records return 410 Gone (before any auth check).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const { recordId } = await params;
  const record = await findRecordById(recordId);
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (record.revokedAt) {
    return NextResponse.json({ error: 'Revoked' }, { status: 410 });
  }

  // Public capability: the share token that unlocks the public record page
  // also authorizes its PDF — same data, same capability. Must match THIS
  // record's token so one record's link can't unlock another.
  const token = new URL(req.url).searchParams.get('token');
  const hasValidToken = token != null && token === record.shareToken;

  // Authenticated stakeholder path (unchanged set of roles).
  const session = await getSession();
  let isStakeholder = false;
  if (session) {
    const isIntern = record.internUserId === session.user.id;
    const isGenerator = record.generatedBy === session.user.id;
    const isAdmin = session.role === 'admin';

    let isOrgOwner = false;
    if (!isIntern && !isGenerator && !isAdmin) {
      const [org] = await db
        .select({ ownerId: organizations.ownerId })
        .from(organizations)
        .where(eq(organizations.id, record.organizationId))
        .limit(1);
      isOrgOwner = org?.ownerId === session.user.id;
    }
    isStakeholder = isIntern || isGenerator || isAdmin || isOrgOwner;
  }

  if (!hasValidToken && !isStakeholder) {
    return NextResponse.json(
      { error: session ? 'Forbidden' : 'Unauthorized' },
      { status: session ? 403 : 401 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:3000';
  const shareUrl = origin.startsWith('http')
    ? `${origin}/${record.snapshot.locale}/records/${record.shareToken}`
    : `https://${origin}/${record.snapshot.locale}/records/${record.shareToken}`;

  // RecordPdf returns a <Document> element — pass directly so the type
  // matches renderToBuffer's ReactElement<DocumentProps> signature.
  const buffer = await renderToBuffer(RecordPdf({ snapshot: record.snapshot, shareUrl }));

  const filename = `inturn-record-${record.snapshot.intern.name
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
