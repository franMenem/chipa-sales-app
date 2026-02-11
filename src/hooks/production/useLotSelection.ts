import { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FLOAT_PRECISION, QUANTITY_DECIMAL_PLACES } from '../../lib/constants';
import type { InsumoLote, ProductoWithCost } from '../../lib/types';
import type { RecipeItemWithLotes, SelectionStatusItem } from './types';
import { UNIT_LABELS } from './types';

interface UseLotSelectionParams {
  recipeWithLotes: RecipeItemWithLotes[];
  quantity: number;
  loteOrder: Record<string, string[]>;
  selectedProducto: ProductoWithCost | null;
  getOrderedLotesFromMap: (item: RecipeItemWithLotes, orderMap: Record<string, string[]>) => InsumoLote[];
}

export function useLotSelection({
  recipeWithLotes,
  quantity,
  loteOrder,
  selectedProducto,
  getOrderedLotesFromMap,
}: UseLotSelectionParams) {
  const [lotSelections, setLotSelections] = useState<Record<string, Record<string, number>>>({});

  const buildDefaultSelections = useCallback((
    items: RecipeItemWithLotes[],
    qty: number,
    overrideOrder?: Record<string, string[]>
  ) => {
    const orderMap = overrideOrder || loteOrder;
    const result: Record<string, Record<string, number>> = {};
    items.forEach((item) => {
      if (!item.insumo_id || item.lotes.length === 0) return;

      let remaining = Number((item.quantity_needed * qty).toFixed(QUANTITY_DECIMAL_PLACES));
      const orderedLotes = getOrderedLotesFromMap(item, orderMap);

      orderedLotes.forEach((lote) => {
        if (remaining <= 0) return;
        const toUse = Math.min(lote.quantity_remaining, remaining);
        if (toUse > 0) {
          if (!result[item.recipe_item_id]) {
            result[item.recipe_item_id] = {};
          }
          result[item.recipe_item_id][lote.id] = Number(toUse.toFixed(QUANTITY_DECIMAL_PLACES));
          remaining = Number((remaining - toUse).toFixed(QUANTITY_DECIMAL_PLACES));
        }
      });
    });
    return result;
  }, [loteOrder, getOrderedLotesFromMap]);

  // Auto-set default selections when recipe/quantity changes
  useEffect(() => {
    if (recipeWithLotes.length === 0) {
      setLotSelections({});
      return;
    }
    setLotSelections(buildDefaultSelections(recipeWithLotes, quantity));
  }, [recipeWithLotes, quantity, buildDefaultSelections]);

  // Auto-select single lot for items with only one available lot
  useEffect(() => {
    if (recipeWithLotes.length === 0 || quantity <= 0) return;

    setLotSelections(prev => {
      let changed = false;
      const next = { ...prev };

      recipeWithLotes.forEach((item) => {
        const requiredQuantity = Number((item.quantity_needed * quantity).toFixed(QUANTITY_DECIMAL_PLACES));
        if (requiredQuantity <= 0) return;

        if (!item.use_categorias && item.insumo_id) {
          const availableLotes = (item.lotes || []).filter(lote => lote.quantity_remaining >= 0.01);
          if (availableLotes.length === 1 && (!next[item.recipe_item_id] || Object.keys(next[item.recipe_item_id]).length === 0)) {
            const lote = availableLotes[0];
            const nextValue = Number(Math.min(lote.quantity_remaining, requiredQuantity).toFixed(QUANTITY_DECIMAL_PLACES));
            next[item.recipe_item_id] = { [lote.id]: nextValue };
            changed = true;
          }
        }

        if (item.use_categorias && item.selected_insumos && item.selected_insumos.length === 1) {
          const selected = item.selected_insumos[0];
          const availableLotes = (selected.lotes || []).filter(lote => lote.quantity_remaining >= 0.01);
          if (availableLotes.length === 1 && (!next[item.recipe_item_id] || Object.keys(next[item.recipe_item_id]).length === 0)) {
            const lote = availableLotes[0];
            const nextValue = Number(Math.min(lote.quantity_remaining, requiredQuantity).toFixed(QUANTITY_DECIMAL_PLACES));
            next[item.recipe_item_id] = { [lote.id]: nextValue };
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [recipeWithLotes, quantity]);

  const handleLotQuantityChange = (recipeItemId: string, lotId: string, value: number) => {
    const safeValue = Number(Math.max(0, value).toFixed(QUANTITY_DECIMAL_PLACES));
    setLotSelections(prev => ({
      ...prev,
      [recipeItemId]: {
        ...(prev[recipeItemId] || {}),
        [lotId]: safeValue,
      },
    }));
  };

  const handleUseAllFromLot = (
    recipeItemId: string,
    lotId: string,
    quantityRemaining: number,
    requiredQuantity: number
  ) => {
    setLotSelections(prev => {
      const lotMap = prev[recipeItemId] || {};
      const currentValue = lotMap[lotId] || 0;
      const selectedTotal = Object.values(lotMap).reduce((sum, value) => sum + value, 0);
      const remainingNeeded = requiredQuantity - (selectedTotal - currentValue);

      if (remainingNeeded <= 0) return prev;

      const nextValue = Number(Math.min(quantityRemaining, remainingNeeded).toFixed(QUANTITY_DECIMAL_PLACES));

      return {
        ...prev,
        [recipeItemId]: {
          ...lotMap,
          [lotId]: nextValue,
        },
      };
    });
  };

  const resetSelectionsForItem = (recipeItem: RecipeItemWithLotes) => {
    const defaults = buildDefaultSelections([recipeItem], quantity);
    setLotSelections(prev => ({
      ...prev,
      ...defaults,
    }));
  };

  const selectionStatus = useMemo(() => {
    const status: Record<string, SelectionStatusItem> = {};

    recipeWithLotes.forEach(item => {
      const required = Number((item.quantity_needed * quantity).toFixed(QUANTITY_DECIMAL_PLACES));
      const lotMap = lotSelections[item.recipe_item_id] || {};
      const selected = Object.values(lotMap || {}).reduce((sum, value) => sum + value, 0);
      let message: string | null = null;
      let hasError = false;

      if (required > 0) {
        if (selected < required - FLOAT_PRECISION) {
          hasError = true;
          message = `Faltan ${(required - selected).toFixed(3)} ${UNIT_LABELS[item.unit_type] || item.unit_type}`;
        } else if (selected > required + FLOAT_PRECISION) {
          hasError = true;
          message = `Te sobran ${(selected - required).toFixed(3)} ${UNIT_LABELS[item.unit_type] || item.unit_type}`;
        }
      }

      Object.entries(lotMap || {}).forEach(([lotId, qty]) => {
        let lote: InsumoLote | undefined;

        if (item.lotes && item.lotes.length > 0) {
          lote = item.lotes.find(l => l.id === lotId);
        }

        if (!lote && item.use_categorias && item.selected_insumos) {
          for (const selectedInsumo of item.selected_insumos) {
            lote = selectedInsumo.lotes.find(l => l.id === lotId);
            if (lote) break;
          }
        }

        if (lote && qty > lote.quantity_remaining + FLOAT_PRECISION) {
          hasError = true;
          message = `El lote del ${format(new Date(lote.purchase_date), 'dd/MM/yyyy', { locale: es })} no tiene suficiente stock`;
        }
      });

      status[item.recipe_item_id] = { required, selected, hasError, message };
    });

    return status;
  }, [recipeWithLotes, lotSelections, quantity]);

  const hasSelectionErrors = useMemo(() => {
    return recipeWithLotes.some(item => {
      const status = selectionStatus[item.recipe_item_id];
      if (!status) return item.quantity_needed * quantity > 0;
      if (status.hasError) return true;
      if (status.required > 0 && status.selected <= 0) return true;
      return false;
    });
  }, [recipeWithLotes, selectionStatus, quantity]);

  const buildLotSelectionsPayload = () => {
    const payload: Array<{
      recipe_item_id: string;
      ingredient_id: string;
      lots: Array<{ lot_id: string; quantity: number }>;
    }> = [];

    recipeWithLotes.forEach(item => {
      const lotMap = lotSelections[item.recipe_item_id] || {};

      if (item.use_categorias && item.selected_insumos && item.selected_insumos.length > 0) {
        item.selected_insumos.forEach(selectedInsumo => {
          const insumoLotIds = selectedInsumo.lotes.map(l => l.id);
          const lots = Object.entries(lotMap)
            .filter(([lotId, qty]) => insumoLotIds.includes(lotId) && qty > 0)
            .map(([lotId, qty]) => ({
              lot_id: lotId,
              quantity: Number(qty.toFixed(QUANTITY_DECIMAL_PLACES)),
            }));

          if (lots.length > 0) {
            payload.push({
              recipe_item_id: item.recipe_item_id,
              ingredient_id: selectedInsumo.insumo_id,
              lots,
            });
          }
        });
      } else if (item.insumo_id) {
        const lots = Object.entries(lotMap)
          .filter(([, qty]) => qty > 0)
          .map(([lotId, qty]) => ({
            lot_id: lotId,
            quantity: Number(qty.toFixed(QUANTITY_DECIMAL_PLACES)),
          }));

        if (lots.length > 0) {
          payload.push({
            recipe_item_id: item.recipe_item_id,
            ingredient_id: item.insumo_id,
            lots,
          });
        }
      }
    });

    return payload;
  };

  const dynamicCostCalculation = useMemo(() => {
    if (!selectedProducto || quantity <= 0 || recipeWithLotes.length === 0) {
      return { totalCost: 0, costPerUnit: 0 };
    }

    let totalCost = 0;

    recipeWithLotes.forEach((item) => {
      const lotMap = lotSelections[item.recipe_item_id] || {};

      Object.entries(lotMap).forEach(([lotId, qtyUsed]) => {
        if (qtyUsed <= 0) return;

        let lote: InsumoLote | undefined;

        if (item.lotes && item.lotes.length > 0) {
          lote = item.lotes.find(l => l.id === lotId);
        }

        if (!lote && item.use_categorias && item.selected_insumos) {
          for (const selectedInsumo of item.selected_insumos) {
            lote = selectedInsumo.lotes.find(l => l.id === lotId);
            if (lote) break;
          }
        }

        if (lote) {
          totalCost += qtyUsed * lote.price_per_unit;
        }
      });
    });

    const costPerUnit = quantity > 0 ? totalCost / quantity : 0;

    return { totalCost, costPerUnit };
  }, [selectedProducto, quantity, recipeWithLotes, lotSelections]);

  return {
    lotSelections,
    setLotSelections,
    selectionStatus,
    hasSelectionErrors,
    dynamicCostCalculation,
    handleLotQuantityChange,
    handleUseAllFromLot,
    resetSelectionsForItem,
    buildLotSelectionsPayload,
  };
}
