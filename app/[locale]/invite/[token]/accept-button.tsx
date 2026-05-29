'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { acceptInviteAction } from '@/modules/team/server-actions';

const STR = {
  fr: {
    accept: "Rejoindre l'équipe",
    accepting: 'En cours…',
    errorNotFound: "Cette invitation est introuvable ou a déjà été utilisée.",
    errorExpired: "Cette invitation a expiré. Demandez un nouveau lien.",
    errorEmailMismatch: "Votre adresse e-mail ne correspond pas à l'invitation.",
    errorAlreadyMember: "Vous êtes déjà membre de cette organisation.",
    errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
  },
  en: {
    accept: 'Join the team',
    accepting: 'Joining…',
    errorNotFound: 'This invite could not be found or has already been used.',
    errorExpired: 'This invite has expired. Ask for a new link.',
    errorEmailMismatch: "Your email address doesn't match this invite.",
    errorAlreadyMember: 'You are already a member of this organisation.',
    errorGeneric: 'Something went wrong. Please try again.',
  },
} as const;

type Reason = 'not_found' | 'expired' | 'email_mismatch' | 'already_member' | 'error';

export function AcceptButton({ token, locale }: { token: string; locale: string }) {
  const t = STR[locale === 'en' ? 'en' : 'fr'];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mapReason(reason: Reason): string {
    switch (reason) {
      case 'not_found':
        return t.errorNotFound;
      case 'expired':
        return t.errorExpired;
      case 'email_mismatch':
        return t.errorEmailMismatch;
      case 'already_member':
        return t.errorAlreadyMember;
      default:
        return t.errorGeneric;
    }
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await acceptInviteAction({ token });
      if (res.ok) {
        router.push('/company/dashboard');
      } else {
        setError(mapReason(res.reason));
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        size="lg"
        disabled={pending}
        onClick={handleClick}
        className="w-full"
      >
        {pending ? t.accepting : t.accept}
      </Button>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
