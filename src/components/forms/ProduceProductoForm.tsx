import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { QuantityStepper } from '../ui/QuantityStepper';
import { useProductos } from '../../hooks/useProductos';
import { useProduceProductoCustomOrder } from '../../hooks/useProduction';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { InsumoLote } from '../../lib/types';

interface ProduceProductoFormProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProductoId?: string;
}

interface FormData {
  producto_id: string;
  quantity: number;
  margin_percentage: number;
  price_sale: number;
}

interface RecipeItemWithLotes {
  recipe_item_id: string;
  use_categorias: boolean;
  insumo_id: string | null;
  insumo_name: string;
  unit_type: string;
  quantity_needed: number;
  lotes: InsumoLote[];
  // For category-based items
  required_categoria_ids?: string[];
  compatible_insumos?: Array<{
    id: string;
    name: string;
    unit_type: string;
    total_stock: number;
  }>;
  // For multiple insumos in category-based items
  selected_insumos?: Array<{
    insumo_id: string;
    insumo_name: string;
    unit_type: string;
    lotes: InsumoLote[];
  }>;
}

const unitLabels = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

const PRECISION = 0.0001;

export function ProduceProductoForm({ isOpen, onClose, preselectedProductoId }: ProduceProductoFormProps) {
  const { data: productos = [] } = useProductos();
  const produceMutation = useProduceProductoCustomOrder();
  const toast = useToast();

  const [selectedProducto, setSelectedProducto] = useState<any>(null);
  const [recipeWithLotes, setRecipeWithLotes] = useState<RecipeItemWithLotes[]>([]);
  const [loteOrder, setLoteOrder] = useState<Record<string, string[]>>({});
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lotSelections, setLotSelections] = useState<Record<string, Record<string, number>>>({});
  // Track selected insumos for category-based ingredients (allows multiple insumos per ingredient)
  const [selectedCategoryInsumos, setSelectedCategoryInsumos] = useState<Record<string, string[]>>({});

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      producto_id: preselectedProductoId || '',
      quantity: 1,
      margin_percentage: 50,  // Default 50% margin
      price_sale: 0,           // Will be calculated automatically
    },
  });

  const productoId = watch('producto_id');
  const quantity = watch('quantity');
  const marginPercentage = watch('margin_percentage');
  const priceSale = watch('price_sale');

  const getOrderedLotesFromMap = (
    recipeItem: RecipeItemWithLotes,
    orderMap: Record<string, string[]>
  ) => {
    if (!recipeItem.insumo_id) return recipeItem.lotes;
    const order = orderMap[recipeItem.insumo_id];
    if (order && order.length > 0) {
      const ordered = order
        .map(loteId => recipeItem.lotes.find(l => l.id === loteId))
        .filter(Boolean) as InsumoLote[];
      if (ordered.length > 0) {
        return ordered;
      }
    }
    return recipeItem.lotes;
  };

  const getOrderedLotes = useCallback(
    (recipeItem: RecipeItemWithLotes) => getOrderedLotesFromMap(recipeItem, loteOrder),
    [loteOrder]
  );

  const buildDefaultSelections = useCallback((
    items: RecipeItemWithLotes[],
    qty: number,
    overrideOrder?: Record<string, string[]>
  ) => {
    const orderMap = overrideOrder || loteOrder;
    const result: Record<string, Record<string, number>> = {};
    items.forEach((item) => {
      if (!item.insumo_id || item.lotes.length === 0) return;

      let remaining = Number((item.quantity_needed * qty).toFixed(4));
      const orderedLotes = getOrderedLotesFromMap(item, orderMap);

      orderedLotes.forEach((lote) => {
        if (remaining <= 0) return;
        const toUse = Math.min(lote.quantity_remaining, remaining);
        if (toUse > 0) {
          if (!result[item.recipe_item_id]) {
            result[item.recipe_item_id] = {};
          }
          result[item.recipe_item_id][lote.id] = Number(toUse.toFixed(4));
          remaining = Number((remaining - toUse).toFixed(4));
        }
      });
    });
    return result;
  }, [loteOrder]);

  // Load recipe and lotes when producto changes
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
        // Get recipe items
        const { data: recipeItems, error: recipeError } = await supabase
          .from('recipe_items')
          .select(`
            *,
            insumo:insumos(*)
          `)
          .eq('producto_id', productoId);

        if (recipeError) throw recipeError;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');

        // For each recipe item, get available lotes
        const recipeWithLotesData = await Promise.all(
          (recipeItems || []).map(async (item) => {
            // Check if this recipe item uses categories
            if (item.use_categorias && item.required_categoria_ids && item.required_categoria_ids.length > 0) {
              // Fetch all insumos for this user, then filter client-side for those that have ANY of the required categories
              const { data: allInsumos, error: insumosError } = await supabase
                .from('insumos_with_stock')
                .select('id, name, unit_type, total_stock, categoria_ids')
                .eq('user_id', user.id);

              if (insumosError) throw insumosError;

              // Filter for insumos that have at least one of the required categories
              const compatibleInsumos = (allInsumos || []).filter((insumo) => {
                const insumoCategories = insumo.categoria_ids || [];
                const requiredCategories = item.required_categoria_ids || [];
                return requiredCategories.some((reqCat: string) => insumoCategories.includes(reqCat));
              });

              if (compatibleInsumos.length === 0) {
                // No compatible insumos found
                return {
                  recipe_item_id: item.id,
                  use_categorias: true,
                  insumo_id: null,
                  insumo_name: 'Sin insumos compatibles',
                  unit_type: 'kg', // Default
                  quantity_needed: item.quantity_in_base_units,
                  lotes: [],
                  required_categoria_ids: item.required_categoria_ids,
                  compatible_insumos: [],
                  selected_insumos: [],
                };
              }

              // Don't select any insumo by default - user will select via checkboxes
              // This allows multiple insumos to be selected
              return {
                recipe_item_id: item.id,
                use_categorias: true,
                insumo_id: null,
                insumo_name: '',
                unit_type: compatibleInsumos[0]?.unit_type || 'kg',
                quantity_needed: item.quantity_in_base_units,
                lotes: [],
                required_categoria_ids: item.required_categoria_ids,
                compatible_insumos: compatibleInsumos || [],
                selected_insumos: [], // Will be populated when user selects insumos
              };
            } else {
              // Regular recipe item with specific insumo
              const { data: lotes, error: lotesError } = await supabase
                .from('insumo_lotes')
                .select('*')
                .eq('insumo_id', item.insumo_id)
                .gt('quantity_remaining', 0)
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

        // Initialize lote order with default LIFO order
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

  useEffect(() => {
    if (recipeWithLotes.length === 0) {
      setLotSelections({});
      return;
    }
    setLotSelections(buildDefaultSelections(recipeWithLotes, quantity));
  }, [recipeWithLotes, quantity, buildDefaultSelections]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        producto_id: preselectedProductoId || '',
        quantity: 1,
      });
      setSelectedProducto(null);
      setRecipeWithLotes([]);
      setLoteOrder({});
      setShowAdvanced(false);
    }
  }, [isOpen, preselectedProductoId, reset]);

  const onSubmit = async (data: FormData) => {
    if (hasSelectionErrors) {
      toast.error('Cantidades incompletas', 'Revisa la selección de lotes antes de fabricar');
      return;
    }

    if (data.margin_percentage < 0 || data.margin_percentage > 100) {
      toast.error('Margen inválido', 'El margen debe estar entre 0 y 100%');
      return;
    }

    if (data.price_sale <= 0) {
      toast.error('Precio inválido', 'El precio de venta debe ser mayor a 0');
      return;
    }

    try {
      const lotSelectionsPayload = buildLotSelectionsPayload();

      await produceMutation.mutateAsync({
        producto_id: data.producto_id,
        quantity: data.quantity,
        margin_percentage: data.margin_percentage,
        price_sale: data.price_sale,
        lote_order: loteOrder,
        lot_selections: lotSelectionsPayload,
      });
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Handle changing the selected insumo for a category-based recipe item
  // Toggle selection of an insumo for category-based ingredients (allows multiple selections)
  const handleCategoryInsumoToggle = async (recipeItemId: string, insumoId: string) => {
    const recipeItem = recipeWithLotes.find(r => r.recipe_item_id === recipeItemId);
    if (!recipeItem || !recipeItem.use_categorias) return;

    try {
      const currentlySelected = selectedCategoryInsumos[recipeItemId] || [];
      const isSelected = currentlySelected.includes(insumoId);

      if (isSelected) {
        // Deselect: Remove insumo from selected list
        const newSelected = currentlySelected.filter(id => id !== insumoId);
        setSelectedCategoryInsumos(prev => ({
          ...prev,
          [recipeItemId]: newSelected,
        }));

        // Remove lotes of this insumo from selected_insumos
        const updatedSelectedInsumos = (recipeItem.selected_insumos || []).filter(
          si => si.insumo_id !== insumoId
        );

        // Update recipe item
        setRecipeWithLotes(prev => prev.map(item =>
          item.recipe_item_id === recipeItemId
            ? { ...item, selected_insumos: updatedSelectedInsumos }
            : item
        ));

        // Clear lot selections for this insumo
        setLotSelections(prev => {
          const newSelections = { ...prev };
          if (newSelections[recipeItemId]) {
            // Remove selections for lotes of this insumo
            const lotesToRemove = recipeItem.selected_insumos
              ?.find(si => si.insumo_id === insumoId)
              ?.lotes.map(l => l.id) || [];

            lotesToRemove.forEach(loteId => {
              delete newSelections[recipeItemId][loteId];
            });
          }
          return newSelections;
        });

        // Clean up lote order
        setLoteOrder(prev => {
          const newOrder = { ...prev };
          delete newOrder[insumoId];
          return newOrder;
        });
      } else {
        // Select: Add insumo to selected list
        const newSelected = [...currentlySelected, insumoId];
        setSelectedCategoryInsumos(prev => ({
          ...prev,
          [recipeItemId]: newSelected,
        }));

        // Fetch lotes for the new insumo
        const { data: lotes, error: lotesError } = await supabase
          .from('insumo_lotes')
          .select('*')
          .eq('insumo_id', insumoId)
          .gt('quantity_remaining', 0)
          .order('purchase_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (lotesError) throw lotesError;

        // Find the insumo details
        const insumoDetails = recipeItem.compatible_insumos?.find(i => i.id === insumoId);

        // Add to selected_insumos
        const newInsumoEntry = {
          insumo_id: insumoId,
          insumo_name: insumoDetails?.name || '',
          unit_type: insumoDetails?.unit_type || 'kg',
          lotes: lotes || [],
        };

        const updatedSelectedInsumos = [...(recipeItem.selected_insumos || []), newInsumoEntry];

        // Update recipe item
        setRecipeWithLotes(prev => prev.map(item =>
          item.recipe_item_id === recipeItemId
            ? { ...item, selected_insumos: updatedSelectedInsumos }
            : item
        ));

        // Add lote order for this insumo
        setLoteOrder(prev => ({
          ...prev,
          [insumoId]: (lotes || []).map(l => l.id),
        }));

        const availableLotes = (lotes || []).filter(lote => lote.quantity_remaining > 0);
        const requiredQuantity = Number((recipeItem.quantity_needed * quantity).toFixed(4));
        if (availableLotes.length === 1 && updatedSelectedInsumos.length === 1 && requiredQuantity > 0) {
          setLotSelections(prev => {
            const existing = prev[recipeItemId] || {};
            if (Object.keys(existing).length > 0) return prev;

            const lote = availableLotes[0];
            const nextValue = Number(Math.min(lote.quantity_remaining, requiredQuantity).toFixed(4));
            return {
              ...prev,
              [recipeItemId]: {
                [lote.id]: nextValue,
              },
            };
          });
        }
      }
    } catch (error) {
      console.error('Error toggling category insumo:', error);
      toast.error('Error', 'No se pudo cargar los lotes del insumo');
    }
  };

  // Move lote up in order
  const moveLoteUp = (insumoId: string | null, loteIndex: number) => {
    if (!insumoId || loteIndex === 0) return; // Already at top or invalid insumo

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

  // Move lote down in order
  const moveLoteDown = (insumoId: string | null, loteIndex: number) => {
    if (!insumoId) return;
    const currentOrder = loteOrder[insumoId];
    if (!currentOrder || loteIndex === currentOrder.length - 1) return; // Already at bottom or invalid

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

  const handleLotQuantityChange = (recipeItemId: string, lotId: string, value: number) => {
    const safeValue = Number(Math.max(0, value).toFixed(4));
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

      const nextValue = Number(Math.min(quantityRemaining, remainingNeeded).toFixed(4));

      return {
        ...prev,
        [recipeItemId]: {
          ...lotMap,
          [lotId]: nextValue,
        },
      };
    });
  };

  useEffect(() => {
    if (recipeWithLotes.length === 0 || quantity <= 0) return;

    setLotSelections(prev => {
      let changed = false;
      const next = { ...prev };

      recipeWithLotes.forEach((item) => {
        const requiredQuantity = Number((item.quantity_needed * quantity).toFixed(4));
        if (requiredQuantity <= 0) return;

        if (!item.use_categorias && item.insumo_id) {
          const availableLotes = (item.lotes || []).filter(lote => lote.quantity_remaining > 0);
          if (availableLotes.length === 1 && (!next[item.recipe_item_id] || Object.keys(next[item.recipe_item_id]).length === 0)) {
            const lote = availableLotes[0];
            const nextValue = Number(Math.min(lote.quantity_remaining, requiredQuantity).toFixed(4));
            next[item.recipe_item_id] = { [lote.id]: nextValue };
            changed = true;
          }
        }

        if (item.use_categorias && item.selected_insumos && item.selected_insumos.length === 1) {
          const selected = item.selected_insumos[0];
          const availableLotes = (selected.lotes || []).filter(lote => lote.quantity_remaining > 0);
          if (availableLotes.length === 1 && (!next[item.recipe_item_id] || Object.keys(next[item.recipe_item_id]).length === 0)) {
            const lote = availableLotes[0];
            const nextValue = Number(Math.min(lote.quantity_remaining, requiredQuantity).toFixed(4));
            next[item.recipe_item_id] = { [lote.id]: nextValue };
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [recipeWithLotes, quantity]);

  const resetSelectionsForItem = (recipeItem: RecipeItemWithLotes) => {
    const defaults = buildDefaultSelections([recipeItem], quantity);
    setLotSelections(prev => ({
      ...prev,
      ...defaults,
    }));
  };

  const selectionStatus = useMemo(() => {
    const status: Record<string, { required: number; selected: number; hasError: boolean; message: string | null }> = {};

    recipeWithLotes.forEach(item => {
      const required = Number((item.quantity_needed * quantity).toFixed(4));
      const lotMap = lotSelections[item.recipe_item_id] || {};
      const selected = Object.values(lotMap || {}).reduce((sum, value) => sum + value, 0);
      let message: string | null = null;
      let hasError = false;

      if (required > 0) {
        if (selected < required - PRECISION) {
          hasError = true;
          message = `Faltan ${(required - selected).toFixed(3)} ${unitLabels[item.unit_type as keyof typeof unitLabels]}`;
        } else if (selected > required + PRECISION) {
          hasError = true;
          message = `Te sobran ${(selected - required).toFixed(3)} ${unitLabels[item.unit_type as keyof typeof unitLabels]}`;
        }
      }

      // Validate lot quantities - check both regular lotes and category-based selected_insumos lotes
      Object.entries(lotMap || {}).forEach(([lotId, qty]) => {
        let lote: InsumoLote | undefined;

        // First try to find in regular lotes
        if (item.lotes && item.lotes.length > 0) {
          lote = item.lotes.find(l => l.id === lotId);
        }

        // If not found and this is a category-based ingredient, search in selected_insumos
        if (!lote && item.use_categorias && item.selected_insumos) {
          for (const selectedInsumo of item.selected_insumos) {
            lote = selectedInsumo.lotes.find(l => l.id === lotId);
            if (lote) break;
          }
        }

        if (lote && qty > lote.quantity_remaining + PRECISION) {
          hasError = true;
          message = `El lote del ${format(new Date(lote.purchase_date), 'dd/MM/yyyy', { locale: es })} no tiene suficiente stock`;
        }
      });

      status[item.recipe_item_id] = {
        required,
        selected,
        hasError,
        message,
      };
    });

    return status;
  }, [recipeWithLotes, lotSelections, quantity]);

  const hasSelectionErrors = useMemo(() => {
    return recipeWithLotes.some(item => {
      const status = selectionStatus[item.recipe_item_id];
      if (!status) {
        return item.quantity_needed * quantity > 0;
      }
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
        // Category-based ingredient with multiple possible insumos
        // Group lots by insumo and create one entry per insumo
        item.selected_insumos.forEach(selectedInsumo => {
          const insumoLotIds = selectedInsumo.lotes.map(l => l.id);
          const lots = Object.entries(lotMap)
            .filter(([lotId, qty]) => insumoLotIds.includes(lotId) && qty > 0)
            .map(([lotId, qty]) => ({
              lot_id: lotId,
              quantity: Number(qty.toFixed(4)),
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
        // Regular ingredient with single insumo
        const lots = Object.entries(lotMap)
          .filter(([, qty]) => qty > 0)
          .map(([lotId, qty]) => ({
            lot_id: lotId,
            quantity: Number(qty.toFixed(4)),
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

  // Prepare producto options
  const productoOptions = [
    { value: '', label: 'Seleccionar producto...' },
    ...productos.map(p => ({
      value: p.id,
      label: `${p.name} (Stock: ${p.finished_stock} unidades)`,
    })),
  ];

  // Calculate dynamic cost based on selected lots
  const dynamicCostCalculation = useMemo(() => {
    if (!selectedProducto || quantity <= 0 || recipeWithLotes.length === 0) {
      return {
        totalCost: 0,
        costPerUnit: 0,
      };
    }

    let totalCost = 0;

    recipeWithLotes.forEach((item) => {
      const lotMap = lotSelections[item.recipe_item_id] || {};

      // Find the cost for each lot and multiply by quantity used
      Object.entries(lotMap).forEach(([lotId, qtyUsed]) => {
        if (qtyUsed <= 0) return;

        let lote: InsumoLote | undefined;

        // Find lote in regular lotes or in selected_insumos
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

    return {
      totalCost,
      costPerUnit,
    };
  }, [selectedProducto, quantity, recipeWithLotes, lotSelections]);

  // Auto-calculate suggested price when margin or cost changes
  useEffect(() => {
    if (!selectedProducto || marginPercentage < 0 || marginPercentage > 100) return;

    const costUnit =
      dynamicCostCalculation.costPerUnit > 0
        ? dynamicCostCalculation.costPerUnit
        : selectedProducto.cost_unit || 0;
    if (costUnit <= 0) return;

    // Formula: price = cost * (1 + margin/100)
    // This calculates margin ON TOP of cost (markup)
    // Example: if cost=8000 and margin=50%, then price = 8000 * 1.5 = 12000
    const suggestedPrice = costUnit * (1 + marginPercentage / 100);
    setValue('price_sale', Number(suggestedPrice.toFixed(2)));
  }, [selectedProducto, marginPercentage, dynamicCostCalculation.costPerUnit, setValue]);

  const isSubmitDisabled =
    isSubmitting ||
    !selectedProducto?.has_sufficient_ingredients ||
    hasSelectionErrors ||
    recipeWithLotes.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Fabricar Productos"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitDisabled}
            icon="manufacturing"
          >
            {isSubmitting ? 'Fabricando...' : 'Fabricar'}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => {
        e.preventDefault();
        // Solo ejecutar si el botón estaría habilitado
        if (!isSubmitDisabled) {
          handleSubmit(onSubmit)(e);
        }
      }} className="space-y-4">
        {/* Seleccionar producto */}
        <Select
          label="Producto a fabricar"
          options={productoOptions}
          {...register('producto_id', { required: 'Selecciona un producto' })}
        />

        {/* Cantidad a fabricar */}
        <Input
          label="Cantidad a fabricar"
          type="number"
          step="1"
          min="1"
          placeholder="1"
          icon="production_quantity_limits"
          helperText="¿Cuántas unidades quieres fabricar?"
          {...register('quantity', {
            valueAsNumber: true,
            required: 'Ingresa la cantidad',
            min: { value: 1, message: 'Debe ser al menos 1' }
          })}
        />

        {/* Margin and price configuration */}
        {selectedProducto && !isLoadingRecipe && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Margen de ganancia (%)"
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="50"
              icon="trending_up"
              helperText="Margen objetivo de ganancia"
              {...register('margin_percentage', {
                valueAsNumber: true,
                required: 'Ingresa el margen',
                min: { value: 0, message: 'Mínimo 0%' },
                max: { value: 100, message: 'Máximo 100%' }
              })}
            />

            <Input
              label="Precio de venta ($/ud)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              icon="sell"
              helperText="Precio de venta sugerido"
              {...register('price_sale', {
                valueAsNumber: true,
                required: 'Ingresa el precio',
                min: { value: 0, message: 'Debe ser mayor a 0' }
              })}
            />
          </div>
        )}

        {/* Información del producto seleccionado */}
        {selectedProducto && !isLoadingRecipe && (
          <div className="space-y-3">
            {/* Stock actual */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[20px]">
                    inventory
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Stock actual:
                  </span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedProducto.finished_stock} unidades
                </span>
              </div>
            </div>

            {/* Costo dinámico basado en lotes seleccionados */}
            <div className="bg-primary-50 dark:bg-primary-950/30 rounded-xl p-4 border border-primary-200 dark:border-primary-900">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[18px]">
                    calculate
                  </span>
                  <h4 className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                    Costos de Producción
                  </h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    Costo por unidad:
                  </span>
                  <span className="font-semibold text-primary-700 dark:text-primary-300">
                    {formatCurrency(dynamicCostCalculation.costPerUnit)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    Costo total:
                  </span>
                  <span className="text-lg font-bold text-primary-700 dark:text-primary-300">
                    {formatCurrency(dynamicCostCalculation.totalCost)}
                  </span>
                </div>
                {dynamicCostCalculation.costPerUnit > 0 && (
                  <p className="text-xs text-primary-600 dark:text-primary-400 italic">
                    * Calculado en base a los lotes seleccionados
                  </p>
                )}
                {priceSale > 0 && dynamicCostCalculation.costPerUnit > 0 && (
                  <>
                    <div className="border-t border-primary-200 dark:border-primary-900 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Precio de venta:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(priceSale)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Margen:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {marginPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="border-t border-green-200 dark:border-green-900 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600 dark:text-green-400">
                        Ganancia por unidad:
                      </span>
                      <span className="font-semibold text-green-700 dark:text-green-300">
                        {formatCurrency(priceSale - dynamicCostCalculation.costPerUnit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600 dark:text-green-400">
                        Ganancia total:
                      </span>
                      <span className="text-lg font-bold text-green-700 dark:text-green-300">
                        {formatCurrency((priceSale - dynamicCostCalculation.costPerUnit) * quantity)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Estado de ingredientes */}
            {!selectedProducto.has_sufficient_ingredients ? (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3">
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[20px]">
                    error
                  </span>
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                      Stock insuficiente de ingredientes
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      No hay suficientes insumos para fabricar este producto. Registra una compra de los insumos faltantes.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-3">
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]">
                    check_circle
                  </span>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Todos los ingredientes están disponibles
                  </p>
                </div>
              </div>
            )}

            {/* Category-based ingredients selector */}
            {recipeWithLotes.some(item => item.use_categorias && item.compatible_insumos && item.compatible_insumos.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[20px]">
                    category
                  </span>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                    Ingredientes por categoría
                  </h4>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                  <div className="flex gap-2">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">
                      lightbulb
                    </span>
                    <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                      <p className="font-medium">Ingredientes flexibles - Selección múltiple</p>
                      <p>1. <strong>Selecciona uno o más insumos</strong> que quieras combinar (checkboxes)</p>
                      <p>2. Abajo verás los lotes de cada insumo seleccionado <strong>agrupados</strong></p>
                      <p>3. Ajusta las cantidades de cada lote para completar lo necesario</p>
                      <p className="font-medium mt-1">Ejemplo: Si necesitas 62.5g de queso, puedes usar:</p>
                      <p className="ml-3">✓ 37.5g de Parmeggiano + 25g de Mar del Plata</p>
                    </div>
                  </div>
                </div>

                    {recipeWithLotes
                      .filter(item => item.use_categorias && item.compatible_insumos && item.compatible_insumos.length > 0)
                      .map((recipeItem) => {
                        const selectedInsumos = selectedCategoryInsumos[recipeItem.recipe_item_id] || [];
                        return (
                          <Card key={recipeItem.recipe_item_id}>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                                  Ingrediente basado en categoría
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  Necesario: {recipeItem.quantity_needed * quantity} {unitLabels[recipeItem.unit_type as keyof typeof unitLabels]}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  Seleccionar insumos (puedes elegir varios):
                                </label>
                                <div className="space-y-1.5">
                                  {(recipeItem.compatible_insumos || []).map((insumo) => {
                                    const isChecked = selectedInsumos.includes(insumo.id);
                                    return (
                                      <label
                                        key={insumo.id}
                                        className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-colors touch-manipulation ${
                                          isChecked
                                            ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-300 dark:border-primary-700'
                                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-800'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleCategoryInsumoToggle(recipeItem.recipe_item_id, insumo.id)}
                                          className="w-5 h-5 sm:w-4 sm:h-4 text-primary-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary-500 flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                            {insumo.name}
                                          </p>
                                          <p className="text-xs text-slate-600 dark:text-slate-400">
                                            {insumo.total_stock} {unitLabels[insumo.unit_type as keyof typeof unitLabels]} disponibles
                                          </p>
                                        </div>
                                        {isChecked && (
                                          <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[20px] flex-shrink-0">
                                            check_circle
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              {selectedInsumos.length === 0 && (
                                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[16px]">
                                      info
                                    </span>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                      Selecciona al menos un insumo para continuar
                                    </p>
                                  </div>
                                </div>
                              )}

                              {selectedInsumos.length > 0 && (
                                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[16px]">
                                      check_circle
                                    </span>
                                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                                      {selectedInsumos.length} insumo{selectedInsumos.length !== 1 ? 's' : ''} seleccionado{selectedInsumos.length !== 1 ? 's' : ''}
                                      {selectedInsumos.length > 1 && ' - Puedes combinarlos para completar la cantidad necesaria'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
              </div>
            )}

                {/* Lote selection per ingredient */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-[20px]">
                      inventory_2
                    </span>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                      Selección de lotes por ingrediente
                    </h4>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                    <div className="flex gap-2">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">
                        info
                      </span>
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <p className="font-medium">Combinar múltiples lotes del mismo ingrediente</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li><strong>Botón "Auto":</strong> Llena automáticamente usando LIFO (lotes más recientes primero)</li>
                          <li><strong>Manual:</strong> Ajusta cada lote individualmente. Si necesitas 500g:</li>
                          <ul className="list-circle list-inside ml-3 space-y-0.5">
                            <li>Lote 1 (compra reciente): 450g disponibles → selecciona 450g</li>
                            <li>Lote 2 (compra anterior): 100g disponibles → selecciona 50g</li>
                            <li><strong>Total: 450g + 50g = 500g ✓</strong></li>
                          </ul>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Regular ingredients (non-category) */}
                  {recipeWithLotes
                    .filter(item => !item.use_categorias && item.insumo_id)
                    .map((recipeItem) => {
                      const orderedLotes = getOrderedLotes(recipeItem).filter(
                        (lote) => lote.quantity_remaining > 0
                      );
                      const requiredQuantity = Number((recipeItem.quantity_needed * quantity).toFixed(4));
                      const status = selectionStatus[recipeItem.recipe_item_id];
                      const stepValue = recipeItem.unit_type === 'unit' ? 1 : 0.1;

                      return (
                        <Card key={`lot-selection-${recipeItem.recipe_item_id}`}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {recipeItem.insumo_name}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  Necesario: {(recipeItem.quantity_needed * quantity).toFixed(3)} {unitLabels[recipeItem.unit_type as keyof typeof unitLabels]}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                icon="refresh"
                                onClick={() => resetSelectionsForItem(recipeItem)}
                              >
                                Auto
                              </Button>
                            </div>

                            {orderedLotes.length === 0 ? (
                              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
                                No hay lotes disponibles para este insumo.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {orderedLotes.map((lote) => {
                                  const currentValue = lotSelections[recipeItem.recipe_item_id]?.[lote.id] || 0;
                                  return (
                                    <div
                                      key={lote.id}
                                      className="flex flex-col gap-2 rounded-lg border border-slate-100 dark:border-slate-700 p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/40"
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            Lote del {format(new Date(lote.purchase_date), 'dd/MM/yyyy', { locale: es })}
                                          </p>
                                          <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Disponible: {lote.quantity_remaining.toFixed(3)} {unitLabels[lote.unit_type as keyof typeof unitLabels]} • {formatCurrency(lote.price_per_unit)}/{unitLabels[lote.unit_type as keyof typeof unitLabels]}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 justify-between sm:justify-end">
                                          <QuantityStepper
                                            value={currentValue}
                                            onChange={(val) => handleLotQuantityChange(recipeItem.recipe_item_id, lote.id, val)}
                                            min={0}
                                            max={lote.quantity_remaining}
                                            step={stepValue}
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUseAllFromLot(
                                              recipeItem.recipe_item_id,
                                              lote.id,
                                              lote.quantity_remaining,
                                              requiredQuantity
                                            )}
                                            className="flex-shrink-0"
                                          >
                                            <span className="hidden xs:inline">Completar</span>
                                            <span className="xs:hidden">Max</span>
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Progress bar and status */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Seleccionado: {(status?.selected || 0).toFixed(3)} / {(status?.required || 0).toFixed(3)} {unitLabels[recipeItem.unit_type as keyof typeof unitLabels]}
                                </span>
                                {status?.message && (
                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                    {status.message}
                                  </span>
                                )}
                              </div>

                              {/* Visual progress bar */}
                              {status && status.required > 0 && (
                                <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`absolute top-0 left-0 h-full transition-all duration-300 rounded-full ${
                                      status.hasError
                                        ? 'bg-red-500'
                                        : Math.abs(status.selected - status.required) < 0.001
                                        ? 'bg-green-500'
                                        : 'bg-yellow-500'
                                    }`}
                                    style={{
                                      width: `${Math.min((status.selected / status.required) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                              )}

                              {/* Success indicator when using multiple lots */}
                              {orderedLotes.length > 1 && status && !status.hasError && Math.abs(status.selected - status.required) < 0.001 && (
                                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-2">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[14px]">
                                      check_circle
                                    </span>
                                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                                      ✓ Usando {orderedLotes.filter(lote => (lotSelections[recipeItem.recipe_item_id]?.[lote.id] || 0) > 0).length} lotes combinados
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}

                  {/* Category-based ingredients - Show selected insumos grouped */}
                  {recipeWithLotes
                    .filter(item => item.use_categorias && item.selected_insumos && item.selected_insumos.length > 0)
                    .map((recipeItem) => {
                      const status = selectionStatus[recipeItem.recipe_item_id];
                      const stepValue = recipeItem.unit_type === 'unit' ? 1 : 0.1;

                      return (
                        <Card key={`category-lot-selection-${recipeItem.recipe_item_id}`}>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[18px]">
                                  category
                                </span>
                                Ingrediente por categoría
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                Necesario total: {(recipeItem.quantity_needed * quantity).toFixed(3)} {unitLabels[recipeItem.unit_type as keyof typeof unitLabels]}
                              </p>
                            </div>

                            {/* Show each selected insumo with its lotes */}
                            <div className="space-y-3">
                              {(recipeItem.selected_insumos || []).map((selectedInsumo) => {
                                const insumoLotes = (selectedInsumo.lotes || []).filter(
                                  (lote) => lote.quantity_remaining > 0
                                );
                                const requiredQuantity = Number((recipeItem.quantity_needed * quantity).toFixed(4));
                                const orderedInsumoLotes = loteOrder[selectedInsumo.insumo_id]
                                  ? loteOrder[selectedInsumo.insumo_id]
                                      .map(loteId => insumoLotes.find(l => l.id === loteId))
                                      .filter(Boolean) as InsumoLote[]
                                  : insumoLotes;

                                return (
                                  <div key={selectedInsumo.insumo_id} className="border border-primary-200 dark:border-primary-800 rounded-lg p-3 bg-primary-50/50 dark:bg-primary-950/20">
                                    <div className="mb-2">
                                      <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                                        {selectedInsumo.insumo_name}
                                      </p>
                                      <p className="text-xs text-primary-700 dark:text-primary-300">
                                        {orderedInsumoLotes.length} lote{orderedInsumoLotes.length !== 1 ? 's' : ''} disponible{orderedInsumoLotes.length !== 1 ? 's' : ''}
                                      </p>
                                    </div>

                                    {orderedInsumoLotes.length === 0 ? (
                                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-2 text-xs text-amber-700 dark:text-amber-300">
                                        No hay lotes disponibles para este insumo.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {orderedInsumoLotes.map((lote) => {
                                          const currentValue = lotSelections[recipeItem.recipe_item_id]?.[lote.id] || 0;
                                          return (
                                            <div
                                              key={lote.id}
                                              className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-800"
                                            >
                                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                    Lote del {format(new Date(lote.purchase_date), 'dd/MM/yyyy', { locale: es })}
                                                  </p>
                                                  <p className="text-xs text-slate-600 dark:text-slate-400">
                                                    Disponible: {lote.quantity_remaining.toFixed(3)} {unitLabels[lote.unit_type as keyof typeof unitLabels]} • {formatCurrency(lote.price_per_unit)}/{unitLabels[lote.unit_type as keyof typeof unitLabels]}
                                                  </p>
                                                </div>
                                                <div className="flex items-center gap-2 justify-between sm:justify-end">
                                                  <QuantityStepper
                                                    value={currentValue}
                                                    onChange={(val) => handleLotQuantityChange(recipeItem.recipe_item_id, lote.id, val)}
                                                    min={0}
                                                    max={lote.quantity_remaining}
                                                    step={stepValue}
                                                  />
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleUseAllFromLot(
                                                      recipeItem.recipe_item_id,
                                                      lote.id,
                                                      lote.quantity_remaining,
                                                      requiredQuantity
                                                    )}
                                                    className="flex-shrink-0"
                                                  >
                                                    <span className="hidden xs:inline">Completar</span>
                                                    <span className="xs:hidden">Max</span>
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Progress bar and status for the whole category-based ingredient */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Seleccionado: {(status?.selected || 0).toFixed(3)} / {(status?.required || 0).toFixed(3)} {unitLabels[recipeItem.unit_type as keyof typeof unitLabels]}
                                </span>
                                {status?.message && (
                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                    {status.message}
                                  </span>
                                )}
                              </div>

                              {/* Visual progress bar */}
                              {status && status.required > 0 && (
                                <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`absolute top-0 left-0 h-full transition-all duration-300 rounded-full ${
                                      status.hasError
                                        ? 'bg-red-500'
                                        : Math.abs(status.selected - status.required) < 0.001
                                        ? 'bg-green-500'
                                        : 'bg-yellow-500'
                                    }`}
                                    style={{
                                      width: `${Math.min((status.selected / status.required) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                              )}

                              {/* Success indicator when combining multiple insumos */}
                              {(recipeItem.selected_insumos?.length || 0) > 1 && status && !status.hasError && Math.abs(status.selected - status.required) < 0.001 && (
                                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-2">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[14px]">
                                      check_circle
                                    </span>
                                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                                      ✓ Combinando {recipeItem.selected_insumos?.length || 0} insumos diferentes
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>

                {/* Advanced: Reorder lotes */}
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">Orden de consumo de lotes (Avanzado)</span>
                      <span className="material-symbols-outlined text-[18px]">
                        {showAdvanced ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </Button>

                  {showAdvanced && (
                    <div className="mt-3 space-y-4">
                      {recipeWithLotes.map((recipeItem) => {
                        if (!recipeItem.insumo_id) return null; // Skip items without insumo

                        const orderedLotes = getOrderedLotes(recipeItem).filter(
                          (lote) => lote.quantity_remaining > 0
                        );

                        return (
                          <Card key={recipeItem.recipe_item_id}>
                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-slate-900 dark:text-white">
                                    {recipeItem.insumo_name}
                                  </h4>
                                  {recipeItem.use_categorias && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                                      Categoría
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  Necesario: {recipeItem.quantity_needed * quantity} {unitLabels[recipeItem.unit_type as keyof typeof unitLabels]}
                                </p>
                              </div>

                              {/* Note: Category insumo selection is now handled via checkboxes above */}

                              <div className="space-y-2">
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  Orden de consumo (de arriba a abajo):
                                </p>
                                {orderedLotes.map((lote, index) => (
                                  <div
                                    key={lote.id}
                                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2"
                                  >
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-6">
                                      {index + 1}.
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-slate-900 dark:text-white">
                                        {format(new Date(lote.purchase_date), 'dd/MM/yyyy', { locale: es })}
                                      </p>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">
                                        {lote.quantity_remaining} {unitLabels[lote.unit_type as keyof typeof unitLabels]} • {formatCurrency(lote.price_per_unit)}/{unitLabels[lote.unit_type as keyof typeof unitLabels]}
                                      </p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <button
                                        type="button"
                                        onClick={() => moveLoteUp(recipeItem.insumo_id, index)}
                                        disabled={index === 0}
                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          arrow_upward
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moveLoteDown(recipeItem.insumo_id, index)}
                                        disabled={index === orderedLotes.length - 1}
                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          arrow_downward
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

            {/* Info sobre LIFO */}
            {!showAdvanced && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
                    info
                  </span>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <p>Al fabricar productos:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs ml-1">
                      <li>Se consumirán los lotes más recientes primero (LIFO)</li>
                      <li>Se aumentará el stock de productos terminados</li>
                      <li>Se registrará el costo de producción</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isLoadingRecipe && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Cargando lotes disponibles...</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
