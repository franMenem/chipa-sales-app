import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import type { ProductoWithCost } from '../../lib/types';

interface AdjustFinishedStockFormProps {
  isOpen: boolean;
  onClose: () => void;
  producto: ProductoWithCost | null;
}

export function AdjustFinishedStockForm({ isOpen, onClose, producto }: AdjustFinishedStockFormProps) {
  const [quantity, setQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const handleSubmit = async () => {
    if (!producto) return;

    const newStock = (producto.finished_stock || 0) + quantity;

    if (newStock < 0) {
      toast.error('Error', 'El stock no puede ser negativo');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('productos')
        .update({ finished_stock: newStock })
        .eq('id', producto.id);

      if (error) throw error;

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['productos'] });

      toast.success(
        'Stock actualizado',
        `${producto.name} ahora tiene ${newStock} unidades terminadas`
      );

      // Reset y cerrar
      setQuantity(0);
      onClose();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Error', 'No se pudo actualizar el stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!producto) return null;

  const currentStock = producto.finished_stock || 0;
  const newStock = currentStock + quantity;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Stock de Productos Terminados`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} icon="save">
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Product name */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
            {producto.name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Stock actual: <strong className="text-primary">{currentStock} unidades</strong>
          </p>
        </div>

        {/* Input to add/subtract */}
        <div>
          <Input
            label="Agregar o quitar unidades"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            placeholder="Ej: 20 para agregar, -5 para quitar"
            icon="inventory_2"
            helperText="Usa números positivos para agregar, negativos para quitar"
          />
        </div>

        {/* Preview */}
        <div className={`rounded-lg p-4 border-2 ${
          newStock < 0
            ? 'bg-red-50 dark:bg-red-950/30 border-red-500'
            : newStock > currentStock
            ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
            : newStock < currentStock
            ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500'
            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nuevo stock:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {currentStock}
              </span>
              {quantity !== 0 && (
                <>
                  <span className="text-xl text-slate-500 dark:text-slate-400">→</span>
                  <span className={`text-2xl font-bold ${
                    newStock < 0
                      ? 'text-red-600 dark:text-red-400'
                      : newStock > currentStock
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {newStock}
                  </span>
                </>
              )}
            </div>
          </div>
          {quantity !== 0 && (
            <p className="text-xs mt-2 text-slate-600 dark:text-slate-400">
              {quantity > 0 ? `Agregando ${quantity} unidades` : `Quitando ${Math.abs(quantity)} unidades`}
            </p>
          )}
        </div>

        {newStock < 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[18px] mt-0.5">
                error
              </span>
              <p className="text-xs text-red-700 dark:text-red-300">
                El stock no puede ser negativo. Ajusta la cantidad.
              </p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px] mt-0.5">
              info
            </span>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Este es el stock de productos ya terminados/listos para vender. Es adicional al stock calculado por insumos.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
