import React, { useState, useEffect } from 'react';
import { Mail, Ban, Handshake, MessageSquare, Copy, Check, Search, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { money } from '@/components/guardian/format';
import { buildDraft } from '@/components/guardian/emailDraft';
import { base44 } from '@/api/base44Client';

const FOCUSES = [{ id: 'general', label: 'General', icon: MessageSquare }, { id: 'cancel', label: 'Cancel Subscription', icon: Ban }, { id: 'negotiate', label: 'Negotiate', icon: Handshake }];

export default function InvestigateEmailDialog({ payment, batchId, onClose }) {
  const [focus, setFocus] = useState('general');
  const [draft, setDraft] = useState(() => buildDraft(payment, 'general'));
  const [copied, setCopied] = useState(false);
  const [sources, setSources] = useState([]);
  const [research, setResearch] = useState({ state: 'idle' });
  const [retryKey, setRetryKey] = useState(0);

  const pick = (id) => { setFocus(id); setDraft(buildDraft(payment, id)); setCopied(false); };

  useEffect(() => {
    if (focus !== 'negotiate') { setSources([]); setResearch({ state: 'idle' }); return; }
    let active = true;
    setResearch({ state: 'searching' });
    base44.functions.invoke('negotiateResearch', { batchId, paymentId: payment.payment_id })
      .then(({ data }) => {
        if (!active) return;
        if (data.error) { setResearch({ state: 'error', message: data.error }); return; }
        setDraft(data.draft);
        setSources(data.sources || []);
        setResearch({ state: 'done', query: data.query, warning: data.searchWarning || '' });
      })
      .catch(e => { if (active) setResearch({ state: 'error', message: e?.response?.data?.error || e?.data?.error || e?.message || 'Research failed. You can still edit the template draft.' }); });
    return () => { active = false; };
  }, [focus, batchId, payment.payment_id, retryKey]);

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
        {focus === 'negotiate' && research.state === 'searching' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 size={16} className="animate-spin" />Researching leverage via Bright Data — generating query, searching, then writing an improved draft…</div>
        )}
        {focus === 'negotiate' && research.state === 'done' && sources.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold flex items-center gap-1.5"><Search size={12} />Research sources (Bright Data)</p>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setRetryKey(k => k + 1)}><RefreshCw size={12} className="mr-1" />Refresh</Button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Search query: "{research.query}"</p>
            <div className="space-y-2">
              {sources.map((s, i) => (
                <div key={i} className="bg-warning-soft border border-warning/20 rounded-lg p-3">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">{s.title}<ExternalLink size={10} /></a>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.snippet}</p>
                  {s.pricing?.length > 0 && <p className="text-[11px] text-warning font-medium mt-1">Pricing: {s.pricing.join(', ')}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {focus === 'negotiate' && research.state === 'done' && sources.length === 0 && (
          <div className="border-t pt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Bright Data returned no results{research.warning ? `: ${research.warning}` : ''}. The draft was written from the payment context only.</p>
            <Button size="sm" variant="outline" onClick={() => setRetryKey(k => k + 1)}><RefreshCw size={12} className="mr-1.5" />Retry research</Button>
          </div>
        )}
        {focus === 'negotiate' && research.state === 'error' && (
          <div className="border-t pt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-destructive">{research.message}</p>
            <Button size="sm" variant="outline" onClick={() => setRetryKey(k => k + 1)}><RefreshCw size={12} className="mr-1.5" />Retry research</Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">Edit freely. The recipient is a placeholder, and no email is sent from this tool. Switching type replaces your edits.</p>
          <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}{copied ? 'Copied' : 'Copy'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}