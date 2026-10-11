import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { money } from '@/components/guardian/format';

export default function InvestigationContextBar({ investigation, page }) {
  if (!investigation.id) return null;
  const { record, loading, error } = investigation;
  return <section className="border-b px-4 py-3 space-y-2 text-xs" aria-label="Selected payment investigation">
    {loading ? <p role="status">Loading selected payment…</p> : error ? <p role="alert" className="text-destructive">Could not load this investigation. <button className="underline" onClick={() => investigation.retry()}>Retry</button></p> : <>
      <p className="font-semibold">{record.payment.vendor} · {record.payment_id} · {money(record.payment.amount)}</p>
      <p>Historical median: {record.payment.median == null ? 'Unavailable' : money(record.payment.median)} · {record.payment.historyCount} charges</p>
      <p className="text-muted-foreground">{record.risk_reason}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm"><Link to={`${page === 'extractor' ? '/advisor' : '/extractor'}?investigation=${encodeURIComponent(record.id)}`}>{page === 'extractor' ? 'Ask Payment Advisor' : 'Research Vendor'}</Link></Button>
        {record.research && <span role="status">Saved Bright Data findings · {new Date(record.researched_at).toLocaleString()}</span>}
      </div>
    </>}
  </section>;
}