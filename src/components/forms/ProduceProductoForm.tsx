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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      producto_id: preselectedProductoId || '',
      quantity: 1,
    },
  });

  const productoId = watch('producto_id');
  const quantity = watch('quantity');

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

              // Use the first compatible insumo by default (or previously selected one)
              const defaultInsumoId = compatibleInsumos && compatibleInsumos.length > 0
                ? compatibleInsumos[0].id
                : null;

              if (!defaultInsumoId) {
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
                };
              }

              // Fetch lotes for the default insumo
              const { data: lotes, error: lotesError } = await supabase
                .from('insumo_lotes')
                .select('*')
                .eq('insumo_id', defaultInsumoId)
                .gt('quantity_remaining', 0)
                .order('purchase_date', { ascending: false })
                .order('created_at', { ascending: false });

              if (lotesError) throw lotesError;

              const selectedInsumo = compatibleInsumos.find(i => i.id === defaultInsumoId);

              return {
                recipe_item_id: item.id,
                use_categorias: true,
                insumo_id: defaultInsumoId,
                insumo_name: selectedInsumo?.name || '',
                unit_type: selectedInsumo?.unit_type || 'kg',
                quantity_needed: item.quantity_in_base_units,
                lotes: lotes || [],
                required_categoria_ids: item.required_categoria_ids,
                compatible_insumos: compatibleInsumos || [],
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

        console.log('Recipe with lotes loaded:', recipeWithLotesData);
        console.log('Initial lote order:', initialOrder);
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

    try {
      const lotSelectionsPayload = buildLotSelectionsPayload();

      await produceMutation.mutateAsync({
        producto_id: data.producto_id,
        quantity: data.quantity,
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
  const handleCategoryInsumoChange = async (recipeItemId: string, newInsumoId: string) => {
    const recipeItem = recipeWithLotes.find(r => r.recipe_item_id === recipeItemId);
    if (!recipeItem || !recipeItem.use_categorias) return;

    try {
      // Fetch lotes for the new insumo
      const { data: lotes, error: lotesError } = await supabase
        .from('insumo_lotes')
        .select('*')
        .eq('insumo_id', newInsumoId)
        .gt('quantity_remaining', 0)
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (lotesError) throw lotesError;

      // Find the selected insumo details
      const selectedInsumo = recipeItem.compatible_insumos?.find(i => i.id === newInsumoId);

      const updatedItem: RecipeItemWithLotes = {
        ...recipeItem,
        insumo_id: newInsumoId,
        insumo_name: selectedInsumo?.name || '',
        unit_type: selectedInsumo?.unit_type || recipeItem.unit_type,
        lotes: lotes || [],
      };

      // Update recipeWithLotes with new lotes and insumo info
      setRecipeWithLotes(prev => prev.map(item => (
        item.recipe_item_id === recipeItemId ? updatedItem : item
      )));

      // Build updated order map for this insumo
      const updatedOrderMap: Record<string, string[]> = { ...loteOrder };
      if (recipeItem.insumo_id && recipeItem.insumo_id !== newInsumoId) {
        delete updatedOrderMap[recipeItem.insumo_id];
      }
      updatedOrderMap[newInsumoId] = (lotes || []).map(l => l.id);
      setLoteOrder(updatedOrderMap);

      // Reset selections for this recipe item using new lotes
      const selectionForItem = buildDefaultSelections([updatedItem], quantity, updatedOrderMap);
      setLotSelections(prev => ({
        ...prev,
        ...selectionForItem,
      }));
    } catch (error) {
      console.error('Error changing category insumo:', error);
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

      Object.entries(lotMap || {}).forEach(([lotId, qty]) => {
        const lote = item.lotes.find(l => l.id === lotId);
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
    return recipeWithLotes
      .filter(item => item.insumo_id)
      .map(item => {
        const lotMap = lotSelections[item.recipe_item_id] || {};
        const lots = Object.entries(lotMap)
          .filter(([, qty]) => qty > 0)
          .map(([lotId, qty]) => ({
            lot_id: lotId,
            quantity: Number(qty.toFixed(4)),
          }));

        return {
          recipe_item_id: item.recipe_item_id,
          ingredient_id: item.insumo_id as string,
          lots,
        };
      })
      .filter(entry => entry.lots.length > 0);
  };

  // Prepare producto options
  const productoOptions = [
    { value: '', label: 'Seleccionar producto...' },
    ...productos.map(p => ({
      value: p.id,
      label: `${p.name} (Stock: ${p.finished_stock} unidades)`,
    })),
  ];

  // Calculate estimated cost
  const estimatedTotalCost = selectedProducto && quantity > 0
    ? selectedProducto.cost_unit * quantity
    : 0;
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

            {/* Costo estimado */}
            <div className="bg-primary-50 dark:bg-primary-950/30 rounded-xl p-4 border border-primary-200 dark:border-primary-900">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    Costo por unidad:
                  </span>
                  <span className="font-semibold text-primary-700 dark:text-primary-300">
                    {formatCurrency(selectedProducto.cost_unit)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    Costo total estimado:
                  </span>
                  <span className="text-lg font-bold text-primary-700 dark:text-primary-300">
                    {formatCurrency(estimatedTotalCost)}
                  </span>
                </div>
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
              <>
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
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Selecciona qué insumo usar para cada ingrediente de la receta
                    </p>

                    {recipeWithLotes
                      .filter(item => item.use_categorias && item.compatible_insumos && item.compatible_insumos.length > 0)
                      .map((recipeItem) => (
                        <Card key={recipeItem.recipe_item_id}>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  Ingrediente basado en categoría
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  Necesario: {recipeItem.quantity_needed * quantity} {unitLabels[recipeItem.unit_type as keyof typeof unitLabels]}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Seleccionar insumo:
                              </label>
                              <select
                                value={recipeItem.insumo_id || ''}
                                onChange={(e) => handleCategoryInsumoChange(recipeItem.recipe_item_id, e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                {(recipeItem.compatible_insumos || []).map((insumo) => (
                                  <option key={insumo.id} value={insumo.id}>
                                    {insumo.name} ({insumo.total_stock} {unitLabels[insumo.unit_type as keyof typeof unitLabels]} disponibles)
                                  </option>
                                ))}
                              </select>
                            </div>

                            {recipeItem.lotes.length > 0 && (
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  ✓ {recipeItem.lotes.length} lote{recipeItem.lotes.length !== 1 ? 's' : ''} disponible{recipeItem.lotes.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            )}
                          </div>
                        </Card>
                    ))}
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
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Asigna cuánto consumir de cada lote para cubrir la receta.
                  </p>
                  {recipeWithLotes.map((recipeItem) => {
                    if (!recipeItem.insumo_id) return null;
                    const orderedLotes = getOrderedLotes(recipeItem);
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
                                    className="flex flex-col gap-2 rounded-lg border border-slate-100 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/40"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                          Lote del {format(new Date(lote.purchase_date), 'dd/MM/yyyy', { locale: es })}
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                          Disponible: {lote.quantity_remaining.toFixed(3)} {unitLabels[lote.unit_type as keyof typeof unitLabels]} • {formatCurrency(lote.price_per_unit)}/{unitLabels[lote.unit_type as keyof typeof unitLabels]}
                                        </p>
                                      </div>
                                      <QuantityStepper
                                        value={currentValue}
                                        onChange={(val) => handleLotQuantityChange(recipeItem.recipe_item_id, lote.id, val)}
                                        min={0}
                                        max={lote.quantity_remaining}
                                        step={stepValue}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

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

                        const orderedLotes = getOrderedLotes(recipeItem);

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

                              {/* Category insumo selector */}
                              {recipeItem.use_categorias && recipeItem.compatible_insumos && recipeItem.compatible_insumos.length > 1 && (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Seleccionar insumo:
                                  </label>
                                  <select
                                    value={recipeItem.insumo_id || ''}
                                    onChange={(e) => handleCategoryInsumoChange(recipeItem.recipe_item_id, e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    {recipeItem.compatible_insumos.map((insumo) => (
                                      <option key={insumo.id} value={insumo.id}>
                                        {insumo.name} ({insumo.total_stock} {unitLabels[insumo.unit_type as keyof typeof unitLabels]} disponibles)
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

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
              </>
            )}

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
