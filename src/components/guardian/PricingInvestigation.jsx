import React, { useEffect, useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { money } from '@/components/guardian/format';
import PricingFindings from '@/components/guardian/PricingFindings';
import { savePaymentContext } from '@/components/guardian/investigationContext';
export default function PricingInvestigation({ payment, batchId, onBack }) {
  const [result, setResult] = useState(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setResult(null); setError('');
    base44.functions.invoke('investigateGuardianPricing', { batchId, paymentId: payment.payment_id }).then(async ({ data }) => {
      if (data.error) { if (active) setError(data.error); return; }
      if (active) setResult(data);
      if (data.findings?.length) {
        const record = await savePaymentContext(payment, batchId);
        await base44.entities.GuardianInvestigation.update(record.id, { research: { provider: 'Bright Data', success: true, result_count: data.findings.length, results: data.findings.map(f => ({ title: f.title, url: f.url, description: f.snippet, pricing: [], search: f.search })), queries: data.queries, warnings: data.warnings }, researched_at: data.retrievedAt });
      }
    }).catch(e => { if (active) setError(e.response?.data?.error || e.message || 'Could not connect to Bright Data.'); });
    return () => { active = false; };
  }, [batchId, payment.payment_id, attempt]);
  return <section className="border rounded-lg p-4 space-y-4" aria-label="Pricing investigation">
    <div className="flex flex-wrap justify-between items-center gap-2"><h3 className="text-sm font-semibold">Pricing investigation</h3><Button variant="outline" size="sm" onClick={onBack}><ArrowLeft size={14} />Return to payment review</Button></div>
    <p className="text-xs">{payment.vendor} · Pending payment: <strong>{money(payment.amount)}</strong> · Historical median: <strong>{money(payment.median)}</strong></p>
    {error ? <div role="alert" className="text-sm text-destructive"><p>{error}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => setAttempt(n => n + 1)}>Retry investigation</Button></div> : !result ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />Searching official pricing and pricing announcements through Bright Data…</p> : <PricingFindings result={result} />}
  </section>;
}