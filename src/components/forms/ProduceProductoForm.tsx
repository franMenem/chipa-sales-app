import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { useProductos } from '../../hooks/useProductos';
import { useProduceProductoCustomOrder } from '../../hooks/useProduction';
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
  insumo_id: string;
  insumo_name: string;
  unit_type: string;
  quantity_needed: number;
  lotes: InsumoLote[];
}

const unitLabels = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

export function ProduceProductoForm({ isOpen, onClose, preselectedProductoId }: ProduceProductoFormProps) {
  const { data: productos = [] } = useProductos();
  const produceMutation = useProduceProductoCustomOrder();

  const [selectedProducto, setSelectedProducto] = useState<any>(null);
  const [recipeWithLotes, setRecipeWithLotes] = useState<RecipeItemWithLotes[]>([]);
  const [loteOrder, setLoteOrder] = useState<Record<string, string[]>>({});
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

        // For each insumo, get available lotes
        const recipeWithLotesData = await Promise.all(
          (recipeItems || []).map(async (item) => {
            const { data: lotes, error: lotesError } = await supabase
              .from('insumo_lotes')
              .select('*')
              .eq('insumo_id', item.insumo_id)
              .gt('quantity_remaining', 0)
              .order('purchase_date', { ascending: false })
              .order('created_at', { ascending: false });

            if (lotesError) throw lotesError;

            return {
              insumo_id: item.insumo_id,
              insumo_name: item.insumo.name,
              unit_type: item.insumo.unit_type,
              quantity_needed: item.quantity_in_base_units,
              lotes: lotes || [],
            };
          })
        );

        setRecipeWithLotes(recipeWithLotesData);

        // Initialize lote order with default LIFO order
        const initialOrder: Record<string, string[]> = {};
        recipeWithLotesData.forEach((item) => {
          initialOrder[item.insumo_id] = item.lotes.map(l => l.id);
        });
        setLoteOrder(initialOrder);
      } catch (error) {
        console.error('Error loading recipe and lotes:', error);
      } finally {
        setIsLoadingRecipe(false);
      }
    };

    loadRecipeAndLotes();
  }, [productoId, productos]);

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
    try {
      await produceMutation.mutateAsync({
        producto_id: data.producto_id,
        quantity: data.quantity,
        lote_order: loteOrder,
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

  // Move lote up in order
  const moveLoteUp = (insumoId: string, loteIndex: number) => {
    if (loteIndex === 0) return; // Already at top

    setLoteOrder(prev => {
      const newOrder = { ...prev };
      const lotes = [...newOrder[insumoId]];
      [lotes[loteIndex - 1], lotes[loteIndex]] = [lotes[loteIndex], lotes[loteIndex - 1]];
      newOrder[insumoId] = lotes;
      return newOrder;
    });
  };

  // Move lote down in order
  const moveLoteDown = (insumoId: string, loteIndex: number) => {
    const lotes = loteOrder[insumoId];
    if (loteIndex === lotes.length - 1) return; // Already at bottom

    setLoteOrder(prev => {
      const newOrder = { ...prev };
      const lotes = [...newOrder[insumoId]];
      [lotes[loteIndex], lotes[loteIndex + 1]] = [lotes[loteIndex + 1], lotes[loteIndex]];
      newOrder[insumoId] = lotes;
      return newOrder;
    });
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
            disabled={isSubmitting || !selectedProducto?.has_sufficient_ingredients}
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
        if (!isSubmitting && selectedProducto?.has_sufficient_ingredients) {
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
                        const orderedLotes = (loteOrder[recipeItem.insumo_id] || [])
                          .map(loteId => recipeItem.lotes.find(l => l.id === loteId))
                          .filter(Boolean) as InsumoLote[];

                        return (
                          <Card key={recipeItem.insumo_id}>
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">
                                  {recipeItem.insumo_name}
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  Necesario: {recipeItem.quantity_needed * quantity} {unitLabels[recipeItem.unit_type as keyof typeof unitLabels]}
                                </p>
                              </div>

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
