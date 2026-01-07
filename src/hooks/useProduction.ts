import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ProductionRecord, ProduceProductoFormData, LotSelectionPayload } from '../lib/types';
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
    onSuccess: async (data) => {
      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productos'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['insumos'], exact: false, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['insumo-lotes'], exact: false, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['production-history'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['stock-fabricado-totals'], refetchType: 'active' }),
      ]);

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

// Reverse a production (return consumed insumos and reduce finished stock)
export function useReverseProduction() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ production_history_id, force = false }: { production_history_id: string; force?: boolean }) => {
      const { data, error } = await supabase.rpc('reverse_production', {
        p_production_history_id: production_history_id,
        p_force: force,
      });

      if (error) throw error;

      // Check if the function returned an error in the JSON
      if (data && !data.success) {
        throw new Error(data.error || 'Error desconocido al revertir producción');
      }

      return data as {
        success: boolean;
        quantity_reversed: number;
        total_cost_reversed: number;
        new_stock: number;
        was_forced: boolean;
      };
    },
    onSuccess: async (data) => {
      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productos'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['insumos'], exact: false, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['insumo-lotes'], exact: false, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['production-history'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['stock-fabricado-totals'], refetchType: 'active' }),
      ]);

      const message = data.was_forced
        ? `Se revirtieron ${data.quantity_reversed} unidades. Stock actual: ${data.new_stock} ${data.new_stock < 0 ? '(negativo)' : ''}`
        : `Se revirtieron ${data.quantity_reversed} unidades y se restauraron los insumos consumidos`;

      toast.success('Producción revertida', message);
    },
    onError: (error: Error) => {
      toast.error('Error al revertir', error.message);
    },
  });
}

// Produce products with custom lote order
interface ProduceWithCustomOrderInput {
  producto_id: string;
  quantity: number;
  margin_percentage: number;  // NEW: Margin percentage (0-100)
  price_sale: number;         // NEW: Sale price
  lote_order?: Record<string, string[]>; // insumo_id -> array of lote_ids
  lot_selections?: LotSelectionPayload[];
}

export function useProduceProductoCustomOrder() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({
      producto_id,
      quantity,
      margin_percentage,
      price_sale,
      lote_order = {},
      lot_selections = []
    }: ProduceWithCustomOrderInput) => {
      const { data, error } = await supabase.rpc('produce_producto_custom_order', {
        p_producto_id: producto_id,
        p_quantity: quantity,
        p_margin_percentage: margin_percentage,
        p_price_sale: price_sale,
        p_lote_order: lote_order,
        p_lot_selections: lot_selections,
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
        margin_percentage: number;
        price_sale: number;
        production_history_id: string;
        stock_fabricado_id: string;
      };
    },
    onSuccess: async (data) => {
      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productos'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['insumos'], exact: false, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['insumo-lotes'], exact: false, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['production-history'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['stock-fabricado'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['stock-fabricado-totals'], refetchType: 'active' }),
      ]);

      toast.success(
        'Producción completada',
        `Se fabricaron ${data.quantity_produced} unidades. Costo: ${formatCurrency(data.cost_per_unit)}/ud | Precio venta: ${formatCurrency(data.price_sale)}/ud | Margen: ${data.margin_percentage}%`
      );
    },
    onError: (error: Error) => {
      toast.error('Error en producción', error.message);
    },
  });
}
