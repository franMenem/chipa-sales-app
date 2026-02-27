import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
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

// Create venta atomically via RPC.
// Wraps stock check → optional auto-produce → stock deduction → venta insert
// in a single DB transaction, preventing partial-failure inconsistencies.
export function useCreateVenta() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateVentaInput) => {
      const user = await getCurrentUser();

      const { data, error } = await supabase.rpc('create_venta_with_stock', {
        p_user_id:             user.id,
        p_producto_id:         input.producto_id,
        p_producto_name:       input.producto_name,
        p_quantity:            input.quantity,
        p_price_sold:          input.price_sold,
        p_cost_unit:           input.cost_unit,
        p_customer_name:       input.customer_name ?? null,
        p_payment_status:      input.payment_status ?? 'pagado',
        p_payment_destination: input.payment_destination ?? null,
        p_delivery_status:     input.delivery_status ?? 'entregado',
        p_sale_date:           input.sale_date ?? new Date().toISOString(),
      });

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
