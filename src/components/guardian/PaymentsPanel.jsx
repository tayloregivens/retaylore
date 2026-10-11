import React, { useState, useMemo } from 'react';
import { Zap } from 'lucide-react';
import PaymentToolbar from '@/components/guardian/PaymentToolbar';
import PaymentTable from '@/components/guardian/PaymentTable';
import PaymentDetailDialog from '@/components/guardian/PaymentDetailDialog';
import BulkActionsDialog from '@/components/guardian/BulkActionsDialog';
import usePaymentDecisions from '@/components/guardian/usePaymentDecisions';
export default function PaymentsPanel({ data, userId, batchId, filter, setFilter }) {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set()); const [bulkOpen, setBulkOpen] = useState(false);
  const term = search.trim().toLowerCase();
  const filtered = data.payments.filter(p => {
    const riskMatch = filter === 'all' || (filter === 'flagged' && p.flags.length > 0) || p.flags.includes(filter) || (filter === 'insufficient' && p.insufficient) || (filter === 'clear' && !p.flags.length && !p.insufficient);
    return riskMatch && (!term || [p.vendor, p.invoice_id, p.payment_id].some(text => text.toLowerCase().includes(term)));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 8)); const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * 8, current * 8);
  const ids = [...new Set([...rows.map(p => p.payment_id), ...(selected ? [selected.payment_id] : [])])];
  const decisions = usePaymentDecisions(userId, batchId, ids);

  const flaggedRows = rows.filter(p => p.flags.length > 0);
  const allFlaggedSelected = flaggedRows.length > 0 && flaggedRows.every(p => selectedIds.has(p.payment_id));

  const toggleSelect = p => setSelectedIds(prev => { const next = new Set(prev); next.has(p.payment_id) ? next.delete(p.payment_id) : next.add(p.payment_id); return next; });
  const toggleSelectAll = () => setSelectedIds(prev => { const next = new Set(prev); if (allFlaggedSelected) flaggedRows.forEach(p => next.delete(p.payment_id)); else flaggedRows.forEach(p => next.add(p.payment_id)); return next; });

  const selectedPayments = useMemo(() => data.payments.filter(p => selectedIds.has(p.payment_id)), [data.payments, selectedIds]);

  return <section className="bg-card border rounded-xl shadow-sm overflow-hidden min-w-0"><PaymentToolbar filter={filter} setFilter={value => { setPage(1); setFilter(value); }} search={search} setSearch={value => { setPage(1); setSearch(value); }} total={data.payments.length} />
    {decisions.error && <div role="alert" className="bg-danger-soft p-3 text-xs text-destructive">Saved decisions could not be loaded. <button className="underline" onClick={() => decisions.retry()}>Retry</button></div>}
    {selectedPayments.length > 0 && <div className="flex items-center gap-3 bg-primary/5 border-b px-5 py-2.5"><span className="text-xs font-medium text-primary">{selectedPayments.length} selected</span><button onClick={() => setBulkOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors"><Zap size={13} />Do something about this</button><button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button></div>}
    <PaymentTable rows={rows} decisions={decisions.records} onSelect={payment => { decisions.save.reset(); setSelected(payment); }} page={current} pages={pages} setPage={setPage} count={filtered.length} loading={decisions.loading || !!decisions.error} onClear={() => { setSearch(''); setFilter('all'); setPage(1); }} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} />
    {selected && <PaymentDetailDialog key={selected.payment_id} payment={selected} analysis={data} batchId={batchId} status={decisions.records[selected.payment_id] || selected.status} save={decisions.save} loading={decisions.loading || !!decisions.error} onClose={() => setSelected(null)} />}
    <BulkActionsDialog open={bulkOpen} selected={selectedPayments} onClose={() => setBulkOpen(false)} onClear={() => { setSelectedIds(new Set()); setBulkOpen(false); }} />
  </section>;
}