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
 * Authorization:
 *   - The intern who earned it
 *   - The supervisor who issued it
 *   - The owner of the host organization
 *   - Any admin
 *
 * Revoked records return 410 Gone.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { recordId } = await params;
  const record = await findRecordById(recordId);
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (record.revokedAt) {
    return NextResponse.json({ error: 'Revoked' }, { status: 410 });
  }

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

  if (!isIntern && !isGenerator && !isAdmin && !isOrgOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
