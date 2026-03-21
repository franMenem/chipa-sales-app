import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { UnitType, RecipeItemFormData } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { useCreateProducto, useUpdateProducto, useDeleteProducto } from '../../hooks/mutations/useProductosMutations';
import { useAllInsumos } from '../../hooks/queries/useInsumosQueries';
import { useCategorias } from '../../hooks/queries/useCategoriasQueries';
import { useToast } from '../../hooks/useToast';
import { useRecipeBuilder } from '../../hooks/domain/useRecipeBuilder';
import { calculateRecipeCost, hasCategoryItems, isRecipeEmpty } from '../../utils/recipeCalculations';
import { formatCurrency } from '../../utils/formatters';
import { RecipeModeTabs } from './RecipeModeTabs';
import { RecipeItemsList } from './RecipeItemsList';

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

  // Use custom hook for recipe builder logic
  const {
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
    reset: resetRecipe,
    setRecipeItems,
  } = useRecipeBuilder([]);

  // Track initialization to prevent infinite loops.
  // Uses 'CLOSED' sentinel so re-opening fresh (editData=undefined) always triggers reset.
  const prevEditIdRef = useRef<string>('CLOSED');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormData>({
    mode: 'onBlur', // Validate only on blur to reduce re-renders
    defaultValues: editData
      ? {
          name: editData.name,
        }
      : {
          name: '',
        },
  });

  // Calculate cost using utility function
  const calculatedCost = useMemo(() =>
    calculateRecipeCost(recipeItems, insumos),
    [recipeItems, insumos]
  );

  // Check if recipe has category items using utility function
  const hasCategoryItemsInRecipe = useMemo(() =>
    hasCategoryItems(recipeItems),
    [recipeItems]
  );

  // Reset form when modal opens/closes or edit data changes
  useEffect(() => {
    if (!isOpen) {
      prevEditIdRef.current = 'CLOSED';
      return;
    }

    const currentEditId = editData?.id ?? 'NEW';

    // Only initialize if edit ID changed (or opened fresh)
    if (prevEditIdRef.current !== currentEditId) {
      prevEditIdRef.current = currentEditId;

      if (editData) {
        reset({ name: editData.name });
        setRecipeItems(editData.recipe_items || []);
      } else {
        reset({ name: '' });
        resetRecipe();
      }
    }
  }, [isOpen, editData, reset, resetRecipe, setRecipeItems]);

  const handleAddInsumo = () => {
    try {
      if (!selectedInsumoId) return;
      addInsumo(selectedInsumoId);
      setSelectedInsumoId(''); // Limpiar selección después de agregar
      toast.success('Ingrediente agregado');
    } catch (error) {
      toast.warning('Insumo duplicado', (error as Error).message);
    }
  };

  const handleAddCategorias = () => {
    try {
      if (selectedCategorias.length === 0) return;
      addCategorias(selectedCategorias);
      setSelectedCategorias([]); // Limpiar selección después de agregar
      toast.success('Categorías agregadas');
    } catch (error) {
      toast.warning('Error', (error as Error).message);
    }
  };

  const onSubmit = async (data: ProductoFormData) => {
    if (isRecipeEmpty(recipeItems)) {
      toast.error('Receta vacía', 'Debes agregar al menos un ingrediente a la receta');
      return;
    }

    try {
      if (isEdit && editData) {
        await updateMutation.mutateAsync({
          id: editData.id,
          name: data.name,
          recipe_items: recipeItems,
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
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
          <RecipeModeTabs
            useCategoriasMode={useCategoriasMode}
            onChange={setUseCategoriasMode}
          />

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
            <RecipeItemsList
              items={recipeItems}
              insumos={insumos}
              categorias={categorias}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          )}

          {/* Cost Summary */}
          {recipeItems.length > 0 && (
            <>
              <Card className="bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Costo {hasCategoryItemsInRecipe ? 'estimado' : 'total'} de la receta:
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(calculatedCost)}
                  </span>
                </div>
              </Card>

              {hasCategoryItemsInRecipe && (
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
