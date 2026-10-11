import React, { useEffect, useState } from 'react';
import { Loader2, Mail, Ban, Handshake } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { money } from '@/components/guardian/format';

const FOCUS_LABELS = { general: 'General inquiry', cancel: 'Cancel subscription', negotiate: 'Negotiate' };

export default function InvestigateEmailDialog({ payment, batchId, onClose }) {
  const [focus, setFocus] = useState('general');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setBusy(true); setError('');
    base44.functions.invoke('draftVendorEmail', { batchId, paymentId: payment.payment_id, focus }).then(({ data }) => {
      if (!active) return;
      if (data.error) { setError(data.error); setDraft(null); } else setDraft(data);
    }).catch(e => { if (!active) return; setError(e?.response?.data?.error || e?.data?.error || e?.message || 'Could not generate the email draft. Please try again.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [batchId, payment.payment_id, focus, retryKey]);

  return (
    <Dialog open onOpenChange={v => { if (!v && !busy) onClose(); }}>
      <DialogContent className="max-w-2xl bg-card max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="text-lg flex items-center gap-2"><Mail size={18} />Investigate · Vendor email draft</DialogTitle>
            <DialogDescription>{payment.vendor} · {payment.payment_id} · {money(payment.amount)}</DialogDescription>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={focus === 'cancel' ? 'default' : 'outline'} disabled={busy} onClick={() => setFocus('cancel')}><Ban size={14} className="mr-1.5" />Cancel Subscription</Button>
          <Button size="sm" variant={focus === 'negotiate' ? 'default' : 'outline'} disabled={busy} onClick={() => setFocus('negotiate')}><Handshake size={14} className="mr-1.5" />Negotiate</Button>
        </div>

        {busy ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center"><Loader2 size={16} className="animate-spin" />Drafting {FOCUS_LABELS[focus].toLowerCase()} email…</p>
        ) : error ? (
          <div role="alert" className="py-4 space-y-3"><p className="text-sm text-destructive">{error}</p><Button size="sm" variant="outline" disabled={busy} onClick={() => setRetryKey(k => k + 1)}><Loader2 size={14} className="mr-2" />Retry</Button></div>
        ) : draft && (
          <div className="space-y-3 text-sm">
            <div className="flex gap-2 items-center"><span className="text-muted-foreground w-16 shrink-0">To</span><span className="font-mono text-xs bg-muted px-2 py-1 rounded">{draft.recipient}</span></div>
            <div className="flex gap-2 items-center"><span className="text-muted-foreground w-16 shrink-0">Subject</span><span className="font-medium">{draft.subject}</span></div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-1">Draft focus: {FOCUS_LABELS[draft.focus]}</p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted/40 rounded-lg p-4">{draft.body}</pre>
            </div>
            <p className="text-[11px] text-muted-foreground">AI-generated draft addressed to a placeholder contact. Review and edit before sending; no email is sent from this tool.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}