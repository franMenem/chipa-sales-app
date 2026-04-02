import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { Retiro } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';
import { queryKeys } from '../../lib/queryKeys';

export function useRetiros(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.retiros.filtered(filters),
    staleTime: STALE_TIME.FREQUENT,
    queryFn: async () => {
      const user = await getCurrentUser();

      let query = supabase
        .from('retiros')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Retiro[];
    },
  });
}

export function useRetirosMonthlyTotal() {
  return useQuery({
    queryKey: queryKeys.retiros.monthlyTotal(),
    staleTime: STALE_TIME.FREQUENT,
    queryFn: async () => {
      const user = await getCurrentUser();

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data, error } = await supabase
        .from('retiros')
        .select('total_cost')
        .eq('user_id', user.id)
        .gte('created_at', monthStart);

      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + r.total_cost, 0);
    },
  });
}
