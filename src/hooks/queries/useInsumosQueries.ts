import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { Insumo, InsumoWithStock } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';
import { queryKeys } from '../../lib/queryKeys';

// Fetch insumos with stock (from view) - only active with stock > 0
export function useInsumos() {
  return useQuery({
    queryKey: ['insumos'],
    staleTime: STALE_TIME.MASTER_DATA,
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('insumos_with_stock')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('total_stock', 0) // Only show insumos with stock
        .order('name', { ascending: true });

      if (error) throw error;
      return data as InsumoWithStock[];
    },
  });
}

// Fetch ALL insumos (including those without stock, for history view)
export function useAllInsumos() {
  return useQuery({
    queryKey: ['insumos', 'all'],
    staleTime: STALE_TIME.MASTER_DATA,
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('insumos_with_stock')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as InsumoWithStock[];
    },
  });
}

// Suma total histórica del costo de todos los lotes (price_per_unit × quantity_purchased)
// Usado en GananciasCard para calcular ganancia real (incluye insumos ya consumidos)
export function useInsumoLotesTotalCost() {
  return useQuery({
    queryKey: queryKeys.insumos.lotesTotal(),
    staleTime: STALE_TIME.FREQUENT,
    queryFn: async () => {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('insumo_lotes')
        .select('price_per_unit, quantity_purchased')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).reduce(
        (sum, lote) => sum + lote.price_per_unit * lote.quantity_purchased,
        0
      );
    },
  });
}

// Costo del stock actual: solo lotes con stock disponible (price_per_unit × quantity_remaining)
// Usado en ReservaCard para calcular cuánto necesitás tener en reserva hoy
export function useInsumoStockActualCost() {
  return useQuery({
    queryKey: queryKeys.insumos.stockActualCost(),
    staleTime: STALE_TIME.FREQUENT,
    queryFn: async () => {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('insumo_lotes')
        .select('price_per_unit, quantity_remaining')
        .eq('user_id', user.id)
        .gt('quantity_remaining', 0);
      if (error) throw error;
      return (data || []).reduce(
        (sum, lote) => sum + lote.price_per_unit * lote.quantity_remaining,
        0
      );
    },
  });
}

// Fetch single insumo by ID
export function useInsumo(id: string | undefined) {
  return useQuery({
    queryKey: ['insumos', id],
    staleTime: STALE_TIME.MASTER_DATA,
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Insumo;
    },
    enabled: !!id,
  });
}
