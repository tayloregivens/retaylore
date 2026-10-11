import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { analyze, loadSource } from '../../shared/guardianAnalysis.ts';
import { extractBrightData } from '../../shared/extractBrightData.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { batchId, paymentId } = await req.json();
    if (typeof paymentId !== 'string' || paymentId.length > 200) return Response.json({ error: 'Select a valid payment.' }, { status: 400 });
    if (!secrets.get('brightData')) return Response.json({ error: 'Bright Data is not configured. Add the Bright Data API key to connect pricing investigations.' }, { status: 503 });
    const source = await loadSource(base44, user, batchId);
    const analysis = analyze(source.historyText, source.pendingText);
    const payment = analysis.payments.find(p => p.payment_id === paymentId);
    if (!payment?.flags.includes('unusual')) return Response.json({ error: 'Pricing investigation is available only for unusual payments.' }, { status: 400 });
    const vendor = payment.vendor.slice(0, 200).replace(/["\r\n]/g, ' ');
    const queries = [`"${vendor}" official pricing prices rates`, `"${vendor}" pricing announcement price increase`];
    const findings = [];
    const warnings = [];
    for (const query of queries) {
      try {
        const response = await extractBrightData({ query });
        const result = await response.json();
        if (!response.ok || result.provider !== 'Bright Data' || result.success !== true || !result.results?.length) {
          throw new Error(result.error || 'No usable Bright Data results found.');
        }
        for (const entry of result.results) {
          if (findings.some(f => f.url === entry.url)) continue;
          findings.push({ title: entry.title, url: entry.url, snippet: entry.description, pricing: entry.pricing, search: query });
        }
      } catch (error) {
        warnings.push(error.data?.error || error.response?.data?.error || error.message || 'Bright Data connection failed.');
      }
    }
    if (!findings.length && warnings.length) return Response.json({ success: false, provider: 'Bright Data', result_count: 0, results: [], error: warnings.join(' ') }, { status: 502 });
    const usable = findings.slice(0, 20);
    const results = usable.map(f => ({ title: f.title, url: f.url, description: f.snippet, pricing: f.pricing, search: f.search }));
    return Response.json({ success: results.length > 0, provider: 'Bright Data', result_count: results.length, results, vendor: payment.vendor, amount: payment.amount, median: payment.median, history: analysis.history.filter(h => h.vendorKey === payment.vendorKey).map(h => ({ payment_id: h.payment_id, amount: h.amount, date: h.payment_date })), findings: usable, warnings, queries, retrievedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.response?.data?.error || error.message || 'Pricing investigation failed.' }, { status: 500 });
  }
}