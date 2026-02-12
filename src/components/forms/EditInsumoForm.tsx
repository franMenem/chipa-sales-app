import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useUpdateInsumo, useDeleteInsumo } from '../../hooks/useInsumos';
import { useCategorias } from '../../hooks/useCategorias';
import type { Insumo } from '../../lib/types';

interface EditInsumoFormProps {
  isOpen: boolean;
  onClose: () => void;
  insumo: Insumo | null;
}

interface FormData {
  name: string;
  description?: string;
}

export function EditInsumoForm({ isOpen, onClose, insumo }: EditInsumoFormProps) {
  const { data: categorias = [] } = useCategorias();
  const updateMutation = useUpdateInsumo();
  const deleteMutation = useDeleteInsumo();
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>();

  // Reset form when modal opens/closes or insumo changes
  /* eslint-disable react-hooks/set-state-in-effect -- Syncing props to local state for form reset */
  useEffect(() => {
    if (isOpen && insumo) {
      reset({
        name: insumo.name,
        description: insumo.description || '',
      });
      setSelectedCategorias(insumo.categoria_ids || []);
    } else {
      reset({ name: '', description: '' });
      setSelectedCategorias([]);
    }
  }, [isOpen, insumo, reset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onSubmit = async (data: FormData) => {
    if (!insumo) return;

    try {
      await updateMutation.mutateAsync({
        id: insumo.id,
        data: {
          name: data.name,
          description: data.description,
          categoria_ids: selectedCategorias,
        },
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

  const handleDelete = async () => {
    if (!insumo) return;

    const confirmMessage = `¿Estás seguro de que quieres eliminar "${insumo.name}"?\n\nEsta acción eliminará:\n- El insumo\n- Todos sus lotes\n- Las transacciones relacionadas\n\nEsta acción NO se puede deshacer.`;

    if (window.confirm(confirmMessage)) {
      try {
        await deleteMutation.mutateAsync(insumo.id);
        onClose();
      } catch (error) {
        console.error('Error deleting insumo:', error);
      }
    }
  };

  if (!insumo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Editar ${insumo.name}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={isSubmitting || deleteMutation.isPending}
            icon="delete"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
          >
            Eliminar
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              icon="save"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nombre */}
        <Input
          label="Nombre del insumo"
          placeholder="Ej: Harina de trigo"
          icon="inventory_2"
          {...register('name', { required: 'El nombre es requerido' })}
        />

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Descripción (opcional)
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="Notas adicionales sobre este insumo..."
          />
        </div>

        {/* Categorías */}
        {categorias.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Categorías (opcional)
            </label>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              Asigna una o más categorías para organizar este insumo
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoria.color }}
                    />
                    <span>{categoria.name}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Info sobre el tipo de unidad */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px] mt-0.5">
              info
            </span>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              El tipo de unidad ({insumo.unit_type}) no se puede cambiar porque afectaría los lotes existentes.
              Si necesitas cambiar la unidad, crea un nuevo insumo.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
