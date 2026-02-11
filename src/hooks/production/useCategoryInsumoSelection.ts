import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../useToast';
import { QUANTITY_DECIMAL_PLACES } from '../../lib/constants';
import type { RecipeItemWithLotes } from './types';

interface UseCategoryInsumoSelectionParams {
  recipeWithLotes: RecipeItemWithLotes[];
  setRecipeWithLotes: React.Dispatch<React.SetStateAction<RecipeItemWithLotes[]>>;
  setLoteOrder: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setLotSelections: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>;
  quantity: number;
}

export function useCategoryInsumoSelection({
  recipeWithLotes,
  setRecipeWithLotes,
  setLoteOrder,
  setLotSelections,
  quantity,
}: UseCategoryInsumoSelectionParams) {
  const [selectedCategoryInsumos, setSelectedCategoryInsumos] = useState<Record<string, string[]>>({});
  const toast = useToast();

  const handleCategoryInsumoToggle = async (recipeItemId: string, insumoId: string) => {
    const recipeItem = recipeWithLotes.find(r => r.recipe_item_id === recipeItemId);
    if (!recipeItem || !recipeItem.use_categorias) return;

    try {
      const currentlySelected = selectedCategoryInsumos[recipeItemId] || [];
      const isSelected = currentlySelected.includes(insumoId);

      if (isSelected) {
        // Deselect: Remove insumo from selected list
        const newSelected = currentlySelected.filter(id => id !== insumoId);
        setSelectedCategoryInsumos(prev => ({ ...prev, [recipeItemId]: newSelected }));

        const updatedSelectedInsumos = (recipeItem.selected_insumos || []).filter(
          si => si.insumo_id !== insumoId
        );

        setRecipeWithLotes(prev => prev.map(item =>
          item.recipe_item_id === recipeItemId
            ? { ...item, selected_insumos: updatedSelectedInsumos }
            : item
        ));

        setLotSelections(prev => {
          const newSelections = { ...prev };
          if (newSelections[recipeItemId]) {
            const lotesToRemove = recipeItem.selected_insumos
              ?.find(si => si.insumo_id === insumoId)
              ?.lotes.map(l => l.id) || [];
            lotesToRemove.forEach(loteId => {
              delete newSelections[recipeItemId][loteId];
            });
          }
          return newSelections;
        });

        setLoteOrder(prev => {
          const newOrder = { ...prev };
          delete newOrder[insumoId];
          return newOrder;
        });
      } else {
        // Select: Add insumo to selected list
        const newSelected = [...currentlySelected, insumoId];
        setSelectedCategoryInsumos(prev => ({ ...prev, [recipeItemId]: newSelected }));

        const { data: lotes, error: lotesError } = await supabase
          .from('insumo_lotes')
          .select('*')
          .eq('insumo_id', insumoId)
          .gte('quantity_remaining', 0.01)
          .order('purchase_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (lotesError) throw lotesError;

        const insumoDetails = recipeItem.compatible_insumos?.find(i => i.id === insumoId);

        const newInsumoEntry = {
          insumo_id: insumoId,
          insumo_name: insumoDetails?.name || '',
          unit_type: insumoDetails?.unit_type || 'kg',
          lotes: lotes || [],
        };

        const updatedSelectedInsumos = [...(recipeItem.selected_insumos || []), newInsumoEntry];

        setRecipeWithLotes(prev => prev.map(item =>
          item.recipe_item_id === recipeItemId
            ? { ...item, selected_insumos: updatedSelectedInsumos }
            : item
        ));

        setLoteOrder(prev => ({
          ...prev,
          [insumoId]: (lotes || []).map(l => l.id),
        }));

        const availableLotes = (lotes || []).filter(lote => lote.quantity_remaining >= 0.01);
        const requiredQuantity = Number((recipeItem.quantity_needed * quantity).toFixed(QUANTITY_DECIMAL_PLACES));
        if (availableLotes.length === 1 && updatedSelectedInsumos.length === 1 && requiredQuantity > 0) {
          setLotSelections(prev => {
            const existing = prev[recipeItemId] || {};
            if (Object.keys(existing).length > 0) return prev;

            const lote = availableLotes[0];
            const nextValue = Number(Math.min(lote.quantity_remaining, requiredQuantity).toFixed(QUANTITY_DECIMAL_PLACES));
            return {
              ...prev,
              [recipeItemId]: { [lote.id]: nextValue },
            };
          });
        }
      }
    } catch (error) {
      console.error('Error toggling category insumo:', error);
      toast.error('Error', 'No se pudo cargar los lotes del insumo');
    }
  };

  return {
    selectedCategoryInsumos,
    setSelectedCategoryInsumos,
    handleCategoryInsumoToggle,
  };
}
