import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StockFabricadoTotals } from '../lib/types';

export function useStockFabricadoTotals() {
  return useQuery({
    queryKey: ['stock-fabricado-totals'],
    staleTime: 1000 * 30, // 30 seconds (real-time production data)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('stock_fabricado_totals')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as StockFabricadoTotals[];
    },
  });
}
