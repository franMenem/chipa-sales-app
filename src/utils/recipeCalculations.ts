import type { RecipeItemFormData, InsumoWithStock } from '../lib/types';

/**
 * Calculate the total cost of a recipe based on current insumo prices
 */
export function calculateRecipeCost(
  recipeItems: RecipeItemFormData[],
  insumos: InsumoWithStock[]
): number {
  return recipeItems.reduce((total, item) => {
    // Skip category-based items (cost determined at production time)
    if (item.use_categorias) return total;

    const insumo = insumos.find(i => i.id === item.insumo_id);
    if (!insumo) return total;

    return total + item.quantity_in_base_units * (insumo.current_price_per_unit || 0);
  }, 0);
}

/**
 * Check if recipe contains any category-based items
 */
export function hasCategoryItems(recipeItems: RecipeItemFormData[]): boolean {
  return recipeItems.some(item => item.use_categorias);
}

/**
 * Check if recipe is empty
 */
export function isRecipeEmpty(recipeItems: RecipeItemFormData[]): boolean {
  return recipeItems.length === 0;
}

/**
 * Validate that a recipe has at least one item and all required fields
 */
export function validateRecipe(recipeItems: RecipeItemFormData[]): {
  isValid: boolean;
  error?: string;
} {
  if (recipeItems.length === 0) {
    return {
      isValid: false,
      error: 'La receta debe tener al menos un ingrediente',
    };
  }

  for (const item of recipeItems) {
    if (item.quantity_in_base_units <= 0) {
      return {
        isValid: false,
        error: 'Todas las cantidades deben ser mayores a cero',
      };
    }

    if (item.use_categorias) {
      if (!item.required_categoria_ids || item.required_categoria_ids.length === 0) {
        return {
          isValid: false,
          error: 'Los items por categoría deben tener al menos una categoría seleccionada',
        };
      }
    } else {
      if (!item.insumo_id) {
        return {
          isValid: false,
          error: 'Todos los items específicos deben tener un insumo seleccionado',
        };
      }
    }
  }

  return { isValid: true };
}
