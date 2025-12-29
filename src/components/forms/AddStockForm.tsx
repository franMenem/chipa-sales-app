import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { QuantityStepper } from '../ui/QuantityStepper';
import { useInsumos } from '../../hooks/useInsumos';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import type { ProductoWithCost } from '../../lib/types';

interface AddStockFormProps {
  isOpen: boolean;
  onClose: () => void;
  producto: ProductoWithCost | null;
}

export function AddStockForm({ isOpen, onClose, producto }: AddStockFormProps) {
  const { data: insumos } = useInsumos();
  const [quantity, setQuantity] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const handleSubmit = async () => {
    if (!producto || !producto.recipe_items || !insumos) {
      toast.error('Error', 'No se puede agregar stock a este producto');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calcular cuánto agregar de cada insumo
      for (const item of producto.recipe_items) {
        const insumo = insumos.find((i) => i.id === item.insumo_id);
        if (!insumo) continue;

        // Cantidad a agregar en unidades base (g, ml, o unidades)
        const quantityToAdd = item.quantity_in_base_units * quantity;

        // Convertir a la unidad del insumo
        let newQuantity = insumo.quantity;
        if (insumo.unit_type === 'kg' || insumo.unit_type === 'l') {
          // Convertir de g/ml a kg/l
          newQuantity = insumo.quantity + (quantityToAdd / 1000);
        } else {
          // Unidades directas
          newQuantity = insumo.quantity + quantityToAdd;
        }

        // Actualizar el insumo
        const { error: updateError } = await supabase
          .from('insumos')
          .update({ quantity: newQuantity })
          .eq('id', insumo.id);

        if (updateError) throw updateError;
      }

      // Invalidar queries para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });

      toast.success(
        'Stock agregado',
        `Se agregaron ${quantity} unidades de ${producto.name}`
      );

      // Reset y cerrar
      setQuantity(10);
      onClose();
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error('Error', 'No se pudo agregar el stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!producto) return null;

  // Calcular cuánto se va a agregar de cada insumo
  const insumosToAdd = producto.recipe_items?.map((item) => {
    const insumo = insumos?.find((i) => i.id === item.insumo_id);
    if (!insumo) return null;

    const quantityToAdd = item.quantity_in_base_units * quantity;

    let displayQuantity = quantityToAdd;
    let displayUnit = insumo.unit_type;

    if (insumo.unit_type === 'kg' || insumo.unit_type === 'l') {
      displayQuantity = quantityToAdd / 1000;
      displayUnit = insumo.unit_type;
    }

    return {
      name: insumo.name,
      quantity: displayQuantity,
      unit: displayUnit,
    };
  }).filter(Boolean);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Agregar Stock: ${producto.name}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} icon="add">
            {isSubmitting ? 'Agregando...' : 'Agregar Stock'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Quantity Stepper */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            ¿Cuántas unidades quieres agregar?
          </label>
          <div className="flex justify-center">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              step={1}
            />
          </div>
        </div>

        {/* Preview de insumos a agregar */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              inventory_2
            </span>
            Insumos que se agregarán:
          </h4>
          <div className="space-y-2">
            {insumosToAdd?.map((item, index) => {
              if (!item) return null;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600 dark:text-slate-400">
                    {item.name}
                  </span>
                  <span className="font-semibold text-primary">
                    +{item.quantity.toFixed(2)} {item.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px] mt-0.5">
              info
            </span>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Esto incrementará los insumos necesarios para producir {quantity} unidades de {producto.name}.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
