import React from 'react';
import { money, dateLabel } from '@/components/guardian/format';
export default function PricingFindings({ result }) {
  return <div className="space-y-4 text-xs">
    {result.warnings.map((warning, i) => <p key={i} role="alert" className="text-warning">Partial search: {warning}</p>)}
    <div><h4 className="font-semibold mb-2">Historical payment amounts</h4><div className="max-h-32 overflow-auto border rounded-md">{result.history.map(h => <p key={h.payment_id} className="px-3 py-2 border-b last:border-0">{h.payment_id} · {dateLabel(h.date)} · {money(h.amount)}</p>)}</div></div>
    <div><h4 className="font-semibold mb-2">Public findings from Bright Data</h4><p className="text-muted-foreground mb-3">Search excerpts, not verified invoice explanations. Confirm the vendor identity, official domain, pricing date, and applicability before relying on a source.</p>
      {!result.findings.length && <p>No public pricing results were returned for this vendor.</p>}
      <div className="space-y-3">{result.findings.map(f => <article key={f.url} className="border rounded-md p-3"><a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline">{f.title}</a><p className="mt-2 whitespace-pre-wrap">{f.snippet || 'No search excerpt was provided.'}</p><a href={f.url} target="_blank" rel="noopener noreferrer" className="block mt-2 break-all text-primary underline">{f.url}</a></article>)}</div>
    </div>
    <div className="bg-muted/40 rounded-md p-3"><h4 className="font-semibold mb-2">Possible explanations to verify, not findings</h4><ul className="list-disc pl-4 space-y-1"><li>A published price increase or expired discount, if confirmed by a dated vendor announcement.</li><li>A different plan, larger quantity, or longer billing period; compare the invoice with applicable pricing.</li><li>Additional usage, fees, or taxes; ask the vendor for an itemized breakdown.</li></ul><p className="mt-2 text-muted-foreground">Public pricing cannot establish why this specific charge changed. Detection flags and your saved decision remain unchanged.</p></div>
    <p className="text-muted-foreground">Retrieved {new Date(result.retrievedAt).toLocaleString()} · Powered by Bright Data SERP API</p>
  </div>;
}