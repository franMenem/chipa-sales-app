import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { Insumo, CreateInsumoFormData } from '../../lib/types';
import { useToast } from '../useToast';

// Create new insumo (base catalog entry only, no price/quantity)
export function useCreateInsumo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateInsumoFormData) => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('insumos')
        .insert({
          ...input,
          user_id: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Insumo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo creado', 'El insumo se agregó al catálogo');
    },
    onError: (error: Error) => {
      toast.error('Error al crear insumo', error.message);
    },
  });
}

// Update insumo
export function useUpdateInsumo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateInsumoFormData> }) => {
      const { error } = await supabase
        .from('insumos')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Insumo actualizado', 'Los cambios se guardaron correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar insumo', error.message);
    },
  });
}

// Archive/unarchive insumo (soft delete)
export function useArchiveInsumo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('insumos')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Insumo;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success(
        variables.is_active ? 'Insumo activado' : 'Insumo archivado',
        variables.is_active
          ? 'El insumo está activo nuevamente'
          : 'El insumo fue archivado (no se eliminó)'
      );
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}

// Delete insumo (hard delete - only if no lotes exist)
export function useDeleteInsumo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('insumos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Insumo eliminado', 'El insumo se eliminó permanentemente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar insumo', error.message);
    },
  });
}
