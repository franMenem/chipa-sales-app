import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { InsumoLote, ProductoWithCost } from '../../lib/types';
import type { RecipeItemWithLotes } from './types';

export function useRecipeWithLotes(productoId: string, productos: ProductoWithCost[]) {
  const [selectedProducto, setSelectedProducto] = useState<ProductoWithCost | null>(null);
  const [recipeWithLotes, setRecipeWithLotes] = useState<RecipeItemWithLotes[]>([]);
  const [loteOrder, setLoteOrder] = useState<Record<string, string[]>>({});
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  const getOrderedLotesFromMap = (
    recipeItem: RecipeItemWithLotes,
    orderMap: Record<string, string[]>
  ): InsumoLote[] => {
    if (!recipeItem.insumo_id) return recipeItem.lotes;
    const order = orderMap[recipeItem.insumo_id];
    if (order && order.length > 0) {
      const ordered = order
        .map(loteId => recipeItem.lotes.find(l => l.id === loteId))
        .filter(Boolean) as InsumoLote[];
      if (ordered.length > 0) return ordered;
    }
    return recipeItem.lotes;
  };

  const getOrderedLotes = useCallback(
    (recipeItem: RecipeItemWithLotes) => getOrderedLotesFromMap(recipeItem, loteOrder),
    [loteOrder]
  );

  const moveLoteUp = (insumoId: string | null, loteIndex: number) => {
    if (!insumoId || loteIndex === 0) return;
    setLoteOrder(prev => {
      const newOrder = { ...prev };
      const currentOrder = newOrder[insumoId];
      if (!currentOrder) return prev;
      const lotes = [...currentOrder];
      [lotes[loteIndex - 1], lotes[loteIndex]] = [lotes[loteIndex], lotes[loteIndex - 1]];
      newOrder[insumoId] = lotes;
      return newOrder;
    });
  };

  const moveLoteDown = (insumoId: string | null, loteIndex: number) => {
    if (!insumoId) return;
    const currentOrder = loteOrder[insumoId];
    if (!currentOrder || loteIndex === currentOrder.length - 1) return;
    setLoteOrder(prev => {
      const newOrder = { ...prev };
      const existing = newOrder[insumoId];
      if (!existing) return prev;
      const lotes = [...existing];
      [lotes[loteIndex], lotes[loteIndex + 1]] = [lotes[loteIndex + 1], lotes[loteIndex]];
      newOrder[insumoId] = lotes;
      return newOrder;
    });
  };

  useEffect(() => {
    const loadRecipeAndLotes = async () => {
      if (!productoId) {
        setSelectedProducto(null);
        setRecipeWithLotes([]);
        setLoteOrder({});
        return;
      }

      const producto = productos.find(p => p.id === productoId);
      setSelectedProducto(producto || null);
      if (!producto) return;

      setIsLoadingRecipe(true);

      try {
        const { data: recipeItems, error: recipeError } = await supabase
          .from('recipe_items')
          .select(`*, insumo:insumos(*)`)
          .eq('producto_id', productoId);

        if (recipeError) throw recipeError;

        const user = await getCurrentUser();

        const recipeWithLotesData: RecipeItemWithLotes[] = await Promise.all(
          (recipeItems || []).map(async (item) => {
            if (item.use_categorias && item.required_categoria_ids?.length > 0) {
              const { data: allInsumos, error: insumosError } = await supabase
                .from('insumos_with_stock')
                .select('id, name, unit_type, total_stock, categoria_ids')
                .eq('user_id', user.id)
                .gte('total_stock', 0.01);

              if (insumosError) throw insumosError;

              const compatibleInsumos = (allInsumos || []).filter((insumo) => {
                const insumoCategories = insumo.categoria_ids || [];
                const requiredCategories = item.required_categoria_ids || [];
                return requiredCategories.some((reqCat: string) => insumoCategories.includes(reqCat));
              });

              return {
                recipe_item_id: item.id,
                use_categorias: true,
                insumo_id: null,
                insumo_name: compatibleInsumos.length === 0 ? 'Sin insumos compatibles' : '',
                unit_type: compatibleInsumos[0]?.unit_type || 'kg',
                quantity_needed: item.quantity_in_base_units,
                lotes: [],
                required_categoria_ids: item.required_categoria_ids,
                compatible_insumos: compatibleInsumos || [],
                selected_insumos: [],
              };
            } else {
              const { data: lotes, error: lotesError } = await supabase
                .from('insumo_lotes')
                .select('*')
                .eq('insumo_id', item.insumo_id)
                .gte('quantity_remaining', 0.01)
                .order('purchase_date', { ascending: false })
                .order('created_at', { ascending: false });

              if (lotesError) throw lotesError;

              return {
                recipe_item_id: item.id,
                use_categorias: false,
                insumo_id: item.insumo_id,
                insumo_name: item.insumo?.name || '',
                unit_type: item.insumo?.unit_type || 'kg',
                quantity_needed: item.quantity_in_base_units,
                lotes: lotes || [],
              };
            }
          })
        );

        setRecipeWithLotes(recipeWithLotesData);

        const initialOrder: Record<string, string[]> = {};
        recipeWithLotesData.forEach((item) => {
          if (item.insumo_id) {
            initialOrder[item.insumo_id] = item.lotes.map(l => l.id);
          }
        });
        setLoteOrder(initialOrder);
      } catch (error) {
        console.error('Error loading recipe and lotes:', error);
      } finally {
        setIsLoadingRecipe(false);
      }
    };

    loadRecipeAndLotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  return {
    selectedProducto,
    recipeWithLotes,
    setRecipeWithLotes,
    loteOrder,
    setLoteOrder,
    isLoadingRecipe,
    getOrderedLotes,
    getOrderedLotesFromMap,
    moveLoteUp,
    moveLoteDown,
  };
}
