import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { retiroProductoSchema } from '../../utils/validators';
import { RETIRO_REASONS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import { useProductos } from '../../hooks/queries/useProductosQueries';
import { useCreateRetiroProducto } from '../../hooks/mutations/useRetirosMutations';
import { formatCurrency } from '../../utils/formatters';
import type { RetiroProductoFormData, StockFabricado } from '../../lib/types';

interface RetiroProductoFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function useStockFabricadoBatches(productoId: string | undefined) {
  return useQuery({
    queryKey: ['stock-fabricado', 'batches', productoId],
    enabled: !!productoId,
    queryFn: async () => {
      if (!productoId) throw new Error('Producto ID required');
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('stock_fabricado')
        .select('*')
        .eq('producto_id', productoId)
        .eq('user_id', user.id)
        .gt('quantity_remaining', 0)
        .order('production_date', { ascending: false });

      if (error) throw error;
      return data as StockFabricado[];
    },
  });
}

export function RetiroProductoForm({ isOpen, onClose }: RetiroProductoFormProps) {
  const { data: productos } = useProductos();
  const createRetiro = useCreateRetiroProducto();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RetiroProductoFormData>({
    resolver: zodResolver(retiroProductoSchema),
    defaultValues: {
      producto_id: '',
      stock_fabricado_id: '',
      quantity: 0,
      reason: 'consumo_personal',
      notes: '',
    },
  });

  const selectedProductoId = watch('producto_id');
  const selectedBatchId = watch('stock_fabricado_id');

  const { data: batches } = useStockFabricadoBatches(selectedProductoId || undefined);

  const productoOptions = useMemo(() =>
    (productos || [])
      .filter((p) => p.finished_stock > 0)
      .map((p) => ({ value: p.id, label: `${p.name} (${p.finished_stock} ud)` })),
    [productos]
  );

  const batchOptions = useMemo(() =>
    (batches || []).map((b) => ({
      value: b.id,
      label: `${b.quantity_remaining} ud — ${formatCurrency(b.cost_unit)}/ud — ${formatCurrency(b.price_sale)} venta`,
    })),
    [batches]
  );

  const selectedBatch = batches?.find((b) => b.id === selectedBatchId);

  const onSubmit = async (data: RetiroProductoFormData) => {
    await createRetiro.mutateAsync({
      producto_id: data.producto_id,
      stock_fabricado_id: data.stock_fabricado_id,
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
      title="Descontar Producto"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={createRetiro.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="retiro-producto-form"
            disabled={createRetiro.isPending}
            icon="remove_shopping_cart"
          >
            {createRetiro.isPending ? 'Descontando...' : 'Descontar'}
          </Button>
        </>
      }
    >
      <form id="retiro-producto-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Producto"
          options={productoOptions}
          placeholder="Seleccioná un producto"
          error={errors.producto_id?.message}
          {...register('producto_id')}
        />

        {selectedProductoId && (
          <Select
            label="Batch"
            options={batchOptions}
            placeholder="Seleccioná un batch"
            error={errors.stock_fabricado_id?.message}
            {...register('stock_fabricado_id')}
          />
        )}

        {selectedBatch && (
          <Input
            label={`Cantidad (max: ${selectedBatch.quantity_remaining})`}
            type="number"
            min="1"
            max={selectedBatch.quantity_remaining}
            placeholder="0"
            icon="inventory_2"
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
