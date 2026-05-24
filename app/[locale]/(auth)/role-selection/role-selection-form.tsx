'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useState } from 'react';

export function RoleSelectionForm() {
  const t = useTranslations('auth.roleSelection');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSelect(role: 'intern' | 'company') {
    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
      <button onClick={() => handleSelect('intern')} disabled={loading}>
        <strong>{t('intern')}</strong>
        <p>{t('internDescription')}</p>
      </button>
      <button onClick={() => handleSelect('company')} disabled={loading}>
        <strong>{t('company')}</strong>
        <p>{t('companyDescription')}</p>
      </button>
    </div>
  );
}
