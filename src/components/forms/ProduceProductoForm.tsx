import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useProductos } from '../../hooks/queries/useProductosQueries';
import { useProduceProductoCustomOrder } from '../../hooks/useProduction';
import { useToast } from '../../hooks/useToast';
import { DEFAULT_MARGIN_PERCENTAGE } from '../../lib/constants';
import { useRecipeWithLotes } from '../../hooks/production/useRecipeWithLotes';
import { useLotSelection } from '../../hooks/production/useLotSelection';
import { useCategoryInsumoSelection } from '../../hooks/production/useCategoryInsumoSelection';
import { CategoryInsumoSelector } from './production/CategoryInsumoSelector';
import { RegularLotCard, CategoryLotCard } from './production/LotSelectionCard';
import { LoteOrderAdvanced } from './production/LoteOrderAdvanced';
import { ProductionCostSummary } from './production/ProductionCostSummary';

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

export function ProduceProductoForm({ isOpen, onClose, preselectedProductoId }: ProduceProductoFormProps) {
  const { data: productos = [] } = useProductos();
  const produceMutation = useProduceProductoCustomOrder();
  const toast = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      margin_percentage: DEFAULT_MARGIN_PERCENTAGE,
      price_sale: 0,
    },
  });

  const productoId = watch('producto_id');
  const quantity = watch('quantity');
  const marginPercentage = watch('margin_percentage');
  const priceSale = watch('price_sale');

  // --- Hooks ---
  const {
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
  } = useRecipeWithLotes(productoId, productos);

  const {
    lotSelections,
    setLotSelections,
    selectionStatus,
    hasSelectionErrors,
    dynamicCostCalculation,
    handleLotQuantityChange,
    handleUseAllFromLot,
    resetSelectionsForItem,
    buildLotSelectionsPayload,
  } = useLotSelection({
    recipeWithLotes,
    quantity,
    loteOrder,
    selectedProducto,
    getOrderedLotesFromMap,
  });

  const {
    selectedCategoryInsumos,
    setSelectedCategoryInsumos,
    handleCategoryInsumoToggle,
  } = useCategoryInsumoSelection({
    recipeWithLotes,
    setRecipeWithLotes,
    setLoteOrder,
    setLotSelections,
    quantity,
  });

  // --- Effects ---
  useEffect(() => {
    if (isOpen) {
      reset({
        producto_id: preselectedProductoId || '',
        quantity: 1,
        margin_percentage: DEFAULT_MARGIN_PERCENTAGE,
        price_sale: 0,
      });
      setShowAdvanced(false);
      setSelectedCategoryInsumos({});
    }
  }, [isOpen, preselectedProductoId, reset, setSelectedCategoryInsumos]);

  // Auto-calculate suggested price when margin or cost changes
  useEffect(() => {
    if (!selectedProducto || marginPercentage < 0 || marginPercentage > 100) return;

    const costUnit =
      dynamicCostCalculation.costPerUnit > 0
        ? dynamicCostCalculation.costPerUnit
        : selectedProducto.cost_unit || 0;
    if (costUnit <= 0) return;

    const suggestedPrice = costUnit * (1 + marginPercentage / 100);
    setValue('price_sale', Number(suggestedPrice.toFixed(2)));
  }, [selectedProducto, marginPercentage, dynamicCostCalculation.costPerUnit, setValue]);

  // --- Handlers ---
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
      await produceMutation.mutateAsync({
        producto_id: data.producto_id,
        quantity: data.quantity,
        margin_percentage: data.margin_percentage,
        price_sale: data.price_sale,
        lote_order: loteOrder,
        lot_selections: buildLotSelectionsPayload(),
      });
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  // --- Derived ---
  const productoOptions = [
    { value: '', label: 'Seleccionar producto...' },
    ...productos.map(p => ({
      value: p.id,
      label: `${p.name} (Stock: ${p.finished_stock} unidades)`,
    })),
  ];

  const isSubmitDisabled =
    isSubmitting ||
    !selectedProducto?.has_sufficient_ingredients ||
    hasSelectionErrors ||
    recipeWithLotes.length === 0;

  const hasCategoryItems = recipeWithLotes.some(
    item => item.use_categorias && item.compatible_insumos && item.compatible_insumos.length > 0
  );

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
        if (!isSubmitDisabled) {
          handleSubmit(onSubmit)(e);
        }
      }} className="space-y-4">
        <Select
          label="Producto a fabricar"
          options={productoOptions}
          {...register('producto_id', { required: 'Selecciona un producto' })}
        />

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

            <ProductionCostSummary
              costPerUnit={dynamicCostCalculation.costPerUnit}
              totalCost={dynamicCostCalculation.totalCost}
              priceSale={priceSale}
              marginPercentage={marginPercentage}
              quantity={quantity}
            />

            {/* Ingredient status */}
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

            {/* Category ingredient selector */}
            {hasCategoryItems && (
              <CategoryInsumoSelector
                recipeWithLotes={recipeWithLotes}
                selectedCategoryInsumos={selectedCategoryInsumos}
                onToggle={handleCategoryInsumoToggle}
                quantity={quantity}
              />
            )}

            {/* Lot selection per ingredient */}
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

              {/* Regular ingredients */}
              {recipeWithLotes
                .filter(item => !item.use_categorias && item.insumo_id)
                .map((recipeItem) => (
                  <RegularLotCard
                    key={`lot-${recipeItem.recipe_item_id}`}
                    recipeItem={recipeItem}
                    lotSelections={lotSelections}
                    status={selectionStatus[recipeItem.recipe_item_id]}
                    quantity={quantity}
                    getOrderedLotes={getOrderedLotes}
                    onLotQuantityChange={handleLotQuantityChange}
                    onUseAllFromLot={handleUseAllFromLot}
                    onResetSelections={resetSelectionsForItem}
                  />
                ))}

              {/* Category-based ingredients */}
              {recipeWithLotes
                .filter(item => item.use_categorias && item.selected_insumos && item.selected_insumos.length > 0)
                .map((recipeItem) => (
                  <CategoryLotCard
                    key={`cat-lot-${recipeItem.recipe_item_id}`}
                    recipeItem={recipeItem}
                    lotSelections={lotSelections}
                    status={selectionStatus[recipeItem.recipe_item_id]}
                    quantity={quantity}
                    loteOrder={loteOrder}
                    onLotQuantityChange={handleLotQuantityChange}
                    onUseAllFromLot={handleUseAllFromLot}
                  />
                ))}
            </div>

            {/* Advanced lote reorder */}
            <LoteOrderAdvanced
              show={showAdvanced}
              onToggle={() => setShowAdvanced(!showAdvanced)}
              recipeWithLotes={recipeWithLotes}
              getOrderedLotes={getOrderedLotes}
              onMoveLoteUp={moveLoteUp}
              onMoveLoteDown={moveLoteDown}
              quantity={quantity}
            />

            {/* LIFO info */}
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
