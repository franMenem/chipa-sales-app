import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import type { StockFabricadoTotals, StockFabricado } from '../lib/types';
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

// Fetch individual batches with remaining stock for a specific producto
export function useStockFabricadoBatches(productoId: string | undefined) {
  return useQuery({
    queryKey: ['stock-fabricado', 'batches', productoId],
    staleTime: STALE_TIME.FREQUENT,
    enabled: !!productoId,
    queryFn: async () => {
      if (!productoId) throw new Error('Producto ID required');
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('stock_fabricado')
        .select('*')
        .eq('producto_id', productoId)
        .eq('user_id', user.id)
        .gt('quantity_remaining', 0)
        .order('production_date', { ascending: false });

      if (error) throw error;
      return data as StockFabricado[];
    },
  });
}
