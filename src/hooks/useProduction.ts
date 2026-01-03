import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ProductionRecord, ProduceProductoFormData } from '../lib/types';
import { useToast } from './useToast';
import { formatCurrency } from '../utils/formatters';

// Fetch production history for a specific product
export function useProductionHistory(producto_id: string | undefined) {
  return useQuery({
    queryKey: ['production-history', producto_id],
    queryFn: async () => {
      if (!producto_id) throw new Error('Producto ID is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('production_history')
        .select('*')
        .eq('producto_id', producto_id)
        .eq('user_id', user.id)
        .order('production_date', { ascending: false });

      if (error) throw error;
      return data as ProductionRecord[];
    },
    enabled: !!producto_id,
  });
}

// Fetch all production history for the user
export function useAllProductionHistory() {
  return useQuery({
    queryKey: ['production-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('production_history')
        .select('*')
        .eq('user_id', user.id)
        .order('production_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ProductionRecord[];
    },
  });
}

// Produce products (consume insumos using LIFO, increase finished_stock)
export function useProduceProducto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ producto_id, quantity }: ProduceProductoFormData) => {
      const { data, error } = await supabase.rpc('produce_producto', {
        p_producto_id: producto_id,
        p_quantity: quantity,
      });

      if (error) throw error;

      // Check if the function returned an error in the JSON
      if (data && !data.success) {
        throw new Error(data.error || 'Error desconocido al fabricar productos');
      }

      return data as {
        success: boolean;
        quantity_produced: number;
        total_cost: number;
        cost_per_unit: number;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['insumo-lotes'] });
      queryClient.invalidateQueries({ queryKey: ['production-history'] });

      toast.success(
        'Producción completada',
        `Se fabricaron ${data.quantity_produced} unidades. Costo total: ${formatCurrency(data.total_cost)}`
      );
    },
    onError: (error: Error) => {
      toast.error('Error en producción', error.message);
    },
  });
}

// Produce products with custom lote order
interface ProduceWithCustomOrderInput {
  producto_id: string;
  quantity: number;
  lote_order?: Record<string, string[]>; // insumo_id -> array of lote_ids
}

export function useProduceProductoCustomOrder() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ producto_id, quantity, lote_order = {} }: ProduceWithCustomOrderInput) => {
      const { data, error } = await supabase.rpc('produce_producto_custom_order', {
        p_producto_id: producto_id,
        p_quantity: quantity,
        p_lote_order: lote_order,
      });

      if (error) throw error;

      // Check if the function returned an error in the JSON
      if (data && !data.success) {
        throw new Error(data.error || 'Error desconocido al fabricar productos');
      }

      return data as {
        success: boolean;
        quantity_produced: number;
        total_cost: number;
        cost_per_unit: number;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['insumo-lotes'] });
      queryClient.invalidateQueries({ queryKey: ['production-history'] });

      toast.success(
        'Producción completada',
        `Se fabricaron ${data.quantity_produced} unidades. Costo total: ${formatCurrency(data.total_cost)}`
      );
    },
    onError: (error: Error) => {
      toast.error('Error en producción', error.message);
    },
  });
}
