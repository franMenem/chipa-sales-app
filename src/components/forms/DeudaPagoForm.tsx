import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { deudaPagoSchema } from '../../utils/validators';
import { PAYMENT_METHODS } from '../../lib/constants';
import { getTodayForInput } from '../../utils/dates';
import { formatCurrency } from '../../utils/formatters';
import type { DeudaPagoFormData } from '../../lib/types';

interface DeudaPagoFormProps {
  deudaId: string;
  maxAmount: number;
  onSubmit: (data: DeudaPagoFormData) => Promise<void>;
  formId?: string;
}

export function DeudaPagoForm({ deudaId, maxAmount, onSubmit, formId = 'deuda-pago-form' }: DeudaPagoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeudaPagoFormData>({
    resolver: zodResolver(deudaPagoSchema),
    defaultValues: {
      deuda_id: deudaId,
      amount: 0,
      payment_date: getTodayForInput(),
      payment_method: 'efectivo',
      notes: '',
    },
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('deuda_id')} />

      <Input
        label={`Monto a pagar (máx ${formatCurrency(maxAmount)})`}
        type="number"
        step="0.01"
        min="0"
        max={maxAmount}
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
          rows={2}
          placeholder="Información adicional sobre el pago"
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
