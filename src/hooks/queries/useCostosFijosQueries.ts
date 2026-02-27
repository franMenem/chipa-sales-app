import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { CostoFijo } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';

// Fetch all costos fijos for current user
export function useCostosFijos() {
  return useQuery({
    queryKey: ['costos-fijos'],
    staleTime: STALE_TIME.RARE,
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('costos_fijos')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as CostoFijo[];
    },
  });
}

// Fetch single costo fijo by ID
export function useCostoFijo(id: string | undefined) {
  return useQuery({
    queryKey: ['costos-fijos', id],
    staleTime: STALE_TIME.RARE,
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data, error } = await supabase
        .from('costos_fijos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CostoFijo;
    },
    enabled: !!id,
  });
}
