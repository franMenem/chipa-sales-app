import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import type { StockFabricadoTotals } from '../lib/types';
import { STALE_TIME } from '../lib/constants';

export function useStockFabricadoTotals() {
  return useQuery({
    queryKey: ['stock-fabricado-totals'],
    staleTime: STALE_TIME.REALTIME,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('stock_fabricado_totals')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as StockFabricadoTotals[];
    },
  });
}
