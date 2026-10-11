import { money, dateLabel } from '@/components/guardian/format';

export const FOCUS_LABELS = { general: 'General inquiry', cancel: 'Cancel subscription', negotiate: 'Negotiate price' };

function reasonLine(p) {
  const parts = [];
  const matches = [...(p.historicalMatches || []), ...(p.pendingMatches || [])];
  if (p.flags.includes('duplicate')) parts.push(`This invoice appears to match a previous payment on file (${matches.join(', ')}), so we want to make sure it is not a duplicate charge.`);
  if (p.flags.includes('unusual')) parts.push(`The amount is higher than your typical charges to us (median ${money(p.median)} across ${p.historyCount} prior payments).`);
  if (p.insufficient) parts.push('We have limited payment history with your company and would like to verify this charge.');
  return parts.join(' ') || 'We are doing a routine check on this charge.';
}

export function buildDraft(p, focus) {
  const slug = String(p.vendor || 'vendor').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'vendor';
  const details = `Payment ID: ${p.payment_id}\nInvoice: ${p.invoice_id}\nAmount: ${money(p.amount)}\nDue date: ${dateLabel(p.due_date)}`;
  const greeting = `Hello ${p.vendor} Billing Team,\n\n`;
  const signoff = '\n\nThank you for your help.\n\nBest regards,\nFinance Team';
  const to = `accounts@${slug}.example`;
  if (focus === 'cancel') return { to, subject: `Cancellation and refund request - invoice ${p.invoice_id}`, body: `${greeting}We would like to cancel our subscription or service with ${p.vendor} and request a refund of the charge below.\n\n${details}\n\n${reasonLine(p)}\n\nPlease confirm the cancellation in writing, the effective date, and when we can expect the refund.${signoff}` };
  if (focus === 'negotiate') return { to, subject: `Pricing review - invoice ${p.invoice_id}`, body: `${greeting}We value our relationship with ${p.vendor} and would like to discuss the charge below.\n\n${details}\n\n${reasonLine(p)}\n\nCould you offer a lower rate, or a partial credit or refund, for this charge?${signoff}` };
  return { to, subject: `Question about invoice ${p.invoice_id} (${p.payment_id})`, body: `${greeting}Our finance team is reviewing an upcoming payment and would like to confirm a few details before it is processed.\n\n${details}\n\n${reasonLine(p)}\n\nCould you please confirm that this charge is correct and send any supporting documentation, such as the invoice or a service statement?${signoff}` };
}