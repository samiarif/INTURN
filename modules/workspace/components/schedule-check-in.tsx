'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Check, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { scheduleCheckInAction } from '../server-actions';

function defaultDate(): string {
  // Default to next Friday at 14:00 local time.
  const d = new Date();
  const day = d.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilFriday);
  d.setHours(14, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function ScheduleCheckInButton({
  workspaceId,
  trigger = 'inline-cta',
}: {
  workspaceId: string;
  trigger?: 'inline-cta' | 'inline-btn';
}) {
  const locale = useLocale();
  const t = useTranslations('workspace.schedule');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [scheduledAt, setScheduledAt] = useState(defaultDate());
  const [duration, setDuration] = useState('30');
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState<{ url: string; when: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await scheduleCheckInAction({
          workspaceId,
          scheduledAtIso: new Date(scheduledAt).toISOString(),
          durationMinutes: Number(duration),
          note: note.trim() || undefined,
        });
        setSuccess({ url: result.meetingUrl, when: result.scheduledAt });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to schedule');
      }
    });
  }

  if (trigger === 'inline-cta') {
    if (!open) {
      return (
        <button type="button" onClick={() => setOpen(true)} className="ws-btn-w">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {t('title')}
            <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
          </span>
        </button>
      );
    }
  }

  // "When", "Duration", "15/30/45 minutes", "1 hour", "Agenda (optional)",
  // the agenda placeholder, and "Scheduling…" are not in the plan namespace
  // and remain English.
  return (
    <div
      className="ws-card"
      style={{ padding: 16, marginTop: trigger === 'inline-cta' ? 12 : 0 }}
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--status-success-bg)',
              color: 'var(--status-success-ink)',
              marginBottom: 8,
            }}
          >
            <Check size={18} strokeWidth={2.5} />
          </div>
          <h4 className="text-heading" style={{ color: 'var(--ink)', marginBottom: 4 }}>
            {t('successHeading')}
          </h4>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 10 }}>
            {new Date(success.when).toLocaleString(locale, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <a
            href={success.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ws-btn brand"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            {t('linkLabel')}
            <ExternalLink size={14} strokeWidth={2.25} aria-hidden />
          </a>
        </div>
      ) : (
        <>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 12,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t('title')}
          </h4>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
            {t('description')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <Label htmlFor="when" style={{ fontSize: 12 }}>
                When
              </Label>
              <Input
                id="when"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <Label style={{ fontSize: 12 }}>Duration</Label>
              <Select value={duration} onValueChange={(v) => setDuration(v ?? '30')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="note" style={{ fontSize: 12 }}>
                Agenda (optional)
              </Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Review v2, plan next sprint"
              />
            </div>
            {error && (
              <p style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={pending}
                className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
              >
                {pending ? 'Scheduling…' : t('submit')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
