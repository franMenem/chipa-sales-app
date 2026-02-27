import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { CostoFijo, Frequency } from '../../lib/types';
import { useToast } from '../useToast';

interface CreateCostoFijoInput {
  name: string;
  amount: number;
  frequency: Frequency;
}

interface UpdateCostoFijoInput extends CreateCostoFijoInput {
  id: string;
}

// Create costo fijo
export function useCreateCostoFijo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateCostoFijoInput) => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('costos_fijos')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CostoFijo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costos-fijos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Costo fijo creado', 'El costo fijo se agregó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear costo fijo', error.message);
    },
  });
}

// Update costo fijo
export function useUpdateCostoFijo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: UpdateCostoFijoInput) => {
      const { id, ...updateData } = input;

      const { data, error } = await supabase
        .from('costos_fijos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CostoFijo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costos-fijos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Costo fijo actualizado', 'Los cambios se guardaron correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar costo fijo', error.message);
    },
  });
}

// Delete costo fijo
export function useDeleteCostoFijo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('costos_fijos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costos-fijos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Costo fijo eliminado', 'El costo fijo se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar costo fijo', error.message);
    },
  });
}
