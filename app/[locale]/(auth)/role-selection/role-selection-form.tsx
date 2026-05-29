'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useState } from 'react';
import { GraduationCap, Building2, Loader2 } from 'lucide-react';

export function RoleSelectionForm() {
  const t = useTranslations('auth.roleSelection');
  const router = useRouter();
  const [loading, setLoading] = useState<'intern' | 'company' | null>(null);

  async function handleSelect(role: 'intern' | 'company') {
    setLoading(role);
    try {
      const res = await fetch('/api/auth/select-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to select role');
      }

      // Route new users straight into onboarding, not to the dashboard.
      // Both onboarding routes are profile-state-aware and will fast-skip
      // to the dashboard once profile_step === 'complete'.
      const redirectPath =
        role === 'intern' ? '/onboarding/intern/basics' : '/onboarding/company';
      router.push(redirectPath);
    } catch (err) {
      console.error('Role selection failed:', err);
      setLoading(null);
    }
  }

  const options = [
    {
      role: 'intern' as const,
      Icon: GraduationCap,
      title: t('intern'),
      desc: t('internDescription'),
    },
    {
      role: 'company' as const,
      Icon: Building2,
      title: t('company'),
      desc: t('companyDescription'),
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {options.map(({ role, Icon, title, desc }) => {
        const isLoading = loading === role;
        return (
          <button
            key={role}
            type="button"
            onClick={() => handleSelect(role)}
            disabled={loading !== null}
            aria-busy={isLoading}
            className="group flex flex-col items-start text-left p-6 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--elev-card)] transition-all duration-200 ease-[var(--ease-out)] hover:border-[var(--brand-500)] hover:shadow-[var(--elev-card-hover)] focus-visible:border-[var(--brand-500)] disabled:opacity-60 disabled:pointer-events-none"
          >
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)] mb-4 transition-colors group-hover:bg-[var(--brand-500)] group-hover:text-white">
              {isLoading ? (
                <Loader2 size={20} strokeWidth={2.25} className="animate-spin" aria-hidden />
              ) : (
                <Icon size={20} strokeWidth={2.25} aria-hidden />
              )}
            </span>
            <span className="block text-heading text-[var(--ink)] mb-1.5">{title}</span>
            <span className="block text-body text-[var(--ink-3)]">{desc}</span>
          </button>
        );
      })}
    </div>
  );
}
