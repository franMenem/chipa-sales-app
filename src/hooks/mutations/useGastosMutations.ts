import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import { useToast } from '../useToast';
import { invalidateGastosRelated } from '../../utils/cacheInvalidation';
import { queryKeys } from '../../lib/queryKeys';
import type { GastoConceptoFormData, GastoFormData } from '../../lib/types';

// Create a new gasto concepto
export function useCreateGastoConcepto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: GastoConceptoFormData) => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('gasto_conceptos')
        .insert({
          name: input.name,
          user_id: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gastoConceptos.all(), refetchType: 'active' });
      toast.success('Concepto creado', 'El concepto se agregó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear concepto', error.message);
    },
  });
}

// Create a new gasto
export function useCreateGasto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: GastoFormData) => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('gastos')
        .insert({
          concepto_id: input.concepto_id,
          amount: input.amount,
          payment_date: input.payment_date,
          payment_method: input.payment_method,
          notes: input.notes || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateGastosRelated(queryClient);
      toast.success('Gasto registrado', 'El gasto se registró correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al registrar gasto', error.message);
    },
  });
}

// Update a gasto
export function useUpdateGasto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: GastoFormData & { id: string }) => {
      const { id, ...updateData } = input;

      const { data, error } = await supabase
        .from('gastos')
        .update({
          concepto_id: updateData.concepto_id,
          amount: updateData.amount,
          payment_date: updateData.payment_date,
          payment_method: updateData.payment_method,
          notes: updateData.notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateGastosRelated(queryClient);
      toast.success('Gasto actualizado', 'Los cambios se guardaron correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar gasto', error.message);
    },
  });
}

// Delete a gasto
export function useDeleteGasto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateGastosRelated(queryClient);
      toast.success('Gasto eliminado', 'El gasto se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar gasto', error.message);
    },
  });
}
