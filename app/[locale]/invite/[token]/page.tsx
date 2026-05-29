import Link from 'next/link';
import { XCircle, Clock, CheckCircle2, Mail, AlertTriangle, PartyPopper } from 'lucide-react';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizationMembers, organizations, users } from '@/db/schema';
import { getSession } from '@/modules/auth/session';
import { AcceptButton } from './accept-button';

const STR = {
  fr: {
    inviteInvalid: "Cette invitation n'est plus valide.",
    inviteInvalidSub: "Le lien d'invitation a expiré ou a déjà été utilisé.",
    inviteExpired: "Cette invitation a expiré.",
    inviteExpiredSub: "Demandez à votre administrateur d'envoyer un nouveau lien d'invitation.",
    alreadyMember: "Vous êtes déjà membre de cette organisation.",
    alreadyMemberSub: "Accédez à votre tableau de bord pour continuer.",
    goToDashboard: "Aller au tableau de bord",
    goHome: "Retour à l'accueil",
    signInTitle: "Connectez-vous pour accepter l'invitation",
    signInSub: (orgName: string, role: string, inviterName: string | null) =>
      inviterName
        ? `${inviterName} vous invite à rejoindre ${orgName} en tant que ${role}.`
        : `Vous avez été invité(e) à rejoindre ${orgName} en tant que ${role}.`,
    signInCta: "Se connecter",
    emailMismatchTitle: "Mauvais compte",
    emailMismatchBody: (inviteEmail: string, currentEmail: string) =>
      `Cette invitation a été envoyée à ${inviteEmail}, mais vous êtes connecté(e) avec ${currentEmail}. Connectez-vous avec le bon compte pour accepter.`,
    acceptTitle: "Vous avez été invité(e) !",
    acceptSub: (orgName: string, role: string, inviterName: string | null) =>
      inviterName
        ? `${inviterName} vous invite à rejoindre ${orgName} en tant que ${role}.`
        : `Vous avez été invité(e) à rejoindre ${orgName} en tant que ${role}.`,
    roleLabel: { admin: 'Administrateur', supervisor: 'Superviseur', owner: 'Propriétaire' } as Record<string, string>,
  },
  en: {
    inviteInvalid: 'This invite is no longer valid.',
    inviteInvalidSub: 'The invite link has expired or has already been used.',
    inviteExpired: 'This invite has expired.',
    inviteExpiredSub: 'Ask your administrator to send a new invite link.',
    alreadyMember: 'You are already a member of this organisation.',
    alreadyMemberSub: 'Head to your dashboard to continue.',
    goToDashboard: 'Go to dashboard',
    goHome: 'Go back home',
    signInTitle: 'Sign in to accept your invite',
    signInSub: (orgName: string, role: string, inviterName: string | null) =>
      inviterName
        ? `${inviterName} has invited you to join ${orgName} as ${role}.`
        : `You have been invited to join ${orgName} as ${role}.`,
    signInCta: 'Sign in',
    emailMismatchTitle: 'Wrong account',
    emailMismatchBody: (inviteEmail: string, currentEmail: string) =>
      `This invite was sent to ${inviteEmail}, but you are signed in as ${currentEmail}. Sign in with the correct account to accept.`,
    acceptTitle: "You've been invited!",
    acceptSub: (orgName: string, role: string, inviterName: string | null) =>
      inviterName
        ? `${inviterName} has invited you to join ${orgName} as ${role}.`
        : `You have been invited to join ${orgName} as ${role}.`,
    roleLabel: { admin: 'Admin', supervisor: 'Supervisor', owner: 'Owner' } as Record<string, string>,
  },
} as const;

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const t = STR[locale === 'en' ? 'en' : 'fr'];

  // Load the member row by token
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.inviteToken, token))
    .limit(1);

  // Branch 1: not found (token null'd on accept/revoke, or never existed)
  if (!member || member.status === 'removed') {
    return (
      <InviteCard>
        <StatusMessage
          icon={<XCircle className="h-9 w-9 text-destructive" strokeWidth={1.75} aria-hidden />}
          title={t.inviteInvalid}
          sub={t.inviteInvalidSub}
        >
          <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
            {t.goHome}
          </Link>
        </StatusMessage>
      </InviteCard>
    );
  }

  // Branch 2: expired
  if (member.inviteExpiresAt && member.inviteExpiresAt < new Date()) {
    return (
      <InviteCard>
        <StatusMessage
          icon={<Clock className="h-9 w-9 text-warning" strokeWidth={1.75} aria-hidden />}
          title={t.inviteExpired}
          sub={t.inviteExpiredSub}
        >
          <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
            {t.goHome}
          </Link>
        </StatusMessage>
      </InviteCard>
    );
  }

  // Branch 3: already active
  if (member.status === 'active') {
    return (
      <InviteCard>
        <StatusMessage
          icon={<CheckCircle2 className="h-9 w-9 text-success" strokeWidth={1.75} aria-hidden />}
          title={t.alreadyMember}
          sub={t.alreadyMemberSub}
        >
          <Link
            href="/company/dashboard"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {t.goToDashboard}
          </Link>
        </StatusMessage>
      </InviteCard>
    );
  }

  // Load org + inviter for context display (safe after guard checks pass)
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, member.organizationId))
    .limit(1);

  let inviterName: string | null = null;
  if (member.invitedByUserId) {
    const [inviter] = await db
      .select()
      .from(users)
      .where(eq(users.id, member.invitedByUserId))
      .limit(1);
    if (inviter) {
      inviterName =
        [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || inviter.email;
    }
  }

  const orgName = org?.name ?? '';
  const roleLabel = t.roleLabel[member.role] ?? member.role;

  const session = await getSession();

  // Branch 4: not signed in
  if (!session) {
    const invitePath =
      locale === 'en' ? `/en/invite/${token}` : `/invite/${token}`;
    const redirectUrl = encodeURIComponent(invitePath);
    // Keep the invitee in their locale through the sign-in hop.
    const signInPath = locale === 'en' ? '/en/sign-in' : '/sign-in';

    return (
      <InviteCard>
        <div className="flex flex-col items-center gap-4 text-center">
          <Mail className="h-9 w-9 text-brand-600" strokeWidth={1.75} aria-hidden />
          <h1 className="text-xl font-semibold text-foreground">{t.signInTitle}</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t.signInSub(orgName, roleLabel, inviterName)}
          </p>
          <Link
            href={`${signInPath}?redirect_url=${redirectUrl}`}
            className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            {t.signInCta}
          </Link>
        </div>
      </InviteCard>
    );
  }

  // Branch 5: signed in but email mismatch
  if (session.user.email.toLowerCase() !== member.email.toLowerCase()) {
    return (
      <InviteCard>
        <StatusMessage
          icon={<AlertTriangle className="h-9 w-9 text-warning" strokeWidth={1.75} aria-hidden />}
          title={t.emailMismatchTitle}
          sub={t.emailMismatchBody(member.email, session.user.email)}
        >
          <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
            {t.goHome}
          </Link>
        </StatusMessage>
      </InviteCard>
    );
  }

  // Branch 6: signed in + email matches + invited + not expired → show accept UI
  return (
    <InviteCard>
      <div className="flex flex-col items-center gap-4 text-center">
        <PartyPopper className="h-9 w-9 text-brand-600" strokeWidth={1.75} aria-hidden />
        <h1 className="text-xl font-semibold text-foreground">{t.acceptTitle}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t.acceptSub(orgName, roleLabel, inviterName)}
        </p>
        <div className="mt-2 w-full max-w-xs">
          <AcceptButton token={token} locale={locale} />
        </div>
      </div>
    </InviteCard>
  );
}

// ---------------------------------------------------------------------------
// Layout helpers (not exported — page-local only)
// ---------------------------------------------------------------------------

function InviteCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function StatusMessage({
  icon,
  title,
  sub,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex items-center justify-center">{icon}</div>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-xs">{sub}</p>
      {children}
    </div>
  );
}
