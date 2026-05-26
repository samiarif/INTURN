import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { RecordSnapshot } from '@/db/schema';

/**
 * End-of-internship record PDF. Bilingual (FR / EN) — locale picked from
 * snapshot. Pure presentational component; no DB access.
 *
 * Layout:
 *   - Top band with org name + record title
 *   - Intern card (name, university, field of study)
 *   - Internship summary (title, dates, sector, duration)
 *   - Deliverables list
 *   - Stats (tasks done / total, deliverables approved)
 *   - Supervisor signature block (review text + rating + signed at)
 *   - Footer with verification URL
 */

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#0070f3',
    borderBottomStyle: 'solid',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  brand: {
    fontSize: 9,
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0a0a0a',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0070f3',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { fontSize: 11, color: '#0a0a0a', fontWeight: 'bold' },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  deliverable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  badge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: '#0070f3',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeApproved: { backgroundColor: '#22c55e' },
  badgeRevision: { backgroundColor: '#f59e0b' },
  badgeDraft: { backgroundColor: '#9ca3af' },
  reviewBox: {
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 6,
    marginTop: 4,
  },
  reviewText: { fontSize: 11, lineHeight: 1.6, color: '#1a1a1a' },
  signature: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureText: { fontSize: 10, color: '#0a0a0a' },
  rating: { fontSize: 14, color: '#f59e0b' },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
  },
});

const COPY = {
  fr: {
    brand: 'INTURN · ATTESTATION DE STAGE',
    title: 'Attestation de fin de stage',
    subtitle: 'Document officiel délivré par l’entreprise d’accueil',
    intern: 'Stagiaire',
    organization: 'Entreprise',
    internship: 'Stage',
    deliverables: 'Livrables',
    review: 'Évaluation du superviseur',
    supervisor: 'Superviseur',
    signedOn: 'Signé le',
    rating: 'Note',
    statsTasks: 'Tâches accomplies',
    statsDeliv: 'Livrables approuvés',
    of: 'sur',
    name: 'Nom',
    email: 'Email',
    university: 'Établissement',
    fieldOfStudy: 'Domaine',
    title2: 'Intitulé',
    sector: 'Secteur',
    duration: 'Durée',
    period: 'Période',
    location: 'Localisation',
    website: 'Site web',
    weeks: 'semaines',
    verify: 'Vérifiez l’authenticité de ce document à',
    page: 'Page',
    none: '—',
    statusApproved: 'Approuvé',
    statusSubmitted: 'Soumis',
    statusRevision: 'Révision',
    statusDraft: 'Brouillon',
  },
  en: {
    brand: 'INTURN · INTERNSHIP RECORD',
    title: 'End-of-Internship Record',
    subtitle: 'Official document issued by the host organisation',
    intern: 'Intern',
    organization: 'Organisation',
    internship: 'Internship',
    deliverables: 'Deliverables',
    review: "Supervisor's review",
    supervisor: 'Supervisor',
    signedOn: 'Signed on',
    rating: 'Rating',
    statsTasks: 'Tasks completed',
    statsDeliv: 'Deliverables approved',
    of: 'of',
    name: 'Name',
    email: 'Email',
    university: 'University',
    fieldOfStudy: 'Field of study',
    title2: 'Title',
    sector: 'Sector',
    duration: 'Duration',
    period: 'Period',
    location: 'Location',
    website: 'Website',
    weeks: 'weeks',
    verify: 'Verify the authenticity of this document at',
    page: 'Page',
    none: '—',
    statusApproved: 'Approved',
    statusSubmitted: 'Submitted',
    statusRevision: 'Revision',
    statusDraft: 'Draft',
  },
} as const;

