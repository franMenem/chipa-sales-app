import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Insumo, InsumoWithStock, CreateInsumoFormData } from '../lib/types';
import { useToast } from './useToast';

// Fetch insumos with stock (from view) - only active with stock > 0
export function useInsumos() {
  return useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('insumos_with_stock')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('total_stock', 0) // Only show insumos with stock
        .order('name', { ascending: true });

      if (error) throw error;
      return data as InsumoWithStock[];
    },
  });
}

// Fetch ALL insumos (including those without stock, for history view)
export function useAllInsumos() {
  return useQuery({
    queryKey: ['insumos', 'all'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('insumos_with_stock')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as InsumoWithStock[];
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

// Create new insumo (base catalog entry only, no price/quantity)
export function useCreateInsumo() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateInsumoFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

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
