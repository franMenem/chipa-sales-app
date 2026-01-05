import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Categoria, CreateCategoriaFormData } from '../lib/types';
import { useToast } from './useToast';

// Fetch all categorias for current user
export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Categoria[];
    },
  });
}

// Fetch single categoria by ID
export function useCategoria(id: string | undefined) {
  return useQuery({
    queryKey: ['categorias', id],
    queryFn: async () => {
      if (!id) throw new Error('Categoria ID is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as Categoria;
    },
    enabled: !!id,
  });
}

// Create new categoria
export function useCreateCategoria() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (formData: CreateCategoriaFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('categorias')
        .insert({
          user_id: user.id,
          name: formData.name,
          color: formData.color || '#3B82F6',
          unit_type: formData.unit_type || 'g',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Categoria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoría creada', 'La categoría se agregó correctamente');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Error', 'Ya existe una categoría con ese nombre');
      } else {
        toast.error('Error al crear categoría', error.message);
      }
    },
  });
}

// Update categoria
export function useUpdateCategoria() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCategoriaFormData> }) => {
      const { error } = await supabase
        .from('categorias')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoría actualizada', 'Los cambios se guardaron correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar categoría', error.message);
    },
  });
}

// Delete/Archive categoria
export function useDeleteCategoria() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: mark as inactive
      const { error } = await supabase
        .from('categorias')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoría archivada', 'La categoría se ocultó de la lista');
    },
    onError: (error: Error) => {
      toast.error('Error al archivar categoría', error.message);
    },
  });
}

// Get insumos count by categoria
export function useInsumosByCategoriaCount() {
  return useQuery({
    queryKey: ['categorias', 'insumos-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Fetch all categorias
      const { data: categorias, error: categoriasError } = await supabase
        .from('categorias')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (categoriasError) throw categoriasError;

      // Fetch all insumos with categoria_ids
      const { data: insumos, error: insumosError } = await supabase
        .from('insumos')
        .select('id, categoria_ids')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (insumosError) throw insumosError;

      // Count insumos per categoria
      const counts: Record<string, number> = {};

      categorias?.forEach(cat => {
        counts[cat.id] = insumos?.filter(insumo => {
          const ids = insumo.categoria_ids as unknown as string[];
          return ids && ids.includes(cat.id);
        }).length || 0;
      });

      return counts;
    },
  });
}
