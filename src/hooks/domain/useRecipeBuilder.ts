import { useState, useCallback } from 'react';
import type { RecipeItemFormData } from '../../lib/types';

export function useRecipeBuilder(initialItems: RecipeItemFormData[] = []) {
  const [recipeItems, setRecipeItems] = useState<RecipeItemFormData[]>(initialItems);
  const [useCategoriasMode, setUseCategoriasMode] = useState(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);

  const addInsumo = useCallback((insumoId: string, quantity: number = 1) => {
    setRecipeItems(current => {
      if (current.some(item => item.insumo_id === insumoId)) {
        throw new Error('Este insumo ya está en la receta');
      }
      return [...current, {
        insumo_id: insumoId,
        quantity_in_base_units: quantity,
        use_categorias: false,
      }];
    });
  }, []);

  const addCategorias = useCallback((categoriaIds: string[], quantity: number = 1) => {
    if (categoriaIds.length === 0) {
      throw new Error('Debes seleccionar al menos una categoría');
    }
    setRecipeItems(current => [...current, {
      use_categorias: true,
      required_categoria_ids: categoriaIds,
      quantity_in_base_units: quantity,
    }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setRecipeItems(current => current.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    setRecipeItems(current =>
      current.map((item, i) =>
        i === index ? { ...item, quantity_in_base_units: quantity } : item
      )
    );
  }, []);

  const reset = useCallback(() => {
    setRecipeItems([]);
    setUseCategoriasMode(false);
    setSelectedInsumoId('');
    setSelectedCategorias([]);
  }, []);

  return {
    recipeItems,
    useCategoriasMode,
    setUseCategoriasMode,
    selectedInsumoId,
    setSelectedInsumoId,
    selectedCategorias,
    setSelectedCategorias,
    addInsumo,
    addCategorias,
    removeItem,
    updateQuantity,
    reset,
    setRecipeItems,
  };
}
