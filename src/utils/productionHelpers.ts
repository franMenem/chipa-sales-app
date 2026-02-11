import { supabase } from '../lib/supabase';
import type { LotSelectionPayload, RecipeItem, InsumoLote } from '../lib/types';
import { FLOAT_PRECISION, QUANTITY_DECIMAL_PLACES } from '../lib/constants';

/**
 * Valida si un producto puede ser fabricado automáticamente (sin intervención manual)
 *
 * Condiciones:
 * - Debe tener stock suficiente de todos los ingredientes
 * - TODOS los recipe items deben ser específicos (no por categorías)
 * - Debe tener al menos un recipe item
 */
export async function canQuickProduce(productoId: string): Promise<{
  canProduce: boolean;
  reason?: string;
}> {
  try {
    // 1. Fetch producto para validar stock suficiente
    const { data: producto, error: productoError } = await supabase
      .from('productos_with_cost')
      .select('has_sufficient_ingredients')
      .eq('id', productoId)
      .single();

    if (productoError) {
      return { canProduce: false, reason: 'Error al validar producto' };
    }

    if (!producto) {
      return { canProduce: false, reason: 'Producto no encontrado' };
    }

    if (!producto.has_sufficient_ingredients) {
      return { canProduce: false, reason: 'Insumos insuficientes' };
    }

    // 2. Fetch recipe items para validar que no usan categorías
    const { data: recipeItems, error: recipeError } = await supabase
      .from('recipe_items')
      .select('*')
      .eq('producto_id', productoId);

    if (recipeError) {
      return { canProduce: false, reason: 'Error al validar receta' };
    }

    if (!recipeItems || recipeItems.length === 0) {
      return { canProduce: false, reason: 'Sin receta definida' };
    }

    // 3. Validar que NINGÚN recipe item use categorías
    const hasCategoria = recipeItems.some((item: RecipeItem) => item.use_categorias === true);
    if (hasCategoria) {
      return { canProduce: false, reason: 'Requiere selección manual de ingredientes' };
    }

    return { canProduce: true };
  } catch (error) {
    console.error('Error en canQuickProduce:', error);
    return { canProduce: false, reason: 'Error al validar' };
  }
}

/**
 * Construye selecciones de lotes automáticamente usando LIFO (Last In First Out)
 *
 * Para cada ingrediente:
 * 1. Obtiene lotes ordenados por fecha de compra DESC (más reciente primero)
 * 2. Distribuye la cantidad necesaria entre los lotes disponibles
 * 3. Calcula el costo total basado en los lotes seleccionados
 */
export async function buildAutoLIFOSelections(
  productoId: string,
  quantity: number
): Promise<{
  success: boolean;
  lotSelections?: LotSelectionPayload[];
  totalCost?: number;
  costPerUnit?: number;
  error?: string;
}> {
  try {
    // 1. Fetch recipe items
    const { data: recipeItems, error: recipeError } = await supabase
      .from('recipe_items')
      .select('*')
      .eq('producto_id', productoId);

    if (recipeError) {
      return { success: false, error: 'Error al obtener receta' };
    }

    if (!recipeItems || recipeItems.length === 0) {
      return { success: false, error: 'Producto sin receta' };
    }

    const lotSelections: LotSelectionPayload[] = [];
    let totalCost = 0;

    // 2. Para cada recipe item, construir selecciones LIFO
    for (const item of recipeItems as RecipeItem[]) {
      // Solo procesar items específicos (no categorías)
      if (item.use_categorias || !item.insumo_id) {
        return {
          success: false,
          error: 'El producto tiene ingredientes por categoría y requiere selección manual',
        };
      }

      const quantityNeeded = Number((item.quantity_in_base_units * quantity).toFixed(QUANTITY_DECIMAL_PLACES));

      // 3. Fetch lotes disponibles ordenados por LIFO
      const { data: lotes, error: lotesError } = await supabase
        .from('insumo_lotes')
        .select('*')
        .eq('insumo_id', item.insumo_id)
        .gte('quantity_remaining', 0.01)
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (lotesError) {
        return { success: false, error: `Error al obtener lotes del ingrediente` };
      }

      if (!lotes || lotes.length === 0) {
        return { success: false, error: `Sin lotes disponibles para uno o más ingredientes` };
      }

      // 4. Distribuir quantity_needed entre lotes (LIFO)
      const lots: Array<{ lot_id: string; quantity: number }> = [];
      let remaining = quantityNeeded;

      for (const lote of lotes as InsumoLote[]) {
        if (remaining <= 0) break;

        const toUse = Math.min(lote.quantity_remaining, remaining);
        if (toUse > 0) {
          lots.push({
            lot_id: lote.id,
            quantity: Number(toUse.toFixed(QUANTITY_DECIMAL_PLACES)),
          });

          // Acumular costo
          totalCost += toUse * lote.price_per_unit;
          remaining = Number((remaining - toUse).toFixed(QUANTITY_DECIMAL_PLACES));
        }
      }

      // 5. Validar que se pudo cubrir la cantidad necesaria
      if (remaining > FLOAT_PRECISION) {
        // Permitir tolerancia de precisión
        return {
          success: false,
          error: `Stock insuficiente para completar la fabricación`,
        };
      }

      // 6. Agregar a lot_selections
      if (lots.length > 0) {
        lotSelections.push({
          recipe_item_id: item.id,
          ingredient_id: item.insumo_id,
          lots,
        });
      }
    }

    const costPerUnit = quantity > 0 ? totalCost / quantity : 0;

    return {
      success: true,
      lotSelections,
      totalCost: Number(totalCost.toFixed(2)),
      costPerUnit: Number(costPerUnit.toFixed(2)),
    };
  } catch (error) {
    console.error('Error en buildAutoLIFOSelections:', error);
    return { success: false, error: 'Error al calcular lotes' };
  }
}

/**
 * Calcula precio de venta con margen de ganancia
 *
 * Formula: precio = costo * (1 + margen/100)
 * Ejemplo: costo=8000, margen=30% => precio = 8000 * 1.30 = 10400
 */
export function calculatePriceWithMargin(
  costUnit: number,
  marginPercentage: number = 30
): number {
  if (costUnit <= 0) return 0;
  if (marginPercentage < 0) return costUnit;

  return Number((costUnit * (1 + marginPercentage / 100)).toFixed(2));
}
