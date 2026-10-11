import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { analyze, loadSource } from '../../shared/guardianAnalysis.ts';

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
        const params = new URLSearchParams({ q: query, hl: 'en', gl: 'us', brd_json: 'parsed_light' });
        const response = await base44.functions.invoke('extractWebData', { url: `https://www.google.com/search?${params}`, format: 'raw', data_format: 'parsed_light' });
        const result = response.data;
        if (result.error) throw new Error(result.error);
        if (result.truncated) throw new Error('Bright Data returned an incomplete response. Please retry.');
        let parsed;
        try { parsed = JSON.parse(result.content); } catch { throw new Error('Bright Data did not return structured search results. Check the SERP zone configuration.'); }
        if (!Array.isArray(parsed.organic)) throw new Error('Bright Data returned an unexpected search response.');
        const entries = [...parsed.organic, ...(parsed.top_stories?.items || [])];
        for (const entry of entries.slice(0, 12)) {
          let url;
          try { url = new URL(entry.link); } catch { continue; }
          if (!['https:', 'http:'].includes(url.protocol) || findings.some(f => f.url === url.href)) continue;
          findings.push({ title: String(entry.title || url.hostname).slice(0, 300), url: url.href, snippet: String(entry.description || entry.story || '').slice(0, 1500), search: query });
        }
      } catch (error) {
        warnings.push(error.response?.data?.error || error.message || 'Bright Data connection failed.');
      }
    }
    if (!findings.length && warnings.length) return Response.json({ error: warnings.join(' ') }, { status: 502 });
    return Response.json({ vendor: payment.vendor, amount: payment.amount, median: payment.median, history: analysis.history.filter(h => h.vendorKey === payment.vendorKey).map(h => ({ payment_id: h.payment_id, amount: h.amount, date: h.payment_date })), findings: findings.slice(0, 20), warnings, queries, retrievedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.response?.data?.error || error.message || 'Pricing investigation failed.' }, { status: 500 });
  }
}