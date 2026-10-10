import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, LockKeyhole, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { downloadCsv } from '@/components/guardian/format';
export default function ImportDialog({ open, onClose, onImported, sampleFiles }) {
  const [files, setFiles] = useState({}); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      for (const kind of ['history', 'pending']) {
        const file = files[kind];
        if (!file || !file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose both CSV files before continuing.');
        if (file.size > 1000000) throw new Error(`${file.name}: maximum size is 1 MB.`);
        if (!file.size) throw new Error(`${file.name} is empty. Include the required headers.`);
      }
      const [historyText, pendingText] = await Promise.all([files.history.text(), files.pending.text()]);
      const { data } = await base44.functions.invoke('analyzeGuardianPayments', { historyText, pendingText });
      const [history, pending] = await Promise.all([base44.integrations.Core.UploadPrivateFile({ file: files.history }), base44.integrations.Core.UploadPrivateFile({ file: files.pending })]);
      const batch = await base44.entities.GuardianBatch.create({ name: files.pending.name, history_uri: history.file_uri, pending_uri: pending.file_uri, history_name: files.history.name, pending_name: files.pending.name });
      onImported(batch, data); setFiles({}); onClose();
    } catch (e) { setError(e.response?.data?.error || e.data?.error || e.message || 'Import failed. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!value && !busy) onClose(); }}><DialogContent className="max-w-xl bg-card max-h-[90vh] overflow-y-auto"><DialogTitle>Bring your payments into focus</DialogTitle><DialogDescription>Upload a historical ledger and your pending payment batch. Both files are validated before anything is saved.</DialogDescription><form onSubmit={submit} className="space-y-4">
    {['history', 'pending'].map(kind => <div className="border rounded-xl p-4" key={kind}><label className="block" htmlFor={`csv-${kind}`}><span className="flex gap-2 items-center text-sm font-semibold"><FileSpreadsheet size={16} className="text-primary" />{kind === 'history' ? '1. Payment history' : '2. Pending payments'}</span><span className="block text-[11px] text-muted-foreground my-2 leading-relaxed">{kind === 'history' ? 'payment_id, vendor, category, amount, payment_date, invoice_id' : 'payment_id, vendor, amount, invoice_id, due_date, status'}</span></label><input key={`${kind}-${open}`} id={`csv-${kind}`} aria-label={`${kind} CSV file`} type="file" accept=".csv,text/csv" disabled={busy} onChange={e => setFiles(current => ({ ...current, [kind]: e.target.files?.[0] }))} className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-medium file:text-foreground" /></div>)}
    <p className="text-[11px] leading-relaxed text-muted-foreground">Maximum 1 MB and 1,000 records per file. Dates: YYYY-MM-DD. Amounts: non-negative USD, no currency symbols. Status: Pending, Approved, On Hold, or Needs Investigation. Header-only files are supported.</p>
    {error && <p role="alert" className="text-xs text-destructive bg-danger-soft rounded-lg p-3">{error}</p>}
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><LockKeyhole size={14} />Files are stored privately. No real payments are initiated.</div>
    <Button type="submit" disabled={busy || !files.history || !files.pending} className="w-full">{busy ? <Loader2 size={16} className="mr-2 animate-spin" /> : <UploadCloud size={16} className="mr-2" />}{busy ? 'Validating and importing…' : 'Import & analyze payments'}</Button>
    {sampleFiles && <div className="border-t pt-4"><p className="text-xs text-muted-foreground mb-2">Need a starting point? Download the working sample files.</p><div className="flex flex-wrap gap-3">{['history', 'pending'].map(kind => <button type="button" key={kind} onClick={() => downloadCsv(kind === 'history' ? 'payment_history.csv' : 'pending_payments.csv', sampleFiles[`${kind}Text`])} className="text-[11px] text-primary flex items-center gap-1"><Download size={12} />{kind === 'history' ? 'payment_history.csv' : 'pending_payments.csv'}</button>)}</div></div>}
  </form></DialogContent></Dialog>;
}