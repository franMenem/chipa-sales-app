import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { Venta } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';
import { queryKeys } from '../../lib/queryKeys';

export interface VentasFilters {
  startDate?: string;
  endDate?: string;
  producto_id?: string;
  payment_status?: 'pagado' | 'debe';
}

// Fetch all ventas for current user with optional filters
export function useVentas(filters?: VentasFilters) {
  return useQuery({
    queryKey: ['ventas', { startDate: filters?.startDate, endDate: filters?.endDate, producto_id: filters?.producto_id, payment_status: filters?.payment_status }],
    staleTime: STALE_TIME.FREQUENT,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    queryFn: async () => {
      const user = await getCurrentUser();

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

// Suma total de ingresos de ventas cobradas (all time)
export function useVentasTotalCobradas() {
  return useQuery({
    queryKey: queryKeys.ventas.totalCobradas(),
    staleTime: STALE_TIME.FREQUENT,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('ventas')
        .select('total_income')
        .eq('user_id', user.id)
        .eq('payment_status', 'pagado');
      if (error) throw error;
      return (data || []).reduce((sum, v) => sum + v.total_income, 0);
    },
  });
}

// Suma total del costo basis de TODAS las ventas (insumos consumidos para esas ventas)
// Usado en ReservaCard: representa lo que tenés que reponer
export function useVentasTotalCosto() {
  return useQuery({
    queryKey: queryKeys.ventas.totalCosto(),
    staleTime: STALE_TIME.FREQUENT,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('ventas')
        .select('total_cost')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).reduce((sum, v) => sum + (v.total_cost || 0), 0);
    },
  });
}

// Fetch single venta by ID
export function useVenta(id: string | undefined) {
  return useQuery({
    queryKey: ['ventas', id],
    staleTime: STALE_TIME.FREQUENT,
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
