import { useMemo } from 'react';
import type { ProductoWithCost, InsumoWithStock } from '../../lib/types';
import { UNIT_BASE_MULTIPLIER } from '../../lib/constants';

/**
 * Calculate available stock for a product including:
 * - Finished stock (already produced units)
 * - Stock that can be produced from available insumos
 */
export function useAvailableStock(
  producto: ProductoWithCost | null | undefined,
  insumos: InsumoWithStock[]
) {
  return useMemo(() => {
    if (!producto) return 0;

    // Finished stock (already produced units)
    const finishedStock = producto.finished_stock || 0;

    // Calculate stock that can be produced from insumos
    let stockFromInsumos = 0;

    if (producto.recipe_items && producto.recipe_items.length > 0) {
      const possibleUnitsPerInsumo = producto.recipe_items.map((item) => {
        const insumo = insumos.find((i) => i.id === item.insumo_id);
        if (!insumo) return 0;

        // Convert insumo stock to base units (g / ml / unit)
        const multiplier = UNIT_BASE_MULTIPLIER[insumo.unit_type] ?? 1;
        const availableInBaseUnits = insumo.total_stock * multiplier;

        // Calculate how many units can be produced with this insumo
        const possibleUnits = Math.floor(
          availableInBaseUnits / item.quantity_in_base_units
        );
        return possibleUnits;
      });

      // The limiting factor determines total producible stock
      stockFromInsumos = Math.min(...possibleUnitsPerInsumo, Infinity);
      if (stockFromInsumos === Infinity) stockFromInsumos = 0;
    }

    return finishedStock + stockFromInsumos;
  }, [producto, insumos]);
}
