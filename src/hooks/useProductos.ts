import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ProductoWithCost, RecipeItem } from '../lib/types';
import { useToast } from './useToast';

interface CreateProductoInput {
  name: string;
  price_sale: number;
  margin_goal?: number | null;
  recipe_items: {
    insumo_id: string;
    quantity_in_base_units: number;
  }[];
}

interface UpdateProductoInput extends CreateProductoInput {
  id: string;
}

// Fetch all productos with calculated costs
export function useProductos() {
  return useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // First get productos
      const { data: productos, error: productosError } = await supabase
        .from('productos')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (productosError) throw productosError;

      // Then get recipe items and insumos for each producto
      const productosWithCosts = await Promise.all(
        (productos || []).map(async (producto) => {
          const { data: recipeItems, error: recipeError } = await supabase
            .from('recipe_items')
            .select(`
              *,
              insumo:insumos(*)
            `)
            .eq('producto_id', producto.id);

          if (recipeError) throw recipeError;

          // Calculate cost_unit
          const cost_unit = (recipeItems || []).reduce((total, item) => {
            if (!item.insumo) return total;
            return total + (item.quantity_in_base_units * item.insumo.base_unit_cost);
          }, 0);

          return {
            ...producto,
            cost_unit,
          } as ProductoWithCost;
        })
      );

      return productosWithCosts;
    },
  });
}

// Fetch single producto by ID with recipe
export function useProducto(id: string | undefined) {
  return useQuery({
    queryKey: ['productos', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data: producto, error: productoError } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();

      if (productoError) throw productoError;

      // Get recipe items
      const { data: recipeItems, error: recipeError } = await supabase
        .from('recipe_items')
        .select(`
          *,
          insumo:insumos(*)
        `)
        .eq('producto_id', id);

      if (recipeError) throw recipeError;

      // Calculate cost_unit
      const cost_unit = (recipeItems || []).reduce((total, item) => {
        if (!item.insumo) return total;
        return total + (item.quantity_in_base_units * item.insumo.base_unit_cost);
      }, 0);

      return {
        producto: {
          ...producto,
          cost_unit,
        } as ProductoWithCost,
        recipeItems: recipeItems as RecipeItem[],
      };
    },
    enabled: !!id,
  });
}

// Create producto with recipe
export function useCreateProducto() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateProductoInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

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
              insumo_id: item.insumo_id,
              quantity_in_base_units: item.quantity_in_base_units,
            }))
          );

        if (recipeError) throw recipeError;
      }

      return producto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
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
              insumo_id: item.insumo_id,
              quantity_in_base_units: item.quantity_in_base_units,
            }))
          );

        if (recipeError) throw recipeError;
      }

      return producto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto actualizado', 'Los cambios se guardaron correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar producto', error.message);
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
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto eliminado', 'El producto se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar producto', error.message);
    },
  });
}
