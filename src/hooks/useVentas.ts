import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Venta } from '../lib/types';
import { useToast } from './useToast';

interface CreateVentaInput {
  producto_id: string;
  producto_name: string;
  quantity: number;
  price_sold: number;
  cost_unit: number;
  sale_date?: string;
}

interface VentasFilters {
  startDate?: string;
  endDate?: string;
  producto_id?: string;
}

// Fetch all ventas for current user with optional filters
export function useVentas(filters?: VentasFilters) {
  return useQuery({
    queryKey: ['ventas', filters],
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

// Create venta (with cost snapshot and automatic stock deduction)
// Hybrid system: uses finished_stock first, auto-produces if needed
export function useCreateVenta() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateVentaInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Obtener el producto para verificar finished_stock
      const { data: producto, error: productoError } = await supabase
        .from('productos')
        .select('finished_stock')
        .eq('id', input.producto_id)
        .single();

      if (productoError) throw productoError;

      const finishedStock = producto.finished_stock || 0;
      const needed = input.quantity;

      // Si no hay suficiente finished_stock, auto-producir
      if (finishedStock < needed) {
        const quantityToProduce = needed - finishedStock;

        // Llamar a produce_producto para fabricar lo faltante
        // Esta función automáticamente aumenta finished_stock
        const { data: productionResult, error: productionError } = await supabase.rpc(
          'produce_producto',
          {
            p_producto_id: input.producto_id,
            p_quantity: quantityToProduce,
          }
        );

        if (productionError) throw productionError;

        if (productionResult && !productionResult.success) {
          throw new Error(
            productionResult.error || 'No hay suficientes insumos para fabricar el producto'
          );
        }
      }

      // Obtener finished_stock actualizado (puede haber aumentado si se produjo)
      const { data: updatedProducto } = await supabase
        .from('productos')
        .select('finished_stock')
        .eq('id', input.producto_id)
        .single();

      const currentFinishedStock = updatedProducto?.finished_stock || 0;

      // Descontar la cantidad vendida del finished_stock
      const { error: updateError } = await supabase
        .from('productos')
        .update({ finished_stock: currentFinishedStock - needed })
        .eq('id', input.producto_id);

      if (updateError) throw updateError;

      // Crear la venta
      const { data, error } = await supabase
        .from('ventas')
        .insert({
          ...input,
          user_id: user.id,
          sale_date: input.sale_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Venta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['insumo-lotes'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['production-history'] });
      toast.success('Venta registrada', 'La venta se registró y el stock se actualizó');
    },
    onError: (error: Error) => {
      toast.error('Error al registrar venta', error.message);
    },
  });
}

// Update venta
export function useUpdateVenta() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, quantity, price_sold }: { id: string; quantity: number; price_sold: number }) => {
      const { data, error } = await supabase
        .from('ventas')
        .update({ quantity, price_sold })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Venta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Venta actualizada', 'La venta se actualizó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar venta', error.message);
    },
  });
}

// Delete venta
export function useDeleteVenta() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Venta eliminada', 'La venta se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar venta', error.message);
    },
  });
}
