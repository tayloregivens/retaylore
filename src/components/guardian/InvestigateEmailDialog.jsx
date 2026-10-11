import React, { useState } from 'react';
import { Mail, Ban, Handshake, MessageSquare, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { money } from '@/components/guardian/format';
import { buildDraft } from '@/components/guardian/emailDraft';

const FOCUSES = [{ id: 'general', label: 'General', icon: MessageSquare }, { id: 'cancel', label: 'Cancel Subscription', icon: Ban }, { id: 'negotiate', label: 'Negotiate', icon: Handshake }];

export default function InvestigateEmailDialog({ payment, onClose }) {
  const [focus, setFocus] = useState('general');
  const [draft, setDraft] = useState(() => buildDraft(payment, 'general'));
  const [copied, setCopied] = useState(false);
  const pick = id => { setFocus(id); setDraft(buildDraft(payment, id)); setCopied(false); };
  const copy = async () => { await navigator.clipboard.writeText(`To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`); setCopied(true); };
  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl bg-card max-h-[92vh] overflow-y-auto">
        <div>
          <DialogTitle className="text-lg flex items-center gap-2"><Mail size={18} />Investigate · Vendor email draft</DialogTitle>
          <DialogDescription>{payment.vendor} · {payment.payment_id} · {money(payment.amount)}</DialogDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {FOCUSES.map(({ id, label, icon: Icon }) => <Button key={id} size="sm" variant={focus === id ? 'default' : 'outline'} onClick={() => pick(id)}><Icon size={14} className="mr-1.5" />{label}</Button>)}
        </div>
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2"><span className="text-muted-foreground w-16 shrink-0">To</span><Input value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
          <label className="flex items-center gap-2"><span className="text-muted-foreground w-16 shrink-0">Subject</span><Input value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} /></label>
          <Textarea value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} className="min-h-[320px] leading-relaxed" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">Edit freely. The recipient is a placeholder, and no email is sent from this tool. Switching type replaces your edits.</p>
          <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}{copied ? 'Copied' : 'Copy'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}