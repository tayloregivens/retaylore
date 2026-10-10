import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
export default function useGuardian() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [chosen, setChosen] = useState(null);
  const latest = useQuery({ queryKey: ['guardian-latest', user?.id], enabled: !!user, queryFn: async () => {
    const page = await base44.entities.GuardianBatch.filter({ created_by_id: user.id }, { sort: '-created_date', limit: 1 });
    return page.items[0] || null;
  } });
  const batchId = chosen?.id || latest.data?.id || 'sample';
  const analysis = useQuery({ queryKey: ['guardian-analysis', user?.id, batchId], enabled: !!user && latest.isSuccess, staleTime: Infinity, retry: false, queryFn: async () => {
    const response = await base44.functions.invoke('analyzeGuardianPayments', { batchId });
    return response.data;
  } });
  const useImport = (batch, data) => {
    client.setQueryData(['guardian-analysis', user.id, batch.id], data);
    client.setQueryData(['guardian-latest', user.id], batch);
    setChosen(batch);
  };
  return { user, batchId, batch: chosen || latest.data, sample: batchId === 'sample', data: analysis.data, loading: latest.isPending || analysis.isPending, error: latest.error || analysis.error, retry: () => { latest.refetch(); analysis.refetch(); }, useImport, useSample: () => setChosen({ id: 'sample', name: 'Sample data' }) };
}