import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Venta } from '../../lib/types';

export interface VentasFilters {
  startDate?: string;
  endDate?: string;
  producto_id?: string;
  payment_status?: 'pagado' | 'debe';
}

// Fetch all ventas for current user with optional filters
export function useVentas(filters?: VentasFilters) {
  return useQuery({
    queryKey: [
      'ventas',
      filters?.startDate,
      filters?.endDate,
      filters?.producto_id,
      filters?.payment_status,
    ],
    staleTime: 1000 * 60 * 1, // 1 minute (frequently changing data)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      let query = supabase
        .from('ventas')
        .select('*')
        .eq('user_id', user.id)
        .order('sale_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('sale_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('sale_date', filters.endDate);
      }
      if (filters?.producto_id) {
        query = query.eq('producto_id', filters.producto_id);
      }
      if (filters?.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Venta[];
    },
  });
}

// Fetch single venta by ID
export function useVenta(id: string | undefined) {
  return useQuery({
    queryKey: ['ventas', id],
    staleTime: 1000 * 60 * 1, // 1 minute (frequently changing data)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Venta;
    },
    enabled: !!id,
  });
}
