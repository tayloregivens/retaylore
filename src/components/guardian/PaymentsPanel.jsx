import React, { useState } from 'react';
import PaymentToolbar from '@/components/guardian/PaymentToolbar';
import PaymentTable from '@/components/guardian/PaymentTable';
import PaymentDetailDialog from '@/components/guardian/PaymentDetailDialog';
import usePaymentDecisions from '@/components/guardian/usePaymentDecisions';
export default function PaymentsPanel({ data, userId, batchId, filter, setFilter }) {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [selected, setSelected] = useState(null);
  const term = search.trim().toLowerCase();
  const filtered = data.payments.filter(p => {
    const riskMatch = filter === 'all' || (filter === 'flagged' && p.flags.length > 0) || p.flags.includes(filter) || (filter === 'insufficient' && p.insufficient) || (filter === 'clear' && !p.flags.length && !p.insufficient);
    return riskMatch && (!term || [p.vendor, p.invoice_id, p.payment_id].some(text => text.toLowerCase().includes(term)));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 8)); const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * 8, current * 8);
  const ids = [...new Set([...rows.map(p => p.payment_id), ...(selected ? [selected.payment_id] : [])])];
  const decisions = usePaymentDecisions(userId, batchId, ids);
  return <section className="bg-card border rounded-xl shadow-sm overflow-hidden min-w-0"><PaymentToolbar filter={filter} setFilter={value => { setPage(1); setFilter(value); }} search={search} setSearch={value => { setPage(1); setSearch(value); }} total={data.payments.length} />
    {decisions.error && <div role="alert" className="bg-danger-soft p-3 text-xs text-destructive">Saved decisions could not be loaded. <button className="underline" onClick={() => decisions.retry()}>Retry</button></div>}
    <PaymentTable rows={rows} decisions={decisions.records} onSelect={payment => { decisions.save.reset(); setSelected(payment); }} page={current} pages={pages} setPage={setPage} count={filtered.length} loading={decisions.loading || !!decisions.error} onClear={() => { setSearch(''); setFilter('all'); setPage(1); }} />
    {selected && <PaymentDetailDialog key={selected.payment_id} payment={selected} analysis={data} batchId={batchId} status={decisions.records[selected.payment_id] || selected.status} save={decisions.save} loading={decisions.loading || !!decisions.error} onClose={() => setSelected(null)} />}
  </section>;
}