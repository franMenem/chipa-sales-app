import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Venta } from '../../lib/types';
import { useToast } from '../useToast';
import { invalidateSalesRelated } from '../../utils/cacheInvalidation';

export interface CreateVentaInput {
  producto_id: string;
  producto_name: string;
  quantity: number;
  price_sold: number;
  cost_unit: number;
  customer_name?: string | null;
  payment_status?: 'pagado' | 'debe';
  payment_destination?: string | null;
  delivery_status?: 'entregado' | 'no_entregado';
  sale_date?: string;
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

      // Get producto to check finished_stock
      const { data: producto, error: productoError } = await supabase
        .from('productos')
        .select('finished_stock')
        .eq('id', input.producto_id)
        .single();

      if (productoError) throw productoError;

      const finishedStock = producto.finished_stock || 0;
      const needed = input.quantity;

      // If not enough finished_stock, auto-produce
      if (finishedStock < needed) {
        const { data: recipeItems, error: recipeError } = await supabase
          .from('recipe_items')
          .select('use_categorias')
          .eq('producto_id', input.producto_id);

        if (recipeError) throw recipeError;

        const usesCategorias = (recipeItems || []).some((item) => item.use_categorias);
        if (usesCategorias) {
          throw new Error(
            'Este producto usa ingredientes por categoría. Debes fabricarlo manualmente para elegir los lotes.'
          );
        }

        const quantityToProduce = needed - finishedStock;

        // Call produce_producto to manufacture missing quantity
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

      // Get updated finished_stock (may have increased if production occurred)
      const { data: updatedProducto } = await supabase
        .from('productos')
        .select('finished_stock')
        .eq('id', input.producto_id)
        .single();

      const currentFinishedStock = updatedProducto?.finished_stock || 0;

      // Deduct sold quantity from finished_stock
      const { error: updateError } = await supabase
        .from('productos')
        .update({ finished_stock: currentFinishedStock - needed })
        .eq('id', input.producto_id);

      if (updateError) throw updateError;

      // Create the sale
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
      invalidateSalesRelated(queryClient);
      // Also invalidate production-related queries since we may have auto-produced
      queryClient.invalidateQueries({ queryKey: ['insumos'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['insumo-lotes'], exact: false });
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
    mutationFn: async ({
      id,
      quantity,
      price_sold,
      customer_name,
      payment_status,
      payment_destination,
      delivery_status,
    }: {
      id: string;
      quantity: number;
      price_sold: number;
      customer_name?: string | null;
      payment_status?: 'pagado' | 'debe';
      payment_destination?: string | null;
      delivery_status?: 'entregado' | 'no_entregado';
    }) => {
      const { data, error } = await supabase
        .from('ventas')
        .update({
          quantity,
          price_sold,
          customer_name,
          payment_status,
          payment_destination,
          delivery_status,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Venta;
    },
    onSuccess: () => {
      invalidateSalesRelated(queryClient);
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
      invalidateSalesRelated(queryClient);
      toast.success('Venta eliminada', 'La venta se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar venta', error.message);
    },
  });
}
