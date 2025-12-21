import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Insumo, UnitType } from '../lib/types';
import { useToast } from './useToast';

interface CreateInsumoInput {
  name: string;
  price_per_unit: number;
  unit_type: UnitType;
  quantity: number;
}

interface UpdateInsumoInput extends CreateInsumoInput {
  id: string;
}

// Fetch all insumos for current user
export function useInsumos() {
  return useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Insumo[];
    },
  });
}

// Fetch single insumo by ID
export function useInsumo(id: string | undefined) {
  return useQuery({
    queryKey: ['insumos', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Insumo;
    },
    enabled: !!id,
  });
}

// Create insumo
export function useCreateInsumo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateInsumoInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('insumos')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Insumo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo creado', 'El insumo se agregó correctamente');
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
    mutationFn: async (input: UpdateInsumoInput) => {
      const { id, ...updateData } = input;

      const { data, error } = await supabase
        .from('insumos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Insumo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      // Also invalidate productos because costs may have changed
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Insumo actualizado', 'Los costos se recalcularon automáticamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar insumo', error.message);
    },
  });
}

// Delete insumo
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
      toast.success('Insumo eliminado', 'El insumo se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar insumo', error.message);
    },
  });
}
