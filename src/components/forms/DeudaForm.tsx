import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/Input';
import { deudaSchema } from '../../utils/validators';
import type { DeudaFormData } from '../../lib/types';

interface DeudaFormProps {
  onSubmit: (data: DeudaFormData) => Promise<void>;
  defaultValues?: Partial<DeudaFormData>;
  formId?: string;
}

export function DeudaForm({ onSubmit, defaultValues, formId = 'deuda-form' }: DeudaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeudaFormData>({
    resolver: zodResolver(deudaSchema),
    defaultValues: defaultValues || {
      description: '',
      creditor_name: '',
      total_amount: 0,
      due_date: '',
      notes: '',
    },
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Descripción"
        placeholder="Ej: Préstamo para equipamiento"
        icon="description"
        error={errors.description?.message}
        {...register('description')}
      />

      <Input
        label="Acreedor"
        placeholder="Ej: Banco, Juan, Proveedor X"
        icon="person"
        error={errors.creditor_name?.message}
        {...register('creditor_name')}
      />

      <Input
        label="Monto total"
        type="number"
        step="0.01"
        min="0"
        placeholder="0"
        icon="payments"
        error={errors.total_amount?.message}
        {...register('total_amount', { valueAsNumber: true })}
      />

      <Input
        label="Fecha de vencimiento (opcional)"
        type="date"
        icon="event"
        error={errors.due_date?.message}
        {...register('due_date')}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Notas (opcional)
        </label>
        <textarea
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-base text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation resize-none"
          rows={3}
          placeholder="Información adicional sobre la deuda"
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
  );
}
