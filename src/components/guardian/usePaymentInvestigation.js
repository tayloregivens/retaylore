import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function usePaymentInvestigation() {
  const [params] = useSearchParams();
  const id = params.get('investigation');
  const client = useQueryClient();
  const key = ['payment-investigation', id];
  const query = useQuery({ queryKey: key, enabled: !!id, queryFn: async () => {
    const user = await base44.auth.me();
    const page = await base44.entities.GuardianInvestigation.filter({ id, owner_id: user.id }, { limit: 1 });
    if (!page.items[0]) throw new Error('This payment investigation is not available.');
    return page.items[0];
  } });
  const research = useMutation({ mutationFn: async text => {
    const { data } = await base44.functions.invoke('extractWebData', { query: text.slice(0, 1000) });
    if (data?.provider !== 'Bright Data' || data.success !== true || !data.results?.length) {
      const error = new Error(data?.error || 'No usable Bright Data results found.');
      error.response = { data };
      throw error;
    }
    return base44.entities.GuardianInvestigation.update(id, { research: data, researched_at: new Date().toISOString() });
  }, onSuccess: record => client.setQueryData(key, record) });
  return { id, record: query.data, loading: !!id && query.isPending, error: query.error, retry: query.refetch, research };
}