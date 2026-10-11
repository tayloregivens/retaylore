import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { XCircle, MessageSquareQuote, Phone, Ban } from 'lucide-react';
import RiskBadge from '@/components/guardian/RiskBadge';
import { money, dateLabel } from '@/components/guardian/format';

const SUGGESTED_ACTIONS = [
  { key: 'cancel', icon: Ban, label: 'Cancel the service', detail: 'If the charge is for a subscription or recurring service you no longer use, cancel it directly with the vendor and request written confirmation.' },
  { key: 'negotiate', icon: MessageSquareQuote, label: 'Negotiate a lower price', detail: 'Reference your historical payment amounts and ask the vendor to explain the increase. Request a revised quote or a one-time credit for the difference.' },
  { key: 'contact', icon: Phone, label: 'Contact the company', detail: 'Reach out to your account manager or billing support to confirm the charge, request an invoice breakdown, and document the conversation for your records.' },
];

export default function BulkActionsDialog({ open, selected, onClose, onClear }) {
  const total = selected.reduce((sum, p) => sum + (p.amount || 0), 0);
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Do something about this</DialogTitle>
          <DialogDescription>
            {selected.length} flagged {selected.length === 1 ? 'transaction' : 'transactions'} selected. Review the suggested follow-up actions below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-1">
          {selected.map(p => (
            <div key={p.payment_id} className="flex items-center gap-3 border rounded-lg p-3">
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
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 pb-2 border-b">
          <span>Total selected</span>
          <span className="font-semibold tabular-nums text-foreground">{money(total)}</span>
        </div>

        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold">Suggested follow-up actions</p>
          {SUGGESTED_ACTIONS.map(({ key, icon: Icon, label, detail }) => (
            <div key={key} className="flex gap-3 border rounded-lg p-3.5">
              <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0"><Icon size={16} /></span>
              <div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t">
          <button onClick={onClear} className="text-xs text-primary font-medium">Clear selection</button>
          <button onClick={onClose} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}