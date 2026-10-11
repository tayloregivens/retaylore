import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MessageSquareQuote, Phone, Ban } from 'lucide-react';
import RiskBadge from '@/components/guardian/RiskBadge';
import { money, dateLabel } from '@/components/guardian/format';

const ACTION_META = {
  cancel: { icon: Ban, label: 'Cancel the service', detail: 'If the charge is for a subscription or recurring service you no longer use, cancel it directly with the vendor and request written confirmation.' },
  negotiate: { icon: MessageSquareQuote, label: 'Negotiate a lower price', detail: 'Reference your historical payment amounts and ask the vendor to explain the increase. Request a revised quote or a one-time credit for the difference.' },
  contact: { icon: Phone, label: 'Contact the company', detail: 'Reach out to your account manager or billing support to confirm the charge, request an invoice breakdown, and document the conversation for your records.' },
};
const ACTION_ORDER = ['cancel', 'negotiate', 'contact'];

// Determine which of the 3 follow-up actions apply to a given payment.
function recommendActions(p) {
  const actions = new Set();
  if (p.flags.includes('duplicate')) { actions.add('cancel'); actions.add('contact'); }
  if (p.flags.includes('unusual')) { actions.add('negotiate'); actions.add('contact'); }
  if (p.insufficient) { actions.add('contact'); }
  if (actions.size === 0) actions.add('contact'); // baseline fallback
  return actions;
}

export default function BulkActionsDialog({ open, selected, onClose, onClear }) {
  const total = selected.reduce((sum, p) => sum + (p.amount || 0), 0);

  const { perPayment, actionCounts } = useMemo(() => {
    const counts = { cancel: 0, negotiate: 0, contact: 0 };
    const per = selected.map(p => {
      const actions = recommendActions(p);
      actions.forEach(a => counts[a]++);
      return { payment: p, actions: [...actions] };
    });
    return { perPayment: per, actionCounts: counts };
  }, [selected]);

  const activeActions = ACTION_ORDER.filter(a => actionCounts[a] > 0);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Do something about this</DialogTitle>
          <DialogDescription>
            {selected.length} flagged {selected.length === 1 ? 'transaction' : 'transactions'} selected. Recommended follow-up actions are determined per transaction based on its risk flags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-1">
          {perPayment.map(({ payment: p, actions }) => (
            <div key={p.payment_id} className="border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 bg-secondary rounded-lg border grid place-items-center text-[10px] font-semibold text-muted-foreground shrink-0">{p.vendor.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{p.vendor}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.invoice_id} · due {dateLabel(p.due_date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-semibold tabular-nums">{money(p.amount)}</span>
                  <div className="flex gap-1">{p.flags.map(f => <RiskBadge key={f} kind={f} compact />)}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t">
                {actions.map(a => {
                  const { icon: Icon, label } = ACTION_META[a];
                  return <span key={a} className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 text-primary px-2 py-1 text-[11px] font-medium"><Icon size={12} />{label}</span>;
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 pb-2 border-b">
          <span>Total selected</span>
          <span className="font-semibold tabular-nums text-foreground">{money(total)}</span>
        </div>

        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold">Recommended follow-up actions</p>
          {activeActions.map(a => {
            const { icon: Icon, label, detail } = ACTION_META[a];
            return (
              <div key={a} className="flex gap-3 border rounded-lg p-3.5">
                <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0"><Icon size={16} /></span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{label}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{actionCounts[a]} of {selected.length}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t">
          <button onClick={onClear} className="text-xs text-primary font-medium">Clear selection</button>
          <button onClick={onClose} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}