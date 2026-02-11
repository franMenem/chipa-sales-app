import { supabase } from './supabase';
import type { RecipeItemFormData } from './types';

/**
 * Fetch the latest production history entry for a product.
 * Used imperatively (not as a hook) for undo operations.
 */
export async function fetchLatestProductionHistory(producto_id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('production_history')
    .select('id')
    .eq('producto_id', producto_id)
    .order('production_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.id;
}

/**
 * Fetch recipe items for a product.
 * Used imperatively for editing products.
 */
export async function fetchRecipeItems(producto_id: string): Promise<RecipeItemFormData[]> {
  const { data, error } = await supabase
    .from('recipe_items')
    .select('*')
    .eq('producto_id', producto_id);

  if (error) throw error;

  return (data || []).map((item) => ({
    insumo_id: item.insumo_id,
    quantity_in_base_units: item.quantity_in_base_units,
    use_categorias: item.use_categorias,
    required_categoria_ids: item.required_categoria_ids || [],
  }));
}
