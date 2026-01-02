import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UnitType } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useAllInsumos, useCreateInsumo } from '../../hooks/useInsumos';
import { useAddInsumoBatch } from '../../hooks/useInsumoLotes';
import { formatCurrency } from '../../utils/formatters';

interface AddInsumoBatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedInsumoId?: string;
}

interface FormData {
  insumo_id: string;
  new_insumo_name?: string;
  unit_type: UnitType;
  purchase_date: string;
  quantity_purchased: number;
  price_per_unit: number;
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

export function AddInsumoBatchForm({ isOpen, onClose, preselectedInsumoId }: AddInsumoBatchFormProps) {
  const { data: insumos = [] } = useAllInsumos();
  const createInsumoMutation = useCreateInsumo();
  const addBatchMutation = useAddInsumoBatch();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      insumo_id: preselectedInsumoId || '',
      unit_type: 'kg',
      purchase_date: new Date().toISOString().split('T')[0],
      quantity_purchased: 1,
      price_per_unit: 0,
    },
  });

  const insumoId = watch('insumo_id');
  const quantity = watch('quantity_purchased');
  const unitType = watch('unit_type');
  const pricePerUnit = watch('price_per_unit');

  // Auto-detect unit type from selected insumo
  useEffect(() => {
    if (insumoId && insumoId !== 'new') {
      const selectedInsumo = insumos.find(i => i.id === insumoId);
      if (selectedInsumo) {
        setValue('unit_type', selectedInsumo.unit_type);
      }
    }
  }, [insumoId, insumos, setValue]);

  // Calculate price per unit when quantity or total price changes
  useEffect(() => {
    if (quantity > 0 && totalPrice > 0) {
      const calculatedPrice = totalPrice / quantity;
      setValue('price_per_unit', calculatedPrice);
    }
  }, [quantity, totalPrice, setValue]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        insumo_id: preselectedInsumoId || '',
        unit_type: 'kg',
        purchase_date: new Date().toISOString().split('T')[0],
        quantity_purchased: 1,
        price_per_unit: 0,
      });
      setTotalPrice(0);
      setIsCreatingNew(false);
    }
  }, [isOpen, preselectedInsumoId, reset]);

  // Handle insumo selection change
  useEffect(() => {
    setIsCreatingNew(insumoId === 'new');
  }, [insumoId]);

  const onSubmit = async (data: FormData) => {
    try {
      let finalInsumoId = data.insumo_id;

      // Si es nuevo insumo, crearlo primero
      if (isCreatingNew && data.new_insumo_name) {
        const newInsumo = await createInsumoMutation.mutateAsync({
          name: data.new_insumo_name,
          unit_type: data.unit_type,
        });
        finalInsumoId = newInsumo.id;
      }

      // Agregar el lote
      await addBatchMutation.mutateAsync({
        insumo_id: finalInsumoId,
        purchase_date: data.purchase_date,
        quantity_purchased: data.quantity_purchased,
        price_per_unit: data.price_per_unit,
        unit_type: data.unit_type,
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

  // Prepare insumo options
  const insumoOptions = [
    { value: '', label: 'Seleccionar insumo...' },
    ...insumos.map(i => ({
      value: i.id,
      label: `${i.name} (${i.total_stock} ${unitLabels[i.unit_type]} disponibles)`,
    })),
    { value: 'new', label: '+ Crear nuevo insumo' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar Compra de Insumo"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            icon="add_shopping_cart"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Compra'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Seleccionar insumo existente o crear nuevo */}
        <Select
          label="Insumo"
          options={insumoOptions}
          {...register('insumo_id', { required: 'Selecciona un insumo' })}
        />

        {/* Si es nuevo insumo, mostrar campo de nombre */}
        {isCreatingNew && (
          <Input
            label="Nombre del nuevo insumo"
            placeholder="Ej: Harina de trigo"
            icon="new_label"
            {...register('new_insumo_name', {
              required: isCreatingNew ? 'Ingresa el nombre del insumo' : false
            })}
          />
        )}

        {/* Tipo de unidad (solo si es nuevo) */}
        {isCreatingNew && (
          <Select
            label="Tipo de unidad"
            options={unitOptions}
            {...register('unit_type')}
          />
        )}

        {/* Fecha de compra */}
        <Input
          label="Fecha de compra"
          type="date"
          icon="calendar_today"
          {...register('purchase_date', { required: 'Ingresa la fecha de compra' })}
        />

        {/* Cantidad comprada */}
        <Input
          label={`Cantidad comprada (${unitLabels[unitType]})`}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Ej: 5"
          icon="scale"
          helperText={`¿Cuántos ${unitLabels[unitType]} compraste?`}
          {...register('quantity_purchased', {
            valueAsNumber: true,
            required: 'Ingresa la cantidad',
            min: { value: 0.01, message: 'Debe ser mayor a 0' }
          })}
        />

        {/* Calculadora de precio */}
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

        {/* Precio directo (si no usó calculadora) */}
        {totalPrice === 0 && (
          <Input
            label={`Precio por ${unitLabels[unitType]}`}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            icon="payments"
            helperText={`O ingresa directamente el precio en guaraníes (₲) por cada ${unitLabels[unitType]}`}
            {...register('price_per_unit', {
              valueAsNumber: true,
              required: 'Ingresa el precio',
              min: { value: 0.01, message: 'Debe ser mayor a 0' }
            })}
          />
        )}

        {/* Info sobre LIFO */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
              info
            </span>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Esta compra se registrará como un lote independiente. El sistema usará los lotes más recientes primero (LIFO) al fabricar productos.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
