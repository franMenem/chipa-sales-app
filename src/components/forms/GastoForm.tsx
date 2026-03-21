import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { GastoConceptoModal } from './GastoConceptoModal';
import { gastoSchema } from '../../utils/validators';
import { PAYMENT_METHODS } from '../../lib/constants';
import { getTodayForInput } from '../../utils/dates';
import { useGastoConceptos } from '../../hooks/queries/useGastosQueries';
import type { GastoFormData } from '../../lib/types';

interface GastoFormProps {
  onSubmit: (data: GastoFormData) => Promise<void>;
  defaultValues?: Partial<GastoFormData>;
  isSubmitting?: boolean;
  formId?: string;
}

export function GastoForm({ onSubmit, defaultValues, formId = 'gasto-form' }: GastoFormProps) {
  const [showConceptoModal, setShowConceptoModal] = useState(false);
  const { data: conceptos } = useGastoConceptos();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GastoFormData>({
    resolver: zodResolver(gastoSchema),
    defaultValues: defaultValues || {
      concepto_id: '',
      amount: 0,
      payment_date: getTodayForInput(),
      payment_method: 'efectivo',
      notes: '',
    },
  });

  const conceptoOptions = conceptos?.map((concepto) => ({
    value: concepto.id,
    label: concepto.name,
  })) || [];

  return (
    <>
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="Concepto"
              options={conceptoOptions}
              placeholder="Seleccioná un concepto"
              error={errors.concepto_id?.message}
              {...register('concepto_id')}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon="add"
            onClick={() => setShowConceptoModal(true)}
            className="flex-shrink-0"
          >
            Nuevo
          </Button>
        </div>

        <Input
          label="Monto"
          type="number"
          step="0.01"
          min="0"
          placeholder="0"
          icon="payments"
          error={errors.amount?.message}
          {...register('amount', { valueAsNumber: true })}
        />

        <Input
          label="Fecha de pago"
          type="date"
          icon="calendar_today"
          error={errors.payment_date?.message}
          {...register('payment_date')}
        />

        <Select
          label="Método de pago"
          options={[...PAYMENT_METHODS]}
          error={errors.payment_method?.message}
          {...register('payment_method')}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Notas (opcional)
          </label>
          <textarea
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-base text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation resize-none"
            rows={3}
            placeholder="Información adicional sobre el gasto"
            {...register('notes')}
          />
          {errors.notes && (
            <p className="mt-1.5 text-xs sm:text-sm text-red-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {errors.notes.message}
            </p>
          )}
        </div>
      </form>

      <GastoConceptoModal
        isOpen={showConceptoModal}
        onClose={() => setShowConceptoModal(false)}
      />
    </>
  );
}
