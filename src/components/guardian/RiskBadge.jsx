import React from 'react';
import { AlertTriangle, Copy, CheckCircle2, History } from 'lucide-react';
const styles = { duplicate: ['bg-danger-soft text-destructive', Copy, 'Potential duplicate'], unusual: ['bg-warning-soft text-warning', AlertTriangle, 'Unusual amount'], insufficient: ['bg-secondary text-muted-foreground', History, 'Insufficient history'], clear: ['bg-success-soft text-success', CheckCircle2, 'No issues detected'] };
export default function RiskBadge({ kind, compact = false }) {
  const [style, Icon, label] = styles[kind];
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap ${style}`}><Icon size={12} />{compact && kind === 'duplicate' ? 'Duplicate' : label}</span>;
}