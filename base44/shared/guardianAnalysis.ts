import { parseCsv } from './guardianCsv.ts';
import { historyText as sampleHistory, pendingText as samplePending } from './guardianSample.ts';
export function analyze(historyText, pendingText) {
  const history = parseCsv(historyText, 'history'), pending = parseCsv(pendingText, 'pending');
  const byVendor = new Map(), historicalInvoices = new Map(), pendingInvoices = new Map();
  const key = row => JSON.stringify([row.vendorKey, row.invoiceKey]);
  const add = (map, k, value) => map.set(k, [...(map.get(k) || []), value]);
  history.forEach(row => { add(byVendor, row.vendorKey, row); add(historicalInvoices, key(row), row.payment_id); });
  pending.forEach(row => add(pendingInvoices, key(row), row.payment_id));
  const payments = pending.map(row => {
    const vendorHistory = byVendor.get(row.vendorKey) || [];
    const sorted = vendorHistory.map(h => h.amountCents).sort((a, b) => a - b), n = sorted.length;
    const medianCents = n ? (sorted[Math.floor((n - 1) / 2)] + sorted[Math.floor(n / 2)]) / 2 : null;
    const historicalMatches = historicalInvoices.get(key(row)) || [];
    const pendingMatches = (pendingInvoices.get(key(row)) || []).filter(id => id !== row.payment_id);
    const duplicate = historicalMatches.length > 0 || pendingMatches.length > 0;
    const insufficient = n < 3;
    const unusual = !insufficient && row.amountCents > 2 * medianCents;
    const flags = [...(duplicate ? ['duplicate'] : []), ...(unusual ? ['unusual'] : [])];
    return { ...row, flags, insufficient, historicalMatches, pendingMatches, historyCount: n, median: medianCents === null ? null : medianCents / 100, threshold: medianCents === null ? null : 2 * medianCents / 100, ratio: medianCents > 0 ? row.amountCents / medianCents : null, recommendation: duplicate ? 'On Hold' : unusual || insufficient ? 'Needs Investigation' : 'Approved' };
  });
  const flagged = payments.filter(p => p.flags.length);
  return { history, payments, stats: { total: payments.length, totalAmount: payments.reduce((n, p) => n + p.amountCents, 0) / 100, flagged: flagged.length, flaggedAmount: flagged.reduce((n, p) => n + p.amountCents, 0) / 100, duplicate: payments.filter(p => p.flags.includes('duplicate')).length, unusual: payments.filter(p => p.flags.includes('unusual')).length, insufficient: payments.filter(p => p.insufficient).length, clear: payments.filter(p => !p.flags.length && !p.insufficient).length } };
}
export async function loadSource(base44, user, batchId) {
  if (batchId === 'sample') return { historyText: sampleHistory, pendingText: samplePending };
  if (typeof batchId !== 'string' || batchId.length > 100) throw new Error('Select a valid import.');
  const batch = await base44.entities.GuardianBatch.get(batchId);
  if (!batch || batch.created_by_id !== user.id) throw new Error('This import is not available to your account.');
  const load = async file_uri => {
    if (typeof file_uri !== 'string' || file_uri.length > 2000) throw new Error('Invalid private file reference.');
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 120 });
    const res = await fetch(signed_url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('Could not read the private CSV. Please upload it again.');
    const text = await res.text();
    if (text.length > 1000000) throw new Error('CSV exceeds the 1 MB file limit.');
    return text;
  };
  const [historyText, pendingText] = await Promise.all([load(batch.history_uri), load(batch.pending_uri)]);
  return { historyText, pendingText };
}