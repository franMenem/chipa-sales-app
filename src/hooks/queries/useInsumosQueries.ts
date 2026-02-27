import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { Insumo, InsumoWithStock } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';

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
