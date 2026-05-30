import type { StatusTone } from '@/components/status-pill';

export function toneFor(status: string): StatusTone {
  if (status === 'submitted') return 'info';
  if (status === 'approved') return 'success';
  if (status === 'revision-requested') return 'warn';
  return 'neutral';
}
