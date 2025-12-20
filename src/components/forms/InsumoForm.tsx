import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insumoSchema } from '../../utils/validators';
import type { UnitType } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useCreateInsumo, useUpdateInsumo } from '../../hooks/useInsumos';

interface InsumoFormProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: {
    id: string;
    name: string;
    price_per_unit: number;
    unit_type: UnitType;
  };
}

interface InsumoFormData {
  name: string;
  price_per_unit: number;
  unit_type: UnitType;
}

const unitOptions = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'unit', label: 'Unidades' },
];

export function InsumoForm({ isOpen, onClose, editData }: InsumoFormProps) {
  const isEdit = !!editData;
  const createMutation = useCreateInsumo();
  const updateMutation = useUpdateInsumo();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InsumoFormData>({
    resolver: zodResolver(insumoSchema),
    defaultValues: editData || {
      name: '',
      price_per_unit: 0,
      unit_type: 'kg',
    },
  });

  // Reset form when modal opens/closes or edit data changes
  useEffect(() => {
    if (isOpen) {
      reset(editData || {
        name: '',
        price_per_unit: 0,
        unit_type: 'kg',
      });
    }
  }, [isOpen, editData, reset]);

  const onSubmit = async (data: InsumoFormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: editData.id,
          ...data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
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

        <Input
          label="Precio por unidad"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          icon="payments"
          error={errors.price_per_unit?.message}
          helperText="Precio en guaraníes (₲)"
          {...register('price_per_unit', { valueAsNumber: true })}
        />

        <Select
          label="Tipo de unidad"
          options={unitOptions}
          error={errors.unit_type?.message}
          {...register('unit_type')}
        />

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
