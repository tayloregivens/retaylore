export const columns = {
  history: ['payment_id', 'vendor', 'category', 'amount', 'payment_date', 'invoice_id'],
  pending: ['payment_id', 'vendor', 'amount', 'invoice_id', 'due_date', 'status'],
};
export const normalizeVendor = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
export const normalizeInvoice = (value) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function parseCsv(text, kind) {
  if (typeof text !== 'string' || text.length > 1000000) throw new Error(`${kind}: file must be text under 1 MB.`);
  const input = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  const pushField = () => { row.push(field.trim()); field = ''; closed = false; };
  const pushRow = () => { pushField(); if (row.some(Boolean)) rows.push(row); row = []; };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"') {
      if (field.length || closed) throw new Error(`${kind}: malformed quote near row ${rows.length + 1}.`);
      quoted = true;
    } else if (c === ',') pushField();
    else if (c === '\n' || c === '\r') { pushRow(); if (c === '\r' && input[i + 1] === '\n') i++; }
    else { if (closed && !/\s/.test(c)) throw new Error(`${kind}: unexpected text after a closing quote.`); if (!closed) field += c; }
  }
  if (quoted) throw new Error(`${kind}: unclosed quoted field.`);
  if (field.length || row.length || closed) pushRow();
  if (!rows.length) throw new Error(`${kind}: file is empty. Include the required header row.`);
  const headers = rows.shift().map(h => h.toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error(`${kind}: duplicate column headers.`);
  const missing = columns[kind].filter(h => !headers.includes(h));
  if (missing.length) throw new Error(`${kind}: missing columns: ${missing.join(', ')}.`);
  if (rows.length > 1000) throw new Error(`${kind}: maximum 1,000 records per file.`);
  const ids = new Set();
  return rows.map((values, index) => {
    const fail = message => { throw new Error(`${kind}, row ${index + 2}: ${message}`); };
    if (values.length !== headers.length) fail('column count does not match the header.');
    const item = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    for (const key of columns[kind]) if (!item[key]) fail(`${key} is required.`);
    for (const key of columns[kind]) if (item[key].length > 200) fail(`${key} exceeds 200 characters.`);
    if (ids.has(item.payment_id)) fail(`duplicate payment_id ${item.payment_id}. Use unique payment IDs.`);
    ids.add(item.payment_id);
    if (!/^\d+(\.\d{1,2})?$/.test(item.amount) || Number(item.amount) > 1000000000) fail('amount must be a non-negative number, at most 1 billion, with up to 2 decimal places (no currency symbols or commas).');
    const dateKey = kind === 'history' ? 'payment_date' : 'due_date';
    const date = new Date(`${item[dateKey]}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item[dateKey]) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== item[dateKey]) fail(`${dateKey} must be a valid YYYY-MM-DD date.`);
    if (!normalizeVendor(item.vendor) || !normalizeInvoice(item.invoice_id)) fail('vendor and invoice_id must contain letters or digits.');
    if (kind === 'pending') {
      const statuses = {'pending':'Pending', 'approved':'Approved', 'on hold':'On Hold', 'needs investigation':'Needs Investigation'};
      const status = statuses[item.status.toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')];
      if (!status) fail('status must be Pending, Approved, On Hold, or Needs Investigation.');
      item.status = status;
    }
    return { ...Object.fromEntries(columns[kind].map(key => [key, item[key]])), amount: Number(item.amount), amountCents: Math.round(Number(item.amount) * 100), vendorKey: normalizeVendor(item.vendor), invoiceKey: normalizeInvoice(item.invoice_id) };
  });
}