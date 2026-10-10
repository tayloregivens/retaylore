import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
export default function usePaymentDecisions(userId, batchId, ids) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['guardian-decisions', userId, batchId, ids], enabled: !!userId && ids.length > 0, queryFn: () => base44.entities.GuardianDecision.filter({ owner_id: userId, batch_id: batchId, payment_id: { $in: ids } }, { limit: 50 }) });
  const save = useMutation({ mutationFn: ({ paymentId, status }) => base44.entities.GuardianDecision.upsert([{ owner_id: userId, batch_id: batchId, payment_id: paymentId, status }], { key: ['owner_id', 'batch_id', 'payment_id'] }), onSuccess: () => client.invalidateQueries({ queryKey: ['guardian-decisions', userId, batchId] }) });
  return { records: Object.fromEntries((query.data?.items || []).map(row => [row.payment_id, row.status])), loading: query.isFetching, error: query.error, retry: query.refetch, save };
}