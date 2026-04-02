import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToast } from '../useToast';
import { invalidateRetirosRelated } from '../../utils/cacheInvalidation';

interface CreateRetiroInsumoInput {
  insumo_id: string;
  lote_id: string;
  quantity: number;
  reason: string;
  notes?: string;
}

interface CreateRetiroProductoInput {
  producto_id: string;
  stock_fabricado_id: string;
  quantity: number;
  reason: string;
  notes?: string;
}

export function useCreateRetiroInsumo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateRetiroInsumoInput) => {
      const { data, error } = await supabase.rpc('create_retiro_insumo', {
        p_insumo_id: input.insumo_id,
        p_lote_id: input.lote_id,
        p_quantity: input.quantity,
        p_reason: input.reason,
        p_notes: input.notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateRetirosRelated(queryClient);
      toast.success('Retiro registrado', 'El stock de insumo fue descontado');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message || 'No se pudo registrar el retiro');
    },
  });
}

export function useCreateRetiroProducto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateRetiroProductoInput) => {
      const { data, error } = await supabase.rpc('create_retiro_producto', {
        p_producto_id: input.producto_id,
        p_stock_fabricado_id: input.stock_fabricado_id,
        p_quantity: input.quantity,
        p_reason: input.reason,
        p_notes: input.notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateRetirosRelated(queryClient);
      toast.success('Retiro registrado', 'El stock de producto fue descontado');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message || 'No se pudo registrar el retiro');
    },
  });
}
