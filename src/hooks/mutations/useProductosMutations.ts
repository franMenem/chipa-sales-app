import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import { useToast } from '../useToast';
import { invalidateProductosRelated } from '../../utils/cacheInvalidation';

export interface CreateProductoInput {
  name: string;
  recipe_items: {
    insumo_id?: string | null;
    quantity_in_base_units: number;
    use_categorias?: boolean;
    required_categoria_ids?: string[];
  }[];
}

export interface UpdateProductoInput extends CreateProductoInput {
  id: string;
}

// Create producto with recipe
export function useCreateProducto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateProductoInput) => {
      const user = await getCurrentUser();

      const { recipe_items, ...productoData } = input;

      // Create producto
      const { data: producto, error: productoError } = await supabase
        .from('productos')
        .insert({
          ...productoData,
          user_id: user.id,
        })
        .select()
        .single();

      if (productoError) throw productoError;

      // Create recipe items
      if (recipe_items.length > 0) {
        const { error: recipeError } = await supabase
          .from('recipe_items')
          .insert(
            recipe_items.map((item) => ({
              producto_id: producto.id,
              insumo_id: item.use_categorias ? null : item.insumo_id,
              quantity_in_base_units: item.quantity_in_base_units,
              use_categorias: item.use_categorias || false,
              required_categoria_ids: item.use_categorias ? item.required_categoria_ids || [] : [],
            }))
          );

        if (recipeError) throw recipeError;
      }

      return producto;
    },
    onSuccess: () => {
      invalidateProductosRelated(queryClient);
      toast.success('Producto creado', 'El producto se agregó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear producto', error.message);
    },
  });
}

// Update producto and recipe
export function useUpdateProducto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: UpdateProductoInput) => {
      const { id, recipe_items, ...updateData } = input;

      // Update producto
      const { data: producto, error: productoError } = await supabase
        .from('productos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (productoError) throw productoError;

      // Delete existing recipe items
      const { error: deleteError } = await supabase
        .from('recipe_items')
        .delete()
        .eq('producto_id', id);

      if (deleteError) throw deleteError;

      // Insert new recipe items
      if (recipe_items.length > 0) {
        const { error: recipeError } = await supabase
          .from('recipe_items')
          .insert(
            recipe_items.map((item) => ({
              producto_id: id,
              insumo_id: item.use_categorias ? null : item.insumo_id,
              quantity_in_base_units: item.quantity_in_base_units,
              use_categorias: item.use_categorias || false,
              required_categoria_ids: item.use_categorias ? item.required_categoria_ids || [] : [],
            }))
          );

        if (recipeError) throw recipeError;
      }

      return producto;
    },
    onSuccess: () => {
      invalidateProductosRelated(queryClient);
      toast.success('Producto actualizado', 'Los cambios se guardaron correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar producto', error.message);
    },
  });
}

// Archive (soft-delete) producto — sets is_active = false
export function useArchiveProducto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('productos')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProductosRelated(queryClient);
      toast.success('Receta archivada', 'La receta se ocultó de la lista');
    },
    onError: (error: Error) => {
      toast.error('Error al archivar receta', error.message);
    },
  });
}

// Restore (unarchive) producto — sets is_active = true
export function useRestoreProducto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('productos')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProductosRelated(queryClient);
      toast.success('Receta restaurada', 'La receta volvió a la lista activa');
    },
    onError: (error: Error) => {
      toast.error('Error al restaurar receta', error.message);
    },
  });
}

// Delete producto
export function useDeleteProducto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Recipe items will be deleted automatically by CASCADE
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProductosRelated(queryClient);
      toast.success('Producto eliminado', 'El producto se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar producto', error.message);
    },
  });
}
