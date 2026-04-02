import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { retiroInsumoSchema } from '../../utils/validators';
import { RETIRO_REASONS } from '../../lib/constants';
import { useInsumos } from '../../hooks/queries/useInsumosQueries';
import { useInsumoLotes } from '../../hooks/useInsumoLotes';
import { useCreateRetiroInsumo } from '../../hooks/mutations/useRetirosMutations';
import { formatCurrency } from '../../utils/formatters';
import type { RetiroInsumoFormData } from '../../lib/types';

interface RetiroInsumoFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RetiroInsumoForm({ isOpen, onClose }: RetiroInsumoFormProps) {
  const { data: insumos } = useInsumos();
  const createRetiro = useCreateRetiroInsumo();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RetiroInsumoFormData>({
    resolver: zodResolver(retiroInsumoSchema),
    defaultValues: {
      insumo_id: '',
      lote_id: '',
      quantity: 0,
      reason: 'consumo_personal',
      notes: '',
    },
  });

  const selectedInsumoId = watch('insumo_id');
  const selectedLoteId = watch('lote_id');

  const { data: lotes } = useInsumoLotes(selectedInsumoId || undefined);

  // Only show insumos with stock
  const insumoOptions = useMemo(() =>
    (insumos || [])
      .filter((i) => i.total_stock > 0)
      .map((i) => ({ value: i.id, label: `${i.name} (${i.total_stock.toFixed(0)} ${i.unit_type})` })),
    [insumos]
  );

  // Only show lotes with remaining stock
  const loteOptions = useMemo(() =>
    (lotes || [])
      .filter((l) => l.quantity_remaining > 0.01)
      .map((l) => ({
        value: l.id,
        label: `${l.quantity_remaining.toFixed(0)} ${l.unit_type} — ${formatCurrency(l.base_unit_cost)}/base`,
      })),
    [lotes]
  );

  const selectedLote = lotes?.find((l) => l.id === selectedLoteId);

  const onSubmit = async (data: RetiroInsumoFormData) => {
    await createRetiro.mutateAsync({
      insumo_id: data.insumo_id,
      lote_id: data.lote_id,
      quantity: data.quantity,
      reason: data.reason,
      notes: data.notes,
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Descontar Insumo"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={createRetiro.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="retiro-insumo-form"
            disabled={createRetiro.isPending}
            icon="remove_shopping_cart"
          >
            {createRetiro.isPending ? 'Descontando...' : 'Descontar'}
          </Button>
        </>
      }
    >
      <form id="retiro-insumo-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Insumo"
          options={insumoOptions}
          placeholder="Seleccioná un insumo"
          error={errors.insumo_id?.message}
          {...register('insumo_id')}
        />

        {selectedInsumoId && (
          <Select
            label="Lote"
            options={loteOptions}
            placeholder="Seleccioná un lote"
            error={errors.lote_id?.message}
            {...register('lote_id')}
          />
        )}

        {selectedLote && (
          <Input
            label={`Cantidad (max: ${selectedLote.quantity_remaining.toFixed(0)})`}
            type="number"
            step="0.01"
            min="0"
            max={selectedLote.quantity_remaining}
            placeholder="0"
            icon="scale"
            error={errors.quantity?.message}
            {...register('quantity', { valueAsNumber: true })}
          />
        )}

        <Select
          label="Motivo"
          options={[...RETIRO_REASONS]}
          error={errors.reason?.message}
          {...register('reason')}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Notas (opcional)
          </label>
          <textarea
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-base text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 touch-manipulation resize-none"
            rows={2}
            placeholder="Detalle opcional"
            {...register('notes')}
          />
          {errors.notes && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {errors.notes.message}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
