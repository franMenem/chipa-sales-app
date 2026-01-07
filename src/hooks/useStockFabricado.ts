import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StockFabricadoTotals } from '../lib/types';

export function useStockFabricadoTotals() {
  return useQuery({
    queryKey: ['stock-fabricado-totals'],
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
