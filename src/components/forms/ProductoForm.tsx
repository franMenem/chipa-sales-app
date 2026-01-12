import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { UnitType, RecipeItemFormData } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { QuantityStepper } from '../ui/QuantityStepper';
import { useCreateProducto, useUpdateProducto, useDeleteProducto } from '../../hooks/useProductos';
import { useAllInsumos } from '../../hooks/useInsumos';
import { useCategorias } from '../../hooks/useCategorias';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';

interface ProductoFormProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: {
    id: string;
    name: string;
    recipe_items: RecipeItemFormData[];
  };
}

interface ProductoFormData {
  name: string;
}

const unitLabels: Record<UnitType, string> = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

export function ProductoForm({ isOpen, onClose, editData }: ProductoFormProps) {
  const isEdit = !!editData;
  const createMutation = useCreateProducto();
  const updateMutation = useUpdateProducto();
  const deleteMutation = useDeleteProducto();
  const { data: insumos = [] } = useAllInsumos();
  const { data: categorias = [] } = useCategorias();
  const toast = useToast();

  const [recipeItems, setRecipeItems] = useState<RecipeItemFormData[]>(
    editData?.recipe_items || []
  );
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>('');
  const [useCategoriasMode, setUseCategoriasMode] = useState<boolean>(false);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormData>({
    defaultValues: editData
      ? {
          name: editData.name,
        }
      : {
          name: '',
        },
  });

  // Calculate current cost based on recipe (only for reference/display)
  const calculatedCost = useMemo(() => {
    return recipeItems.reduce((total, item) => {
      // Skip category-based items (no cost until fabrication)
      if (item.use_categorias) return total;

      const insumo = insumos.find((i) => i.id === item.insumo_id);
      if (!insumo) return total;
      return total + item.quantity_in_base_units * (insumo.current_price_per_unit || 0);
    }, 0);
  }, [recipeItems, insumos]);

  // Check if recipe has any category-based items
  const hasCategoryItems = useMemo(() => {
    return recipeItems.some(item => item.use_categorias);
  }, [recipeItems]);

  // Reset form when modal opens/closes or edit data changes
  useEffect(() => {
    if (isOpen) {
      reset(
        editData
          ? {
              name: editData.name,
            }
          : {
              name: '',
            }
      );
      setRecipeItems(editData?.recipe_items || []);
      setSelectedInsumoId('');
      setUseCategoriasMode(false);
      setSelectedCategorias([]);
    } else {
      // Reset when closing
      reset({
        name: '',
      });
      setRecipeItems([]);
      setSelectedInsumoId('');
      setUseCategoriasMode(false);
      setSelectedCategorias([]);
    }
  }, [isOpen, editData?.id, reset]);

  const handleAddInsumo = () => {
    if (!selectedInsumoId) return;

    // Check if insumo already exists in recipe
    const exists = recipeItems.some((item) => item.insumo_id === selectedInsumoId);
    if (exists) {
      toast.warning('Insumo duplicado', 'Este insumo ya está en la receta');
      return;
    }

    setRecipeItems([
      ...recipeItems,
      {
        insumo_id: selectedInsumoId,
        quantity_in_base_units: 1,
        use_categorias: false,
      },
    ]);
    setSelectedInsumoId('');
  };

  const handleAddCategorias = () => {
    if (selectedCategorias.length === 0) {
      toast.warning('Selecciona categorías', 'Debes seleccionar al menos una categoría');
      return;
    }

    setRecipeItems([
      ...recipeItems,
      {
        insumo_id: null,
        quantity_in_base_units: 1,
        use_categorias: true,
        required_categoria_ids: selectedCategorias,
      },
    ]);
    setSelectedCategorias([]);
  };

  const handleRemoveItem = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setRecipeItems(
      recipeItems.map((item, i) =>
        i === index
          ? { ...item, quantity_in_base_units: quantity }
          : item
      )
    );
  };

  const onSubmit = async (data: ProductoFormData) => {
    if (recipeItems.length === 0) {
      toast.error('Receta vacía', 'Debes agregar al menos un ingrediente a la receta');
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: editData.id,
          ...data,
          recipe_items: recipeItems,
        });
      } else {
        await createMutation.mutateAsync({
          ...data,
          recipe_items: recipeItems,
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !deleteMutation.isPending) {
      onClose();
    }
  };

  const handleDeleteProducto = async () => {
    if (!editData) return;
    const confirmMessage = `¿Estás seguro de que quieres eliminar "${editData.name}"?\n\nEsta acción eliminará la receta.\n\nEsta acción NO se puede deshacer.`;

    if (window.confirm(confirmMessage)) {
      try {
        await deleteMutation.mutateAsync(editData.id);
        onClose();
      } catch (error) {
        console.error('Error deleting producto:', error);
      }
    }
  };

  const availableInsumos = insumos.filter(
    (insumo) => !recipeItems.some((item) => item.insumo_id === insumo.id)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Editar Receta' : 'Nueva Receta'}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-2 sm:gap-0">
          {isEdit ? (
            <Button
              variant="ghost"
              onClick={handleDeleteProducto}
              disabled={isSubmitting || deleteMutation.isPending}
              icon="delete"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 order-3 sm:order-1"
              fullWidth
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex gap-2 order-1 sm:order-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting || deleteMutation.isPending}
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || deleteMutation.isPending}
              icon={isEdit ? 'save' : 'add'}
              fullWidth
            >
              {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Información básica
          </h3>
          <Input
            label="Nombre de la receta"
            placeholder="Ej: Chipa tradicional x12"
            icon="bakery_dining"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        {/* Recipe Builder */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Receta</h3>

          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setUseCategoriasMode(false)}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                !useCategoriasMode
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="hidden xs:inline">Ingrediente específico</span>
              <span className="xs:hidden">Específico</span>
            </button>
            <button
              type="button"
              onClick={() => setUseCategoriasMode(true)}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                useCategoriasMode
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Por categoría
            </button>
          </div>

          {/* Add Ingredient - Specific Mode */}
          {!useCategoriasMode && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0">
                <Select
                  options={[
                    { value: '', label: 'Seleccionar ingrediente...' },
                    ...availableInsumos.map((insumo) => ({
                      value: insumo.id,
                      label: `${insumo.name} (${formatCurrency(insumo.current_price_per_unit || 0)}/${unitLabels[insumo.unit_type]})`,
                    })),
                  ]}
                  value={selectedInsumoId}
                  onChange={(e) => setSelectedInsumoId(e.target.value)}
                  placeholder="Seleccionar ingrediente..."
                />
              </div>
              <Button
                type="button"
                onClick={handleAddInsumo}
                disabled={!selectedInsumoId}
                icon="add"
                className="sm:flex-shrink-0"
              >
                Agregar
              </Button>
            </div>
          )}

          {/* Add Ingredient - Category Mode */}
          {useCategoriasMode && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Selecciona una o más categorías. Al fabricar, podrás elegir cualquier insumo que tenga TODAS estas categorías.
              </p>
              <div className="flex flex-wrap gap-2">
                {categorias.map((categoria) => {
                  const isSelected = selectedCategorias.includes(categoria.id);
                  return (
                    <button
                      key={categoria.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCategorias(prev => prev.filter(id => id !== categoria.id));
                        } else {
                          setSelectedCategorias(prev => [...prev, categoria.id]);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation ${
                        isSelected
                          ? 'bg-primary/20 text-primary border-2 border-primary'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div
                        className="w-3 h-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: categoria.color }}
                      />
                      <span className="truncate">{categoria.name}</span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[16px] flex-shrink-0">check</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                onClick={handleAddCategorias}
                disabled={selectedCategorias.length === 0}
                icon="add"
                className="w-full"
              >
                Agregar ingrediente por categoría
              </Button>
            </div>
          )}

          {/* Recipe Items List */}
          {recipeItems.length === 0 ? (
            <Card>
              <div className="text-center py-6">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-4xl mb-2">
                  recipe_long
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Agrega ingredientes a la receta
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {recipeItems.map((item, index) => {
                // Category-based item
                if (item.use_categorias && item.required_categoria_ids) {
                  const itemCategorias = categorias.filter(c =>
                    item.required_categoria_ids?.includes(c.id)
                  );

                  // Determine unit label based on categories
                  const categoryUnit = itemCategorias.length === 1
                    ? unitLabels[itemCategorias[0].unit_type]
                    : 'unidad(es)';

                  return (
                    <Card key={`cat-${index}`} className="border-2 border-primary/30">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">
                              category
                            </span>
                            <h4 className="font-medium text-slate-900 dark:text-white">
                              Ingrediente por categoría
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {itemCategorias.map(cat => (
                              <span
                                key={cat.id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                {cat.name}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                            Se elegirá el insumo al fabricar
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                              Cantidad ({categoryUnit})
                            </label>
                            <QuantityStepper
                              value={item.quantity_in_base_units}
                              onChange={(val) => handleQuantityChange(index, val)}
                              min={0.1}
                              step={itemCategorias.length === 1 && itemCategorias[0].unit_type === 'unit' ? 1 : 0.1}
                            />
                          </div>
                          <div className="pt-5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon="delete"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 dark:text-red-400"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                }

                // Specific insumo item
                const insumo = insumos.find((i) => i.id === item.insumo_id);
                if (!insumo) return null;

                const itemCost = item.quantity_in_base_units * (insumo.current_price_per_unit || 0);

                return (
                  <Card key={`insumo-${item.insumo_id}`}>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-white">
                          {insumo.name}
                        </h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                          Costo: {formatCurrency(itemCost)} ({formatCurrency(insumo.current_price_per_unit || 0)}/
                          {unitLabels[insumo.unit_type]}
                          )
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            Cantidad
                          </label>
                          <QuantityStepper
                            value={item.quantity_in_base_units}
                            onChange={(val) => handleQuantityChange(index, val)}
                            min={0.1}
                            step={0.1}
                          />
                        </div>
                        <div className="pt-5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon="delete"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 dark:text-red-400"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Cost Summary */}
          {recipeItems.length > 0 && (
            <>
              <Card className="bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Costo {hasCategoryItems ? 'estimado' : 'total'} de la receta:
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(calculatedCost)}
                  </span>
                </div>
              </Card>

              {hasCategoryItems && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px] mt-0.5">
                      info
                    </span>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Esta receta incluye ingredientes por categoría. El costo exacto se calculará al fabricar, cuando selecciones los insumos específicos.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Cost estimation */}
        {calculatedCost > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
                info
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Costo estimado actual: {formatCurrency(calculatedCost)}/unidad
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Este es un costo de referencia. El costo real y precio de venta se configurarán al fabricar el stock.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
