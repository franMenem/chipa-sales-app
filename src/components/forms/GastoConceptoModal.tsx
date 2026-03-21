import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { gastoConceptoSchema } from '../../utils/validators';
import { useCreateGastoConcepto } from '../../hooks/mutations/useGastosMutations';
import type { GastoConceptoFormData } from '../../lib/types';

interface GastoConceptoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GastoConceptoModal({ isOpen, onClose }: GastoConceptoModalProps) {
  const createMutation = useCreateGastoConcepto();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GastoConceptoFormData>({
    resolver: zodResolver(gastoConceptoSchema),
    defaultValues: { name: '' },
  });

  const handleCreate = async (data: GastoConceptoFormData) => {
    try {
      await createMutation.mutateAsync(data);
      onClose();
      reset();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Nuevo Concepto"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(handleCreate)}
            disabled={isSubmitting}
            icon="add"
          >
            {isSubmitting ? 'Creando...' : 'Crear'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
        <Input
          label="Nombre del concepto"
          placeholder="Ej: Alquiler, Servicios, Marketing"
          icon="label"
          error={errors.name?.message}
          {...register('name')}
        />
      </form>
    </Modal>
  );
}
