import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productoBaseSchema } from '../../utils/validators';
import type { UnitType } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { QuantityStepper } from '../ui/QuantityStepper';
import { useCreateProducto, useUpdateProducto } from '../../hooks/useProductos';
import { useInsumos } from '../../hooks/useInsumos';
import { formatCurrency } from '../../utils/formatters';
import { calculateSuggestedPrice } from '../../utils/calculations';

interface RecipeItemInput {
  insumo_id: string;
  quantity_in_base_units: number;
}

interface ProductoFormProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: {
    id: string;
    name: string;
    price_sale: number;
    margin_goal?: number | null;
    recipe_items: RecipeItemInput[];
  };
}

interface ProductoFormData {
  name: string;
  price_sale: number;
  margin_goal?: number | null;
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
  const { data: insumos = [] } = useInsumos();

  const [recipeItems, setRecipeItems] = useState<RecipeItemInput[]>(
    editData?.recipe_items || []
  );
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoBaseSchema),
    defaultValues: editData
      ? {
          name: editData.name,
          price_sale: editData.price_sale,
          margin_goal: editData.margin_goal || 0,
        }
      : {
          name: '',
          price_sale: 0,
          margin_goal: 50,
        },
  });

  const marginGoal = watch('margin_goal');
  const priceSale = watch('price_sale');

  // Calculate current cost based on recipe
  const calculatedCost = useMemo(() => {
    return recipeItems.reduce((total, item) => {
      const insumo = insumos.find((i) => i.id === item.insumo_id);
      if (!insumo) return total;
      return total + item.quantity_in_base_units * insumo.base_unit_cost;
    }, 0);
  }, [recipeItems, insumos]);

  // Calculate suggested price
  const suggestedPrice = useMemo(() => {
    if (calculatedCost === 0 || !marginGoal) return 0;
    return calculateSuggestedPrice(calculatedCost, marginGoal);
  }, [calculatedCost, marginGoal]);

  // Calculate actual margin
  const actualMargin = useMemo(() => {
    if (priceSale === 0 || calculatedCost === 0) return 0;
    return ((priceSale - calculatedCost) / priceSale) * 100;
  }, [priceSale, calculatedCost]);

  // Reset form when modal opens/closes or edit data changes
  useEffect(() => {
    if (isOpen) {
      reset(
        editData
          ? {
              name: editData.name,
              price_sale: editData.price_sale,
              margin_goal: editData.margin_goal || 0,
            }
          : {
              name: '',
              price_sale: 0,
              margin_goal: 50,
            }
      );
      setRecipeItems(editData?.recipe_items || []);
      setSelectedInsumoId('');
    }
  }, [isOpen, editData, reset]);

  const handleAddInsumo = () => {
    if (!selectedInsumoId) return;

    // Check if insumo already exists in recipe
    const exists = recipeItems.some((item) => item.insumo_id === selectedInsumoId);
    if (exists) {
      alert('Este insumo ya está en la receta');
      return;
    }

    setRecipeItems([
      ...recipeItems,
      {
        insumo_id: selectedInsumoId,
        quantity_in_base_units: 1,
      },
    ]);
    setSelectedInsumoId('');
  };

  const handleRemoveInsumo = (insumoId: string) => {
    setRecipeItems(recipeItems.filter((item) => item.insumo_id !== insumoId));
  };

  const handleQuantityChange = (insumoId: string, quantity: number) => {
    setRecipeItems(
      recipeItems.map((item) =>
        item.insumo_id === insumoId
          ? { ...item, quantity_in_base_units: quantity }
          : item
      )
    );
  };

  const handleUseSuggestedPrice = () => {
    setValue('price_sale', Math.round(suggestedPrice));
  };

  const onSubmit = async (data: ProductoFormData) => {
    if (recipeItems.length === 0) {
      alert('Debes agregar al menos un ingrediente a la receta');
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
    if (!isSubmitting) {
      onClose();
    }
  };

  const availableInsumos = insumos.filter(
    (insumo) => !recipeItems.some((item) => item.insumo_id === insumo.id)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Editar Producto' : 'Nuevo Producto'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            icon={isEdit ? 'save' : 'add'}
          >
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Información básica
          </h3>
          <Input
            label="Nombre del producto"
            placeholder="Ej: Chipa tradicional x12"
            icon="bakery_dining"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        {/* Recipe Builder */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Receta</h3>

          {/* Add Ingredient */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                options={[
                  { value: '', label: 'Seleccionar ingrediente...' },
                  ...availableInsumos.map((insumo) => ({
                    value: insumo.id,
                    label: `${insumo.name} (${formatCurrency(insumo.base_unit_cost)}/${
                      unitLabels[insumo.unit_type] === 'kg' || unitLabels[insumo.unit_type] === 'L'
                        ? 'g o ml'
                        : 'ud'
                    })`,
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
            >
              Agregar
            </Button>
          </div>

          {/* Recipe Items List */}
          {recipeItems.length === 0 ? (
            <Card>
              <div className="text-center py-6">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-4xl mb-2">
                  recipe_long
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Agrega ingredientes a la receta
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {recipeItems.map((item) => {
                const insumo = insumos.find((i) => i.id === item.insumo_id);
                if (!insumo) return null;

                const itemCost = item.quantity_in_base_units * insumo.base_unit_cost;

                return (
                  <Card key={item.insumo_id}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 dark:text-white truncate">
                          {insumo.name}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {formatCurrency(itemCost)} (
                          {formatCurrency(insumo.base_unit_cost)}/
                          {unitLabels[insumo.unit_type] === 'kg' ||
                          unitLabels[insumo.unit_type] === 'L'
                            ? 'g o ml'
                            : 'ud'}
                          )
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <QuantityStepper
                          value={item.quantity_in_base_units}
                          onChange={(val) => handleQuantityChange(item.insumo_id, val)}
                          min={0.1}
                          step={0.1}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon="delete"
                          onClick={() => handleRemoveInsumo(item.insumo_id)}
                          className="text-red-600 dark:text-red-400"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Cost Summary */}
          {recipeItems.length > 0 && (
            <Card className="bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Costo total del producto:
                </span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(calculatedCost)}
                </span>
              </div>
            </Card>
          )}
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Precio</h3>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Margen objetivo (%)"
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="50"
              icon="percent"
              error={errors.margin_goal?.message}
              {...register('margin_goal', { valueAsNumber: true })}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Precio sugerido
              </label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300 font-semibold">
                  {formatCurrency(suggestedPrice)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon="check"
                  onClick={handleUseSuggestedPrice}
                  disabled={suggestedPrice === 0}
                >
                  Usar
                </Button>
              </div>
            </div>
          </div>

          <Input
            label="Precio de venta"
            type="number"
            step="1"
            min="0"
            placeholder="0"
            icon="payments"
            error={errors.price_sale?.message}
            helperText={`Margen real: ${actualMargin.toFixed(1)}%`}
            {...register('price_sale', { valueAsNumber: true })}
          />
        </div>
      </form>
    </Modal>
  );
}
