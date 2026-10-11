import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Search, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { savePaymentContext } from '@/components/guardian/investigationContext';

export default function PaymentInvestigationActions({ payment, batchId }) {
  const navigate = useNavigate();
  const open = useMutation({
    mutationFn: async path => ({ path, record: await savePaymentContext(payment, batchId) }),
    onSuccess: ({ path, record }) => navigate(`${path}?investigation=${encodeURIComponent(record.id)}`)
  });
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={open.isPending} onClick={() => open.mutate('/extractor')}><Search size={14} />Research Vendor</Button>
      <Button variant="outline" disabled={open.isPending} onClick={() => open.mutate('/advisor')}><Bot size={14} />Ask Payment Advisor</Button>
      {open.isPending && <Loader2 size={16} className="animate-spin" />}
    </div>
    {open.isError && <p role="alert" className="text-xs text-destructive">Could not open this investigation. Please try again.</p>}
  </div>;
}