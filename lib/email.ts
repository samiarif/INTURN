import { Resend } from 'resend';
import { requireEnv } from './env';

let _client: Resend | null = null;
function client(): Resend {
  if (!_client) _client = new Resend(requireEnv('RESEND_API_KEY'));
  return _client;
}

export type EmailPayload = {
  to: string | string[];
  subject: string;
  /** Plain-text fallback for clients that don't render HTML. */
  text: string;
  html: string;
  /** Optional reply-to override. */
  replyTo?: string;
  /** Tags for Resend dashboard analytics. */
  tags?: Array<{ name: string; value: string }>;
};

/**
 * Send a transactional email. Throws on network/API error.
 *
 * `RESEND_API_KEY=test-mode` short-circuits: logs to stdout and returns null
 * so CI + local dev don't blow real send budget. Production uses a real key.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ id: string } | null> {
  const key = requireEnv('RESEND_API_KEY');
  if (key === 'test-mode') {
    console.log('[email/test-mode] would send:', payload.subject, 'to', payload.to);
    return null;
  }

  const from = requireEnv('EMAIL_FROM');
  const replyTo = payload.replyTo ?? process.env.EMAIL_REPLY_TO;

  const result = await client().emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo,
    tags: payload.tags,
  });

  if (result.error) {
    throw new Error(`[email] send failed: ${result.error.message}`);
  }
  return { id: result.data!.id };
}
