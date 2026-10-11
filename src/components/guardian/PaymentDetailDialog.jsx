import React, { useState } from 'react';
import PricingInvestigation from '@/components/guardian/PricingInvestigation';
import InvestigateEmailDialog from '@/components/guardian/InvestigateEmailDialog';
import PaymentInvestigationActions from '@/components/guardian/PaymentInvestigationActions';
import { Check, Pause, Search, Loader2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import RiskBadge from '@/components/guardian/RiskBadge';
import PaymentEvidence from '@/components/guardian/PaymentEvidence';
import PaymentAiReview from '@/components/guardian/PaymentAiReview';
import { money, dateLabel } from '@/components/guardian/format';
export default function PaymentDetailDialog({ payment: p, analysis, batchId, status, save, loading, onClose }) {
  const [pricingOpen, setPricingOpen] = useState(false);
  const [investigateOpen, setInvestigateOpen] = useState(false);
  const currentMutation = save.variables?.paymentId === p.payment_id;
  return <Dialog open onOpenChange={value => { if (!value && !save.isPending) onClose(); }}><DialogContent className="max-w-3xl bg-card max-h-[92vh] overflow-y-auto"><DialogTitle className="text-xl pr-6">{p.vendor}</DialogTitle><DialogDescription>{p.payment_id} · Invoice {p.invoice_id} · Due {dateLabel(p.due_date)}</DialogDescription><div className="flex justify-between gap-3 items-start"><div className="flex flex-wrap gap-1.5">{p.flags.map(kind => <RiskBadge key={kind} kind={kind} />)}{p.insufficient && <RiskBadge kind="insufficient" />}{!p.flags.length && !p.insufficient && <RiskBadge kind="clear" />}</div><strong className="text-2xl tracking-tight whitespace-nowrap">{money(p.amount)}</strong></div>
  {(p.flags.length > 0 || p.insufficient) && <PaymentInvestigationActions payment={p} batchId={batchId} />}
  {p.flags.includes('unusual') && <div>{!pricingOpen ? <Button variant="outline" onClick={() => setPricingOpen(true)}><Search size={14} />Investigate Pricing</Button> : <PricingInvestigation payment={p} batchId={batchId} onBack={() => setPricingOpen(false)} />}</div>}
  <PaymentAiReview key={`${batchId}-${p.payment_id}`} payment={p} batchId={batchId} /><PaymentEvidence payment={p} analysis={analysis} />
  <section className="border-t pt-4"><div className="flex justify-between items-center mb-3 gap-2"><h3 className="text-sm font-semibold">Your review decision</h3><span className="text-xs text-muted-foreground">{loading ? 'Loading saved decision…' : status}</span></div><div className="flex flex-wrap gap-2">{[{ status: 'Approved', label: 'Approve', icon: Check }, { status: 'On Hold', label: 'Put on hold', icon: Pause }, { status: 'Needs Investigation', label: 'Investigate', icon: Search }].map(({ status: next, label, icon: Icon }) => <Button key={next} variant={status === next ? 'default' : 'outline'} className="text-xs" disabled={save.isPending || loading || (status === next && next !== 'Needs Investigation')} onClick={() => { if (next === 'Needs Investigation') { if (status !== 'Needs Investigation') save.mutate({ paymentId: p.payment_id, status: next }); setInvestigateOpen(true); } else save.mutate({ paymentId: p.payment_id, status: next }); }}>{save.isPending && currentMutation && save.variables.status === next ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Icon size={14} className="mr-2" />}{label}</Button>)}</div>
  {save.isError && currentMutation && <p role="alert" className="text-xs text-destructive mt-3">Could not save the decision. Please try again.</p>}{save.isSuccess && currentMutation && <p role="status" className="text-xs text-success mt-3">Decision saved. No transaction was initiated.</p>}
  <p className="text-[11px] text-muted-foreground mt-4 flex gap-2 leading-relaxed"><ShieldCheck size={14} className="shrink-0" />Simulation only. Flags remain visible after review for traceability. An approval never sends money or guarantees that a payment is safe.</p></section>{investigateOpen && <InvestigateEmailDialog payment={p} batchId={batchId} onClose={() => setInvestigateOpen(false)} />}</DialogContent></Dialog>;
}