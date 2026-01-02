import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insumoSchema } from '../../utils/validators';
import type { UnitType } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useCreateInsumo } from '../../hooks/useInsumos';
// useUpdateInsumo removed - insumos no longer editable, use AddInsumoBatch instead
import { formatCurrency } from '../../utils/formatters';

interface InsumoFormProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: {
    id: string;
    name: string;
    price_per_unit: number;
    unit_type: UnitType;
    quantity: number;
  };
}

interface InsumoFormData {
  name: string;
  price_per_unit: number;
  unit_type: UnitType;
  quantity: number;
}

const unitOptions = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'unit', label: 'Unidades' },
];

const unitLabels: Record<UnitType, string> = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

export function InsumoForm({ isOpen, onClose, editData }: InsumoFormProps) {
  const isEdit = !!editData;
  const createMutation = useCreateInsumo();
  // const updateMutation = useUpdateInsumo(); // Removed - use AddInsumoBatch for adding stock
  
  const [totalPrice, setTotalPrice] = useState<number>(0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InsumoFormData>({
    resolver: zodResolver(insumoSchema),
    defaultValues: editData || {
      name: '',
      price_per_unit: 0,
      unit_type: 'kg',
      quantity: 1,
    },
  });

  const pricePerUnit = watch('price_per_unit');
  const quantity = watch('quantity');
  const unitType = watch('unit_type');

  // Reset form when modal opens/closes or edit data changes
  useEffect(() => {
    if (isOpen) {
      reset(editData || {
        name: '',
        price_per_unit: 0,
        unit_type: 'kg',
        quantity: 1,
      });
      setTotalPrice(editData ? editData.price_per_unit * editData.quantity : 0);
    }
  }, [isOpen, editData, reset]);

  // Calculate price per unit when quantity or total price changes
  useEffect(() => {
    if (quantity > 0 && totalPrice > 0) {
      const calculatedPrice = totalPrice / quantity;
      setValue('price_per_unit', calculatedPrice);
    }
  }, [quantity, totalPrice, setValue]);

  const onSubmit = async (data: InsumoFormData) => {
    try {
      if (isEdit) {
        // Edit mode disabled - use AddInsumoBatch to add new purchase
        console.warn('Edit mode is disabled. Use AddInsumoBatch instead');
        onClose();
        return;
      }
      await createMutation.mutateAsync(data);
      onClose();
    } catch (error) {
      // Error handled by mutation
      console.error(error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Editar Insumo' : 'Nuevo Insumo'}
      size="md"
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
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar' : 'Agregar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nombre del insumo"
          placeholder="Ej: Harina de trigo"
          icon="inventory_2"
          error={errors.name?.message}
          {...register('name')}
        />

        <Select
          label="Tipo de unidad"
          options={unitOptions}
          error={errors.unit_type?.message}
          {...register('unit_type')}
        />

        <Input
          label={`Cantidad de ${unitLabels[unitType] || 'unidades'} compradas`}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Ej: 5"
          icon="scale"
          error={errors.quantity?.message}
          helperText={`¿Cuántos ${unitLabels[unitType]} compraste?`}
          {...register('quantity', { valueAsNumber: true })}
        />

        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[20px]">
              calculate
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Calcular precio por unidad
            </p>
          </div>

          <Input
            label="Precio total de la compra"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            icon="payments"
            helperText="Precio total que pagaste en guaraníes (₲)"
            value={totalPrice}
            onChange={(e) => setTotalPrice(Number(e.target.value))}
          />

          {quantity > 0 && totalPrice > 0 && (
            <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900 rounded-lg p-3">
              <p className="text-xs text-primary-600 dark:text-primary-400 mb-1">
                Precio calculado por {unitLabels[unitType]}:
              </p>
              <p className="text-lg font-bold text-primary-700 dark:text-primary-300">
                {formatCurrency(pricePerUnit)} / {unitLabels[unitType]}
              </p>
            </div>
          )}
        </div>

        {totalPrice === 0 && (
          <Input
            label={`Precio por ${unitLabels[unitType] || 'unidad'}`}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            icon="payments"
            error={errors.price_per_unit?.message}
            helperText={`O ingresa directamente el precio en guaraníes (₲) por cada ${unitLabels[unitType]}`}
            {...register('price_per_unit', { valueAsNumber: true })}
          />
        )}

        {isEdit && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
            <div className="flex gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
                info
              </span>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Al actualizar el precio, todos los productos que usan este insumo recalcularán su costo automáticamente.
              </p>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
