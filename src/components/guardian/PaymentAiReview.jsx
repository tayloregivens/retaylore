import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
export default function PaymentAiReview({ payment, batchId }) {
  const [result, setResult] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const explain = async () => {
    setBusy(true); setError('');
    try { const { data } = await base44.functions.invoke('explainGuardianPayment', { batchId, paymentId: payment.payment_id }); setResult(data); }
    catch (e) { setError(e.response?.data?.error || e.data?.error || 'AI review is unavailable. You can still review the exact evidence and make a decision.'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-xl p-4 bg-success-soft border border-primary/10"><div className="flex items-center gap-2 text-primary text-sm font-semibold"><Sparkles size={16} />AI-assisted review</div><p className="text-xs mt-3">Rule-based suggestion: <strong>{payment.recommendation}</strong></p>{result ? <div className="text-xs leading-relaxed mt-3"><p>{result.explanation}</p><ul className="list-disc pl-4 mt-3 space-y-1">{result.next_steps.map((step, i) => <li key={i}>{step}</li>)}</ul><p className="text-[10px] text-muted-foreground mt-3">AI-generated explanation. Verify it against the exact records below; the suggestion comes from deterministic rules.</p></div> : <><p className="text-xs text-muted-foreground my-3">Get an explanation and suggested next steps using only this payment and its supporting records.</p><Button onClick={explain} disabled={busy} size="sm" variant="outline" className="bg-card text-xs">{busy ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Sparkles size={14} className="mr-2" />}{busy ? 'Reviewing evidence…' : 'Generate AI explanation'}</Button></>}{error && <p role="alert" className="text-destructive text-xs mt-3">{error}</p>}</section>;
}