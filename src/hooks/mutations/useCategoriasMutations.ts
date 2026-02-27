import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { Categoria, CreateCategoriaFormData } from '../../lib/types';
import { useToast } from '../useToast';

// Create new categoria
export function useCreateCategoria() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (formData: CreateCategoriaFormData) => {
      const user = await getCurrentUser();

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

// Delete/Archive categoria (soft delete)
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
