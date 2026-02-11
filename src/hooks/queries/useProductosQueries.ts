import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { ProductoWithCost, RecipeItem } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';

// Fetch all productos with calculated costs
export function useProductos() {
  return useQuery({
    queryKey: ['productos'],
    staleTime: STALE_TIME.MASTER_DATA,
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('productos_with_cost')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as ProductoWithCost[];
    },
  });
}

// Fetch single producto by ID with recipe
export function useProducto(id: string | undefined) {
  return useQuery({
    queryKey: ['productos', id],
    staleTime: STALE_TIME.MASTER_DATA,
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data: producto, error: productoError } = await supabase
        .from('productos_with_cost')
        .select('*')
        .eq('id', id)
        .single();

      if (productoError) throw productoError;

      // Get recipe items
      const { data: recipeItems, error: recipeError } = await supabase
        .from('recipe_items')
        .select(`
          *,
          insumo:insumos_with_stock(*)
        `)
        .eq('producto_id', id);

      if (recipeError) throw recipeError;

      // Calculate cost_unit
      const cost_unit = (recipeItems || []).reduce((total, item) => {
        if (!item.insumo) return total;
        return total + (item.quantity_in_base_units * (item.insumo.current_price_per_unit || 0));
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
