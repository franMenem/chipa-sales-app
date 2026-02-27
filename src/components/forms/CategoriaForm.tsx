import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { CreateCategoriaFormData, Categoria } from '../../lib/types';
import { useCreateCategoria, useUpdateCategoria } from '../../hooks/mutations/useCategoriasMutations';

interface CategoriaFormProps {
  isOpen: boolean;
  onClose: () => void;
  categoria?: Categoria | null; // For edit mode
}

const defaultColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

const unitOptions = [
  { value: 'g', label: 'Gramos (g) - para ingredientes sólidos' },
  { value: 'kg', label: 'Kilogramos (kg) - para ingredientes sólidos' },
  { value: 'ml', label: 'Mililitros (ml) - para líquidos' },
  { value: 'l', label: 'Litros (l) - para líquidos' },
  { value: 'unit', label: 'Unidades - para items contables' },
];

export function CategoriaForm({ isOpen, onClose, categoria }: CategoriaFormProps) {
  const createMutation = useCreateCategoria();
  const updateMutation = useUpdateCategoria();
  const isEditMode = !!categoria;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoriaFormData>({
    defaultValues: {
      name: '',
      color: '#3B82F6',
      unit_type: 'g',
    },
  });

  const selectedColor = watch('color');

  // Reset form when modal opens/closes or categoria changes
  useEffect(() => {
    if (isOpen) {
      if (categoria) {
        reset({
          name: categoria.name,
          color: categoria.color || '#3B82F6',
          unit_type: categoria.unit_type || 'g',
        });
      } else {
        reset({
          name: '',
          color: '#3B82F6',
          unit_type: 'g',
        });
      }
    }
  }, [isOpen, categoria, reset]);

  const onSubmit = async (data: CreateCategoriaFormData) => {
    try {
      if (isEditMode && categoria) {
        await updateMutation.mutateAsync({
          id: categoria.id,
          data,
        });
      } else {
        await createMutation.mutateAsync(data);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Editar Categoría' : 'Nueva Categoría'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            icon="save"
          >
            {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nombre */}
        <Input
          label="Nombre de la categoría"
          placeholder="Ej: Quesos tipo duro, Harinas, Mantecas..."
          error={errors.name?.message}
          icon="category"
          {...register('name', {
            required: 'El nombre es requerido',
            minLength: { value: 2, message: 'Mínimo 2 caracteres' },
            maxLength: { value: 100, message: 'Máximo 100 caracteres' },
          })}
        />

        {/* Tipo de unidad */}
        <Select
          label="Tipo de unidad"
          options={unitOptions}
          {...register('unit_type')}
        />

        {/* Color picker */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Color (opcional)
          </label>

          {/* Preset colors */}
          <div className="grid grid-cols-8 gap-2 mb-3">
            {defaultColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('color', color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color
                    ? 'border-slate-900 dark:border-white scale-110'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>

          {/* Custom color input */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              {...register('color')}
              className="w-12 h-10 rounded border border-slate-300 dark:border-slate-600 cursor-pointer"
            />
            <Input
              type="text"
              placeholder="#3B82F6"
              {...register('color')}
              className="flex-1"
            />
          </div>

          {/* Preview */}
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Vista previa:</p>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: selectedColor }}
              />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {watch('name') || 'Nombre de categoría'}
              </span>
            </div>
          </div>
        </div>

        {/* Helper text */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px] mt-0.5">
              info
            </span>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Las categorías te permiten agrupar insumos similares. Por ejemplo: "Quesos tipo duro" puede incluir Parmeggiano, Provolone, etc.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