function formatDate(iso: string | null, locale: 'fr' | 'en'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function statusLabel(status: string, t: (typeof COPY)['fr' | 'en']): string {
  if (status === 'approved') return t.statusApproved;
  if (status === 'submitted') return t.statusSubmitted;
  if (status === 'revision-requested') return t.statusRevision;
  return t.statusDraft;
}

function statusBadgeStyle(status: string) {
  if (status === 'approved') return styles.badgeApproved;
  if (status === 'revision-requested') return styles.badgeRevision;
  if (status === 'submitted') return styles.badge;
  return styles.badgeDraft;
}

export type RecordPdfProps = {
  snapshot: RecordSnapshot;
  shareUrl: string;
};

export function RecordPdf({ snapshot, shareUrl }: RecordPdfProps) {
  const t = COPY[snapshot.locale];
  const approvedCount = snapshot.deliverables.filter((d) => d.status === 'approved').length;

  return (
    <Document
      title={`${t.title} — ${snapshot.intern.name}`}
      author={snapshot.organization.name}
      subject={snapshot.internship.title}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>{t.brand}</Text>
            <Text style={styles.brand}>{snapshot.organization.name}</Text>
          </View>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.col}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.intern}</Text>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.label}>{t.name}</Text>
                  <Text style={styles.value}>{snapshot.intern.name}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>{t.email}</Text>
                  <Text style={styles.value}>{snapshot.intern.email}</Text>
                </View>
                {snapshot.intern.university && (
                  <View style={styles.row}>
                    <Text style={styles.label}>{t.university}</Text>
                    <Text style={styles.value}>{snapshot.intern.university}</Text>
                  </View>
                )}
                {snapshot.intern.fieldOfStudy && (
                  <View style={styles.row}>
                    <Text style={styles.label}>{t.fieldOfStudy}</Text>
                    <Text style={styles.value}>{snapshot.intern.fieldOfStudy}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.col}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.organization}</Text>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.label}>{t.name}</Text>
                  <Text style={styles.value}>{snapshot.organization.name}</Text>
                </View>
                {snapshot.organization.location && (
                  <View style={styles.row}>
                    <Text style={styles.label}>{t.location}</Text>
                    <Text style={styles.value}>{snapshot.organization.location}</Text>
                  </View>
                )}
                {snapshot.organization.website && (
                  <View style={styles.row}>
                    <Text style={styles.label}>{t.website}</Text>
                    <Text style={styles.value}>{snapshot.organization.website}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.internship}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{t.title2}</Text>
              <Text style={styles.value}>{snapshot.internship.title}</Text>
            </View>
            {snapshot.internship.sector && (
              <View style={styles.row}>
                <Text style={styles.label}>{t.sector}</Text>
                <Text style={styles.value}>{snapshot.internship.sector}</Text>
              </View>
            )}
            {snapshot.internship.duration != null && (
              <View style={styles.row}>
                <Text style={styles.label}>{t.duration}</Text>
                <Text style={styles.value}>
                  {snapshot.internship.duration} {t.weeks}
                </Text>
              </View>
            )}
            {(snapshot.internship.startDate || snapshot.internship.endDate) && (
              <View style={styles.row}>
                <Text style={styles.label}>{t.period}</Text>
                <Text style={styles.value}>
                  {formatDate(snapshot.internship.startDate, snapshot.locale)} →{' '}
                  {formatDate(snapshot.internship.endDate, snapshot.locale)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {snapshot.deliverables.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.deliverables}</Text>
            <View style={styles.card}>
              {snapshot.deliverables.map((d, idx) => (
                <View key={idx} style={styles.deliverable}>
                  <Text style={{ fontSize: 11, flex: 1 }}>{d.title}</Text>
                  <Text style={[styles.badge, statusBadgeStyle(d.status)]}>
                    {statusLabel(d.status, t)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.grid}>
          <View style={styles.col}>
            <View style={styles.card}>
              <Text style={styles.label}>{t.statsTasks}</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0070f3', marginTop: 4 }}>
                {snapshot.taskStats.done} {t.of} {snapshot.taskStats.total}
              </Text>
            </View>
          </View>
          <View style={styles.col}>
            <View style={styles.card}>
              <Text style={styles.label}>{t.statsDeliv}</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#22c55e', marginTop: 4 }}>
                {approvedCount} {t.of} {snapshot.deliverables.length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.review}</Text>
          <View style={styles.reviewBox}>
            <Text style={styles.reviewText}>{snapshot.signature.reviewText}</Text>
            <View style={styles.signature}>
              <View>
                <Text style={styles.label}>{t.supervisor}</Text>
                <Text style={styles.signatureText}>{snapshot.supervisor.name}</Text>
                <Text style={{ fontSize: 9, color: '#666' }}>
                  {t.signedOn} {formatDate(snapshot.signature.signedAt, snapshot.locale)}
                </Text>
              </View>
              {snapshot.signature.rating && (
                <View>
                  <Text style={styles.label}>{t.rating}</Text>
                  <Text style={styles.rating}>
                    {'★'.repeat(snapshot.signature.rating)}
                    {'☆'.repeat(5 - snapshot.signature.rating)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {t.verify} {shareUrl}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${t.page} ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
